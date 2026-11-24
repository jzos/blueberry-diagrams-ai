export const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const names=(c,g)=>g.nodes.length?g.nodes:['Source','Process','Destination'];
const colors=c=>{
 const style=(c.style||'').toLowerCase(), family=(c.styleFamily||'').toLowerCase();
 if (/blueprint|engineering|drafting|cad/.test(style+' '+family))return {bg:'#071d36',panel:'#102e4b',stroke:'#64c0f5',text:'#e5f8ff',muted:'#9bb7d1',accent:'#38dbff',second:'#9cddfc'};
 if (/chalk|whiteboard|sketch|ink|marker|doodle/.test(style+' '+family))return {bg:'#15211d',panel:'#182b24',stroke:'#d6e0d0',text:'#f4f0de',muted:'#a5b8a5',accent:'#efd58e',second:'#c9df9e'};
 if (/medical|realistic/.test(style+' '+family))return {bg:'#111c25',panel:'#192b37',stroke:'#527d91',text:'#edf8ff',muted:'#98b4c6',accent:'#62d7d9',second:'#ec6d7f'};
 if (/minimalist|monochrome/.test(family+' '+style))return {bg:'#0f1118',panel:'#20232a',stroke:'#676b75',text:'#f7f7f7',muted:'#b2b2b2',accent:'#dce4ff',second:'#b3b9c8'};
 return {bg:'#090f1e',panel:'#17213a',stroke:'#354567',text:'#f2f5ff',muted:'#98a6c5',accent:'#8c83ff',second:'#4ccad8'};
};
const styleBlock=(c,p)=>`<style>
 .flow-path{stroke-dasharray:8 9;stroke-linecap:round;${c.animation==='None'?'':`animation:flow 1.8s linear infinite;`}}
 .item-node{${c.animation==='None'?'':`animation:appear .8s ease both;`}}
 .diagram-pulse{${c.animation==='None'?'':`animation:pulse 2s ease-in-out infinite;`}}
 @keyframes flow{to{stroke-dashoffset:-68}}@keyframes appear{from{opacity:0}to{opacity:1}}@keyframes pulse{50%{opacity:.35}}
 @media(prefers-reduced-motion:reduce){.flow-path,.item-node,.diagram-pulse{animation:none!important}}
 </style>`;
