import fs from 'node:fs';
const b=fs.readFileSync(process.argv[2]);if(b.toString('ascii',0,4)!=='glTF'||b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==b.length)throw Error('Invalid GLB header');
const jsonLength=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+jsonLength));
let triangles=0;for(const m of g.meshes||[])for(const p of m.primitives){triangles+=(g.accessors[p.indices??p.attributes.POSITION].count/3);}
const r={bytes:b.length,scenes:g.scenes?.length,nodes:g.nodes?.length,meshes:g.meshes?.length,materials:g.materials?.length,images:g.images?.length,triangles,normalMapped:g.materials?.filter(m=>m.normalTexture).length,externalURIs:(g.images||[]).filter(i=>i.uri).map(i=>i.uri),extensions:g.extensionsUsed,nodeNames:g.nodes?.map(n=>n.name)};
fs.writeFileSync(process.argv[2]+'.audit.json',JSON.stringify(r,null,2));console.log(JSON.stringify({...r,nodeNames:r.nodeNames?.filter(n=>/enemy|Slice|stool/i.test(n||''))}));
