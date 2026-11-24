import { catalog, makeResult, makePrompt, inferFromPrompt, normalizedConfig, resolveEngine, checkConfig } from './core.js';

const fields={
 prompt:{type:'string',description:'The user request, e.g. create a diagram of A -> B -> C.'},
 session_id:{type:'string',description:'UUID returned by blueberry_start.'},
 patch:{type:'object',description:'Chosen wizard selections: domain, category, purposeDetail, diagramType, styleFamily, style, output, layout, animation, interaction, renderer, content, notes and custom fields.',additionalProperties:true},
 approved:{type:'boolean',description:'True only if the user explicitly answered Yes to the reviewed configuration.'},
 domain:{type:'string',description:'Optional exact domain filter.'},
 query:{type:'string',description:'Optional diagram text search.'}
};
const toolDefs=[
 {name:'blueberry_start',description:'Use when someone requests creation of a diagram, flowchart, UML, chart, animated architecture, technical illustration, or a visual explanation. Infer what you can, then guide the user through the Blueberry configuration wizard. Do NOT render until they confirm Yes.',inputSchema:{type:'object',properties:{prompt:fields.prompt},required:['prompt']}},
 {name:'blueberry_catalog',description:'List available diagram domains, categories, specific types, visual styles, layout, outputs, animation, interactions and engines for the guided wizard. Supports filtering.',inputSchema:{type:'object',properties:{domain:fields.domain,query:fields.query}}},
 {name:'blueberry_update',description:'Save user selections for a Blueberry wizard session; changing selections invalidates previous confirmation.',inputSchema:{type:'object',properties:{session_id:fields.session_id,patch:fields.patch},required:['session_id','patch']}},
 {name:'blueberry_review',description:'Show the final classification, purpose, output, content, and any missing facts. Ask the user explicitly to approve Yes or No BEFORE generation.',inputSchema:{type:'object',properties:{session_id:fields.session_id},required:['session_id']}},
 {name:'blueberry_confirm',description:'Record the explicit Yes/No answer. Never set approved=true unless the user actually confirmed the reviewed selections.',inputSchema:{type:'object',properties:{session_id:fields.session_id,approved:fields.approved},required:['session_id','approved']}},
 {name:'blueberry_generate',description:'After explicit approval, generate a copyable cross-platform prompt plus an SVG preview and links to the web wizard, including output download tools.',inputSchema:{type:'object',properties:{session_id:fields.session_id},required:['session_id']}}
];
const response=obj=>({content:[{type:'text',text:JSON.stringify(obj,null,2)}],structuredContent:obj});
export function mcpTools(){return toolDefs;}
export function invokeTool(name,args,store,baseURL='http://127.0.0.1:3847') {
 const a=args||{};
 if(name==='blueberry_start'){
  const s=store.start(a.prompt||'');return response({session_id:s.id,proposed:s.config,wizard_url:`${baseURL}/wizard?session=${encodeURIComponent(s.id)}`,instruction:'Ask the user to answer each wizard question. Prefer in-chat selection controls when host supports them; otherwise open the wizard URL. Do not generate until explicit Yes confirmation.'});
 }
 if(name==='blueberry_catalog') {
  let domains=catalog.domains;
  if(a.domain)domains=domains.filter(d=>d.name.toLowerCase().includes(String(a.domain).toLowerCase()));
  const q=String(a.query||'').toLowerCase();
  const d=domains.map(v=>({name:v.name,groups:v.groups.map(g=>({...g,diagrams:g.diagrams.filter(x=>!q||x.toLowerCase().includes(q))})).filter(g=>g.diagrams.length)}));
  return response({domains:d.map(({name,groups})=>({name,groups})),styles:catalog.styles,layouts:catalog.layouts,animations:catalog.animations,interactions:catalog.interactions,outputs:['HTML5','SVG','PNG','JPEG','GIF','WebM','MP4','PDF'],renderers:catalog.renderers});
 }
 const s=store.get(a.session_id);
 if(!s)throw new Error('Unknown wizard session. Call blueberry_start first.');
 if(name==='blueberry_update'){
  const patch=a.patch;if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('patch must be an object');
  const result=store.update(s.id,patch);return response({session_id:s.id,config:result.config,needs_confirmation:true});
 }
 if(name==='blueberry_review')return response({session_id:s.id,review:s.config,engine:resolveEngine(s.config),validation_notes:checkConfig(s.config),instruction:'Ask the user: Are these selections correct? Yes / No. If No, call blueberry_update; if Yes, call blueberry_confirm with approved:true.'});
 if(name==='blueberry_confirm')return response({session_id:s.id,approved:store.confirm(s.id,a.approved).confirmed,instruction:a.approved?'Now call blueberry_generate.':'Return to blueberry_update to change answers.'});
 if(name==='blueberry_generate'){
  const generated=store.generate(s.id);
  return response({session_id:s.id,engine:generated.engine,output:generated.config.output,prompt:generated.prompt,preview_url:`${baseURL}/wizard?session=${encodeURIComponent(s.id)}&view=result`,svg_preview_url:`${baseURL}/api/export/${s.id}.svg`,html_preview_url:`${baseURL}/api/export/${s.id}.html`,illustrative_content:generated.graph.illustrative,validation_notes:generated.issues,instruction:'Show the copyable prompt and output preview link. Users can edit, regenerate, or change output format without restarting.'});
 }
 throw new Error('Unknown MCP tool: '+name);
}
export function dispatchMCP(msg,store,baseURL){
 if(msg.jsonrpc!=='2.0')throw Object.assign(new Error('JSON-RPC 2.0 required'),{code:-32600});
 if(msg.method==='notifications/initialized'||msg.method==='notifications/cancelled')return null;
 let result;
 switch(msg.method){
 case 'initialize':result={protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'blueberry-diagrams',version:'0.1.0'}};break;
 case 'ping':result={};break;
 case 'tools/list':result={tools:mcpTools()};break;
 case 'tools/call':
  try{result=invokeTool(msg.params?.name,msg.params?.arguments,store,baseURL)}
  catch(e){result={isError:true,content:[{type:'text',text:e.message}]}}break;
 default:throw Object.assign(new Error('Method not found'),{code:-32601});
 }
 if(!('id'in msg))return null;
 return {jsonrpc:'2.0',id:msg.id,result};
}
export function dispatchMCPError(e,id=null){return {jsonrpc:'2.0',id,error:{code:e.code??-32603,message:e.message||'Internal error'}}}
