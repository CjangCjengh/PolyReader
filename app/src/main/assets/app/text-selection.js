// Keep the range in the document; the host owns the handles and action menu.
export class TextSelection {
 constructor(doc){
  this.doc=doc;this.range=null;
  this.supported=!!(doc.defaultView.CSS?.highlights&&doc.defaultView.Highlight);
 }
 set(range){
  this.range=range.cloneRange();
  if(this.supported){
   // Selection.toString follows rendered text, including publisher visibility rules.
   const selection=this.doc.getSelection();selection.removeAllRanges();selection.addRange(this.range);
   this.text=selection.toString();selection.removeAllRanges();
   this.doc.defaultView.CSS.highlights.set('polyreader_selection',new this.doc.defaultView.Highlight(this.range));
  }else this.text=this.doc.getSelection().toString();
 }
 clear(){this.range=null;this.doc.defaultView.CSS?.highlights?.delete('polyreader_selection');this.doc.getSelection()?.removeAllRanges();}
 endpoint(start){
  const r=this.range.cloneRange();r.collapse(start);
  const box=r.getClientRects()[0]||r.getBoundingClientRect();
  const el=r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement;
  const vertical=this.doc.defaultView.getComputedStyle(el).writingMode.startsWith('vertical');
  const frame=this.doc.defaultView.frameElement.getBoundingClientRect();
  const caret={x:frame.left+(vertical?box.left+box.width/2:box.left),y:frame.top+(vertical?box.top:box.top+box.height/2)};
  return {caret,x:frame.left+(vertical?(start?box.right:box.left):(start?box.left:box.right))+(start?(vertical?1:-1):(vertical?-1:1))*4.9,
   y:frame.top+(start?box.top:box.bottom)+(start?-4.9:4.9)};
 }
 move(fixed,x,y){
  const frame=this.doc.defaultView.frameElement.getBoundingClientRect();
  const point=this.doc.caretRangeFromPoint(Math.max(1,Math.min(frame.width-1,x-frame.left)),Math.max(1,Math.min(frame.height-1,y-frame.top)));
  if(!point||!this.doc.body.contains(point.startContainer))return false;
  const el=point.startContainer.nodeType===1?point.startContainer:point.startContainer.parentElement;
  if(el.closest('script,style'))return false;
  const next=this.doc.createRange(),before=point.compareBoundaryPoints(0,fixed)<0;
  const first=before?point:fixed,last=before?fixed:point;
  next.setStart(first.startContainer,first.startOffset);next.setEnd(last.startContainer,last.startOffset);
  if(!next.toString().trim())return false;
  this.set(next);return !!this.text.trim();
 }
}
