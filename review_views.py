import bpy
from pathlib import Path
root=Path(__file__).resolve().parent
scene=bpy.data.scenes.get('Stalker — spatial study')
bpy.context.window.scene=scene
scene.camera=scene.objects['Arrival — exterior']
bpy.ops.wm.save_as_mainfile(filepath=str(root/'stalker-layout.blend'))
for name,output in [('Hall — window and landscape','hall'),('Roof — loch panorama','roof'),('Hall plan','plan')]:
    scene.camera=scene.objects[name]
    if output=='plan':scene.camera.data.clip_start=52.0
    scene.render.filepath=str(root/'renders'/f'{output}.png')
    bpy.ops.render.render(write_still=True)