function opening(c,p){return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="${esc(c.title||c.diagramType||'Diagram')}" style="display:block;width:100%;height:auto;background:${p.bg};border-radius:18px" ><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="${p.accent}"/></marker><linearGradient id="bg-shade" x2="1" y2="1"><stop stop-color="${p.bg}"/><stop offset="1" stop-color="${p.panel}" stop-opacity=".35"/></linearGradient></defs>${styleBlock(c,p)}<rect width="960" height="540" rx="18" fill="url(#bg-shade)"/><text x="44" y="51" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="${p.accent}" letter-spacing="2.4">BLUEBERRY / ${esc((c.domain||'GENERAL').toUpperCase().slice(0,34))}</text><text x="44" y="92" font-family="Arial,sans-serif" font-size="27" font-weight="bold" fill="${p.text}">${esc((c.title||c.diagramType||'Diagram').slice(0,54))}</text><line x1="44" x2="916" y1="113" y2="113" stroke="${p.stroke}"/>`;}
function footer(c,p,g){return `${g.illustrative?`<text x="48" y="508" fill="${p.second}" font-size="13" font-family="Arial">Illustrative placeholder: enter actual nodes and links to replace this example</text>`:''}<text x="916" y="509" font-size="12" fill="${p.muted}" text-anchor="end" font-family="Arial">${esc(c.diagramType||'Diagram')} • ${esc(c.layout)}</text></svg>`;}
function drawNode(label,x,y,w,h,i,c,p){const delay=(i*.13).toFixed(2);return `<g class="item-node" style="animation-delay:${delay}s"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(18,h/3)}" fill="${p.panel}" stroke="${p.stroke}" stroke-width="2"/><rect x="${x+13}" y="${y+15}" width="5" height="${h-30}" rx="2" fill="${p.accent}"/><text x="${x+w/2+2}" y="${y+h/2+6}" font-size="${label.length>22?14:17}" text-anchor="middle" fill="${p.text}" font-family="Arial,sans-serif" font-weight="600">${esc(label.length>32?label.slice(0,29)+'…':label)}</text></g>`}
function drawEdge(a,b,p){const [x1,y1]=a,[x2,y2]=b, mid=(x1+x2)/2; const curve=`M ${x1} ${y1} C ${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`;return `<path class="flow-path" d="${curve}" stroke="${p.accent}" fill="none" stroke-width="3" marker-end="url(#arrow)" />`;}
function flow(c,g,p){let N=names(c,g).slice(0,12);const links=g.links||[],layout=c.layout||'Linear Horizontal';let nodes=[],positions=[];
 if(layout==='Hub-and-Spoke'&&links.length){
  const incoming=new Map(N.map(n=>[n,0]));
  for(const [a,b] of links)if(incoming.has(b))incoming.set(b,incoming.get(b)+1);
  const destination=[...incoming].sort((a,b)=>b[1]-a[1])[0]?.[0];
  if(destination&&incoming.get(destination)>0)N=[...N.filter(n=>n!==destination),destination];
 }
 if (layout==='Radial'||layout==='Circular'||layout==='Network/Mesh'||layout==='Concentric Rings'){
  const count=N.length; const R=Math.min(170,Math.max(100,200-count*5));
  positions=N.map((_,i)=>[480+R*Math.cos((i/count)*Math.PI*2-Math.PI/2),310+R*Math.sin((i/count)*Math.PI*2-Math.PI/2)]);
  nodes=N.map((a,i)=>drawNode(a,positions[i][0]-64,positions[i][1]-30,128,60,i,c,p));
 }else if(layout==='Linear Vertical'||layout==='Swimlane'){
  positions=N.map((_,i)=>[480,165+(i%5)*72]);nodes=N.slice(0,5).map((a,i)=>drawNode(a,380,positions[i][1]-27,200,54,i,c,p));
 }else if(layout==='Hub-and-Spoke'){
  const src=N.slice(0,-1),dst=N.at(-1);positions=[...src.map((_,i)=>[250,170+i*(230/Math.max(1,src.length-1))]),[730,286]];
  nodes=N.map((a,i)=>drawNode(a,positions[i][0]-105,positions[i][1]-27,210,54,i,c,p));
 }else if(layout==='Layered Stack'||layout==='Isometric Scene'){
  positions=N.slice(0,6).map((_,i)=>[480,164+i*64]);nodes=N.slice(0,6).map((a,i)=>drawNode(a,330,positions[i][1]-27,300,54,i,c,p));
 }else {
  const count=Math.min(N.length,5);positions=N.slice(0,count).map((_,i)=>[155+(i/(Math.max(1,count-1)))*650,280]);
  nodes=N.slice(0,count).map((a,i)=>drawNode(a,positions[i][0]-71,positions[i][1]-35,142,70,i,c,p));
 }
 let edges=[];
 if(layout==='Hub-and-Spoke')edges=positions.slice(0,-1).map((xy,i)=>[i,positions.length-1]);
 else if(layout==='Radial'||layout==='Circular'||layout==='Network/Mesh')edges=positions.map((_,i)=>[i,(i+1)%positions.length]);
 else edges=positions.slice(0,-1).map((_,i)=>[i,i+1]);
 const draw=edges.map(([i,j])=>{
  const one=positions[i],two=positions[j];if(!one||!two)return '';
  if(layout==='Linear Vertical'||layout==='Layered Stack'||layout==='Isometric Scene'||layout==='Swimlane')return `<path class="flow-path" d="M ${one[0]} ${one[1]+30} L ${two[0]} ${two[1]-32}" stroke="${p.accent}" stroke-width="3" fill="none" marker-end="url(#arrow)"/>`;
  return drawEdge([one[0]+(one[0]<two[0]?70:-70),one[1]],[two[0]-(one[0]<two[0]?80:-80),two[1]],p);
 }).join('');
 const label=layout==='Hub-and-Spoke'?`<text x="480" y="462" font-family="Arial" font-size="14" fill="${p.muted}" text-anchor="middle">Many-to-one integration · directional flow</text>`:'';
 return draw+nodes.join('')+label;
}
function sequence(c,g,p){const names=g.illustrative?['User','Client App','Auth Server','Resource API']:g.nodes.slice(0,7);const gap=820/Math.max(1,names.length-1);const coords=names.map((_,i)=>70+i*gap);let s='';
 names.forEach((label,i)=>{const x=coords[i];s+=drawNode(label,x-58,151,116,46,i,c,p);s+=`<line x1="${x}" y1="200" x2="${x}" y2="466" stroke="${p.stroke}" stroke-dasharray="6 7" stroke-width="2"/>`;});
 const msgs=g.illustrative?[['User','Client App'],['Client App','Auth Server'],['Auth Server','Client App'],['Client App','Resource API']]:g.links;
 msgs.slice(0,6).forEach((link,i)=>{const a=names.indexOf(link[0]),b=names.indexOf(link[1]);if(a<0||b<0||a===b)return;const y=244+i*38;s+=`<line class="flow-path" x1="${coords[a]}" y1="${y}" x2="${coords[b]}" y2="${y}" stroke="${p.accent}" stroke-width="2.8" marker-end="url(#arrow)"/><text x="${(coords[a]+coords[b])/2}" y="${y-8}" font-size="11" font-family="Arial" fill="${p.muted}" text-anchor="middle">${esc('Message '+(i+1))}</text>`;});return s;}
