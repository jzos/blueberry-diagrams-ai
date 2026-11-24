import catalog from './catalog.json' with {type: 'json'};
import { randomUUID } from 'node:crypto';
import { renderSVG, renderHTML } from './render.js';

export {catalog};
export const outputs = ['HTML5', 'SVG', 'PNG', 'JPEG', 'GIF', 'WebM', 'MP4', 'PDF'];
const defaultConfig = {
 prompt: '', domain: '', customDomain:'', category:'', customCategory:'', customStyle:'', customStyleFamily:'', customLayout:'', customAnimation:'',
 purpose:'Explain how a system works', purposeDetail:'', diagramType:'', customDiagramType:'',
 styleFamily:'Contemporary UI', style:'Dark SaaS', output:'HTML5', layout:'Linear Horizontal',
 animation:'Dashed-Line Flow', interaction:'Play / Pause', renderer:'Auto', customRenderer:'',
 content:'', notes:'', title:''
};
export function normalizedConfig(config={}) {
 const result={...defaultConfig};
 for (const key of Object.keys(result)) if (typeof config[key]==='string') result[key]=config[key].slice(0,key==='content'||key==='prompt'?8000:1000);
 if (result.animation==='None' || !['HTML5'].includes(result.output)) result.interaction='None';
 return result;
}
const words = s => (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
export function chooseEngine(config) {
 const t=words(config.diagramType+' '+config.category+' '+config.domain);
 if (/line chart|bar chart|histogram|plot|statistics|area chart|trend|curve|scatter|spectrum|data visualization/.test(t)) return 'Chart Engine';
 if (/network|dependency|graph|knowledge|relationship|topology|social/.test(t)) return 'Graph/Network Engine';
 if (/circuit|electrical|piping|schematic|ladder|wiring/.test(t)) return 'Schematic Engine';
 if (/geograph|map|gis|terrain|ground track|route/.test(t)) return 'Geographic Engine';
 if (/isometric|assembly|exploded|building information/.test(t)) return 'Isometric Engine';
 if (/3d|molecular|solid|orbit|aerospace|astronom|atomic/.test(t)) return '3D Visualization Engine';
 if (/simulation|physics|motion|fluid|robotics|dynamic/.test(t)) return 'Simulation Engine';
 if (/whiteboard|chalk|sketch|hand.drawn/.test(words(config.style))) return 'Whiteboard Animation Engine';
 if (/anatom|illustrat|physiolog|biology/.test(t)) return '2D Illustration Engine';
 return 'SVG Flow Engine';
}
export function resolveEngine(config) { return config.renderer==='Other'?(config.customRenderer||chooseEngine(config)):config.renderer && config.renderer!=='Auto' ? config.renderer : chooseEngine(config); }

export function inferFromPrompt(prompt) {
 const raw=String(prompt||'').slice(0,8000); const p=words(raw);
 const partial={prompt:raw,title:raw.length>70?raw.slice(0,67)+'…':raw};
 const domainCandidates=catalog.domains.map(d=>({domain:d,score:0}));
 const aliases={
  1:['flowchart','diagram','workflow'],2:['uml','class diagram','sequence diagram','use case'],
  3:['saas','software','api','microservice','integration','devops','oauth'],
  5:['ai','machine learning','transformer','llm','neural network','rag'],
  10:['aerospace','spacecraft','aircraft','rocket','satellite','flight'],
  12:['electrical','pcb','circuit','voltage','electronics'],
  13:['civil','structural','construction','building','architecture'],
  19:['medical','medicine','healthcare','cardiac','anatomy'],
  23:['chemistry','molecule','chemical','isotope'],
  27:['astronomy','solar system','planet','star','orbital'],
  34:['statistics','chart','graphs','analytics']};
 for (let i=0;i<domainCandidates.length;i++) {
  const d=domainCandidates[i].domain; const match=words(d.name);
  if (p.includes(match)) domainCandidates[i].score+=20;
  for (const phrase of aliases[i+1]||[]) if (p.includes(phrase)) domainCandidates[i].score += phrase.length>8?5:2;
 }
 domainCandidates.sort((a,b)=>b.score-a.score);
 if (domainCandidates[0]?.score>0) partial.domain=domainCandidates[0].domain.name;
 let best={score:0};
 for (const d of catalog.domains) for (const t of d.diagrams) {
  const key=words(t); let score=0;
  if (key && p.includes(key)) score=key.length+20;
  else if (key.length>8 && p.includes(key.replace(/ diagram$/,''))) score=key.length+4;
  if (score>best.score) best={score,type:t,domain:d};
 }
 if (best.score>0) {
  partial.diagramType=best.type; partial.domain=best.domain.name;
  partial.category=best.domain.groups.find(g=>g.diagrams.includes(best.type))?.name||'';
 }
 if (/hub.and.spoke|multiple .* into|sync .* to/.test(p)) partial.layout='Hub-and-Spoke';
 if (/sequence/.test(p)) partial.layout='Swimlane';
 if (/blueprint/.test(p)) {partial.styleFamily='Technical drafting';partial.style='Blueprint'}
 if (/sketch|hand drawn/.test(p)) {partial.styleFamily='Hand-drawn';partial.style='Pencil Sketch'}
 if (/animated|animation|moving|flowing/.test(p)) partial.animation='Dashed-Line Flow';
 if (/static|without animation/.test(p)) partial.animation='None';
 if (/\.gif\b| gif\b/.test(raw.toLowerCase())) partial.output='GIF';
 if (/video|mp4/.test(p)) partial.output='MP4';
 if (/svg/.test(p)) partial.output='SVG';
 return normalizedConfig(partial);
}

export function extractGraph(config) {
 const input=String(config.content||'').trim();
 const outNodes=[]; const outLinks=[];
 const add=n=>{const label=String(n||'').trim().replace(/^[\s\-.,;]+|[\s\-.,;]+$/g,'').slice(0,52);if(label&&!outNodes.includes(label))outNodes.push(label);return label};
 if (input) for (const line of input.split(/[\n;]/).map(x=>x.trim()).filter(Boolean)) {
  const seq=line.split(/\s*(?:->|→|=>)\s*/).map(add).filter(Boolean);
  if (seq.length>1) for(let i=0;i<seq.length-1;i++)outLinks.push([seq[i],seq[i+1]]);
  if(seq.length===1 && !line.includes('->') && line.includes(',')) for (const n of line.split(',')) add(n);
 }
 if(!outNodes.length){
  const from=String(config.prompt||'').match(/from\s+([^\n.]{3,140}?)\s+(?:to|into)\s+([^\n.,;]{2,65})/i);
  if(from){
   const src=from[1].replace(/\b(and|the|services?|applications?)\b/gi,',').split(/[,/]+/).map(add).filter(Boolean);
   const dst=add(from[2].replace(/\s+(with|using|where|that)\b.*/i,''));
   for(const n of src)if(n!==dst)outLinks.push([n,dst]);
  }
 }
 let illustrative=false;
 if(!outNodes.length){
  illustrative=true;
  for (const n of ['Source', 'Process', 'Destination']) add(n);
 }
 if(!outLinks.length) for(let i=0;i<outNodes.length-1;i++)outLinks.push([outNodes[i],outNodes[i+1]]);
 return { nodes:outNodes.slice(0,18), links:outLinks.slice(0,35), illustrative };
}

export function checkConfig(config){
 const c=normalizedConfig(config), issues=[];
 if(!c.domain && !c.customDomain) issues.push('Choose a domain or specify Other.');
 if(!c.diagramType && !c.customDiagramType) issues.push('Choose a diagram type or specify Other.');
 if(!c.purposeDetail && !c.content) issues.push('Add the purpose or diagram content to avoid an illustrative placeholder.');
 if(['GIF','WebM','MP4'].includes(c.output)&&c.animation==='None') issues.push('Selected media format will be static unless animation is enabled.');
 if(c.output!=='HTML5'&&c.interaction!=='None') issues.push('Interactive controls require HTML5 output.');
 return issues;
}
export function makePrompt(input){
 const c=normalizedConfig(input), g=extractGraph(c), engine=resolveEngine(c), type=c.customDiagramType||c.diagramType||'Diagram',domain=c.customDomain||c.domain||'General';
 return `You are a senior information designer and visualization engineer. Create an accurate, production-quality ${type} using the following verified user selections.\n\n`+
 `DOMAIN: ${domain}\nCATEGORY FAMILY: ${c.customCategory||c.category||'Not specified'}\nPURPOSE: ${c.purposeDetail||c.purpose}\nDIAGRAM TYPE: ${type}\nVISUAL FAMILY: ${c.customStyleFamily||c.styleFamily}\nGRAPHIC STYLE: ${c.customStyle||c.style}\nOUTPUT FORMAT: ${c.output}\nLAYOUT: ${c.customLayout||c.layout}\nANIMATION: ${c.customAnimation||c.animation}\nINTERACTION: ${c.interaction}\nRENDERING ENGINE: ${engine}\n`+
 `TITLE: ${c.title||type}\nCONTENT / RELATIONSHIPS:\n${c.content||'(Not fully specified; clarify real nodes, links, labels, or data before claiming accuracy.)'}\nORIGINAL REQUEST: ${c.prompt||'(none)'}\nADDITIONAL NOTES: ${c.notes||'(none)'}\n\n`+
 `REQUIREMENTS:\n1. Preserve the user's domain terminology and the relationships/data that are explicitly supplied. Do not fabricate scientific/clinical/engineering facts.\n2. Use a clear visual hierarchy, responsive sizing, legible labels, and accessible contrast.\n3. Follow the selected visual style and layout.\n4. ${c.animation==='None'?'Keep the diagram static.':`Animate using ${c.animation}, smoothly and without distracting motion. Add reduced-motion support.`}\n5. ${c.interaction==='None'?'No interactive controls are needed.':`Implement ${c.interaction} controls.`}\n6. Export exactly as ${c.output}; provide an actual playable/visible preview and the editable source where possible.\n7. Validate arrows, relationships, units, scales, and nomenclature; identify any illustrative placeholders.\n8. If the requested output is unsupported by the environment, explain this and produce the closest valid preview, without pretending a file was rendered.\n9. Use the best supported rendering technology; preferred engine: ${engine}.`;
}
export class SessionStore {
 constructor(){this.sessions=new Map();}
 start(prompt=''){
  const id=randomUUID(); const config=inferFromPrompt(prompt);
  const session={id,config,confirmed:false,createdAt:Date.now(),updatedAt:Date.now()};
  this.sessions.set(id,session);this.cleanup();return session;
 }
 get(id){return this.sessions.get(id)||null;}
 update(id,patch){let s=this.get(id);if(!s)throw new Error('Unknown session');s.config=normalizedConfig({...s.config,...patch});s.confirmed=false;s.updatedAt=Date.now();return s;}
 confirm(id,approved){let s=this.get(id);if(!s)throw new Error('Unknown session');s.confirmed=approved===true;s.updatedAt=Date.now();return s;}
 generate(id){let s=this.get(id);if(!s)throw new Error('Unknown session');if(!s.confirmed)throw new Error('Confirm the configuration before generating.');return makeResult(s.config);}
 cleanup(){if(this.sessions.size<500)return;const age=Date.now()-24*60*60*1000;for(const [id,s] of this.sessions){if(s.updatedAt<age)this.sessions.delete(id)}}
}
export function makeResult(config){const c=normalizedConfig(config),graph=extractGraph(c);return {config:c,graph,prompt:makePrompt(c),svg:renderSVG(c,graph),html:renderHTML(c,graph),engine:resolveEngine(c),issues:checkConfig(c)};}
