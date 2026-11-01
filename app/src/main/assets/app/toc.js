export function tocEntries(book){
 const entries=[];
 const visit=(items,depth)=>{for(const item of items||[]){entries.push({...item,depth});visit(item.subitems,depth+1);}};
 visit(book.toc,0);
 return entries.length?entries:book.sections.map((_,href)=>({href,depth:0}));
}

export async function currentTocIndex(book,entries,location){
 if(!Number.isInteger(location?.index)||location.index<0)return -1;
 const targets=entries.map((item,row)=>{
  try{
   if(Number.isInteger(item.href))return {row,index:item.href};
   if(typeof item.href!=='string')return null;
   const hash=item.href.indexOf('#'),fragment=hash<0?'':item.href.slice(hash+1);
   let href=item.href;
   if(fragment)try{href=href.slice(0,hash+1)+decodeURIComponent(fragment);}catch{}
   const target=book.resolveHref(href);
   return target?.index>=0?{...target,row,fragment}:null;
  }catch{return null;}
 }).filter(Boolean);
 // A chapter can span several spine files; retain the preceding TOC entry.
 let selected=-1,section=-1;
 for(const target of targets)if(target.index<location.index&&target.index>=section){selected=target.row;section=target.index;}
 const same=targets.filter(t=>t.index===location.index);
 if(!same.length)return selected;
 if(!same.some(t=>t.fragment))return same.at(-1).row;
 let doc,position;
 try{
  doc=await book.sections[location.index].createDocument();
  if(location.cfi){const resolved=book.resolveCFI(location.cfi);if(resolved.index===location.index){position=resolved.anchor(doc).cloneRange();position.collapse(true);}}
 }catch{}
 if(!position)return (same.find(t=>!t.fragment)||same[0]).row;
 let latest;
 for(const target of same){
  try{
   const element=target.fragment?target.anchor(doc):doc.body||doc.documentElement;
   if(!element)continue;
   const start=doc.createRange();start.selectNodeContents(element);start.collapse(true);
   if(start.compareBoundaryPoints(0,position)>0)continue;
   if(!latest||start.compareBoundaryPoints(0,latest)>=0){latest=start;selected=target.row;}
  }catch{}
 }
 return selected;
}
