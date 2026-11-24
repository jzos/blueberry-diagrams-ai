import {download,raster,createGIF,createVideo,svgBlob} from '/export.js';
const $=s=>document.querySelector(s), escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const steps=[
 ['domain','Domain type','Choose the field or industry your diagram belongs to.'],
 ['category','Category family','Narrow your search by the diagram family within that domain.'],
 ['purpose','Purpose & content','Describe what the diagram needs to explain and provide its real content.'],
 ['diagramType','Specific diagram type','Pick the exact professional diagram type from the catalog.'],
 ['style','Illustration & graphic style','Choose a style family and a visual treatment.'],
 ['output','Output format','How should your diagram be delivered and previewed?'],
 ['layout','Layout & composition','Choose how components will be organized visually.'],
 ['animation','Animation style','Define how elements move or choose None.'],
 ['interaction','Interaction type','Choose the actions viewers can perform.'],
 ['renderer','Rendering engine','Advanced: let Blueberry select the engine or override it.']
];
let catalog,session,config,stepIndex=0,screen='wizard',generated=null,mediaUrl=null,authToken=(()=>{try{return sessionStorage.getItem('blueberry-token')||''}catch{return ''}})(),busy=false;
const headers=()=>({'Content-Type':'application/json',...(authToken?{'Authorization':`Bearer ${authToken}`}:{})});
async function api(url,{method='GET',data}={}){
 let res=await fetch(url,{method,headers:headers(),body:data?JSON.stringify(data):undefined});
 if(res.status===401){const newToken=window.prompt('This server requires BLUEBERRY_TOKEN. Enter your access token:');if(newToken){authToken=newToken;sessionStorage.setItem('blueberry-token',newToken);res=await fetch(url,{method,headers:headers(),body:data?JSON.stringify(data):undefined})}}
 const result=await res.json();if(!res.ok)throw new Error(result.error||'Request failed');return result;
}
function showError(msg){const el=$('#error');el.hidden=false;el.textContent=msg;setTimeout(()=>el.hidden=true,10000)}
function domain(){return catalog.domains.find(d=>d.name===config.domain)}
function activeSteps(){return steps.filter(s=>s[0]!=='renderer'||config.animation!=='None')}
function indexOfStep(){return activeSteps().findIndex(s=>s[0]===steps[stepIndex][0])}
const getCustom=(k)=>({domain:'customDomain',category:'customCategory',diagramType:'customDiagramType',style:'customStyle',styleFamily:'customStyleFamily',layout:'customLayout',animation:'customAnimation',renderer:'customRenderer'}[k]);
function option(name,value,selected){return `<button type="button" class="choice ${value===selected?'selected':''}" data-field="${escapeHTML(name)}" data-value="${escapeHTML(value)}"><span class="choice-dot"></span><span>${escapeHTML(value)}</span></button>`}
function options(field,values,selected,{search=false,other=false}={}){
 const items=[...values];if(other&&!items.includes('Other'))items.push('Other');
 return `<div class="field-group">${search?`<input class="search-input" data-search="${escapeHTML(field)}" placeholder="Search ${field==='domain'?'domains':'diagram types'}..." aria-label="Search ${escapeHTML(field)}"/>`:''}<div class="choice-grid" data-grid="${field}">${items.map(v=>option(field,v,selected)).join('')}</div>${other?`<div class="field-group" id="custom-box-${field}" ${selected==='Other'?'':'hidden'}><label class="field-label" for="custom-${field}">Custom ${escapeHTML(field)}</label><input class="text-input" id="custom-${field}" data-custom="${field}" value="${escapeHTML(config[getCustom(field)]||'')}" placeholder="Enter your own ${field}..."/></div>`:''}</div>`;
}
function field(label,name,value,{large=false,placeholder='',note=''}={}){return `<div class="field-group"><label class="field-label" for="field-${name}">${escapeHTML(label)}</label>${large?`<textarea class="text-area" id="field-${name}" data-text="${name}" placeholder="${escapeHTML(placeholder)}">${escapeHTML(value||'')}</textarea>`:`<input class="text-input" id="field-${name}" data-text="${name}" value="${escapeHTML(value||'')}" placeholder="${escapeHTML(placeholder)}"/>`}${note?`<p class="field-note">${escapeHTML(note)}</p>`:''}</div>`}
function stageBody(key){
 const d=domain();
 if(key==='domain')return options('domain',catalog.domains.map(x=>x.name),config.domain,{search:true,other:true});
 if(key==='category')return options('category',d?d.groups.map(g=>g.name):['Flows & processes','Structures & architecture','Charts & analytics','Networks & relationships','Simulation & modeling','Illustrations & explainers'],config.category,{other:true})+`<p class="field-note">This is a filtering category. You will select the exact diagram type separately.</p>`;
 if(key==='purpose')return options('purpose',catalog.purposes,config.purpose)+field('Purpose in your own words','purposeDetail',config.purposeDetail,{large:true,placeholder:'What should someone understand after viewing this diagram?'})+field('Diagram nodes, connections, labels or data','content',config.content,{large:true,placeholder:'Hubstaff -> Ledgely\nHarvest -> Ledgely\nRize -> Ledgely',note:'For flows, enter one connection per line using A -> B. For charts, use Month: value. If blank, the preview will be labeled illustrative.'});
 if(key==='diagramType'){
   const group=d?.groups.find(g=>g.name===config.category);
   return options('diagramType',group?.diagrams||d?.diagrams||[],config.diagramType,{search:true,other:true});
 }
 if(key==='style'){
  const fam=catalog.styles.find(x=>x.family===config.styleFamily);
  return `<div class="field-label">STYLE FAMILY</div>`+options('styleFamily',catalog.styles.map(x=>x.family),config.styleFamily,{other:true})+`<div class="field-label" style="margin-top:24px">GRAPHIC TREATMENT</div>`+options('style',fam?.styles||['Custom graphic style'],config.style,{other:true});
 }
 if(key==='output')return options('output',['HTML5','SVG','PNG','JPEG','GIF','WebM','MP4','PDF'],config.output)+`<p class="field-note">HTML5 supports interaction. GIF and video show motion but cannot contain clickable controls. MP4 conversion may require FFmpeg or browser support.</p>`;
 if(key==='layout')return options('layout',catalog.layouts,config.layout,{other:true});
 if(key==='animation')return options('animation',catalog.animations,config.animation,{other:true});
 if(key==='interaction')return (config.output!=='HTML5'?`<p class="warning">Only HTML5 has working interactive controls. Your selected output ${escapeHTML(config.output)} will be non-interactive.</p>`:'')+options('interaction',config.output==='HTML5'?catalog.interactions:['None'],config.interaction);
 if(key==='renderer')return options('renderer',['Auto',...catalog.renderers.map(x=>x.name)],config.renderer,{other:true})+`<p class="field-note">Auto chooses a suitable engine. This first release includes native SVG renderers, plus chart, sequence, graph, and isometric previews. Specialized engines are extensibility targets, not full CAD/clinical simulators.</p>`;
 return '';
}
function drawNav(){const nav=$('#step-nav');nav.innerHTML=activeSteps().map((s,i)=>{const actual=steps.findIndex(x=>x[0]===s[0]);return `<button type="button" class="step-link ${actual===stepIndex?'current':''} ${actual<stepIndex?'done':''}" data-nav="${actual}"><span class="step-num">${actual<stepIndex?'✓':String(i+1).padStart(2,'0')}</span><span class="step-name">${escapeHTML(s[1])}</span></button>`}).join('');}
function render(){
 drawNav();$('#prompt-entry').hidden=screen==='result';$('#crumb').textContent=screen==='result'?'RESULT':screen==='review'?'REVIEW':'CONFIGURE';
 const footer=$('#step-footer'),idx=indexOfStep();
 if(screen==='wizard'){
  const s=steps[stepIndex],total=activeSteps().length;
  $('#step-kicker').textContent=`STEP ${String(idx+1).padStart(2,'0')} / ${total}`;
  $('#step-title').textContent=s[1];$('#step-description').textContent=s[2];$('#step-progress').textContent=`${idx+1}/${total}`;
  $('#step-body').innerHTML=stageBody(s[0]);
  footer.innerHTML=`<button class="outline-button" id="back" ${idx===0?'disabled':''}>← Previous</button><div id="footer-tip">Selection remains editable</div><button id="next" class="primary-button">${idx===total-1?'Review selections':'Continue'} →</button>`;
 }else if(screen==='review'){
  $('#step-kicker').textContent='FINAL CHECK';$('#step-title').textContent='Review your diagram';$('#step-description').textContent='Confirm your choices before generating the portable prompt and preview.';$('#step-progress').textContent='✓';
  const fields=[['Domain',config.customDomain||config.domain],['Category family',config.customCategory||config.category],['Purpose',config.purposeDetail||config.purpose],['Diagram type',config.customDiagramType||config.diagramType],['Graphic style',`${config.styleFamily} / ${config.customStyle||config.style}`],['Output',config.output],['Layout',config.customLayout||config.layout],['Animation',config.customAnimation||config.animation],['Interaction',config.interaction],['Rendering',config.renderer],['Diagram content',config.content||'Not supplied: an illustrative placeholder will be used']];
  $('#step-body').innerHTML=`<div class="summary-grid">${fields.map(([k,v])=>`<div class="summary-row"><span>${escapeHTML(k)}</span><b>${escapeHTML(v||'Not specified')}</b></div>`).join('')}</div>`+(config.content?'':`<div class="warning">There are no supplied nodes or values. Blueberry will create a clearly labeled illustrative placeholder, not a verified scientific or technical diagram.</div>`);
  footer.innerHTML='<button id="edit" class="outline-button">No, edit selections</button><div id="footer-tip">Generation begins only after confirmation.</div><button id="confirm" class="primary-button">Yes, generate →</button>';
 }else{
  $('#step-kicker').textContent='RENDER COMPLETE';$('#step-title').textContent='Your diagram is ready';$('#step-description').textContent='Copy the portable prompt or preview and export your visual.';$('#step-progress').textContent='✓';
  $('#step-body').innerHTML=`<div class="results"><div class="result-box"><h3>Generated diagram preview</h3><div class="view-pills"><span class="pill">${escapeHTML(config.output)}</span><span class="pill">${escapeHTML(generated.engine)}</span><span class="pill">${escapeHTML(config.animation)}</span></div><div class="result-preview" id="preview-area">${generated.svg}</div><div class="toolbar"><button id="export-primary">Download ${escapeHTML(config.output)}</button><button id="edit-result">Edit diagram</button><button id="change-output">Change output</button><button id="regenerate">Regenerate</button></div><p class="field-note" id="media-status">${escapeHTML(generated.graph?.illustrative?'Illustrative diagram: add actual content for accuracy.':'Rendered from your diagram content.')}</p></div><div class="result-box"><h3>Reusable AI prompt</h3><textarea class="prompt-output" id="copy-prompt" readonly>${escapeHTML(generated.prompt)}</textarea><div class="toolbar"><button id="copy">Copy prompt</button><button id="download-prompt">Download prompt</button><button id="download-source">Download HTML source</button><button id="download-config">Download config JSON</button></div></div></div>`;
  footer.innerHTML='<button class="outline-button" id="restart">Start a new diagram</button><div id="footer-tip">Everything remains editable.</div><button class="primary-button" id="edit-result-footer">Edit selections →</button>';
 }
 $('#original-prompt').value=config?.prompt||'';
}
function change(field,value){
 config[field]=value;
 if(field==='domain'){config.category='';config.diagramType='';config.customDomain=''}
 if(field==='category'){config.diagramType='';config.customCategory=''}
 if(field==='styleFamily'){config.style=catalog.styles.find(x=>x.family===value)?.styles[0]||'Other'}
 if(field==='animation'&&value==='None')config.interaction=config.output==='HTML5'?config.interaction:'None';
 if(field==='output'&&value!=='HTML5')config.interaction='None';
 render();
}
function capture(){document.querySelectorAll('[data-text]').forEach(el=>config[el.dataset.text]=el.value);document.querySelectorAll('[data-custom]').forEach(el=>config[getCustom(el.dataset.custom)]=el.value)}
async function save(){capture();session=await api('/api/session/'+session.id,{method:'PATCH',data:config});}
function findActual(idx){return steps.findIndex(x=>x[0]===activeSteps()[idx]?.[0]);}
async function goForward(){
 capture();
 const step=steps[stepIndex][0];
 if(step==='domain'&&(!(config.customDomain||config.domain)||config.domain==='Other'&&!config.customDomain.trim()))throw new Error('Select a diagram domain or enter a custom domain.');
 if(step==='category'&&(!(config.customCategory||config.category)||config.category==='Other'&&!config.customCategory.trim()))throw new Error('Select a category family or enter a custom category.');
 if(step==='diagramType'&&(!(config.customDiagramType||config.diagramType)||config.diagramType==='Other'&&!config.customDiagramType.trim()))throw new Error('Select a specific diagram type or enter your own.');
 if(step==='style'&&config.styleFamily==='Other'&&!config.customStyleFamily.trim())throw new Error('Enter your custom visual style family.');
 await save();const current=indexOfStep();if(current>=activeSteps().length-1)screen='review';else stepIndex=findActual(current+1);render();}
