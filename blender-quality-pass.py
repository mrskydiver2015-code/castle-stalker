import bpy, math, json, re
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parent;s=bpy.context.scene
wood=next(o for o in s.objects if o.name.startswith('Hall floor')).data.materials[0]
def box(name,loc,size,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 b=o.modifiers.new('Soft timber edge','BEVEL');b.width=.012;b.segments=2
 return o
# Replace the original solid stair blocks with supported treads.
for o in list(s.objects):
 if o.name.startswith('Interior step'):
  top=max((o.matrix_world@v.co).z for v in o.data.vertices)
  o.dimensions.z=.16;o.location.z=top-.08
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.select_set(False)
  b=o.modifiers.new('Tread edge','BEVEL');b.width=.012;b.segments=2
length=math.hypot(7.2,3.95)
for x in [-3.0,-2.0]:
 o=box('Oak stair stringer',(x,-.18,7.98),(.13,length,.22),wood);o.rotation_euler.x=math.atan2(3.95,7.2)
# Seat faces the existing writing desk and touches the upper floor.
stool=next(o for o in s.objects if o.name.startswith('wooden_stool_01'))
bottom=min((stool.matrix_world@v.co).z for v in stool.data.vertices)
stool.location=Vector((1.9,-1.65,10.05-bottom))
# Subtle edges catch light at human viewing distance; do not subdivide walls.
for o in s.objects:
 if o.type=='MESH' and re.search('wall|table|desk|bench|beam',o.name,re.I) and not any(m.type=='BEVEL' for m in o.modifiers):
  b=o.modifiers.new('Human-scale edge highlight','BEVEL');b.width=.018;b.segments=2
# Give candles a visible light source. Preserve the sun; replace the unmotivated area fill.
for o in list(s.objects):
 if o.type=='LIGHT' and o.data.type=='AREA':o.hide_render=True
wax=next(o for o in s.objects if o.name.startswith('Wax candle')).data.materials[0]
flame=bpy.data.materials.new('Warm candle flame');flame.use_nodes=True
p=next(n for n in flame.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(1,.45,.08,1);p.inputs['Emission Color'].default_value=(1,.34,.04,1);p.inputs['Emission Strength'].default_value=4
for o in list(s.objects):
 if o.type=='MESH' and (o.name.startswith('Wax candle') or o.name.startswith('Desk wax candle')):
  top=max((o.matrix_world@v.co).z for v in o.data.vertices);x,y=o.location.xy
  bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=(x,y,top+.024));f=bpy.context.object;f.name='Candle flame';f.scale=(.008,.008,.024);f.data.materials.append(flame)
  light=bpy.data.lights.new('Candle pool','POINT');light.energy=7;light.color=(1,.60,.25);light.shadow_soft_size=.08
  lo=bpy.data.objects.new('Candle pool',light);s.collection.objects.link(lo);lo.location=(x,y,top+.06)
# A real HDRI lights the room; the authored loch stays visible to the camera.
world=s.world;world.use_nodes=True;n=world.node_tree.nodes;links=world.node_tree.links
output=next(v for v in n if v.type=='OUTPUT_WORLD');old=output.inputs['Surface'].links[0].from_socket
tex=n.new('ShaderNodeTexEnvironment');tex.image=bpy.data.images.load(str(root/'mobile-preview/dist/assets/loch.jpg'),check_existing=True)
back=n.new('ShaderNodeBackground');back.inputs['Strength'].default_value=.65;links.new(tex.outputs['Color'],back.inputs['Color'])
path=n.new('ShaderNodeLightPath');mix=n.new('ShaderNodeMixShader');links.new(path.outputs['Is Camera Ray'],mix.inputs[0]);links.new(old,mix.inputs[1]);links.new(back.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],output.inputs['Surface'])
for o in s.objects:
 if o.name.startswith('Distant ridge'):o.hide_render=True
s.camera=next(o for o in s.objects if o.name.startswith('Hall — window'))
s.camera.location=(2.0,3.7,7.75);s.camera.rotation_euler=(Vector((-.5,-1.2,7.5))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.lens=22
s.render.resolution_x=768;s.render.resolution_y=480;s.render.resolution_percentage=100
for image in bpy.data.images:
 if image.source=='FILE' and image.has_data and not image.packed_file:
  try:image.pack()
  except RuntimeError:pass
bpy.data.libraries.write(str(root/'stalker-blender-quality.blend'),{s},fake_user=True)
print(json.dumps({'scene':s.name,'saved':str(root/'stalker-blender-quality.blend'),'stool_bottom':min((stool.matrix_world@v.co).z for v in stool.data.vertices),'meshes':sum(o.type=='MESH' for o in s.objects)}))
