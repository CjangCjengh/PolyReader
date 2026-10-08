import {VisualSelection} from './visual-selection.js';

const controls=/[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/gu;
const clean=text=>text.replace(controls,'').replace(/[ \t\r\n]+/g,' ').trim();
const blockSelector='p,h1,h2,h3,h4,h5,h6,li,blockquote,dd,dt,pre,div,section';
export function paragraphs(doc){
 const blocks=[...doc.body.querySelectorAll(blockSelector)].filter(el=>!el.querySelector(blockSelector));
 return blocks.length?blocks:[doc.body];
}
export function paragraphText(el){
 const doc=el.ownerDocument,win=doc.defaultView;
 if(/[\u202d\u202e]/u.test(el.textContent)){
   const visual=new VisualSelection(doc,{root:el,viewport:false});
   if(!visual.glyphs.length)return '';
   visual.select(0,visual.glyphs.length);return clean(visual.text);
 }
 const walker=doc.createTreeWalker(el,4);let n,text='';
 while(n=walker.nextNode()){
   const parent=n.parentElement,s=win.getComputedStyle(parent);
   if(parent.closest('script,style,rt,rp,[hidden]')||s.visibility!=='visible'||+s.opacity===0||parseFloat(s.fontSize)<2)continue;
   const r=doc.createRange();r.selectNodeContents(n);
   if([...r.getClientRects()].some(b=>b.height>1&&b.width>0))text+=n.textContent;
 }
 return clean(text);
}
export function rubyReadings(elements){
 const result=new Map();for(const el of elements)for(const ruby of el.querySelectorAll('ruby')){
   const copy=ruby.cloneNode(true),reading=clean([...copy.querySelectorAll('rt')].map(rt=>rt.textContent).join(''));
   copy.querySelectorAll('rt,rp').forEach(n=>n.remove());const text=clean(copy.textContent);
   if(text&&reading&&text.length<80&&reading.length<160)result.set(text,reading);
 }return [...result].slice(0,40).map(([text,reading])=>({text,reading}));
}
export async function chapterFrame(book,index){
 const frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-same-origin');frame.setAttribute('aria-hidden','true');
 frame.style.cssText='position:fixed;left:-10000px;top:0;width:600px;height:900px;visibility:hidden;pointer-events:none;border:0';document.body.append(frame);
 try{
   const url=await book.sections[index].load();
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('context_timeout')),8000);frame.onload=()=>{clearTimeout(timer);resolve()};frame.onerror=()=>{clearTimeout(timer);reject(Error('context_unavailable'))};frame.src=url;});
   const doc=frame.contentDocument,style=doc.createElement('style');
   // Use an independent unpaginated canvas: glyph order remains correct beyond the current page.
   style.textContent='html,body{visibility:visible!important;width:560px!important;height:auto!important;max-height:none!important;min-width:0!important;overflow:visible!important;columns:auto!important;writing-mode:horizontal-tb!important;margin:0!important;padding:0!important}';doc.head.append(style);
   void doc.body.offsetWidth;await Promise.race([doc.fonts.ready,new Promise(r=>setTimeout(r,2000))]);return {frame,doc};
 }catch(e){frame.remove();throw e;}
}
export async function extractContext(book,selection,{before=3,after=3,maxChars=12000}={}){
 before=Math.max(0,Math.min(12,Number(before)||0));after=Math.max(0,Math.min(12,Number(after)||0));maxChars=Math.max(1000,Math.min(24000,Number(maxChars)||12000));
 const selected=clean(selection.text||'');if(!selected)throw Error('empty_selection');
 if(selected.length>8000)throw Error('selection_too_long');
 let index=selection.index;try{index=book.resolveCFI(selection.cfi).index;}catch{}
 const opened=[],load=async i=>{const value=await chapterFrame(book,i);opened.push(value.frame);return value.doc;};
 try{
   const doc=await load(index),blocks=paragraphs(doc);let ranges=[];
   try{ranges=(selection.cfis||[selection.cfi]).map(cfi=>book.resolveCFI(cfi).anchor(doc));}catch{}
   let hits=blocks.map((el,i)=>ranges.some(r=>r.intersectsNode(el))?i:-1).filter(i=>i>=0);
   if(!hits.length){hits=blocks.map((el,i)=>paragraphText(el).includes(selected)?i:-1).filter(i=>i>=0);if(hits.length!==1)return {selected,before:[],passage:selected,after:[],limited:true};}
   const first=hits[0],last=hits.at(-1),prior=[],following=[];
   for(let i=first-1;i>=0&&prior.length<before;i--){const t=paragraphText(blocks[i]);if(t)prior.unshift(t);}
   for(let i=last+1;i<blocks.length&&following.length<after;i++){const t=paragraphText(blocks[i]);if(t)following.push(t);}
   // Cross one chapter boundary; stop rather than loading an entire book for context.
   if(prior.length<before&&index>0){const previous=paragraphs(await load(index-1));for(let i=previous.length-1;i>=0&&prior.length<before;i--){const t=paragraphText(previous[i]);if(t)prior.unshift(t);}}
   if(following.length<after&&index+1<book.sections.length){const next=paragraphs(await load(index+1));for(const el of next){if(following.length>=after)break;const t=paragraphText(el);if(t)following.push(t);}}
   let passage=blocks.slice(first,last+1).map(paragraphText).filter(Boolean).join('\n\n'),limited=false;
   if(passage.length>maxChars){const at=passage.indexOf(selected);if(at<0){passage=selected;}else{const start=Math.max(0,at-Math.floor((maxChars-selected.length)/2));passage=passage.slice(start,start+maxChars);}limited=true;}
   while(prior.join('\n').length+passage.length+following.join('\n').length>maxChars&&(prior.length||following.length)){if(prior.length>=following.length)prior.shift();else following.pop();limited=true;}
   return {selected,before:prior,passage,after:following,readings:rubyReadings(blocks.slice(Math.max(0,first-before),last+after+1)),limited,chapter:index+1,startParagraph:first+1,endParagraph:last+1};
 }finally{opened.forEach(frame=>frame.remove());}
}