function graph(c,g,p){const nodes=g.nodes.slice(0,16),cy=305,cx=480,R=168;let s='';const pts=nodes.map((_,i)=>[cx+R*Math.cos(2*Math.PI*i/nodes.length),cy+R*Math.sin(2*Math.PI*i/nodes.length)]);
 const extra=g.illustrative?[[0,1],[1,2],[2,0]]:g.links.map(([a,b])=>[nodes.indexOf(a),nodes.indexOf(b)]).filter(([a,b])=>a>=0&&b>=0);
 for(const [a,b] of extra){const x=pts[a],y=pts[b];s+=`<path d="M${x[0]} ${x[1]}L${y[0]} ${y[1]}" stroke="${p.stroke}" stroke-width="2.3" fill="none"/><circle class="diagram-pulse" r="5" fill="${p.accent}"><animateMotion dur="2.4s" repeatCount="indefinite" path="M${x[0]} ${x[1]}L${y[0]} ${y[1]}"/></circle>`;}
 nodes.forEach((n,i)=>{const [x,y]=pts[i];s+=`<circle cx="${x}" cy="${y}" r="${n.length>14?38:30}" fill="${p.panel}" stroke="${p.accent}" stroke-width="2"/><text x="${x}" y="${y+5}" text-anchor="middle" font-family="Arial" font-size="${n.length>14?10:12}" fill="${p.text}">${esc(n.slice(0,19))}</text>`});return s;}
function chart(c,g,p){const a=(c.content||'').split(/[\n,;]/).map(v=>v.match(/^\s*([\w\s-]{1,22})\s*[:=]\s*(\d+(?:\.\d+)?)\s*$/)).filter(Boolean).slice(0,12);
 const data=a.length>=2?a.map(m=>[m[1],Number(m[2])]):[['Jan',18],['Feb',25],['Mar',22],['Apr',35],['May',48],['Jun',62]];const max=Math.max(...data.map(a=>a[1]),1),left=95,bot=435,areaW=780,H=260;let s=`<line x1="${left}" y1="170" x2="${left}" y2="${bot}" stroke="${p.stroke}" stroke-width="2"/><line x1="${left}" y1="${bot}" x2="${left+areaW}" y2="${bot}" stroke="${p.stroke}" stroke-width="2"/>`;
 data.forEach(([label,value],i)=>{const x=left+(i+.5)*areaW/data.length,w=Math.max(10,areaW/data.length*.54),h=Math.max(4,value/max*H);s+=`<rect class="item-node" x="${x-w/2}" y="${bot-h}" width="${w}" height="${h}" rx="5" fill="${p.accent}" style="animation-delay:${i*.13}s"/><text x="${x}" y="${bot+28}" text-anchor="middle" font-family="Arial" font-size="12" fill="${p.muted}">${esc(label)}</text><text x="${x}" y="${bot-h-8}" text-anchor="middle" font-family="Arial" font-size="13" fill="${p.text}">${value}</text>`});if(!a.length)s+=`<text x="480" y="493" font-family="Arial" font-size="12" fill="${p.second}" text-anchor="middle">Sample values only: add label: value pairs to generate a data-driven chart</text>`;return s;}
