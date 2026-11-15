import bpy, math, random, json
from pathlib import Path
root=Path(__file__).resolve().parent
scene=bpy.context.scene
random.seed(71)
def material(name,color):
 m=bpy.data.materials.new(name);m.use_nodes=True
 s=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');s.inputs['Base Color'].default_value=(*color,1);s.inputs['Roughness'].default_value=.85
 return m
iron=material('Iron charcoal',(.025,.029,.028));wax=material('Beeswax',(.6,.43,.2));clay=material('Earthenware',(.12,.07,.045));linen=material('Natural linen',(.35,.3,.23))
def box(name,loc,size,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 b=o.modifiers.new('Soft edges','BEVEL');b.width=.015;b.segments=2
 return o
def cylinder(name,loc,r,depth,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 b=o.modifiers.new('Soft edge','BEVEL');b.width=.008;b.segments=2
 return o
# Add a small, coordinated still life, above the existing table and desk.
table=next(o for o in scene.objects if o.name.startswith('Oak table'))
top=max((table.matrix_world@v.co).z for v in table.data.vertices)
box('Linen table runner',(0,0,top+.008),(.42,2.7,.016),linen)
for y in [-.8,.8]:
 cylinder('Iron candle base',(0,y,top+.035),.11,.05,iron)
 cylinder('Wax candle',(0,y,top+.20),.035,.3,wax)
for y in [-.35,.38]:cylinder('Earthenware cup',(.38,y,top+.075),.065,.15,clay)
desk=next(o for o in scene.objects if o.name.startswith('Upper chamber writing desk'))
dtop=max((desk.matrix_world@v.co).z for v in desk.data.vertices)
box('Closed leather folio',(1.9,-2.6,dtop+.055),(.36,.28,.11),clay)
cylinder('Desk candle base',(2.38,-2.6,dtop+.03),.10,.04,iron)
cylinder('Desk wax candle',(2.38,-2.6,dtop+.16),.03,.25,wax)
# Preserve the walkable interior while smoothing the island's coarse coastline.
island=next(o for o in scene.objects if o.name.startswith('Island'))
verts=[(0,0,1.8)];faces=[];segments=96;rings=12
for ring in range(1,rings+1):
 r=ring/rings
 for j in range(segments):
  a=j*math.tau/segments;variation=1+.045*math.sin(a*5)+.025*math.cos(a*9)
  x=29*r*math.cos(a)*variation;y=22*r*math.sin(a)*variation
  z=1.8 if r<.48 else 1.8-(r-.48)/.52*2.05
  z+=.10*math.sin(x*.5)*math.cos(y*.4)*r
  verts.append((x,y,z))
for j in range(segments):faces.append((0,1+j,1+(j+1)%segments))
for ring in range(1,rings):
 for j in range(segments):
  a=1+(ring-1)*segments+j;b=1+(ring-1)*segments+(j+1)%segments;c=1+ring*segments+(j+1)%segments;d=1+ring*segments+j
  faces.append((a,d,c,b))
mesh=bpy.data.meshes.new('Smooth coastal terrain');mesh.from_pydata(verts,[],faces);mesh.update();old=island.data;island.data=mesh
for m in old.materials:mesh.materials.append(m)
for p in mesh.polygons:p.use_smooth=True
stone=next(o for o in scene.objects if o.name.startswith('West wall')).data.materials[0]
for i in range(48):
 a=i*math.tau/48;r=1+.04*math.sin(a*5)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(28*r*math.cos(a),21*r*math.sin(a),-.05))
 o=bpy.context.object;o.name='Shore stone';o.scale=(.5+random.random()*.8,.5+random.random()*.6,.25+random.random()*.5);o.data.materials.append(stone)
# Export the exact evaluated scene, using the established browser format.
depsgraph=bpy.context.evaluated_depsgraph_get();objects=[]
for obj in scene.objects:
 if obj.type!='MESH':continue
 evaluated=obj.evaluated_get(depsgraph);mesh=evaluated.to_mesh();mesh.calc_loop_triangles();positions=[];normals=[]
 for triangle in mesh.loop_triangles:
  for index in triangle.vertices:
   vertex=mesh.vertices[index];point=evaluated.matrix_world@vertex.co
   normal=evaluated.matrix_world.to_3x3()@(vertex.normal if mesh.polygons[triangle.polygon_index].use_smooth else triangle.normal);normal.normalize()
   positions.extend(round(v,5) for v in point);normals.extend(round(v,5) for v in normal)
 mat=obj.data.materials[0] if obj.data.materials else None;color=[.3,.3,.3];roughness=.85
 if mat and mat.use_nodes:
  s=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if s:color=list(s.inputs['Base Color'].default_value[:3]);roughness=s.inputs['Roughness'].default_value
 objects.append(dict(name=obj.name,positions=positions,normals=normals,color=color,roughness=roughness));evaluated.to_mesh_clear()
(root/'mobile-preview/dist/castle.json').write_text(json.dumps(dict(objects=objects,units='metres',up='Z'),separators=(',',':')),encoding='utf-8')
bpy.data.libraries.write(str(root/'stalker-refined.blend'),{scene},fake_user=True)
print(json.dumps(dict(meshes=len(objects),triangles=sum(len(o['positions'])//9 for o in objects))))
