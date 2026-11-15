import bpy
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parent
scene=bpy.data.scenes['Stalker — spatial study']
bpy.context.window.scene=scene
roof=scene.objects['Slate roof']
for vertex in roof.data.vertices:
    vertex.co.x *= 4.3/5.9
cam=scene.objects['Roof — loch panorama']
cam.location=(-5.15,-2,17.3)
cam.rotation_euler=(Vector((-200,-100,20))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.camera=scene.objects['Arrival — exterior']
bpy.ops.wm.save_as_mainfile(filepath=str(root/'stalker-layout.blend'))
scene.camera=cam
scene.render.filepath=str(root/'renders'/'roof.png')
bpy.ops.render.render(write_still=True)
