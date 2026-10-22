"""Check EPUB metadata variants in the installed WebView without changing the library."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
wait_js('window.polyReader?.state')
checks=js(r"""(async()=>{
 const {EPUB}=await import('./vendor/foliate/epub.js');
 const checks=[],check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name);};
 const fields='<dc:title id="title">Fixture title</dc:title><dc:creator id="author">Fixture author</dc:creator><dc:identifier id="book-id">urn:fixture:metadata</dc:identifier><dc:language>zh-CN</dc:language>';
 const container='<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';
 const chapter='<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Fixture</title></head><body><p>Readable chapter</p></body></html>';
 const open=async(metadata,version='2.0')=>{
  const files={'META-INF/container.xml':container,'chapter.xhtml':chapter,'book.opf':`<package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/" version="${version}" unique-identifier="book-id">${metadata}<manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="cover" href="cover.png" media-type="image/png"/></manifest><spine><itemref idref="chapter"/></spine></package>`};
  return new EPUB({loadText:async path=>files[path]??null,loadBlob:async()=>new Blob(['image']),getSize:path=>files[path]?.length??0}).init();
 };
 for(const [name,metadata] of [
  ['flat',`<metadata>${fields}<meta name="cover" content="cover"/></metadata>`],
  ['wrapped',`<metadata><dc-metadata>${fields}</dc-metadata><x-metadata><meta name="cover" content="cover"/><meta name="calibre:title_sort" content="Sorted title"/></x-metadata></metadata>`]
 ]){
  const book=await open(metadata);
  try{
   check(name+' metadata preserves title, author, identifier and language',book.metadata.title==='Fixture title'&&book.metadata.author==='Fixture author'&&book.metadata.identifier==='urn:fixture:metadata'&&book.metadata.language==='zh-CN');
   check(name+' metadata preserves cover and readable sections',(await book.getCover()).type==='image/png'&&book.sections.length===1&&(await book.sections[0].createDocument()).querySelector('p').textContent==='Readable chapter');
   if(name==='wrapped')check('Wrapped extension metadata is retained',book.metadata.sortAs==='Sorted title');
  }finally{book.destroy();}
 }
 const modern=await open(`<metadata>${fields}<meta refines="#author" property="role" scheme="marc:relators">trl</meta><meta refines="#title" property="file-as">Modern title sort</meta><meta property="rendition:layout">pre-paginated</meta></metadata>`,'3.0');
 try{check('EPUB 3 refinements and rendition remain intact',modern.metadata.translator?.name==='Fixture author'&&modern.metadata.translator?.role==='trl'&&modern.metadata.sortAs==='Modern title sort'&&modern.rendition.layout==='pre-paginated');}finally{modern.destroy();}
 for(const metadata of ['', '<metadata/>', '<metadata><meta name="cover" content="cover"/></metadata>']){
  const book=await open(metadata);
  try{check('Absent descriptive fields do not prevent chapter access: '+(metadata||'missing metadata'),book.sections.length===1&&(await book.sections[0].createDocument()).querySelector('p').textContent==='Readable chapter');}finally{book.destroy();}
 }
 return checks;
})()""")
for name in checks:print('PASS',name)
