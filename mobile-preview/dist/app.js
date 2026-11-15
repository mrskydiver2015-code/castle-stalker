import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {dress,loadSurfaces,waterMaterial} from './surfaces.js';

const $ = id => document.getElementById(id);
const canvas = $('world');
const coarse = matchMedia('(pointer:coarse)').matches;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b9ced3');
scene.fog = new THREE.Fog('#9faeb6', 300, 1800);
const camera = new THREE.PerspectiveCamera(65, 1, .05, 2200);
camera.up.set(0, 0, 1);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
} catch (error) {
  $('loading').textContent = '3D kunde inte startas på enheten. Öppna förhandsbilderna nedan.';
  throw error;
}
const skyLight=new THREE.HemisphereLight('#dce9f0', '#555344', 1.5);
skyLight.position.set(0,0,1);scene.add(skyLight);
const sun = new THREE.DirectionalLight('#ffe0ac', 2);
sun.position.set(35,-50,65);sun.castShadow=true;
sun.shadow.mapSize.set(coarse?1024:2048,coarse?1024:2048);
Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:150});
sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;scene.add(sun);
for (const z of [8.8,12.9]) {
  const light=new THREE.PointLight('#ffc58b',14,11,1.5);
  light.position.set(0,0,z);scene.add(light);
}
const ground=[],solid=[];
const water=waterMaterial();
const foot=new THREE.Vector3(),direction=new THREE.Vector3();
const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,0,-1);
const keys=new Set(),move={x:0,y:0};
let elevation=0,yaw=0,pitch=0,flying=false,active=false,ready=false;
let savedWalk,currentPlace='hall',noticeTimer;
let orbiting=false,orbitAngle=Math.atan2(40,30);
function stopOrbit(){orbiting=false;$('orbit').setAttribute('aria-pressed','false');}
$('orbit').addEventListener('click',()=>{orbiting=!orbiting;orbitAngle=Math.atan2(foot.y,foot.x);$('orbit').setAttribute('aria-pressed',String(orbiting));});
const preferences={pace:'slow',sensitivity:'low',quality:'auto'};
try{const stored=JSON.parse(localStorage.getItem('stalker-preferences')||'{}');for(const key of Object.keys(preferences)){if([...$(key).options].some(o=>o.value===stored[key]))preferences[key]=stored[key];}}catch{}
function applyQuality(){
  const tier=preferences.quality;
  renderer.setPixelRatio(Math.min(devicePixelRatio,tier==='low'?1:tier==='high'?2:coarse?1.25:1.75));
  renderer.shadowMap.enabled=tier!=='low';
  renderer.shadowMap.needsUpdate=true;
  scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});resize();
}
for(const key of Object.keys(preferences)){
  $(key).value=preferences[key];$(key).addEventListener('change',()=>{
    preferences[key]=$(key).value;
    try{localStorage.setItem('stalker-preferences',JSON.stringify(preferences));}catch{}
    if(key==='quality')applyQuality();
  });
}
const places={
  hall:{label:'Stora salen',position:[1.8,3.1,6.1],yaw:-2.65,pitch:0},
  chamber:{label:'Övre kammaren',position:[-.6,1,10.05],yaw:2.15,pitch:-.08},
  shore:{label:'Landstigningen',position:[11,15,0],yaw:-2.49,pitch:.30},
  roof:{label:'Utsikt över Loch Laich',position:[-4.95,-2,15.425],yaw:-2.5,pitch:.02}
};
function notify(message){
  $('notice').textContent=message;$('notice').classList.add('visible');
  clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').classList.remove('visible'),2600);
}
function resize(){
  renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();
function floorAt(x,y,z,maxDrop=.5){
  ray.set(new THREE.Vector3(x,y,z+.26),down);ray.far=.26+maxDrop;
  return ray.intersectObjects(ground,false)[0]?.point.z;
}
function blocked(position){
  for(const height of [.48,1.4]){
    const origin=new THREE.Vector3(position.x,position.y,position.z+height);
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;
      ray.set(origin,new THREE.Vector3(Math.cos(angle),Math.sin(angle),0));ray.far=.24;
      if(ray.intersectObjects(solid,false).length)return true;
    }
  }
  return false;
}
function walkAxis(axis,amount){
  if(!amount)return;
  const candidate=foot.clone();candidate[axis]+=amount;
  const floor=floorAt(candidate.x,candidate.y,foot.z);
  if(floor===undefined||floor<.1)return;
  candidate.z=floor;
  if(!blocked(candidate))foot.copy(candidate);
}
function resetInput(){
  keys.clear();move.x=move.y=0;elevation=0;$('stick').style.transform='';
}
function updateMode(){
  document.body.classList.toggle('flying',flying);$('altitude').hidden=!flying;
  $('drone').textContent=flying?'Tillbaka':'Flyg';$('drone').setAttribute('aria-pressed',String(flying));
  $('location').textContent=flying?'Drönare · runt ön':places[currentPlace].label;
  $('joystick').querySelector('small').textContent=flying?'FLYG':'GÅ';
  document.querySelectorAll('[data-place]').forEach(button=>button.setAttribute('aria-pressed',String(!flying&&button.dataset.place===currentPlace)));
}
function setPlace(key){
  stopOrbit();
  if(!ready)return;
  const place=places[key];flying=false;currentPlace=key;
  foot.fromArray(place.position);yaw=place.yaw;pitch=place.pitch;
  if(key==='shore')foot.z=floorAt(foot.x,foot.y,5,6)??1.3;
  updateMode();resetInput();camera.position.copy(foot).add(new THREE.Vector3(0,0,1.65));
}
function toggleDrone(){
  stopOrbit();
  if(!ready)return;
  resetInput();
  if(flying){
    flying=false;foot.copy(savedWalk.foot);yaw=savedWalk.yaw;pitch=savedWalk.pitch;
  }else{
    savedWalk={foot:foot.clone(),yaw,pitch};flying=true;
    foot.set(30,40,22);yaw=Math.atan2(-30,-40);pitch=-.28;
  }
  camera.position.copy(foot).add(new THREE.Vector3(0,0,1.65));updateMode();
}
const tourStops=[
  {place:'shore',copy:'Ön och slottet. Dra på vyn för att se dig omkring. Nästa stopp tar dig in i salen.'},
  {place:'hall',copy:'Stora salen. Gå fritt runt bordet. Trappan längs västra väggen leder upp till kammaren.'},
  {place:'chamber',copy:'Övre kammaren. Ett lugnare rum med utsikt genom de djupa fönstren.'},
  {place:'roof',copy:'Utsiktsplatsen. Stanna så länge du vill och se ut över vattnet.'},
  {place:'drone',copy:'Se ön från ovan. Styr själv och ändra höjd med pilarna. Tillbaka återvänder till utsiktsplatsen.'}
];
let tourIndex=-1;
function endTour(){tourIndex=-1;$('tour').hidden=true;document.body.classList.remove('touring');}
function showStop(index){
  if(!ready)return;
  tourIndex=index;const stop=tourStops[index];
  if(stop.place==='drone'){setPlace('roof');toggleDrone();}else setPlace(stop.place);
  $('tour').hidden=false;document.body.classList.add('touring');
  $('tour-count').textContent=`STOPP ${index+1} AV ${tourStops.length}`;
  $('tour-copy').textContent=stop.copy;$('tour-prev').disabled=index===0;
  $('tour-next').textContent=index===4?'Utforska fritt':'Nästa stopp →';
}
function startTour(){if(!ready)return;$('overview').close();active=true;$('intro').close();showStop(0);}
$('tour-start').addEventListener('click',startTour);$('intro-tour').addEventListener('click',startTour);
$('tour-prev').addEventListener('click',()=>showStop(Math.max(0,tourIndex-1)));
$('tour-next').addEventListener('click',()=>tourIndex===4?endTour():showStop(tourIndex+1));
$('tour-close').addEventListener('click',endTour);
document.querySelectorAll('[data-place]').forEach(button=>button.addEventListener('click',()=>{if(!ready)return;$('overview').close();active=true;endTour();setPlace(button.dataset.place);}));
$('drone').addEventListener('click',()=>{endTour();toggleDrone();});
function openOverview(){if(!ready)return;active=false;resetInput();document.exitPointerLock?.();$('intro').close();$('overview').showModal();}
$('start').addEventListener('click',openOverview);
$('overview-open').addEventListener('click',openOverview);
$('overview-close').addEventListener('click',()=>$('overview').close());
$('overview').addEventListener('close',()=>{active=ready&&!$('intro').open;resetInput();});
$('overview-fly').addEventListener('click',()=>{$('overview').close();active=true;endTour();setPlace('shore');toggleDrone();});
$('help').addEventListener('click',()=>{active=false;resetInput();document.exitPointerLock?.();$('instructions').showModal();});
$('close-help').addEventListener('click',()=>$('instructions').close());
$('instructions').addEventListener('close',()=>{active=ready&&!$('intro').open;resetInput();});
$('mouse-lock').addEventListener('click',async()=>{
  try{await canvas.requestPointerLock();}catch{notify('Dra på vyn för att titta.');}
});
document.addEventListener('pointerlockchange',()=>{
  $('mouse-lock').textContent=document.pointerLockElement?'Escape frigör musen':'Lås musen';resetInput();
});
const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE'];
addEventListener('keydown',event=>{
  if(!active||!movementKeys.includes(event.code))return;
  event.preventDefault();stopOrbit();keys.add(event.code);
});
addEventListener('keyup',event=>keys.delete(event.code));
addEventListener('blur',resetInput);document.addEventListener('visibilitychange',resetInput);
let lookPointer=null,lookX=0,lookY=0;
canvas.addEventListener('pointerdown',event=>{
  if(!active||lookPointer!==null)return;
  lookPointer=event.pointerId;lookX=event.clientX;lookY=event.clientY;
  canvas.setPointerCapture(event.pointerId);canvas.focus();
});
function look(dx,dy){stopOrbit();const sensitivity=preferences.sensitivity==='low'?.0018:.003;yaw+=dx*sensitivity;pitch=THREE.MathUtils.clamp(pitch-dy*sensitivity,-1.3,1.3);}
canvas.addEventListener('pointermove',event=>{
  if(!active||document.pointerLockElement||event.pointerId!==lookPointer)return;
  look(event.clientX-lookX,event.clientY-lookY);lookX=event.clientX;lookY=event.clientY;
});
document.addEventListener('mousemove',event=>{if(active&&document.pointerLockElement===canvas)look(event.movementX,event.movementY);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{lookPointer=null;});
const joystick=$('joystick');let joystickPointer=null;
function updateJoystick(event){
  stopOrbit();
  const bounds=joystick.getBoundingClientRect(),limit=bounds.width*.34;
  let x=(event.clientX-bounds.left-bounds.width/2)/limit,y=(event.clientY-bounds.top-bounds.height/2)/limit;
  const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
  move.x=x;move.y=-y;$('stick').style.transform=`translate(${x*limit}px,${y*limit}px)`;
}
joystick.addEventListener('pointerdown',event=>{if(!active)return;joystickPointer=event.pointerId;joystick.setPointerCapture(event.pointerId);updateJoystick(event);});
joystick.addEventListener('pointermove',event=>{if(event.pointerId===joystickPointer)updateJoystick(event);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,()=>{joystickPointer=null;move.x=move.y=0;$('stick').style.transform='';});
for(const [id,value] of [['up',1],['down',-1]]){
  $(id).addEventListener('pointerdown',event=>{if(!active)return;stopOrbit();elevation=value;$(id).setPointerCapture(event.pointerId);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])$(id).addEventListener(type,()=>{elevation=0;});
}
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();active=false;resetInput();notify('3D-vyn pausades. Ladda om sidan för att fortsätta.');});

