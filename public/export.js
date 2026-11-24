// Small dependency-free media exporters. GIF uses a fixed RGB332 palette and
// frequent LZW clear codes (larger than optimized GIFs, but spec-compliant).
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
export function svgBlob(svg){return new Blob([svg],{type:'image/svg+xml;charset=utf-8'})}
function svgFrame(svg,progress){
 const parser=new DOMParser(),doc=parser.parseFromString(svg,'image/svg+xml');
 doc.querySelectorAll('style').forEach(el=>el.remove());
 doc.querySelectorAll('animateMotion,animate,animateTransform').forEach(el=>el.remove());
 doc.querySelectorAll('.flow-path').forEach(el=>{el.setAttribute('stroke-dashoffset',String(-progress*72));el.setAttribute('stroke-dasharray','8 9')});
 doc.querySelectorAll('.item-node').forEach((el,i)=>{el.setAttribute('opacity',String(Math.max(0,Math.min(1,(progress*3-i*.12)/.45))))});
 return new XMLSerializer().serializeToString(doc.documentElement);
}
async function drawSvg(canvas,svg){
 const ctx=canvas.getContext('2d',{willReadFrequently:true});const url=URL.createObjectURL(svgBlob(svg));
 try{await new Promise((resolve,reject)=>{const img=new Image;img.onload=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);resolve()};img.onerror=()=>reject(new Error('Could not rasterize SVG'));img.src=url})}finally{URL.revokeObjectURL(url)}
 return ctx;
}
export async function raster(svg,format='PNG',w=960){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=Math.round(w*540/960);await drawSvg(canvas,svgFrame(svg,1));return new Promise(res=>canvas.toBlob(res,format==='JPEG'?'image/jpeg':'image/png',.94))}
function le16(v){return [v&255,(v>>8)&255]}
function palette332(){const p=[];for(let i=0;i<256;i++)p.push(Math.round(((i>>5)&7)*255/7),Math.round(((i>>2)&7)*255/7),Math.round((i&3)*255/3));return p}
function codesToBytes(indices){
 // Emit clear codes at fixed intervals so the GIF code size never grows past 9 bits.
 const output=[];let acc=0,bits=0;
 const emit=code=>{acc|=code<<bits;bits+=9;while(bits>=8){output.push(acc&255);acc>>>=8;bits-=8}};
 let count=0;emit(256);
 for(const idx of indices){if(count===190){emit(256);count=0}emit(idx);count++}
 emit(257);if(bits)output.push(acc&255);
 const blocks=[];for(let i=0;i<output.length;i+=255){const n=Math.min(255,output.length-i);blocks.push(n,...output.slice(i,i+n))}blocks.push(0);
 return [8,...blocks];
}
function rgb332(pixels){const out=new Uint8Array(pixels.length/4);for(let j=0,i=0;j<out.length;j++,i+=4)out[j]=((pixels[i]>>5)<<5)|((pixels[i+1]>>5)<<2)|(pixels[i+2]>>6);return out}
export async function createGIF(svg,{width=520,frames=26,seconds=3,onProgress=()=>{}}={}){
 const height=Math.round(width*540/960),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const header=[71,73,70,56,57,97,...le16(width),...le16(height),0xf7,0,0,...palette332(),33,255,11,...new TextEncoder().encode('NETSCAPE2.0'),3,1,0,0,0];
 const parts=[new Uint8Array(header)];
 for(let i=0;i<frames;i++){
  await drawSvg(canvas,svgFrame(svg,i/(frames-1)));
  const pixels=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,width,height).data;
  const delay=Math.max(2,Math.round(seconds*100/frames));
  const bytes=[33,249,4,4,...le16(delay),0,0,44,0,0,0,0,...le16(width),...le16(height),0,...codesToBytes(rgb332(pixels))];
  parts.push(new Uint8Array(bytes));onProgress((i+1)/frames);
  if(i%4===0)await new Promise(r=>setTimeout(r,0));
 }
 parts.push(new Uint8Array([59]));return new Blob(parts,{type:'image/gif'});
}
export async function createVideo(svg,{width=720,seconds=3,fps=15,onProgress=()=>{}}={}){
 const supported=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4;codecs=avc1.42E01E','video/mp4'].find(x=>window.MediaRecorder?.isTypeSupported(x));
 if(!supported)throw new Error('This browser does not support video recording. Try Chrome or Safari.');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.round(width*540/960);
 const stream=canvas.captureStream(fps),chunks=[];
 const recorder=new MediaRecorder(stream,{mimeType:supported,videoBitsPerSecond:1_700_000});
 const finished=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onerror=e=>reject(e.error||new Error('Recording failed'));recorder.onstop=()=>resolve(new Blob(chunks,{type:supported.split(';')[0]}))});
 recorder.start();
 try{
  for(let i=0;i<Math.round(seconds*fps);i++){
   await drawSvg(canvas,svgFrame(svg,i/(seconds*fps)));
   onProgress((i+1)/(seconds*fps));
   await new Promise(r=>setTimeout(r,1000/fps));
  }
 }finally{if(recorder.state!=='inactive')recorder.stop();stream.getTracks().forEach(t=>t.stop())}
 return finished;
}
