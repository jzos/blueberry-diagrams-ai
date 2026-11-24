import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtempSync, writeFileSync, readFileSync as readBinary, rmSync} from 'node:fs';
import {spawn} from 'node:child_process';
import { SessionStore, catalog, normalizedConfig, makeResult } from './core.js';
import {dispatchMCP,dispatchMCPError} from './mcp.js';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const pub=join(root,'public');
const types={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml; charset=utf-8'};
export const store=new SessionStore();
function body(req){return new Promise((resolve,reject)=>{let data='';req.on('data',b=>{data+=b;if(data.length>750_000){reject(new Error('Request too large'));req.destroy()}});req.on('end',()=>{try{resolve(data?JSON.parse(data):{})}catch(e){reject(new Error('Invalid JSON'))}});req.on('error',reject)})}
function send(res,status,data,ctype='application/json; charset=utf-8',headers={}){res.writeHead(status,{'Content-Type':ctype,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(ctype.includes('json')&&typeof data!=='string'?JSON.stringify(data):data)}
function json(res,code,data){send(res,code,data)}
function allowed(req,token){
 if(!token)return true;
 const bearer=req.headers.authorization?.replace(/^Bearer\s+/i,'');
 return bearer===token;
}
async function webmToMP4(buffer) {
 const tmp=mkdtempSync(join(tmpdir(),'blueberry-mp4-'));
 const input=join(tmp,'source.webm'),output=join(tmp,'diagram.mp4');
 try{
  writeFileSync(input,buffer);
  await new Promise((resolve,reject)=>{
   const proc=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:'ignore'});
   const kill=setTimeout(()=>{proc.kill('SIGKILL');reject(new Error('FFmpeg conversion timed out'))},30000);
   proc.on('error',e=>{clearTimeout(kill);reject(new Error('FFmpeg not installed: '+e.message))});
   proc.on('exit',code=>{clearTimeout(kill);code===0?resolve():reject(new Error('FFmpeg conversion failed'))});
  });
  return readBinary(output);
 }finally{rmSync(tmp,{recursive:true,force:true})}
}
function binaryBody(req,limit=18_000_000){return new Promise((resolve,reject)=>{const chunks=[];let n=0;req.on('data',b=>{n+=b.length;if(n>limit){reject(new Error('Media upload too large'));req.destroy()}else chunks.push(b)});req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject)})}
export function createServer({host='127.0.0.1',port=3847,token=process.env.BLUEBERRY_TOKEN||'',sessions=store,baseURL=process.env.BLUEBERRY_PUBLIC_URL||''}={}){
 if(!['127.0.0.1','::1','localhost'].includes(host)&&!token)throw new Error('Non-localhost binding requires BLUEBERRY_TOKEN. Do not expose unauthenticated sessions.');
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');const pathname=url.pathname;
   if(req.method==='OPTIONS'){res.writeHead(204,{'Allow':'GET, POST, PATCH, OPTIONS','Access-Control-Allow-Origin':'null'});res.end();return}
   if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host){json(res,403,{error:'Cross-origin requests are not permitted'});return}}catch{json(res,403,{error:'Invalid origin'});return}}
   if(pathname==='/health'){json(res,200,{ok:true,app:'blueberry-diagrams-ai',version:'0.1.0'});return}
   if(pathname==='/'||pathname==='/wizard'){send(res,200,readFileSync(join(pub,'index.html')),'text/html; charset=utf-8');return}
   if(pathname==='/app.css'||pathname==='/app.js'||pathname==='/export.js'){
    send(res,200,readFileSync(join(pub,pathname.substring(1))),types[pathname.match(/\.[^.]+$/)[0]]);return;
   }
   if(pathname==='/mcp'){
    if(!allowed(req,token)){json(res,401,{error:'Bearer token required'});return}
    if(req.method!=='POST'){res.writeHead(405,{'Allow':'POST'});res.end();return}
    let msg=await body(req);let result;
    try{result=dispatchMCP(msg,sessions,baseURL||`http://${req.headers.host}`)}catch(e){result=dispatchMCPError(e,msg.id??null)}
    if(!result){res.writeHead(202);res.end();return}
    send(res,200,result,'application/json; charset=utf-8',{'MCP-Protocol-Version':req.headers['mcp-protocol-version']||'2025-06-18'});return;
   }
   if(pathname.startsWith('/api/')){
    if(!allowed(req,token)){json(res,401,{error:'Bearer token required',requires_token:true});return}
    if(pathname==='/api/convert/mp4'&&req.method==='POST'){
     const local=['127.0.0.1','::1','localhost'].includes(host);
     if(!local&&process.env.BLUEBERRY_ENABLE_FFMPEG!=='1'){json(res,403,{error:'Remote media conversion disabled; set BLUEBERRY_ENABLE_FFMPEG=1 in a controlled environment'});return}
     const input=await binaryBody(req);const video=await webmToMP4(input);send(res,200,video,'video/mp4');return;
    }
    if(pathname==='/api/catalog'&&req.method==='GET'){json(res,200,catalog);return}
    if(pathname==='/api/start'&&req.method==='POST'){
     const {prompt}=await body(req);const s=sessions.start(prompt||'');json(res,200,s);return;
    }
    const sMatch=pathname.match(/^\/api\/session\/([a-f0-9-]+)(?:\/(confirm|generate))?$/);
    if(sMatch){
     const id=sMatch[1],action=sMatch[2];const s=sessions.get(id);if(!s){json(res,404,{error:'Unknown session'});return}
     if(!action&&req.method==='GET'){json(res,200,s);return}
     if(!action&&req.method==='PATCH'){json(res,200,sessions.update(id,await body(req)));return}
     if(action==='confirm'&&req.method==='POST'){const {approved}=await body(req);json(res,200,sessions.confirm(id,approved));return}
     if(action==='generate'&&req.method==='POST'){const r=sessions.generate(id);json(res,200,{...r,html:undefined});return}
    }
    const exp=pathname.match(/^\/api\/export\/([a-f0-9-]+)\.(svg|html|json)$/);
    if(exp&&req.method==='GET'){
     const s=sessions.get(exp[1]);if(!s){json(res,404,{error:'Unknown session'});return}
     if(!s.confirmed){json(res,403,{error:'Confirm selections first'});return}
     const g=makeResult(s.config);
     const body=exp[2]==='svg'?g.svg:exp[2]==='html'?g.html:JSON.stringify({config:s.config,prompt:g.prompt},null,2);
     send(res,200,body,exp[2]==='svg'?'image/svg+xml; charset=utf-8':exp[2]==='html'?'text/html; charset=utf-8':'application/json; charset=utf-8',{'Content-Disposition':`attachment; filename="blueberry-diagram.${exp[2]}"`});return;
    }
    json(res,404,{error:'API endpoint not found'});return;
   }
   json(res,404,{error:'Not found'});
  }catch(e){json(res,e.message==='Request too large'?413:400,{error:e.message||'Request failed'})}
 });
}
export async function startServer(options={}){
 const host=options.host||'127.0.0.1',port=options.port??3847;
 const server=createServer(options);
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve)});
 return {server,url:`http://${host}:${server.address().port}`};
}