function layers(c,g,p){const names=g.illustrative?['Base OS','Dependencies','App Code','Runtime Config']:g.nodes.slice(0,6);let s='';names.forEach((n,i)=>{const x=300+i*27,y=385-i*57;const poly=`${x},${y} ${x+240},${y-65} ${x+350},${y-20} ${x+110},${y+45}`;s+=`<polygon class="item-node" points="${poly}" fill="${i%2?p.second:p.accent}" fill-opacity=".21" stroke="${p.accent}" stroke-width="2" style="animation-delay:${i*.18}s"/><text x="${x+158}" y="${y-8}" fill="${p.text}" font-family="Arial" font-size="16" text-anchor="middle" font-weight="bold">${esc(n)}</text>`});return s;}
export function renderSVG(config, graph){const c=config||{},g=graph||{nodes:[],links:[],illustrative:true},p=colors(c);const engine=c.renderer==='Auto'||!c.renderer?guessEngine(c):c.renderer;const type=(c.diagramType||'').toLowerCase();let content;
 if(/sequence|timing diagram/.test(type))content=sequence(c,g,p);
 else if(/Chart Engine/.test(engine)||/histogram|line chart|bar chart|plot|revenue|users vs/.test(type))content=chart(c,g,p);
 else if(/Graph\/Network/.test(engine))content=graph(c,g,p);
 else if(/Isometric/.test(engine)||/layer/.test(type))content=layers(c,g,p);
 else content=flow(c,g,p);
 return opening(c,p)+content+footer(c,p,g);
}
function guessEngine(c){const t=(c.diagramType+' '+c.domain).toLowerCase();if(/sequence/.test(t))return 'SVG Flow Engine';if(/chart|plot/.test(t))return 'Chart Engine';if(/network|graph/.test(t))return 'Graph/Network Engine';if(/isometric|layer/.test(t))return 'Isometric Engine';return 'SVG Flow Engine'}
export function renderHTML(config,graph){const svg=renderSVG(config,graph),title=esc(config.title||config.diagramType||'Blueberry Diagram');return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090f1e;color:#e6edff;font:15px system-ui,sans-serif}main{width:min(1100px,96vw)}button{background:#232c45;border:1px solid #475678;border-radius:9px;color:white;padding:10px 18px;cursor:pointer}button:hover{background:#343e5e}.controls{display:flex;justify-content:center;gap:10px;padding:18px}svg.paused *{animation-play-state:paused!important}svg.paused animateMotion{display:none}@media(prefers-reduced-motion:reduce){svg *{animation:none!important}}</style></head><body><main>${svg}<div class="controls"><button id="toggle">Pause</button><button id="reset">Replay</button><label>Speed <input type="range" id="speed" min=".3" max="3" step=".1" value="1"/></label></div></main><script>let svg=document.querySelector('svg');const btn=document.getElementById('toggle');btn.onclick=()=>{svg.classList.toggle('paused');btn.textContent=svg.classList.contains('paused')?'Play':'Pause'};document.getElementById('reset').onclick=()=>{svg.classList.remove('paused');btn.textContent='Pause';const clone=svg.cloneNode(true);svg.replaceWith(clone);svg=clone};document.getElementById('speed').oninput=e=>{document.querySelectorAll('.flow-path').forEach(x=>x.style.animationDuration=(1.8/+e.target.value)+'s')}</script></body></html>`}
