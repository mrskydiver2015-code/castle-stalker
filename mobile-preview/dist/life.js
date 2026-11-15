import * as THREE from './vendor/three.module.js';

// Small, original realtime additions; the audited Blender scene stays intact.
export function furnishIsland(scene, solid, ground) {
  const oakSource=scene.children.find(o=>o.material?.name==='Refined oak')?.material;
  const oak=oakSource?oakSource.clone():new THREE.MeshStandardMaterial({color:'#68503b'});
  oak.color.set('#a78e6c');
  const iron=new THREE.MeshStandardMaterial({color:'#343530',roughness:.65,metalness:.45});
  const brass=new THREE.MeshStandardMaterial({color:'#aa8452',roughness:.45,metalness:.65});
  const ceramic=new THREE.MeshStandardMaterial({color:'#687b70',roughness:.7});
  const cloth=new THREE.MeshStandardMaterial({color:'#917257',roughness:1});
  let furniture=0;
  function box(name,x,y,z,w,d,h,material=oak,collision=true){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),material);
    mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
    if(collision)solid.push(mesh);furniture++;return mesh;
  }
  function chest(x,y,z){
    box('Oak storage chest',x,y,z+.37,1.25,.58,.64);
    box('Chest lid',x,y,z+.72,1.31,.63,.10);
    for(const dx of [-.43,.43])box('Forged chest band',x+dx,y,z+.78,.055,.64,.018,iron,false);
    box('Chest latch',x,y+.303,z+.57,.08,.025,.2,brass,false);
  }
  chest(2.35,3.85,6.1);chest(.2,-4.12,10.05);
  // A narrow wall console leaves the stair and both window recesses clear.
  box('Chamber console',2.77,2.7,10.85,.6,1.65,.10);
  for(const y of [2.05,3.35])for(const x of [2.56,2.98])box('Console leg',x,y,10.44,.09,.09,.78);
  for(let i=0;i<6;i++){
    const bookMat=new THREE.MeshStandardMaterial({color:['#684839','#4a5c55','#9b8055'][i%3],roughness:1});
    box('Bound book',2.77,2.2+i*.14,11.05,.35,.10,.32+(i%2)*.08,bookMat,false);
  }
  const vase=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.09,0),new THREE.Vector2(.14,.08),new THREE.Vector2(.13,.23),new THREE.Vector2(.065,.3),new THREE.Vector2(.075,.34)],16),ceramic);
  vase.rotation.x=Math.PI/2;vase.position.set(2.77,3.08,10.9);vase.name='Glazed vase';vase.castShadow=true;scene.add(vase);
  // Framed loch studies, generated locally from the existing authored landscape.
  // No external textures or network dependency.
  const sky=scene.children.find(o=>o.material?.map?.image&&o.geometry?.type==='SphereGeometry');
  function painting(x,z,width,height,offset){
    box('Portrait frame',x,-4.63,z,width+.16,.10,height+.16,oak,false);
    box('Gilt frame liner',x,-4.56,z,width+.045,.025,height+.045,brass,false);
    const c=document.createElement('canvas');c.width=512;c.height=384;const ctx=c.getContext('2d');
    const img=sky?.material.map.image;
    if(img)ctx.drawImage(img,img.width*offset,img.height*.22,img.width*.30,img.height*.52,0,0,512,384);
    else{ctx.fillStyle='#87918b';ctx.fillRect(0,0,512,384);}
    ctx.fillStyle='#926b3826';ctx.fillRect(0,0,512,384);
    for(let i=0;i<512;i+=3){ctx.fillStyle=i%2?'#fff00003':'#16191112';ctx.fillRect(i,0,1,384);}
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    const art=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map:tex,roughness:1}));
    art.rotation.x=Math.PI/2;art.rotation.y=Math.PI;art.position.set(x,-4.535,z);art.name='Framed loch study';scene.add(art);
  }
  painting(1.75,8.05,1.35,.96,.12);painting(.4,12.0,1.9,1.28,.42);
  const rugCanvas=document.createElement('canvas');rugCanvas.width=256;rugCanvas.height=512;const r=rugCanvas.getContext('2d');
  r.fillStyle='#675344';r.fillRect(0,0,256,512);r.fillStyle='#b09b76';r.fillRect(10,10,236,492);r.fillStyle='#4e655f';r.fillRect(21,21,214,470);
  for(let y=45;y<490;y+=40)for(let x=45;x<235;x+=40){r.fillStyle='#b09b76';r.beginPath();r.moveTo(x,y-9);r.lineTo(x+9,y);r.lineTo(x,y+9);r.lineTo(x-9,y);r.fill();}
  for(let y=0;y<512;y+=3){r.fillStyle='#1c231b25';r.fillRect(0,y,256,1);}
  const rugMap=new THREE.CanvasTexture(rugCanvas);rugMap.colorSpace=THREE.SRGBColorSpace;
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.7),new THREE.MeshStandardMaterial({map:rugMap,roughness:1}));
  rug.position.set(.1,-.9,10.062);rug.receiveShadow=true;rug.name='Woven chamber rug';scene.add(rug);
  // A small cushion on the hall window seat, away from the walking route.
  box('Linen seat cushion',2.9,-1.8,6.72,.65,.95,.12,cloth,false);

  scene.updateMatrixWorld(true);
  const island=ground.filter(o=>/Island/i.test(o.name));const ray=new THREE.Raycaster();
  function height(x,y){ray.set(new THREE.Vector3(x,y,8),new THREE.Vector3(0,0,-1));return ray.intersectObjects(island,false)[0]?.point.z;}
  let seed=721;function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  const dummy=new THREE.Object3D();
  const blades=new THREE.BufferGeometry();blades.setAttribute('position',new THREE.Float32BufferAttribute([-.13,0,0, .13,0,0, .07,0,.7, 0,-.13,0,0,.13,0,0,.02,.6],3));blades.computeVertexNormals();
  const grass=new THREE.InstancedMesh(blades,new THREE.MeshStandardMaterial({color:'#6b7545',side:THREE.DoubleSide,roughness:1}),350);
  grass.name='Coastal grass';grass.receiveShadow=true;
  const heather=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:'#75665e',roughness:1}),70);heather.name='Heather clumps';heather.receiveShadow=true;
  let g=0,h=0;
  for(let i=0;i<1500&&g<350;i++){
    const x=(random()-.5)*51,y=(random()-.5)*39;
    if(Math.abs(x)<8&&Math.abs(y)<16)continue;
    if(Math.hypot(x-11,y-15)<2.5)continue;
    const z=height(x,y);if(z===undefined||z<.20)continue;
    dummy.position.set(x,y,z-.025);dummy.rotation.set(0,0,random()*Math.PI);const scale=.45+random()*.7;dummy.scale.setScalar(scale);dummy.updateMatrix();grass.setMatrixAt(g++,dummy.matrix);
    if(h<70&&i%4===0){dummy.position.z=z+.17;dummy.scale.set(.35+random()*.35,.28+random()*.3,.22+random()*.18);dummy.updateMatrix();heather.setMatrixAt(h++,dummy.matrix);}
  }
  grass.count=g;heather.count=h;scene.add(grass,heather);
  // Three wind-shaped rowans, not a forest: keep the castle silhouette open.
  const leaves=new THREE.MeshStandardMaterial({color:'#66704b',roughness:1});
  for(const [x,y] of [[16,-6],[-16,4],[-13,-9]]){
    const z=height(x,y);if(z===undefined)continue;
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.07,.13,2.3,7),oak);trunk.rotation.x=Math.PI/2;trunk.position.set(x,y,z+1.15);trunk.castShadow=true;trunk.name='Coastal rowan trunk';scene.add(trunk);solid.push(trunk);
    for(let i=0;i<4;i++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),leaves);crown.scale.set(1.05,.75,.65);crown.position.set(x+(i-1.5)*.42,y+Math.sin(i)*.45,z+2.2+Math.sin(i)*.35);crown.castShadow=true;crown.name='Rowan crown';scene.add(crown);}
  }
  const wingGeometry=new THREE.BufferGeometry();wingGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.08,0,.65,-.12,0,.22,-.20,0],3));wingGeometry.computeVertexNormals();
  const birdMat=new THREE.MeshStandardMaterial({color:'#deded1',side:THREE.DoubleSide,roughness:1});
  const wings=new THREE.InstancedMesh(wingGeometry,birdMat,14);wings.name='Seven coastal gulls';wings.frustumCulled=false;
  const bodies=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),birdMat,7);bodies.frustumCulled=false;scene.add(wings,bodies);
  const pivot=new THREE.Object3D(),wing=new THREE.Object3D();pivot.add(wing);let time=0;
  function update(dt){time+=dt;for(let i=0;i<7;i++){
    const angle=time*.10+i*.82,radius=24+i*1.6;
    pivot.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,18+i*.7+Math.sin(angle*2)*1.2);pivot.rotation.z=angle;
    pivot.scale.set(1,1,1);pivot.updateMatrixWorld(true);
    dummy.position.copy(pivot.position);dummy.rotation.set(0,0,angle);dummy.scale.set(.07,.28,.08);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);
    for(let side=0;side<2;side++){wing.scale.set(side?-1:1,1,1);wing.rotation.y=(side?-1:1)*Math.sin(time*3+i)*.32;wing.updateMatrixWorld(true);wings.setMatrixAt(i*2+side,wing.matrixWorld);}
  }wings.instanceMatrix.needsUpdate=true;bodies.instanceMatrix.needsUpdate=true;}
  update(0);
  return {update,stats:{furniture,paintings:2,grass:g,heather:h,trees:3,birds:7}};
}