try{
  await loadSurfaces(renderer,scene);
  const model=await new GLTFLoader().loadAsync('assets/castle-quality.glb',event=>{
    $('loading').textContent=event.total?'Laddar slottet · '+Math.round(event.loaded/event.total*100)+' %':'Laddar slottets detaljer…';
  });
  // glTF is Y-up; navigation and the Blender source use Z-up.
  model.scene.rotation.x=Math.PI/2;model.scene.updateMatrixWorld(true);
  const materials=new Set();
  model.scene.traverse(source=>{
    if(!source.isMesh)return;
    const name=source.name.replaceAll('_',' ');
    if(/Distant ridge/i.test(name))return;
    const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);
    geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,source.material);mesh.name=name;
    // Keep the exported UVs and PBR materials. Refined materials used colour
    // images as normal maps in the source; use these as subtle height instead.
    for(const material of [mesh.material].flat()){
      if(materials.has(material))continue;materials.add(material);
      if(/^Refined/.test(material.name)){
        material.normalMap=null;material.bumpMap=material.map;
        material.bumpScale=/stone/i.test(material.name)?.035:.012;
      }
      for(const map of [material.map,material.normalMap,material.roughnessMap])if(map)map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    }
    mesh.castShadow=!/Water/i.test(name);mesh.receiveShadow=true;scene.add(mesh);
    if(/Water/i.test(name))mesh.material=water.material;
    if(/Hall floor|Hall ceiling|Island|step|roof deck|threshold|landing|approach/i.test(name))ground.push(mesh);
    if(!/Water|Distant|Island|Hall floor|Hall ceiling|roof deck|Candle flame/i.test(name))solid.push(mesh);
    if(/Candle flame/i.test(name)){
      const center=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
      const glow=new THREE.PointLight('#ffba72',2,3,2);glow.position.copy(center);scene.add(glow);
    }
  });
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),water.material);
  sea.position.z=-.08;sea.name='Loch water';scene.add(sea);
  scene.updateMatrixWorld(true);ready=true;setPlace('hall');toggleDrone();applyQuality();
  $('loading').textContent='Slottet är redo.';$('start').disabled=false;$('intro-tour').disabled=false;
}catch(error){
  $('loading').textContent='Slottet kunde inte laddas. Ladda om sidan eller öppna förhandsbilderna.';console.error(error);
}
let previous=performance.now(),frames=0,frameTime=0;
function frame(now){
  requestAnimationFrame(frame);
  const elapsed=(now-previous)/1000;
  const dt=Math.min(elapsed,.035);previous=now;
  if(active&&!document.hidden&&!matchMedia('(prefers-reduced-motion:reduce)').matches)water.time.value+=dt;
  if(active&&!document.hidden){
    let forward=move.y+Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
    let sideways=move.x+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const length=Math.hypot(forward,sideways);if(length>1){forward/=length;sideways/=length;}
    const speed=flying?6:preferences.pace==='slow'?1.1:1.65;
    const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*sideways)*speed*dt;
    const dy=(Math.cos(yaw)*forward-Math.sin(yaw)*sideways)*speed*dt;
    if(flying&&orbiting){
      orbitAngle+=dt*.045;foot.set(Math.cos(orbitAngle)*48,Math.sin(orbitAngle)*48,24);
      yaw=Math.atan2(-foot.x,-foot.y);pitch=-.30;
    }else if(flying){
      const candidate=foot.clone().add(new THREE.Vector3(dx,dy,(elevation+Number(keys.has('KeyE'))-Number(keys.has('KeyQ')))*7*dt));
      candidate.z=THREE.MathUtils.clamp(candidate.z,3,65);
      if(Math.hypot(candidate.x,candidate.y)<140&&(candidate.z>23||Math.abs(candidate.x)>9||Math.abs(candidate.y)>11))foot.copy(candidate);
    }else{
      walkAxis('x',dx);walkAxis('y',dy);
      if(Math.abs(foot.x)<3.3&&Math.abs(foot.y)<4.8){
        const room=foot.z>=9.9?'chamber':'hall';
        if(room!==currentPlace){currentPlace=room;updateMode();}
      }
    }
    camera.position.x=foot.x;camera.position.y=foot.y;
    camera.position.z=THREE.MathUtils.lerp(camera.position.z,foot.z+1.65,1-Math.exp(-18*dt));
  }
  direction.set(Math.sin(yaw)*Math.cos(pitch),Math.cos(yaw)*Math.cos(pitch),Math.sin(pitch));
  camera.lookAt(camera.position.clone().add(direction));if(!document.hidden)renderer.render(scene,camera);
  frames++;frameTime+=elapsed;
}
requestAnimationFrame(frame);
window.pilotState=()=>({ready,active,flying,position:foot.toArray(),yaw,pitch,place:currentPlace,tourIndex,preferences:{...preferences},sceneVersion:"blender-quality",orbiting,floor:floorAt(foot.x,foot.y,foot.z),blocked:blocked(foot),meshes:scene.children.filter(o=>o.isMesh).length,triangles:renderer.info.render.triangles,averageFps:frames/Math.max(.1,frameTime)});


