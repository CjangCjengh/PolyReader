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
  d.body.innerHTML='<p id="override">abc\u202efed\u202c<span style="font-size:0">hidden</span></p>';
  const overridden=d.createRange();overridden.selectNodeContents(d.getElementById('override'));c.set(overridden);
  check('Directional overrides follow the visible reading order',c.text==='abcdef');
  const endPoint=c.endpoint(false),grip=c.begin(false,endPoint.x,endPoint.y),letter=c.visual.glyphs.find(g=>g.text==='d');
  c.move(grip,letter.box.right+grip.dx,(letter.box.top+letter.box.bottom)/2+grip.dy);
  check('Dragging selects a continuous visual prefix across a reversed run',c.text==='abcd');
  const contains=(ranges,g)=>ranges.some(r=>r.comparePoint(g.node,g.offset)===0&&r.comparePoint(g.node,g.offset+g.text.length)===0);
  check('Highlight includes every chosen glyph without selecting following glyphs',c.visual.glyphs.every(g=>contains(c.ranges,g)==='abcd'.includes(g.text)));
  check('End handle aligns with the last visual glyph',Math.abs(c.endpoint(false).caret.x-letter.box.right)<1);
  const CFI=await import('./vendor/foliate/epubcfi.js');
  const restored=c.ranges.map(r=>CFI.toRange(d,CFI.parse(CFI.fromRange(r))));
  check('Split highlight ranges survive CFI serialization',c.visual.glyphs.every(g=>contains(restored,g)==='abcd'.includes(g.text)));
  d.body.innerHTML='<p style="width:60px"><span>abc</span> <span>\u202efed\u202c</span></p>';
  const wrapped=d.createRange();wrapped.selectNodeContents(d.body.firstChild);c.set(wrapped);
  check('Soft-wrapped word separators survive visual ordering',c.text==='abc def');
  c.clear();check('Clearing removes the painted selection',!d.defaultView.CSS.highlights.has('polyreader_selection'));
  return checks;
 }finally{frame.remove()}
})()""")
for name in checks:print('PASS',name)
