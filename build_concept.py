import bpy, math, random, json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
random.seed(31)
previous = bpy.data.scenes.get('Stalker — spatial study')
if previous and previous.get('stage','').startswith('Layout and sightline study.'):
    for obj in list(previous.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.scenes.remove(previous)
scene = bpy.data.scenes.new('Stalker — spatial study')
bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'
scene['stage'] = 'Layout and sightline study. Historical dimensions, proposed landscape and interior layout.'

def material(name, color, roughness=0.7):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    return mat

stone = material('Weathered grey stone — study', (0.24,0.26,0.24))
grass = material('Island turf', (0.13,0.18,0.09))
wood = material('Oak — study', (0.19,0.10,0.045))
slate = material('Slate roof', (0.07,0.09,0.11))
water = material('Loch water', (0.075,0.17,0.19), 0.19)
water.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = 0.35
nodes = stone.node_tree.nodes
noise = nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 7
bump = nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .24; bump.inputs['Distance'].default_value = .08
stone.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
stone.node_tree.links.new(bump.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])

def box(name, location, size, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object; obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat: obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new('Edge wear study', 'BEVEL'); modifier.width=bevel; modifier.segments=2
        obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return obj

def opening(wall, name, center, size):
    cutter=box(name+' cutter',center,size,None)
    bpy.context.view_layer.objects.active=wall
    modifier=wall.modifiers.new(name,'BOOLEAN'); modifier.operation='DIFFERENCE'; modifier.solver='EXACT'; modifier.object=cutter
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

box('Water horizon', (0,0,-.18),(3000,3000,.2),water)
# A compact walkable island and a much larger distant silhouette.
def land(name, center, rx, ry, height, mat, rings=8, segments=64):
    verts=[(center[0],center[1],height)]
    jitter=[random.uniform(.87,1.13) for _ in range(segments)]
    for ring in range(1,rings+1):
        t=ring/rings
        for i in range(segments):
            angle=i*math.tau/segments
            z=height*(1-t**3) + random.uniform(-.16,.16)*t
            verts.append((center[0]+rx*t*math.cos(angle)*jitter[i],center[1]+ry*t*math.sin(angle)*jitter[i],z))
    faces=[]
    for i in range(segments): faces.append((0,1+i,1+(i+1)%segments))
    for ring in range(rings-1):
        for i in range(segments):
            a=1+ring*segments+i; b=1+ring*segments+(i+1)%segments
            faces.append((a,a+segments,b+segments,b))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj); obj.data.materials.append(mat)
    return obj

land('Island — proposed shoreline',(0,0),28,21,2.1,grass)
for i in range(14):
    angle=math.radians(15+i*22)
    land('Distant ridge %02d'%i,(650*math.cos(angle),650*math.sin(angle)),random.uniform(100,210),random.uniform(75,140),random.uniform(60,140),stone,6,40)
base=2.1
box('Foundation',(0,0,base+.25),(11.8,14.8,.5),stone)
walls=[]
walls.append(box('West wall',(-4.55,0,base+6.8),(2.7,14.8,13.6),stone))
walls.append(box('East wall',(4.55,0,base+6.8),(2.7,14.8,13.6),stone))
walls.append(box('North wall',(0,6.05,base+6.8),(6.4,2.7,13.6),stone))
walls.append(box('South wall',(0,-6.05,base+6.8),(6.4,2.7,13.6),stone))
hall_z=base+4.0
openings=[]
for label,wall,x,y,sx,sy in [('West outlook',walls[0],-4.55,-1.8,3.2,1.5),('East outlook',walls[1],4.55,-1.8,3.2,1.5),('South outlook',walls[3],0,-6.05,1.5,3.2)]:
    opening(wall,label,(x,y,hall_z+2),(sx,sy,2.4))
    openings.append({'name':label,'type':'window','center':[x,y,hall_z+2],'size':[sx,sy,2.4]})
opening(walls[2],'Hall entrance',(0,6.05,hall_z+1.35),(1.65,3.2,2.7))
for wall,x in [(walls[0],-4.55),(walls[1],4.55)]:
    opening(wall,'Upper chamber window',(x,0,base+10),(3.2,1.2,1.8))
