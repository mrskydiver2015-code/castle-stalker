import bpy, json, math
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parent
# Load the saved project into a separate scene, retaining the live document.
with bpy.data.libraries.load(str(root/'stalker-layout.blend'), link=False) as (source,target):
    target.scenes = [name for name in source.scenes if name.startswith('Stalker')][:1]
scene=target.scenes[0]
scene.name='Stalker — navigable pilot'
bpy.context.window.scene=scene
stone=next(o for o in scene.objects if o.name.startswith('West wall')).data.materials[0]
wood=next(o for o in scene.objects if o.name.startswith('Hall floor')).data.materials[0]

def find(prefix):
    return next(o for o in scene.objects if o.name.startswith(prefix))

def box(name,position,size,material):
    bpy.ops.mesh.primitive_cube_add(size=1,location=position)
    obj=bpy.context.object;obj.name=name;obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(material)
    return obj

def cut(obj,position,size):
    cutter=box('temporary cutter',position,size,stone)
    bpy.context.view_layer.objects.active=obj
    modifier=obj.modifiers.new('Stair aperture','BOOLEAN');modifier.object=cutter;modifier.operation='DIFFERENCE'
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

ceiling=find('Hall ceiling')
box('Entrance threshold',(0,6.2,5.95),(1.65,3.2,.3),stone)
box('Entrance landing',(0,7.65,5.95),(2.0,.8,.3),stone)
for i in range(6):
    top=2.1-i*.15
    box('Approach step %02d'%i,(0,15.0+i*.3,top-.15),(1.8,.31,.3),stone)
cut(ceiling,(-2.5,0,9.9),(1.4,7.8,1))
for obj in list(scene.objects):
    if obj.name.startswith('Ceiling beam'):
        cut(obj,(-2.5,0,9.7),(1.4,8,1.2))
for i in range(20):
    height=(i+1)*3.95/20
    box('Interior step %02d'%i,(-2.5,-3.6+i*.36,6.1+height/2),(1.35,.365,height),wood)
box('Upper stair landing',(-2.5,3.7,9.95),(1.35,.8,.2),wood)
# Protective rail on the open side of the stair well, with access at both ends.
box('Upper stair rail',(-1.75,0,10.95),(.09,6.5,.10),wood)
for y in [-3,-1.5,0,1.5,3]:box('Upper rail post',(-1.75,y,10.5),(.09,.09,.9),wood)
box('Upper chamber ceiling',(0,0,13.85),(6.4,9.4,.28),wood)
box('Upper chamber writing desk',(1.9,-2.6,10.85),(1.6,.7,.12),wood)
for x in [1.25,2.55]:
    for y in [-2.85,-2.35]:box('Desk leg',(x,y,10.42),(.12,.12,.74),wood)
box('Upper chamber bench',(1.9,1.8,10.5),(.55,2.1,.18),wood)
for y in [1,2.6]:box('Upper bench support',(1.9,y,10.25),(.4,.2,.4),wood)
# A continuous deck provides a safe roof viewpoint, reached with a viewpoint button.
box('West roof deck',(-4.9,0,15.3),(1.4,11.6,.25),stone)
box('Roof inner guard',(-4.17,0,15.9),(.1,11.6,1.2),wood)
for y in [-5.8,5.8]:box('Roof end guard',(-4.9,y,15.9),(1.5,.12,1.2),wood)

# Replace the circular placeholder hills with overlapping irregular ridges.
for obj in scene.objects:
    if obj.name.startswith('Distant ridge'):
        for vertex in obj.data.vertices:
            x,y,z=vertex.co
            vertex.co.z=z*(.78+.21*math.sin(x*.025)+.16*math.cos(y*.035))
            vertex.co.x += 20*math.sin(y*.012)
        for face in obj.data.polygons:face.use_smooth=True

depsgraph=bpy.context.evaluated_depsgraph_get()
objects=[]
for obj in scene.objects:
    if obj.type!='MESH':continue
    evaluated=obj.evaluated_get(depsgraph)
    mesh=evaluated.to_mesh();mesh.calc_loop_triangles()
    positions=[];normals=[]
    for triangle in mesh.loop_triangles:
        for index in triangle.vertices:
            vertex=mesh.vertices[index]
            point=evaluated.matrix_world@vertex.co
            normal=evaluated.matrix_world.to_3x3()@(vertex.normal if mesh.polygons[triangle.polygon_index].use_smooth else triangle.normal)
            normal.normalize()
            positions.extend(round(v,5) for v in point)
            normals.extend(round(v,5) for v in normal)
    mat=obj.data.materials[0] if obj.data.materials else None
    color=list(mat.diffuse_color[:3]) if mat else [.3,.3,.3]
    roughness=.75
    if mat and mat.use_nodes:
        shader=next((node for node in mat.node_tree.nodes if node.type=='BSDF_PRINCIPLED'),None)
        if shader:
            color=list(shader.inputs['Base Color'].default_value[:3])
            roughness=shader.inputs['Roughness'].default_value
    objects.append({'name':obj.name,'positions':positions,'normals':normals,'color':color,'roughness':roughness})
    evaluated.to_mesh_clear()
output=root/'mobile-preview'/'dist'/'castle.json'
output.write_text(json.dumps({'objects':objects,'units':'metres','up':'Z'},separators=(',',':')),encoding='utf-8')
bpy.data.libraries.write(str(root/'stalker-navigation.blend'),{scene},fake_user=True)
print(json.dumps({'file':str(output),'bytes':output.stat().st_size,'meshes':len(objects),'triangles':sum(len(o['positions'])//9 for o in objects)}))
