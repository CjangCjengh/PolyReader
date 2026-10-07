const controls=/^[\u200b-\u200f\u202a-\u202e\u2060-\u206f]+$/u;
const visible=(b,w,h,space=false)=>b.width>(space?-.01:1)&&b.height>1&&b.right>0&&b.left<w&&b.bottom>0&&b.top<h;

// Directional overrides can make one visual interval several DOM ranges.
// Keep the source DOM intact so existing EPUB locations remain valid.
export class VisualSelection {
 static create(doc,range){
  if(!/[\u202d\u202e]/u.test(doc.body.textContent)||doc.defaultView.getComputedStyle(doc.body).writingMode.startsWith('vertical'))return null;
  const value=new VisualSelection(doc),selected=[];
  value.glyphs.forEach((g,i)=>{if(range.comparePoint(g.node,g.offset)===0&&range.comparePoint(g.node,g.offset+g.text.length)===0)selected.push(i)});
  if(!selected.length)return null;
  value.select(selected[0],selected.at(-1)+1);return value;
 }
 constructor(doc){
  this.doc=doc;
  const win=doc.defaultView,w=win.innerWidth,h=win.innerHeight,walker=doc.createTreeWalker(doc.body,4),glyphs=[];
  const segmenter=win.Intl?.Segmenter?new win.Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
  let node;
  while(node=walker.nextNode()){
   const el=node.parentElement,style=win.getComputedStyle(el);
   if(el.closest('script,style,rt,rp')||style.visibility!=='visible'||+style.opacity===0||parseFloat(style.fontSize)<2)continue;
   const r=doc.createRange();r.selectNodeContents(node);
   const nodeRects=[...r.getClientRects()],spaceNode=/^[ \t\u00a0]+$/u.test(node.textContent);
   if(!nodeRects.some(b=>visible(b,w,h,spaceNode))&&!(spaceNode&&!nodeRects.length))continue;
   let block=el;while(block.parentElement&&win.getComputedStyle(block).display==='inline')block=block.parentElement;
   const rtl=win.getComputedStyle(block).direction==='rtl';
   const pieces=segmenter?[...segmenter.segment(node.textContent)]:Array.from(node.textContent,(segment)=>({segment}));
   let offset=0;
   for(const {segment:text} of pieces){
    const index=offset;offset+=text.length;if(controls.test(text))continue;
    r.setStart(node,index);r.setEnd(node,offset);
    const rects=[...r.getClientRects()];let box=rects.find(b=>visible(b,w,h,/^[ \t\u00a0]+$/u.test(text)));
    // Soft wrapping can remove a space's rectangle without removing the word separator.
    if(!box&&!rects.length&&spaceNode&&glyphs.at(-1)?.block===block){const prev=glyphs.at(-1).box;box={left:prev.right,right:prev.right,top:prev.top,bottom:prev.bottom,width:0,height:prev.height};}
    if(box)glyphs.push({node,offset:index,text,box,block,rtl});
   }
  }
  glyphs.sort((a,b)=>(a.box.top+a.box.bottom-b.box.top-b.box.bottom)/2);
  const rows=[];
  for(const g of glyphs){
   let row=rows.at(-1);
   if(!row||Math.abs((g.box.top+g.box.bottom)/2-row.center)>Math.min(row.height,g.box.height)*.45){row={center:(g.box.top+g.box.bottom)/2,height:g.box.height,glyphs:[]};rows.push(row)}
   row.glyphs.push(g);g.row=row;
  }
  for(const row of rows)row.glyphs.sort((a,b)=>(a.box.left-b.box.left)*(a.rtl?-1:1));
  this.glyphs=rows.flatMap(row=>row.glyphs);this.rows=rows;
 }
 select(start,end){
  if(start===end)return false;
  this.start=Math.min(start,end);this.end=Math.max(start,end);
  const selected=this.glyphs.slice(this.start,this.end),groups=new Map();
  for(const g of selected){if(!groups.has(g.node))groups.set(g.node,[]);groups.get(g.node).push(g)}
  this.ranges=[];
  for(const [node,chars] of groups){
   chars.sort((a,b)=>a.offset-b.offset);let current;
   for(const g of chars){
    const gap=current?node.textContent.slice(current.endOffset,g.offset):'';
    if(current&&(current.endOffset===g.offset||controls.test(gap)))current.setEnd(node,g.offset+g.text.length);
    else{current=this.doc.createRange();current.setStart(node,g.offset);current.setEnd(node,g.offset+g.text.length);this.ranges.push(current)}
   }
  }
  this.ranges.sort((a,b)=>a.compareBoundaryPoints(0,b));
  this.range=this.ranges[0].cloneRange();const last=this.ranges.at(-1);this.range.setEnd(last.endContainer,last.endOffset);
  this.text='';let block;
  for(const g of selected){if(block&&g.block!==block)this.text+='\n';this.text+=g.text;block=g.block}
  return true;
 }
 endpoint(start){return this.glyphs[start?this.start:this.end-1]}
 boundary(x,y){
  const row=this.rows.reduce((a,b)=>Math.abs(a.center-y)<=Math.abs(b.center-y)?a:b);
  const glyph=row.glyphs.filter(g=>g.box.width>1).reduce((a,b)=>Math.abs(Math.max(a.box.left,Math.min(a.box.right,x))-x)<=Math.abs(Math.max(b.box.left,Math.min(b.box.right,x))-x)?a:b);
  return this.glyphs.indexOf(glyph)+(glyph.rtl?x<(glyph.box.left+glyph.box.right)/2:x>(glyph.box.left+glyph.box.right)/2);
 }
}