box('Hall floor',(0,0,hall_z-.15),(6.4,9.4,.3),wood)
box('Hall ceiling',(0,0,hall_z+3.8),(6.4,9.4,.3),wood)
for y in [-3.5,-1.75,0,1.75,3.5]: box('Ceiling beam',(0,y,hall_z+3.45),(6.4,.22,.45),wood,.025)
for x in [-3.2,3.2]: box('Window stone seat',(x,-1.8,hall_z+.28),(1.25,1.5,.56),stone,.04)
box('Oak table',(0,0,hall_z+.8),(1.25,3.3,.12),wood,.03)
for x in [-.48,.48]:
    for y in [-1.35,1.35]: box('Table leg',(x,y,hall_z+.37),(.14,.14,.74),wood,.015)
for x in [-1.2,1.2]:
    box('Bench',(x,0,hall_z+.44),(.38,3.0,.12),wood,.025)
    for y in [-1.2,1.2]:box('Bench support',(x,y,hall_z+.19),(.28,.18,.38),wood)
# Comfortable preliminary stair, to be checked against the measured plan.
for i in range(24):
    box('Arrival step %02d'%i,(0,7.8+(23-i)*.3,base+(i+1)*4/24/2),(1.8,.31,(i+1)*4/24),stone,.015)
# Stepped gables and a simple slate roof retain the distant silhouette.
for y in [-6.7,6.7]:
    for i in range(7):box('Crow stepped gable',(0,y,base+13.6+i*.37),(11.8-i*1.55,.65,.4),stone)
verts=[(-5.9,-7.4,base+13.6),(5.9,-7.4,base+13.6),(0,-7.4,base+16.4),(-5.9,7.4,base+13.6),(5.9,7.4,base+13.6),(0,7.4,base+16.4)]
mesh=bpy.data.meshes.new('Roof');mesh.from_pydata(verts,[],[(0,3,5,2),(2,5,4,1),(0,2,1),(3,4,5)]);mesh.update()
obj=bpy.data.objects.new('Slate roof',mesh);scene.collection.objects.link(obj);obj.data.materials.append(slate)
for x in [-5.65,5.65]:box('Parapet',(x,0,base+13.4),(.5,14.8,1),stone)
box('Lookout caphouse',(-4,5.2,base+15.1),(3,3.6,3.3),stone)
box('Chimney',(3,-4,base+16.3),(1.1,1.2,3),stone)

world=bpy.data.worlds.new('Loch sky');world.use_nodes=True;scene.world=world
sky=world.node_tree.nodes.new('ShaderNodeTexSky');sky.sky_type='MULTIPLE_SCATTERING';sky.sun_elevation=math.radians(14);sky.sun_rotation=math.radians(230)
world.node_tree.links.new(sky.outputs['Color'],world.node_tree.nodes.get('Background').inputs['Color'])
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.3
bpy.ops.object.light_add(type='SUN',location=(10,-30,40));bpy.context.object.data.energy=2;bpy.context.object.rotation_euler=(math.radians(32),math.radians(-25),math.radians(-35));bpy.context.object.data.angle=.12
bpy.ops.object.light_add(type='AREA',location=(0,0,hall_z+3.2));bpy.context.object.data.energy=170;bpy.context.object.data.color=(1,.73,.45);bpy.context.object.data.shape='DISK';bpy.context.object.data.size=4

def camera(name, pos, target, lens):
    bpy.ops.object.camera_add(location=pos)
    cam=bpy.context.object;cam.name=name;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens;cam.data.clip_end=5000
    return cam
cams=[camera('Arrival — exterior',(35,49,8),(0,0,9),42),camera('Hall — window and landscape',(1.7,3.5,hall_z+1.65),(-2,-2,hall_z+1.5),22),camera('Roof — loch panorama',(-5.2,-3,base+14),(0,-200,45),28)]
plan=camera('Hall plan',(0,0,60),(0,0,0),45);plan.data.type='ORTHO';plan.data.ortho_scale=23
scene.camera=cams[0]
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=800;scene.render.resolution_percentage=75
scene.view_settings.view_transform='AgX'
ROOT.joinpath('renders').mkdir(exist_ok=True)
with open(ROOT/'openings.json','w',encoding='utf-8') as f:json.dump(openings,f,indent=2)
bpy.data.libraries.write(str(ROOT/'stalker-layout.blend'),{scene},fake_user=True)
print(json.dumps({'scene':scene.name,'objects':len(scene.objects),'file':str(ROOT/'stalker-layout.blend'),'cameras':[c.name for c in cams]}))

