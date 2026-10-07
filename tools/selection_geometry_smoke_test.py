"""Exercise DOM selection geometry on the device's real WebView."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
wait_js('window.polyReader?.state')
checks=js(r"""(async()=>{
 const {TextSelection}=await import('./text-selection.js');
 const frame=document.createElement('iframe');
 frame.style.cssText='position:fixed;left:0;top:0;width:360px;height:700px;z-index:100;background:white';
 document.body.append(frame);
 const d=frame.contentDocument,checks=[];
 const check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name)};
 try{
  d.open();d.write('<style>body{margin:30px;font:24px/1.6 sans-serif}p{margin:0 0 20px}.hide{display:none}</style><p id="wrap"><span class="hide">hidden prefix</span><span id="first">가나다 라마바 사아자 차카타 파하나 다라마 </span><b id="last">바사 아자차 카타파 하가나다</b><span class="hide">hidden suffix</span></p><p id="rtl" dir="rtl">אבג דהו זחט</p>');d.close();
  const c=new TextSelection(d),p=d.getElementById('wrap'),first=d.getElementById('first').firstChild,last=d.getElementById('last').firstChild;
  const glyph=(n,i)=>{const r=d.createRange();r.setStart(n,i);r.setEnd(n,i+1);return r.getBoundingClientRect()};
  const r=d.createRange();r.setStart(first,2);r.setEnd(p,p.childNodes.length);c.set(r);
  const a=c.endpoint(true),b=c.endpoint(false),aBox=glyph(first,2),bBox=glyph(last,last.length-1);
  check('Wrapped selection starts at its first painted character',Math.abs(a.caret.x-aBox.left)<1&&Math.abs(a.box.top-aBox.top)<1);
  check('Wrapped selection ends at its last painted character',Math.abs(b.caret.x-bBox.right)<1&&Math.abs(b.box.bottom-bBox.bottom)<1);
  check('Horizontal teardrops both sit below text',a.y>aBox.bottom&&b.y>bBox.bottom);
  for(const start of [true,false])for(const delta of [-5,5]){
   c.set(r);const p=c.endpoint(start),text=c.text,drag=c.begin(start,p.x,p.y);
   c.move(drag,p.x,p.y+delta);
   check('Small perpendicular movement preserves endpoint '+start+' '+delta,c.text===text);
   check('Stationary caret preserves DOM boundary '+start+' '+delta,c.range.startContainer===r.startContainer&&c.range.startOffset===r.startOffset&&c.range.endContainer===r.endContainer&&c.range.endOffset===r.endOffset);
  }
  c.set(r);const end=c.endpoint(false),drag=c.begin(false,end.x,end.y),text=c.text;
  c.move(drag,end.x,end.y-45);
  check('Crossing to another line changes the range',c.text!==text);
  const rtl=d.createRange();rtl.selectNodeContents(d.getElementById('rtl'));c.set(rtl);
  check('RTL endpoints use the corresponding visual sides',c.endpoint(true).caret.x>c.endpoint(false).caret.x&&c.endpoint(true).corner==='top-left');
  c.clear();check('Clearing removes the painted selection',!d.defaultView.CSS.highlights.has('polyreader_selection'));
  return checks;
 }finally{frame.remove()}
})()""")
for name in checks:print('PASS',name)
