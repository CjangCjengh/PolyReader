import {VisualSelection} from './visual-selection.js';
// Keep the range in the document; the host owns the handles and action menu.
export class TextSelection {
 constructor(doc){
  this.doc=doc;this.range=null;
  this.supported=!!(doc.defaultView.CSS?.highlights&&doc.defaultView.Highlight);
 }
 set(range){
  this.visual=this.supported?VisualSelection.create(this.doc,range):null;
  if(this.visual){this.applyVisual();return;}
  this.ranges=null;
  this.range=range.cloneRange();
  if(this.supported){
   // Selection.toString follows rendered text, including publisher visibility rules.
   const selection=this.doc.getSelection();selection.removeAllRanges();selection.addRange(this.range);
   this.text=selection.toString();selection.removeAllRanges();
   this.doc.defaultView.CSS.highlights.set('polyreader_selection',new this.doc.defaultView.Highlight(this.range));
  }else this.text=this.doc.getSelection().toString();
 }
 applyVisual(){
  const v=this.visual;this.range=v.range;this.ranges=v.ranges;this.text=v.text;
  this.doc.getSelection()?.removeAllRanges();
  this.doc.defaultView.CSS.highlights.set('polyreader_selection',new this.doc.defaultView.Highlight(...this.ranges));
 }
 clear(){this.range=null;this.ranges=null;this.visual=null;this.doc.defaultView.CSS?.highlights?.delete('polyreader_selection');this.doc.getSelection()?.removeAllRanges();}
 endpoint(start){
  // A collapsed range can land in a hidden publisher span or on the next line.
  // Measure the first/last painted character inside the range instead.
  const nodes=[],walker=this.doc.createTreeWalker(this.range.commonAncestorContainer,4);
  if(this.range.commonAncestorContainer.nodeType===3)nodes.push(this.range.commonAncestorContainer);
  else {let n;while(n=walker.nextNode())if(this.range.intersectsNode(n))nodes.push(n);}
  if(!start)nodes.reverse();
  let box,el;
  outer:for(const n of nodes){
   el=n.parentElement;const style=this.doc.defaultView.getComputedStyle(el);
   if(el.closest('script,style,rt,rp')||style.visibility!=='visible'||+style.opacity===0||parseFloat(style.fontSize)<2)continue;
   const lo=n===this.range.startContainer?this.range.startOffset:0,hi=n===this.range.endContainer?this.range.endOffset:n.length;
   const chars=[...n.textContent.slice(lo,hi)];let offset=start?lo:hi;
   if(!start)chars.reverse();
   for(const char of chars){
    const a=start?offset:offset-char.length;offset+=start?char.length:-char.length;
    if(/[\s\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(char))continue;
    const r=this.doc.createRange();r.setStart(n,a);r.setEnd(n,a+char.length);
    box=[...r.getClientRects()].find(b=>b.width>1&&b.height>1);
    if(box)break outer;
   }
  }
  if(!box)return null;
  const glyph=this.visual?.endpoint(start);if(glyph){box=glyph.box;el=glyph.node.parentElement;}
  const vertical=this.doc.defaultView.getComputedStyle(el).writingMode.startsWith('vertical');
  const rtl=glyph?glyph.rtl:this.doc.defaultView.getComputedStyle(el).direction==='rtl';
  const frame=this.doc.defaultView.frameElement.getBoundingClientRect();
  const edge=start!==rtl?box.left:box.right;
  const caret={x:frame.left+(vertical?(box.left+box.right)/2:edge),y:frame.top+(vertical?(start?box.top:box.bottom):(box.top+box.bottom)/2)};
  const anchor={x:frame.left+(vertical?box.right:edge),y:frame.top+(vertical?(start?box.top:box.bottom):box.bottom)};
  return {caret,vertical,box:{left:box.left+frame.left,right:box.right+frame.left,top:box.top+frame.top,bottom:box.bottom+frame.top},
   corner:vertical?(start?'bottom-left':'top-left'):(start!==rtl?'top-right':'top-left'),
   x:anchor.x+(vertical?10:(start!==rtl?-10:10)),y:anchor.y+(vertical&&start?-10:10)};
 }
 begin(start,x,y){
  const p=this.endpoint(start);if(!p)return null;
  const fixed=this.range.cloneRange();fixed.collapse(!start);
  return {fixed,visualFixed:this.visual?(start?this.visual.end:this.visual.start):null,start,vertical:p.vertical,band:p.box,point:p.caret,dx:x-p.caret.x,dy:y-p.caret.y};
 }
 move(drag,x,y){
  const {fixed,vertical,band}=drag;x-=drag.dx;y-=drag.dy;
  const low=vertical?band.left:band.top,high=vertical?band.right:band.bottom,pad=(high-low)*.2;
  const cross=vertical?x:y;
  if(cross>=low-pad&&cross<=high+pad){if(vertical)x=(low+high)/2;else y=(low+high)/2;}
  // Do not re-hit-test an unchanged caret: invisible publisher characters can
  // give the same painted position several different DOM boundaries.
  if(Math.hypot(x-drag.point.x,y-drag.point.y)<.5)return false;
  drag.point={x,y};
  const frame=this.doc.defaultView.frameElement.getBoundingClientRect();
  if(this.visual){
   const boundary=this.visual.boundary(x-frame.left,y-frame.top);
   if(!this.visual.select(drag.visualFixed,boundary))return false;
   this.applyVisual();drag.start=boundary<drag.visualFixed;
   const p=this.endpoint(drag.start);if(p)drag.band=p.box;
   return !!this.text.trim();
  }
  const point=this.doc.caretRangeFromPoint(Math.max(1,Math.min(frame.width-1,x-frame.left)),Math.max(1,Math.min(frame.height-1,y-frame.top)));
  if(!point||!this.doc.body.contains(point.startContainer))return false;
  const el=point.startContainer.nodeType===1?point.startContainer:point.startContainer.parentElement;
  if(el.closest('script,style'))return false;
  const next=this.doc.createRange(),before=point.compareBoundaryPoints(0,fixed)<0;
  const first=before?point:fixed,last=before?fixed:point;
  next.setStart(first.startContainer,first.startOffset);next.setEnd(last.startContainer,last.startOffset);
  if(!next.toString().trim())return false;
  this.set(next);drag.start=before;
  const p=this.endpoint(before);if(p)drag.band=p.box;
  return !!this.text.trim();
 }
}
