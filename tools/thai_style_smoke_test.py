"""Verify the Thai preset, font variants and paginated layout in Android WebView."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
wait_js('window.polyReader?.state')
checks=js(r"""(async()=>{
 const {EPUB}=await import('./vendor/foliate/epub.js'),{RidiEngine}=await import('./engines.js'),{profiles,layoutPrefs}=await import('./profiles.js');
 const text='นี่คือหนังสือภาษาไทย ที่มีเสียงวรรณยุกต์และสระอยู่ด้านบนและด้านล่าง อ่านต่อไปในหน้าถัดไป';
 const files={
  'META-INF/container.xml':'<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  'book.opf':'<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">thai-test</dc:identifier><dc:title>Thai test</dc:title><dc:language>th</dc:language></metadata><manifest><item id="text" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="text"/></spine></package>',
  'chapter.xhtml':'<html xmlns="http://www.w3.org/1999/xhtml" lang="th"><head><style>p{margin:1em 0;text-indent:2em}h1{font-size:1.6em}</style></head><body><h1>บทนำ</h1><p><strong>ตัวหนา</strong> <em>ตัวเอียง</em> <strong><em>หนาและเอียง</em></strong></p>'+Array.from({length:12},()=>'<p>'+text+'</p>').join('')+'</body></html>'
 };
 const book=await new EPUB({loadText:async n=>files[n]??null,loadBlob:async n=>files[n]?new Blob([files[n]]):null,getSize:n=>files[n]?.length||0}).init();
 const host=document.createElement('div');host.style.cssText='position:fixed;inset:0 auto auto 0;width:360px;height:640px;z-index:99';document.body.append(host);
 const engine=new RidiEngine(),prefs=layoutPrefs(profiles.find(p=>p.id==='ridi-thai').defaults),checks=[],check=(n,ok)=>{if(!ok)throw Error(n);checks.push(n)};
 try{
  await engine.mount(host,book,prefs,null,{content(){},location(){},redraw(){},notice(){},error(e){throw e}},null);
  await new Promise(r=>setTimeout(r,400));while(engine.busy)await new Promise(r=>setTimeout(r,20));
  const d=engine.doc,s=el=>d.defaultView.getComputedStyle(el),p=d.querySelectorAll('p')[1],b=d.body;
  check('All four Garuda variants load',[...d.fonts].filter(f=>f.family==='Garuda'&&f.status==='loaded').length===4);
  check('Thai body uses its own size and line spacing',s(p).fontFamily.includes('Garuda')&&s(p).fontSize==='28px'&&s(p).lineHeight==='42px');
  check('Thai margins and publisher indentation apply',s(b).marginTop==='36px'&&s(b).marginLeft==='24px'&&s(b).marginBottom==='36px'&&s(p).textIndent==='56px');
  check('Heading and emphasis retain weight and slant',s(d.querySelector('h1')).fontWeight==='700'&&s(d.querySelector('em')).fontStyle==='italic');
  const first=engine.location.cfi;
  check('Thai content spans several pages',engine.pages>2);
  await engine.turn(1);check('Next page advances Thai text',engine.location.cfi!==first);
  await engine.turn(-1);check('Previous page returns to the same text',engine.location.cfi===first);
  await engine.settings({...prefs,theme:'night'});
  check('Night mode retains Garuda and applies shared palette',s(p).fontFamily.includes('Garuda')&&s(p).color==='rgb(190, 190, 190)');
  await engine.settings({...prefs,fontSize:32,lineHeight:1.65,margin:30});
  check('Thai typography controls reflow content',s(p).fontSize==='32px'&&s(p).lineHeight==='52.8px'&&s(b).marginLeft==='30px'&&engine.pages>2);
  const publisher=d.createElement('style');
  publisher.textContent='@font-face{font-family:PublisherThai;src:url("https://appassets.androidplatform.net/app/fonts/Garuda.ttf")}html{font-family:serif}h1{font-family:sans-serif}p.publisher{font-family:PublisherThai}';
  d.head.insertBefore(publisher,engine.style);p.className='publisher';
  await engine.settings(prefs);
  check('Publisher root and heading fonts take precedence',s(b).fontFamily==='serif'&&s(d.querySelector('h1')).fontFamily==='sans-serif');
  check('Publisher web font is used',s(p).fontFamily==='PublisherThai'&&[...d.fonts].some(f=>f.family==='PublisherThai'&&f.status==='loaded'));
  b.style.fontFamily='monospace';
  check('Publisher body font is inherited',s(d.querySelector('p')).fontFamily==='monospace');
  await engine.settings({...prefs,font:'garuda'});
  check('Explicit Garuda choice overrides publisher text fonts',s(p).fontFamily.includes('Garuda')&&s(b).fontFamily.includes('Garuda'));
  await engine.settings(prefs);
  check('Returning to original restores publisher fonts',s(p).fontFamily==='PublisherThai'&&s(b).fontFamily==='monospace');
  publisher.remove();b.style.removeProperty('font-family');p.className='';
  await engine.settings(prefs);
  check('Unspecified fonts fall back to Garuda',s(p).fontFamily.includes('Garuda')&&s(d.querySelector('h1')).fontFamily.includes('Garuda'));
  const regular=layoutPrefs(profiles.find(p=>p.id==='ridi').defaults);
  await engine.settings(regular);
  check('Garuda fallback is confined to RIDI Thai',!s(p).fontFamily.includes('Garuda'));
  return checks;
 }finally{engine.destroy();book.destroy();host.remove()}
})()""")
for name in checks:print('PASS',name)
