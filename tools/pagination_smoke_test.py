"""Exercise RIDI page boundaries with synthetic image and navigation chapters."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
wait_js('window.polyReader?.state')
checks=js(r"""(async()=>{
 const {RidiEngine}=await import('./engines.js'),{profiles,layoutPrefs}=await import('./profiles.js'),CFI=await import('./vendor/foliate/epubcfi.js');
 const host=document.createElement('div');host.style.cssText='position:fixed;inset:0 auto auto 0;width:340px;height:650px;z-index:99';document.body.append(host);
 const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="teal"/></svg>');
 const bodies=[Array.from({length:3},(_,i)=>`<figure id="image${i}"><img src="${image}" alt="${i}"/></figure>`).join(''),'<nav><ol>'+Array.from({length:14},(_,i)=>`<li><a href="#item${i}">Chapter ${i+1} 가나다 라마바</a></li>`).join('')+'</ol></nav>','<p>Following chapter</p>'];
 const urls=bodies.map(body=>URL.createObjectURL(new Blob([`<html xmlns="http://www.w3.org/1999/xhtml"><head><style>figure{margin:0;break-before:column;break-after:column}img{display:block;width:100%;height:auto}li{margin:.8em 0}</style></head><body>${body}</body></html>`],{type:'application/xhtml+xml'})));
 const book={sections:urls.map((url,i)=>({id:'section'+i,cfi:CFI.fake.fromIndex(i),size:1000,load:async()=>url})),resolveCFI(cfi){const parts=CFI.parse(cfi),top=(parts.parent??parts).shift();return {index:CFI.fake.toIndex(top),anchor:doc=>CFI.toRange(doc,parts)}}};
 const e=new RidiEngine(),checks=[],check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name)};
 const p={...layoutPrefs(profiles.find(p=>p.id==='ridi').defaults),topMargin:30,bottomMargin:30};
 try{
  await e.mount(host,book,p,null,{content(){},location(){},redraw(){},notice(){},error(x){throw x}},null);
  await new Promise(r=>setTimeout(r,300));
  check('Image chapter has three pages',e.pages===3);
  const first=e.location.cfi;await e.turn(1);const second=e.location.cfi;await e.turn(1);const last=e.location.cfi;
  check('Each image page has its own saved location',first!==second&&second!==last&&first!==last);
  check('Last image reaches its full viewport',Math.abs(e.frame.contentWindow.scrollX-2*e.pageUnit)<2);
  await e.turn(1);check('Last image advances to navigation chapter',e.index===1);
  await e.go(last);check('Image CFI restores the same last page',e.index===0&&e.location.page===3);
  await e.turn(1);check('Navigation fixture spans multiple pages',e.pages>1);
  for(const margin of [0,20,54]){
   await e.settings({...p,margin});await e.moveAnchor(1);e.emitLocation();
   check('Last navigation page aligns at margin '+margin,Math.abs(e.frame.contentWindow.scrollX-(e.pages-1)*e.pageUnit)<2);
   await e.turn(1);check('Navigation advances to text at margin '+margin,e.index===2);
   await e.turn(-1);check('Reverse turn restores last navigation page at margin '+margin,e.index===1&&e.location.page===e.pages);
  }
  await e.moveAnchor(0);await e.turn(-1);check('Reverse chapter boundary restores last image',e.index===0&&e.location.page===e.pages);
  const chapter=e.index;await e.settings({...p,flow:'scrolled'});
  check('Scroll mode clears horizontal page extent',e.doc.documentElement.scrollWidth<=host.clientWidth+1);
  await e.moveAnchor(1);await e.turn(1);check('Scroll-mode end advances to next chapter',e.index===chapter+1);
  return checks;
 }finally{e.destroy();host.remove();urls.forEach(URL.revokeObjectURL)}
})()""")
for name in checks:print('PASS',name)
