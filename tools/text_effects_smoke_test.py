"""Check publisher text effects, fragmentation, night paint and CFI stability."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
wait_js('window.polyReader?.state')
checks=js(r"""(async()=>{
 const {RidiEngine,cfiFor}=await import('./engines.js'),{profiles,layoutPrefs}=await import('./profiles.js'),CFI=await import('./vendor/foliate/epubcfi.js');
 const host=document.createElement('div');host.style.cssText='position:fixed;inset:0 auto auto 0;width:360px;height:640px;z-index:99';document.body.append(host);
 const html=`<html xmlns="http://www.w3.org/1999/xhtml"><head><style>
 body{font-family:serif}p{margin:0;line-height:1.6}.lead{height:400px}
 .art{break-inside:avoid;container-type:inline-size;margin:12px 0}.canvas{position:relative}
 .back{font-family:sans-serif}.outline{color:transparent;-webkit-text-stroke:.025em #111;font-size:1.7em;font-weight:bold;position:absolute;top:20%;transform:scaleY(1.1)}
 .bottom{top:auto;bottom:0}.protected{break-inside:avoid}.fill{-webkit-text-fill-color:transparent}
 </style></head><body><p class="lead">Introduction</p><div class="art"><div class="canvas"><p class="back">${'가나다 라마바 사아자 차카타 파하. '.repeat(14)}</p><div class="outline"><p><span>Outlined text</span></p></div><div class="outline bottom"><span>End</span></div></div></div><p class="protected">Following paragraph</p><p class="fill">Hidden fill</p></body></html>`;
 const url=URL.createObjectURL(new Blob([html],{type:'application/xhtml+xml'}));
 const book={sections:[{id:'chapter',cfi:CFI.fake.fromIndex(0),size:1000,load:async()=>url}],resolveCFI(cfi){const parts=CFI.parse(cfi);(parts.parent??parts).shift();return {index:0,anchor:doc=>CFI.toRange(doc,parts)}}};
 const e=new RidiEngine(),checks=[],check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name)};
 const p={...layoutPrefs(profiles.find(p=>p.id==='ridi').defaults),fontSize:24,topMargin:30,bottomMargin:30};
 try{
  await e.mount(host,book,p,null,{content(){},location(){},redraw(){},notice(){},error(x){throw x}},null);
  await new Promise(r=>setTimeout(r,300));
  const d=e.doc,w=d.defaultView,s=el=>w.getComputedStyle(el),outline=d.querySelector('.outline span'),plain=d.querySelector('.back');
  check('Nested outlined letters keep transparent fill',s(outline).color==='rgba(0, 0, 0, 0)'&&s(outline).webkitTextFillColor==='rgba(0, 0, 0, 0)');
  check('Day stroke preserves author ink and thickness',s(outline).webkitTextStrokeColor==='rgb(17, 17, 17)'&&parseFloat(s(outline).webkitTextStrokeWidth)>0);
  check('Ordinary text stays solid',s(plain).color===s(plain).webkitTextFillColor&&s(plain).color!=='rgba(0, 0, 0, 0)');
  check('Explicit transparent fill survives palette overrides',s(d.querySelector('.fill')).webkitTextFillColor==='rgba(0, 0, 0, 0)');
  check('Text canvas continues across page columns',d.querySelector('.art').getClientRects().length>1);
  check('Unrelated keep-together blocks retain author rule',s(d.querySelector('.protected')).breakInside==='avoid');
  check('Author layer transform and positioning survive',s(d.querySelector('.outline')).position==='absolute'&&s(d.querySelector('.outline')).transform!=='none');
  const original=new DOMParser().parseFromString(html,'application/xhtml+xml'),r=original.createRange();r.selectNodeContents(original.querySelector('.outline span').firstChild);
  const cfi=cfiFor(book,0,r);
  check('Text-effect attributes leave existing CFI paths valid',book.resolveCFI(cfi).anchor(d).toString()==='Outlined text');
  const rects=[...d.querySelector('.art').getClientRects()].map(r=>({left:r.left+w.scrollX,top:r.top,width:r.width,height:r.height}));
  await e.settings({...p,theme:'night'});
  check('Night stroke contrasts with the dark page',s(outline).webkitTextStrokeColor==='rgb(190, 190, 190)'&&s(outline).webkitTextFillColor==='rgba(0, 0, 0, 0)');
  check('Theme changes preserve fragmentation',JSON.stringify(rects)===JSON.stringify([...d.querySelector('.art').getClientRects()].map(r=>({left:r.left+w.scrollX,top:r.top,width:r.width,height:r.height}))));
  await e.settings(p);
  check('Returning to day restores publisher stroke',s(outline).webkitTextStrokeColor==='rgb(17, 17, 17)');
  await e.turn(1);const saved=e.location.cfi;await e.turn(-1);await e.go(saved);
  check('Page navigation restores text beside layered artwork',e.location.page===2);
  return checks;
 }finally{e.destroy();host.remove();URL.revokeObjectURL(url)}
})()""")
for name in checks:print('PASS',name)
