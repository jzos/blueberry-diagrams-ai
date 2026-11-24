import re,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
s=(root/'docs/MASTER_CATALOG.md').read_text()
sections={}
for m in re.finditer(r'^## (\d+)\. (.+)$',s,re.M):
 n=int(m.group(1)); j=m.end(); e=re.search(r'^## \d+\.|^# Part',s[j:],re.M)
 sections[n]=(m.group(2),s[j:j+e.start()] if e else s[j:])

def stripmd(t):
 return re.sub(r'\*\*|\*|`','',t).strip()
def items(sec):
 vals=[]
 for ln in sec.splitlines():
  ln=ln.strip()
  if ln.startswith('- '): vals.append(stripmd(ln[2:]))
  elif ln.startswith('|') and not ln.startswith('|---') and not ln.startswith('| #') and not ln.startswith('| Category') and not ln.startswith('| Diagram') and not ln.startswith('| UML'):
   cols=[stripmd(a) for a in ln.strip('|').split('|')]
   if len(cols)>=2:
    if cols[0].isdigit() and len(cols)>1: vals.append(cols[1])
    elif len(cols)>=3 and cols[0] not in ('Category','Diagram type','Diagram',''): vals.extend([z.strip() for z in cols[1].split(',') if z.strip()])
 return list(dict.fromkeys(x for x in vals if x))
def section_tables(sec):
 vals=[]
 for ln in sec.splitlines():
  if not ln.startswith('|') or ln.startswith('|---'): continue
  cols=[stripmd(x) for x in ln.strip('|').split('|')]
  if len(cols)>=2 and cols[0] not in ('Style family','Layout','Animation','Interaction','Rendering engine','Category','Diagram type','UML diagram','Diagram'):
   vals.append(cols)
 return vals
families=[('Flows & processes',r'flow|workflow|process|pipeline|cycle|procedure|synchron|journey|sequence|lifecycle|timeline|pathway|route|transfer|transport|training'),('Structures & architecture',r'architect|structure|component|layout|assembly|anatom|cutaway|cross.section|schematic|design|wiring|circuit|mechanism|configuration|system|layer|orbital'),('Charts & analytics',r'chart|plot|curve|distribution|histogram|heatmap|matrix|spectrum|profile|statistics|analysis|graph|diagram of|map|time scale|forecast'),('Networks & relationships',r'network|link|node|relationship|dependency|genealogy|tree|topology|interaction|family|connection'),('Simulation & modeling',r'simulation|model|state|physics|kinematic|dynamics|control|motion|particle|orbit|trajectory'),('Illustrations & explainers',r'.*')]
domains=[]
for i in range(1,43):
 title,sec=sections[i]; dia=items(sec)
 if i==19:
  dia=[]
  for cols in section_tables(sec):
   if len(cols)>=2: dia.extend([x.strip() for x in cols[1].split(',') if x.strip()])
 if i==34:
  dia=[]
  for cols in section_tables(sec):
   if len(cols)>=2: dia.extend([x.strip() for x in cols[1].split(',') if x.strip()])
 if i==9:
  dia=[]
  for cols in section_tables(sec):
   if len(cols)>=2: dia.append(cols[0])
 if i==8: pass
 dia=list(dict.fromkeys(x for x in dia if x and x not in ('Diagram types','Diagram type','Purpose')))
 cat={k:[] for k,_ in families}
 for a in dia:
  for k,r in families:
   if re.search(r,a,re.I): cat[k].append(a); break
 domains.append({'id':'domain-'+str(i),'name':title,'groups':[{'name':k,'diagrams':v} for k,v in cat.items() if v],'diagrams':dia})
styles=[]
for col in section_tables(sections[43][1]):
 if len(col)>=2: styles.append({'family':col[0],'styles':[x.strip() for x in col[1].split(',') if x.strip()]})
layouts=[cols[0] for cols in section_tables(sections[44][1])]
animations=['None']+[cols[0] for cols in section_tables(sections[45][1])]
interactions=['None']+[cols[0] for cols in section_tables(sections[46][1])]
renderers=[]
for ln in s[s.index('## A Universal Diagram Design Library'):].splitlines():
 if not ln.startswith('|') or ln.startswith('|---') or 'Rendering engine' in ln: continue
 cols=[stripmd(x) for x in ln.strip('|').split('|')]
 if len(cols)>=2: renderers.append({'name':cols[0],'description':cols[1]})
data={'title':'The Master Catalog of Diagram Types & Visual Design Styles','version':'2026-11-24','domains':domains,'styles':styles,'layouts':layouts,'animations':animations,'interactions':interactions,'renderers':renderers,'purposes':['Explain how a system works','Show relationships and dependencies','Visualize a process or workflow','Communicate data and trends','Teach a concept step-by-step','Document components and interfaces','Simulate behavior or change over time','Compare options and scenarios','Support decision-making','Other']}
(root/'src/catalog.json').write_text(json.dumps(data,indent=2,ensure_ascii=False))
print('domains:',len(domains),'diagrams:',sum(len(d['diagrams']) for d in domains),'styles:',sum(len(x['styles']) for x in styles),'layouts:',len(layouts),'animations:',len(animations),'interactions:',len(interactions),'renderers:',len(renderers))
print('any empty:',[(d['name'],len(d['diagrams'])) for d in domains if len(d['diagrams'])<3]); print('sample',domains[18]['diagrams'][:8])
