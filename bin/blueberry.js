#!/usr/bin/env node
import {createInterface} from 'node:readline';
import { startServer,store } from '../src/server.js';
import { dispatchMCP, dispatchMCPError } from '../src/mcp.js';
import { makeResult, inferFromPrompt, catalog } from '../src/core.js';
import { writeFileSync } from 'node:fs';
const args=process.argv.slice(2),command=args[0]||'serve';
const option=(flag,fallback)=>args.includes(flag)?args[args.indexOf(flag)+1]:fallback;
function help(){process.stdout.write(`Blueberry Diagrams AI · 0.1.0\n\nCommands:\n  blueberry                       Start local diagram wizard\n  blueberry serve [--port 3847]  Start web UI and HTTP MCP server\n  blueberry mcp                  Start MCP stdio server (AI clients)\n  blueberry create "A -> B -> C"  Create an example HTML + SVG + prompt\n  blueberry catalog              List domains and counts\n  blueberry help                 Show help\n\nAfter npm publication: npm install -g blueberry-diagrams\n`)}
try{
 if(command==='serve'||command==='wizard'){
  const {url}=await startServer({host:option('--host','127.0.0.1'),port:Number(option('--port','3847'))});
  console.log(`Blueberry wizard: ${url}/wizard\nMCP endpoint: ${url}/mcp\nPress Ctrl+C to stop.`);
 }else if(command==='mcp'){
  const addr=option('--url',process.env.BLUEBERRY_PUBLIC_URL||'http://127.0.0.1:3847');
  let browserBase=addr;
  if(process.env.BLUEBERRY_NO_WEB!=='1'){try{const started=await startServer({host:'127.0.0.1',port:Number(process.env.BLUEBERRY_PORT||3847)});browserBase=started.url;console.error('Blueberry browser wizard:',browserBase+'/wizard')}catch(e){if(e.code==='EADDRINUSE')console.error('Blueberry browser port already in use; start blueberry serve separately.');else console.error('Web wizard unavailable:',e.message)}}
  const rl=createInterface({input:process.stdin,terminal:false,crlfDelay:Infinity});
  for await(const line of rl){
   if(!line.trim())continue;
   let request;try{request=JSON.parse(line);const r=dispatchMCP(request,store,browserBase);if(r)process.stdout.write(JSON.stringify(r)+'\n')}
   catch(e){process.stdout.write(JSON.stringify(dispatchMCPError(e,request?.id??null))+'\n')}
  }
 }else if(command==='create'){
  const prompt=args.slice(1).join(' ')||'Source -> Process -> Destination';
  const config=inferFromPrompt(prompt);const out=makeResult(config);
  writeFileSync('blueberry-diagram.html',out.html);writeFileSync('blueberry-diagram.svg',out.svg);writeFileSync('blueberry-prompt.txt',out.prompt);
  console.log('Created illustrative unconfirmed examples: blueberry-diagram.html, blueberry-diagram.svg and blueberry-prompt.txt. Use the wizard for review and confirmation.');
 }else if(command==='catalog'){
  console.log(`${catalog.domains.length} domains, ${catalog.domains.reduce((n,d)=>n+d.diagrams.length,0)} diagram entries`);
  for(const d of catalog.domains)console.log(`• ${d.name} (${d.diagrams.length})`);
 }else if(command==='help'||command==='--help'||command==='-h')help();else{help();process.exitCode=1}
}catch(e){console.error('Blueberry error:',e.message);process.exitCode=1}
