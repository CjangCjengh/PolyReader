"""Verify reading-order context and bounded book tools on Android WebView."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
wait_js('window.polyReader?.state')
checks=js(r"""(async()=>{
 const {EPUB}=await import('./vendor/foliate/epub.js'),CFI=await import('./vendor/foliate/epubcfi.js');
 const {extractContext,chapterFrame,paragraphs,paragraphText}=await import('./assistant-context.js');
 const {BookTools}=await import('./assistant-tools.js');
 const {renderMarkdown}=await import('./assistant.js');
 const files={
 'META-INF/container.xml':'<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
 'book.opf':'<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">context-test</dc:identifier><dc:title>Context</dc:title><dc:language>ko</dc:language></metadata><manifest><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="one"/><itemref idref="two"/></spine></package>',
 'one.xhtml':'<html xmlns="http://www.w3.org/1999/xhtml"><head><style>body{font:24px/1.5 sans-serif}.hidden{font-size:0}</style></head><body><p>Prior paragraph</p><p id="target">abc&#x202e;fed&#x202c;<span class="hidden">GARBAGE</span></p><p>'+('Another sentence. '.repeat(100))+'</p><p>Chapter ending</p></body></html>',
 'two.xhtml':'<html xmlns="http://www.w3.org/1999/xhtml"><head/><body><p>Next chapter first paragraph</p><p>Unique keyword hidden treasure</p></body></html>'};
 const book=await new EPUB({loadText:async n=>files[n]??null,loadBlob:async n=>files[n]?new Blob([files[n]]):null,getSize:n=>files[n]?.length||0}).init();
 const checks=[],check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name)};
 try{
  const doc=await book.sections[0].createDocument(),range=doc.createRange();range.selectNodeContents(doc.getElementById('target'));
  const cfi=CFI.joinIndir(book.sections[0].cfi,CFI.fromRange(range));
  const context=await extractContext(book,{text:'abcdef',cfi,index:0},{before:1,after:1,maxChars:3000});
  check('Context follows rendered directional overrides and removes hidden text',context.passage==='abcdef');
  check('Exact selection and neighboring paragraphs are retained',context.selected==='abcdef'&&context.before[0]==='Prior paragraph'&&context.after.length===1);
  check('Source paragraph coordinates are available to the model',context.chapter===1&&context.startParagraph===2);
  range.selectNodeContents(doc.body.lastElementChild);
  const edge=await extractContext(book,{text:'Chapter ending',cfi:CFI.joinIndir(book.sections[0].cfi,CFI.fromRange(range)),index:0},{before:0,after:1});
  check('Context crosses the chapter boundary',edge.after[0]==='Next chapter first paragraph');
  const tools=new BookTools(book),call=(name,args)=>({function:{name,arguments:JSON.stringify(args)}});
  const result=await tools.execute(call('search_book',{queries:['abcdef']}));
  check('Book search uses visual reading order',result.results.length===1&&result.results[0].text==='abcdef');
  const hidden=await tools.execute(call('search_book',{queries:['GARBAGE']}));check('Hidden obfuscation text is not searchable',hidden.results.length===0);
  const found=await tools.execute(call('search_book',{queries:['hidden treasure']}));
  check('Book-wide search returns source coordinates',found.results[0].chapter===2&&found.results[0].paragraph===2);
  const passage=await tools.execute(call('read_passage',{chapter:2,start:1,count:2}));check('Read tool returns bounded source paragraphs',passage.paragraphs.length===2);
  const saved=tools.cache.get(1);tools.cache.set(1,Array.from({length:9},(_,i)=>({chapter:2,paragraph:i+1,text:'Repeated hit '+i,cfi:'fixture'})));
  const batch=await tools.execute(call('search_book',{queries:['Repeated'],fromChapter:2})),continuation=await tools.execute(call('search_book',{queries:['Repeated'],fromChapter:batch.nextChapter,fromParagraph:batch.nextParagraph}));
  check('Search resumes inside a chapter without skipping matches',batch.results.length===6&&!batch.complete&&batch.nextParagraph===7&&continuation.results.length===3&&continuation.complete);tools.cache.set(1,saved);await tools.execute(call('read_passage',{chapter:2,start:2,count:1}));
  const source=tools.references.get('2:2'),target=book.resolveCFI(source.cfi),sourceDoc=await book.sections[target.index].createDocument();check('Retrieved citation resolves to the source text',target.anchor(sourceDoc).toString().includes('hidden treasure'));
  let rejected=false;try{await tools.execute(call('read_passage',{chapter:1,start:1,count:1000}));}catch{rejected=true;}check('Read limits reject oversized tool arguments',rejected);
  const abort=new AbortController();abort.abort();rejected=false;try{await tools.execute(call('search_book',{queries:['test']}),abort.signal);}catch{rejected=true;}check('Cancelled searches stop',rejected);
  const root=document.createElement('div');renderMarkdown(root,'**Meaning**\n<img src=x onerror=alert(1)>');check('Model Markdown cannot execute HTML',!root.querySelector('img')&&root.querySelector('strong').textContent==='Meaning');
  return checks;
 }finally{book.destroy();}
})()""")
for name in checks:print('PASS',name)
