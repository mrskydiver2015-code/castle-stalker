import * as THREE from './vendor/three.module.js';
const loader=new THREE.TextureLoader(),maps={};
export async function loadSurfaces(renderer,scene){
  await Promise.all(['stone','oak','ground','loch'].map(async name=>{
    const t=await loader.loadAsync(`assets/${name}.jpg`);t.colorSpace=THREE.SRGBColorSpace;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());maps[name]=t;
  }));
  maps.loch.mapping=THREE.EquirectangularReflectionMapping;
  const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromEquirectangular(maps.loch);
  scene.environment=env.texture;scene.environmentIntensity=.9;scene.environmentRotation.x=Math.PI/2;pmrem.dispose();
  const skyMap=maps.loch.clone();skyMap.mapping=THREE.UVMapping;
  const sky=new THREE.Mesh(new THREE.SphereGeometry(1800,64,32),new THREE.MeshBasicMaterial({map:skyMap,side:THREE.BackSide,toneMapped:false,fog:false}));
  sky.material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec4 skyColor=texture2D(map,vMapUv);
    float seam=1.0-smoothstep(0.0,.035,min(vMapUv.x,1.0-vMapUv.x));
    skyColor=mix(skyColor,texture2D(map,vec2(1.0-vMapUv.x,vMapUv.y)),seam*.5);
    diffuseColor*=skyColor;`);
  };
  sky.rotation.x=Math.PI/2;scene.add(sky);
}
export function dress(mesh){
  const name=mesh.name;
  if(/Linen|Earthenware|candle|folio/i.test(name))return;
  const isWood=/floor|ceiling|beam|bench|table|desk|Interior step|Upper stair|rail|support|guard/i.test(name)&&!/stone/i.test(name);
  const isGround=/Island/i.test(name);
  const isStone=/wall|gable|chimney|threshold|Entrance|Approach|roof deck|Arrival step|Foundation|Parapet|caphouse|stone seat|Shore stone/i.test(name);
  if(!isWood&&!isStone&&!isGround)return;
  const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=[];
  const scale=isGround?5:isWood?3:3.5;
  for(let i=0;i<p.count;i++){
    const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
    if(nz>=nx&&nz>=ny)uv.push(p.getX(i)/scale,p.getY(i)/scale);
    else if(nx>ny)uv.push(p.getY(i)/scale,p.getZ(i)/scale);
    else uv.push(p.getX(i)/scale,p.getZ(i)/scale);
  }
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const m=mesh.material;m.map=isGround?maps.ground:isWood?maps.oak:maps.stone;
  m.bumpMap=m.map;m.bumpScale=isGround?.07:isWood?.025:.075;
  m.color.set(isWood?'#b2a48e':isGround?'#c7c5b4':'#cac6bc');m.roughness=isWood?.8:.95;
}
export function waterMaterial(){
  const m=new THREE.MeshStandardMaterial({color:'#435d68',roughness:.28,metalness:.25,envMapIntensity:.75,transparent:true,depthWrite:false});
  const time={value:0};m.onBeforeCompile=shader=>{
    shader.uniforms.waveTime=time;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 waterPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nwaterPosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 waterPosition; uniform float waveTime;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec2 p=waterPosition.xy;
      float fade=1.0-smoothstep(15.0,160.0,length(p));
      float a=(sin(p.x*.7+p.y*.5+waveTime*.6)*.03+sin(p.x*1.7-p.y*.9-waveTime*.8)*.012)*fade;
      float b=(cos(p.y*.8-p.x*.3+waveTime*.4)*.03+cos(p.y*1.3+p.x*.7+waveTime*.5)*.012)*fade;
      normal=normalize(normal+mat3(viewMatrix)*vec3(a,b,0.0));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= 1.0-smoothstep(100.0,480.0,length(waterPosition.xy));\n#include <opaque_fragment>');
  };
  return {material:m,time};
}
