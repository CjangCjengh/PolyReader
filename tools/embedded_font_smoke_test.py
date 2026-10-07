"""Load a real embedded font through mismatched CSS, manifest and archive casing."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
wait_js('window.polyReader?.state')
checks=js(r"""(async()=>{
 const {EPUB}=await import('./vendor/foliate/epub.js'),{resourceIndex}=await import('./epub-resources.js'),{RidiEngine}=await import('./engines.js'),{profiles,layoutPrefs}=await import('./profiles.js');
 const font=await(await fetch('fonts/RIDIBatang.otf')).arrayBuffer();
 const files=new Map([
  ['META-INF/container.xml','<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'],
  ['OEBPS/Book.OPF','<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">font-test</dc:identifier><dc:title>Font test</dc:title><dc:language>vi</dc:language></metadata><manifest><item id="text" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="css" href="styles/main.css" media-type="text/css"/><item id="font" href="fonts/Heading.OTF" media-type="font/otf"/></manifest><spine><itemref idref="text"/></spine></package>'],
  ['OEBPS/chapter.xhtml','<html xmlns="http://www.w3.org/1999/xhtml"><head><link rel="stylesheet" href="STYLES/MAIN.CSS"/></head><body><h1>Chương 1</h1><p>Chapter body</p></body></html>'],
  ['OEBPS/Styles/Main.CSS','@font-face{font-family:ChapterFont;src:url("../FONTS/heading.otf")}@font-face{font-family:ChapterAlias;src:url("../fonts/Heading.OTF")}h1{font-family:ChapterFont;font-weight:normal;font-size:32px}p{font-family:serif}'],
  ['OEBPS/Fonts/Heading.OTF',font],
 ]);
 const resources=resourceIndex([...files].map(([name,data])=>({name,size:data.byteLength||data.length}))),reads=[];
 const book=await new EPUB({loadText:async name=>files.get(resources.resolve(name))??null,loadBlob:async name=>{const path=resources.resolve(name);reads.push(path);return path?new Blob([files.get(path)]):null;},getSize:resources.size,resolvePath:resources.resolve}).init();
 const host=document.createElement('div');host.style.cssText='position:fixed;inset:0 auto auto 0;width:360px;height:640px;z-index:99';document.body.append(host);
 const e=new RidiEngine(),checks=[],check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name)};
 const prefs=layoutPrefs(profiles.find(p=>p.id==='ridi').defaults);
 try{
  await e.mount(host,book,prefs,null,{content(){},location(){},redraw(){},notice(){},error(x){throw x}},null);
  const d=e.doc,s=el=>d.defaultView.getComputedStyle(el),title=d.querySelector('h1');
  check('Heading font loads despite CSS and archive casing differences',[...d.fonts].find(f=>f.family==='ChapterFont')?.status==='loaded');
  check('Font alias also resolves the same embedded file',(await d.fonts.load('32px ChapterAlias')).length===1);
  check('Correct binary is fetched once and reused',reads.length===1&&reads[0]==='OEBPS/Fonts/Heading.OTF');
  check('Publisher title face and size are preserved',s(title).fontFamily==='ChapterFont'&&s(title).fontSize==='32px');
  check('Body font remains independent',s(d.querySelector('p')).fontFamily==='serif');
  await e.settings({...prefs,theme:'night'});
  check('Embedded heading survives theme changes',[...d.fonts].find(f=>f.family==='ChapterFont')?.status==='loaded'&&s(title).color==='rgb(190, 190, 190)');
  return checks;
 }finally{e.destroy();book.destroy();host.remove()}
})()""")
for name in checks:print('PASS',name)
