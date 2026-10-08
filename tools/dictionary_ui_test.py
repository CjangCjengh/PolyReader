"""Dictionary parsing, source settings and harness regression on the installed WebView."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
wait_js('window.polyReader?.state')
checks=js(r"""(async()=>{
 const {lookupSource,validateSource}=await import('./dictionary-sources.js');
 const {Assistant,renderMarkdown}=await import('./assistant.js');
 const checks=[],check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name);};
 const parse=(adapter,body,language='ja',extra={})=>lookupSource({adapter,...extra},'word',language,async()=>({body}),new AbortController().signal,1000);
 let rows=await parse('weblio','<div class="kiji"><h2 class="midashigo">Headword</h2><p>Definition</p><script>bad()</script></div>');
 check('Weblio extracts entries without scripts or page furniture',rows[0].text.includes('Definition')&&!rows[0].text.includes('bad'));
 rows=await parse('wiktionary',JSON.stringify({parse:{title:'word',text:'<div><div class="mw-heading mw-heading2"><h2 id="Japanese">Japanese</h2></div><h3>Etymology</h3><p>Japanese origin</p><div class="mw-heading mw-heading2"><h2 id="English">English</h2></div><p>Other language</p></div>'}}));
 check('Wiktionary keeps only the requested language section',rows[0].text.includes('Japanese origin')&&!rows[0].text.includes('Other language'));
 rows=await parse('naver',JSON.stringify({searchResultMap:{searchResultListMap:{WORD:{items:[{matchType:'exact:entry',expEntry:'<b>word</b>',expKanji:'漢字',meansCollector:[{partOfSpeech:'noun',means:[{value:'Definition'}]}],entryId:'abc'},{matchType:'prefix:entry',expEntry:'Different word'}]}}}}),'ko');
 check('NAVER keeps exact headwords, definitions and original script',rows.length===1&&rows[0].text.includes('漢字')&&rows[0].text.includes('Definition'));
 rows=await parse('tudientv',"<p id='headword'>word</p><section><p class='explanation'>Definition</p></section>",'vi');check('Vietnamese entry body is extracted',rows[0].text.includes('Definition'));
 rows=await parse('orst','<div class="panel-body"><div class="panel-info"><div class="panel-title">word</div><div class="panel-body">Definition</div></div></div>','th');check('Thai entry body is extracted',rows[0].text==='Definition');
 check('A missing Vietnamese entry is distinct from a transport failure',(await parse('tudientv','','vi')).length===0);
 const custom={name:'Custom',languages:['en'],purpose:'both',url:'https://example.org/?q={query}',method:'GET',format:'json',path:'data.entries.*.definition'};
 rows=await parse('custom',JSON.stringify({data:{entries:[{definition:'First'},{definition:'Second'}]}}),'en',custom);check('Custom JSON field paths handle arrays',rows.length===2&&rows[1].text==='Second');
 const panel=document.getElementById('panel'),body=document.getElementById('panel-body');let ai,round=0,active=0,peak=0,opened,copied;
 const requests=[];
 ai=new Assistant({state:{assistant:{learn:false,retrieval:true}},save(){},toast(){},showPanel(){panel.hidden=false;body.replaceChildren();return body;},closePanel(){panel.hidden=true;},send(action,data){
  if(action==='openLink'){opened=data.url;return;}if(action==='copy'){copied=data.text;return;}if(action.endsWith('Cancel'))return;
  if(action!=='aiChat')throw Error(action);requests.push(structuredClone(data));const turn=++round;
  setTimeout(()=>{const emit=(type,value={})=>ai.receive({id:data.id,type,...value});emit('attempt',{model:'Fixture',attempt:1});
   if(turn===1){emit('delta',{text:'Context-supported opening.'});emit('done',{toolCalls:[{id:'book',function:{name:'read_passage',arguments:'{}'}},{id:'dict',function:{name:'lookup_dictionary',arguments:'{"query":"word","language":"ja","purpose":"both"}'}}]});}
   else{emit('delta',{text:'Discard this failed continuation.'});emit('attempt',{model:'Fallback',attempt:2});emit('delta',{text:'Verified explanation. [D1]'});emit('done',{toolCalls:[],usage:{}});}
  },5);
 }});
 const execute=async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,20));active--;return {evidence:'Result'};};
 try{
  ai.bookTools={execute,references:new Map()};ai.dictionaryTools.execute=execute;ai.dictionaryTools.references.set('D1',{source:'Fixture dictionary',url:'https://example.org/word'});
  ai.session={id:'test',bookId:'test',title:'Fixture',language:'ja',context:{selected:'word',before:[],after:[],passage:'Context'},messages:[]};ai.chatPanel();await ai.answer();
  check('Independent book and dictionary tools run concurrently',peak===2);
  check('Verified continuation preserves earlier streamed text through fallback',ai.session.messages[0].content==='Context-supported opening.\n\nVerified explanation. [D1]');
  check('Dictionary evidence is a separate tool result',requests[1].messages.some(m=>m.role==='tool'&&m.tool_call_id==='dict'));
  const citation=body.querySelector('.ai-citation');check('Dictionary citations display source names',citation.textContent==='Fixture dictionary'&&!body.textContent.includes('[D1]'));citation.click();check('Citation opens only its returned URL',opened==='https://example.org/word');
  body.querySelector('.ai-copy').click();check('Copy includes readable dictionary attribution',copied.includes('[Fixture dictionary](https://example.org/word)'));
  const root=document.createElement('div');renderMarkdown(root,'Verified [D',{streaming:true,citation:()=>null});check('Partial dictionary citation is hidden while streaming',root.textContent==='Verified ');
  ai.dictionariesPanel();check('Settings include all five built-in sources',body.querySelectorAll('.ai-provider-row').length===5);
  const first=body.querySelector('.ai-drag-handle');first.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));await new Promise(r=>setTimeout(r,10));check('Dictionary order is saved using the drag handle',ai.settings.dictionaries.sources[0].id==='naver');
  [...body.querySelectorAll('button')].find(b=>b.textContent==='添加来源').click();check('Adding a source exposes URL and extraction controls',body.textContent.includes('查询网址')&&body.textContent.includes('CSS'));
  return checks;
 }finally{ai.dismiss();panel.hidden=true;body.replaceChildren();}
})()""")
for name in checks:print('PASS',name)
