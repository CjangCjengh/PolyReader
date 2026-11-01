"""Check chapter tracking and directory positioning in the installed reader."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
wait_js('window.polyReader?.state')
original=js('JSON.stringify(polyReader.state)')
active=js('({id:polyReader.active?.id,mode:polyReader.profile?.id,chrome:!document.body.classList.contains("chrome-hidden")})')
assert not js('!!polyReader.assistant.current'), 'An answer is still streaming'

checks=js(r"""(async()=>{
 const {EPUB}=await import('./vendor/foliate/epub.js'),{cfiFor}=await import('./engines.js'),{tocEntries,currentTocIndex}=await import('./toc.js');
 const checks=[],check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name);};
 const wrap=body=>`<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Fixture</title></head><body>${body}</body></html>`;
 const files={
  'META-INF/container.xml':'<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  'book.opf':`<package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata/><manifest>${Array.from({length:5},(_,i)=>`<item id="s${i}" href="s${i}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${Array.from({length:5},(_,i)=>`<itemref idref="s${i}"/>`).join('')}</spine></package>`
 };
 for(let i=0;i<5;i++)files[`s${i}.xhtml`]=wrap('<p id="intro">Opening text</p><h2 id="one">One</h2><p id="after-one">First section</p><h2 id="two">Two</h2><p id="after-two">Second section</p><h3 id="小节">Three</h3><p id="end">Ending text</p>');
 const book=await new EPUB({loadText:async p=>files[p]??null,loadBlob:async p=>new Blob([files[p]||'']),getSize:p=>files[p]?.length??0}).init();
 try{
  book.toc=[{label:'Opening',href:'s0.xhtml'},{label:'Part',href:'s1.xhtml',subitems:[{label:'One',href:'s1.xhtml#one'},{label:'Two',href:'s1.xhtml#two',subitems:[{label:'Three',href:'s1.xhtml#%E5%B0%8F%E8%8A%82'}]}]},{label:'Last',href:'s3.xhtml#one'}];
  const entries=tocEntries(book),loc=async(index,id)=>{const doc=await book.sections[index].createDocument(),range=doc.createRange();range.setStart(doc.getElementById(id).firstChild,0);range.collapse(true);return {index,cfi:cfiFor(book,index,range)};};
  check('Nested directory keeps depth and reading order',entries.length===6&&entries[4].depth===2);
  for(const [index,id,expected,name] of [[0,'intro',0,'opening'],[1,'intro',1,'before first subsection'],[1,'after-one',2,'first subsection'],[1,'two',3,'exact heading boundary'],[1,'after-two',3,'second subsection'],[1,'end',4,'encoded anchor'],[2,'intro',4,'chapter continues in next file'],[3,'end',5,'last chapter'],[4,'end',5,'chapter continues through final file']])check('Current entry: '+name,await currentTocIndex(book,entries,await loc(index,id))===expected);
  const anchored=entries.filter(e=>e.label!=='Part');
  check('Before first anchor retains preceding chapter',await currentTocIndex(book,anchored,await loc(1,'intro'))===0);
  const unordered=[entries[0],entries[3],entries[2]];
  check('Same-file anchors are matched by document position',await currentTocIndex(book,unordered,await loc(1,'end'))===1);
  check('Broken links do not prevent chapter tracking',await currentTocIndex(book,[...entries,{href:'missing.xhtml'},{href:'s1.xhtml#missing'},{label:'Group'}],await loc(1,'after-two'))===3);
  check('Missing location has no false current marker',await currentTocIndex(book,entries,null)===-1);
  check('Missing CFI uses current section',await currentTocIndex(book,entries,{index:1})===1);
  const fallback=tocEntries({toc:[],sections:book.sections});
  check('Books without a directory use numbered sections',fallback.length===5&&await currentTocIndex(book,fallback,{index:2})===2);
 }finally{book.destroy();}
 return checks;
})()""")
for name in checks:print('PASS',name,flush=True)

books=js(r"""(async()=>{
 const {loadBook}=await import('./engines.js'),{tocEntries}=await import('./toc.js'),out=[];
 for(const item of polyReader.library.filter(x=>x.format==='epub')){
  const book=await loadBook(item.id);
  try{const entries=tocEntries(book);out.push({id:item.id,language:item.language,count:entries.length,spaced:entries.some(t=>typeof t.href==='string'&&t.href.includes(' '))});}finally{book.destroy();}
 }
 return out;
})()""")
assert books,'Missing test book'
cases=[]
for language,reader in [('ja','bookwalker'),('ko','ridi'),('th','ridi-thai')]:
 candidates=[b for b in books if b.get('language','').startswith(language)] or (books[:1] if reader=='bookwalker' else books)
 cases.append((max(candidates,key=lambda b:b['count']),reader))
spaced=next((b for b in books if b['spaced']),None)
if spaced and (spaced,'bookwalker') not in cases:cases.append((spaced,'bookwalker'))
try:
 for item,reader in cases:
  js("(async()=>{polyReader.home();await polyReader.openBook(polyReader.library.find(x=>x.id==="+json.dumps(item['id'])+"),"+json.dumps(reader)+")})()")
  wait_js('polyReader.engine?.location?.cfi')
  target=js(r"""(async()=>{
   const {tocEntries}=await import('./toc.js'),entries=tocEntries(polyReader.book);
   const row=Math.floor((entries.length-1)*.8),href=entries[row].href,index=typeof href==='number'?href:polyReader.book.resolveHref(href).index;
   await polyReader.engine.go(href);return {index,row,count:entries.length};
  })()""")
  wait_js('polyReader.engine.location.index==='+str(target['index']))
  time.sleep(.4)
  js("document.getElementById('toc-button').click()")
  wait_js("document.querySelector('.toc-list [aria-current=location]')!==null")
  time.sleep(.2)
  info=js(r"""(()=>{
   const current=document.querySelector('.toc-list [aria-current=location]'),p=document.getElementById('panel-body'),r=current.getBoundingClientRect(),pr=p.getBoundingClientRect(),style=getComputedStyle(current);
   return {visible:r.top>=pr.top&&r.bottom<=pr.bottom,row:[...document.querySelectorAll('.toc-list button')].indexOf(current),scroll:p.scrollTop,weight:style.fontWeight,background:style.backgroundColor};
  })()""")
  assert info['visible'] and int(info['weight'])>=600,info
  assert info['row']==target['row'],(info,target)
  if target['count']>20:assert info['scroll']>0,info
  print('PASS',reader,'current chapter highlighted and visible',flush=True)
  Path('work').mkdir(exist_ok=True)
  Path('work/toc-'+reader+'.png').write_bytes(adb('exec-out','screencap','-p'))
  js("document.getElementById('panel-body').scrollTop=0;document.getElementById('panel-close').click();document.getElementById('toc-button').click()")
  wait_js("(()=>{const b=document.querySelector('.toc-list [aria-current=location]'),p=document.getElementById('panel-body');return b&&b.getBoundingClientRect().top>=p.getBoundingClientRect().top&&b.getBoundingClientRect().bottom<=p.getBoundingClientRect().bottom})()")
  print('PASS',reader,'reopening relocates the current chapter',flush=True)
  first=js("(async()=>{const {tocEntries}=await import('./toc.js'),href=tocEntries(polyReader.book)[0].href;const index=typeof href==='number'?href:polyReader.book.resolveHref(href).index;document.querySelector('.toc-list button').click();return index;})()")
  wait_js("document.getElementById('panel').hidden&&polyReader.engine.location.index==="+str(first))
  print('PASS',reader,'directory entry navigates and closes panel',flush=True)
  setting('theme','night')
  js("document.getElementById('toc-button').click()")
  wait_js("document.querySelector('.toc-list [aria-current=location]')!==null")
  assert js("(()=>{const style=getComputedStyle(document.querySelector('.toc-list [aria-current=location]'));return style.backgroundColor==='rgb(61, 70, 65)'&&style.color==='rgb(220, 227, 222)'})()")
  print('PASS',reader,'night theme keeps the current chapter readable',flush=True)
  Path('work/toc-'+reader+'-night.png').write_bytes(adb('exec-out','screencap','-p'))
finally:
 js('polyReader.home()')
 time.sleep(.5)
 js('(()=>{const s=polyReader.state;for(const k of Object.keys(s))delete s[k];Object.assign(s,'+original+');window.flushState()})()')
 if active.get('id'):
  js('polyReader.openBook(polyReader.library.find(x=>x.id==='+json.dumps(active['id'])+'),'+json.dumps(active['mode'])+')')
  wait_js('polyReader.engine?.location?.cfi')
  time.sleep(.8)
  js('Object.assign(polyReader.state,'+original+');window.flushState();polyReader.setChrome('+json.dumps(active['chrome'])+')')
 else:js('polyReader.home()')