async function goBack(){await save();stepIndex=findActual(Math.max(0,indexOfStep()-1));render();}
function bytesToBlobURL(blob){if(mediaUrl)URL.revokeObjectURL(mediaUrl);mediaUrl=URL.createObjectURL(blob);return mediaUrl}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function materialize(format,autopreview=false){
 const svg=generated.svg,name='blueberry-diagram';let blob;
 $('#media-status').textContent=`Rendering ${format}…`;
 if(format==='SVG')blob=svgBlob(svg);
 else if(format==='HTML5'){blob=new Blob([generated.html||await (await fetch(`/api/export/${session.id}.html`,{headers:headers()})).text()],{type:'text/html;charset=utf-8'})}
 else if(format==='PNG'||format==='JPEG')blob=await raster(svg,format);
 else if(format==='GIF')blob=await createGIF(svg,{onProgress:p=>$('#media-status').textContent=`Encoding GIF ${Math.round(100*p)}%…`});
 else if(format==='WebM'||format==='MP4'){
   blob=await createVideo(svg,{onProgress:p=>$('#media-status').textContent=`Recording animation ${Math.round(p*100)}%…`});
   if(format==='MP4'&&blob.type!=='video/mp4'){
    const converted=await fetch('/api/convert/mp4',{method:'POST',headers:{...(authToken?{'Authorization':`Bearer ${authToken}`}:{})},body:blob});
    if(!converted.ok){let why;try{why=(await converted.json()).error}catch{}throw new Error(why||'MP4 conversion unavailable. Try WebM output or install FFmpeg on the local server.')}
    blob=await converted.blob();
   }
 }else if(format==='PDF'){const frame=window.open('','_blank');if(!frame)throw new Error('Allow popups to print the PDF.');frame.document.write(`<html><head><style>body{margin:0;display:grid;place-items:center;min-height:100vh}svg{width:100%;max-height:95vh}@page{size:landscape;margin:0}</style></head><body>${svg}</body></html>`);frame.document.close();frame.focus();frame.print();$('#media-status').textContent='Use Save as PDF in your browser print dialog.';return}
 if(['PNG','JPEG','GIF','WebM','MP4'].includes(format)){
  const url=bytesToBlobURL(blob);const area=$('#preview-area');area.innerHTML= format==='WebM'||format==='MP4'?`<video src="${url}" autoplay muted loop controls playsinline style="width:100%;border-radius:12px"></video>`:`<img alt="Rendered ${format} preview" src="${url}" style="display:block;width:100%;border-radius:12px"/>`;
 }
 $('#media-status').textContent=`${format} generated · ${Math.round(blob.size/1024)} KB`;
 if(!autopreview)download(blob,`${name}.${format==='HTML5'?'html':format==='JPEG'?'jpg':format.toLowerCase()}`);
 return blob;
}
async function generate(){
 session=await api('/api/session/'+session.id+'/confirm',{method:'POST',data:{approved:true}});
 generated=await api('/api/session/'+session.id+'/generate',{method:'POST'});
 screen='result';render();
 if(['GIF','PNG','JPEG','WebM','MP4'].includes(config.output)){
  try{await materialize(config.output,true)}catch(e){$('#media-status').textContent='Preview limitation: '+e.message}
 }
}
async function eventHandler(ev){
 const btn=ev.target.closest('button');
 if(!btn)return;
 if(btn.dataset.field){capture();change(btn.dataset.field,btn.dataset.value);return}
 if(btn.dataset.nav!==undefined){await save();stepIndex=Number(btn.dataset.nav);screen='wizard';render();return}
 const id=btn.id;if(!id||busy)return;
 busy=true;btn.disabled=true;
 try{
  if(id==='next')await goForward();else if(id==='back')await goBack();
  else if(id==='apply-prompt'){
   const prompt=$('#original-prompt').value;session=await api('/api/start',{method:'POST',data:{prompt}});config=session.config;stepIndex=0;screen='wizard';generated=null;render();
  }else if(id==='edit'){screen='wizard';render()}
  else if(id==='confirm')await generate();
  else if(id==='edit-result'||id==='edit-result-footer'){screen='wizard';stepIndex=0;render()}
  else if(id==='change-output'){screen='wizard';stepIndex=steps.findIndex(x=>x[0]==='output');render()}
  else if(id==='regenerate'){await generate()}
  else if(id==='restart'){session=await api('/api/start',{method:'POST',data:{prompt:''}});config=session.config;screen='wizard';stepIndex=0;generated=null;render()}
  else if(id==='copy'){await navigator.clipboard.writeText(generated.prompt);btn.textContent='Copied ✓'}
  else if(id==='download-prompt')download(new Blob([generated.prompt],{type:'text/plain'}),'blueberry-ai-prompt.txt');
  else if(id==='download-config')download(new Blob([JSON.stringify({config,prompt:generated.prompt},null,2)],{type:'application/json'}),'blueberry-diagram.json');
  else if(id==='download-source')await materialize('HTML5');
  else if(id==='export-primary')await materialize(config.output);
 }catch(e){showError(e.message)}finally{busy=false;btn.disabled=false}
}
async function init(){
 try{
  catalog=await api('/api/catalog');const params=new URLSearchParams(location.search),id=params.get('session');
  if(id)try{session=await api('/api/session/'+id)}catch{session=null}
  if(!session)session=await api('/api/start',{method:'POST',data:{prompt:params.get('prompt')||''}});
  config=session.config;
  if(session.confirmed&&params.get('view')==='result'){generated=await api('/api/session/'+session.id+'/generate',{method:'POST'});screen='result'}
  render();
  document.addEventListener('click',eventHandler);
  document.addEventListener('input',e=>{
   if(e.target.dataset?.search){const field=e.target.dataset.search;const query=e.target.value.toLowerCase();const grid=document.querySelector(`[data-grid="${field}"]`);if(grid)grid.querySelectorAll('button').forEach(b=>{b.hidden=!b.dataset.value.toLowerCase().includes(query)})}
   else if(e.target.dataset?.text)config[e.target.dataset.text]=e.target.value;
   else if(e.target.dataset?.custom)config[getCustom(e.target.dataset.custom)]=e.target.value;
  });
  $('#session-state').textContent='Session '+session.id.slice(0,8);
 }catch(e){showError('Unable to initialize Blueberry: '+e.message)}
}
init();
