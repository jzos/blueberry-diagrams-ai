import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,inferFromPrompt,extractGraph,normalizedConfig,makePrompt,makeResult,SessionStore,chooseEngine} from '../src/core.js';
import {dispatchMCP} from '../src/mcp.js';
import {startServer} from '../src/server.js';

test('catalog retains all domain and graphical style groups',()=>{
 assert.equal(catalog.domains.length,42);
 assert.equal(catalog.styles.length,15);
 assert.equal(catalog.renderers.length,10);
 assert.ok(catalog.domains.reduce((n,d)=>n+d.diagrams.length,0)>=900);
 assert.ok(catalog.domains.find(d=>d.name.includes('Aerospace')).diagrams.includes('Rocket Propulsion Diagram'));
});
test('infers UML sequence and distinct categories from prompt',()=>{
 const c=inferFromPrompt('Create a UML Sequence Diagram of User -> Client -> API');
 assert.equal(c.diagramType,'Sequence Diagram');assert.ok(c.domain.includes('UML'));
});
test('reads explicit graph edges, never fabricates real content',()=>{
 const g=extractGraph({content:'Hubstaff -> Ledgely\nHarvest -> Ledgely\nRize -> Ledgely'});
 assert.deepEqual(g.nodes,['Hubstaff','Ledgely','Harvest','Rize']);
 assert.equal(g.links.length,3);assert.equal(g.illustrative,false);
 assert.equal(extractGraph({content:''}).illustrative,true);
});
test('noninteractive outputs disable click controls and generate portable prompt',()=>{
 const c=normalizedConfig({output:'GIF',interaction:'Play / Pause',domain:'Medical',diagramType:'Anatomy',content:'Heart -> Lungs'});
 assert.equal(c.interaction,'None');const p=makePrompt(c);assert.ok(p.includes('OUTPUT FORMAT: GIF'));assert.ok(p.includes('Heart -> Lungs'));
});
test('renderer creates escaped SVG and standalone HTML with controls',()=>{
 const c=normalizedConfig({title:'<script>x</script>',content:'A -> B'});
 const r=makeResult(c);
 assert.ok(r.svg.includes('&lt;script&gt;'));
 assert.ok(!r.svg.includes('<script>x</script>'));
 assert.ok(r.html.includes('<!doctype html>'));
 assert.ok(r.html.includes('Play'));
});
test('generation requires explicit positive confirmation and revisions reset it',()=>{
 const s=new SessionStore();const a=s.start('Create a diagram');
 assert.throws(()=>s.generate(a.id),/Confirm/);
 s.confirm(a.id,true);assert.ok(s.generate(a.id).prompt);
 s.update(a.id,{output:'SVG'});assert.throws(()=>s.generate(a.id),/Confirm/);
});
test('MCP handshake, listing, confirmation and generation',()=>{
 const s=new SessionStore();
 const call=(id,method,params)=>dispatchMCP({jsonrpc:'2.0',id,method,params},s);
 assert.ok(call(1,'initialize',{}).result.serverInfo.name);
 assert.equal(call(2,'tools/list',{}).result.tools.length,6);
 const st=call(3,'tools/call',{name:'blueberry_start',arguments:{prompt:'Build a diagram'}}).result.structuredContent;
 const id=st.session_id;
 assert.equal(call(4,'tools/call',{name:'blueberry_generate',arguments:{session_id:id}}).result.isError,true);
 call(5,'tools/call',{name:'blueberry_confirm',arguments:{session_id:id,approved:true}});
 assert.ok(call(6,'tools/call',{name:'blueberry_generate',arguments:{session_id:id}}).result.structuredContent.prompt);
});
test('HTTP wizard and MCP work on ephemeral local port',async()=>{
 const {server,url}=await startServer({port:0});
 try{
  const health=await (await fetch(url+'/health')).json();assert.equal(health.ok,true);
  const wizard=await (await fetch(url+'/wizard')).text();assert.ok(wizard.includes('Blueberry Diagrams'));
  const obj=await (await fetch(url+'/api/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:'A -> B'})})).json();
  let get=await (await fetch(url+'/api/session/'+obj.id)).json();assert.equal(get.id,obj.id);
  await fetch(url+'/api/session/'+obj.id+'/confirm',{method:'POST',headers:{'content-type':'application/json'},body:'{"approved":true}'});
  assert.equal((await fetch(url+'/api/export/'+obj.id+'.svg')).status,200);
  const mcp=await (await fetch(url+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{}})})).json();
  assert.equal(mcp.result.tools.length,6);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
