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
 const naverWord=(id,number,script,definition)=>({matchType:'exact:entry',expEntry:'<b>word</b>',expEntrySuperscript:number,expKanji:'',expKoreanHanja:'',expAliasGeneralAlwaysList:[{originLanguageValue:script}],searchPhoneticSymbolList:[{symbolValue:'reading',symbolFile:'https://example.org/audio.mp3'}],expAliasEntrySearchList:[{conjValue:'inflected word'}],meansCollector:[{partOfSpeech:'adjective',means:[{order:'1',value:definition,exampleOri:'Example sentence',subjectGroup:'domain'}]}],entryId:id,sourceDictnameKO:'Dictionary'});
 rows=await parse('naver',JSON.stringify({searchResultMap:{searchResultListMap:{WORD:{items:[naverWord('a','1','浩蕩하다','First meaning'),naverWord('b','2','豪宕하다','Second meaning'),{matchType:'prefix:entry',expEntry:'Different word'}]}}}}),'ko');
 check('NAVER original scripts remain paired with distinct homographs',rows.length===2&&rows[0].text.includes('浩蕩하다')&&!rows[0].text.includes('豪宕')&&rows[1].text.includes('豪宕하다')&&rows[1].text.includes('Second meaning')&&rows[0].url!==rows[1].url);
 check('NAVER keeps pronunciation, examples, domains and inflections',rows[0].text.includes('reading')&&rows[0].text.includes('Example sentence')&&rows[0].text.includes('[domain]')&&rows[0].text.includes('inflected word')&&!rows[0].text.includes('audio.mp3'));
 check('NAVER identifies the publisher and search-summary scope',rows[0].publisher==='Dictionary'&&rows[0].coverage==='search_summary');
 rows=await parse('wiktionary',JSON.stringify({parse:{title:'word',text:'<div><h2 id="Japanese">Japanese</h2><h3>Etymology 1</h3><p>First origin</p><h4>Pronunciation</h4><p>First reading</p><h4>Noun</h4><p>Headword 漢字</p><ol><li>First sense<ul><li>Old quotation<dl><dd>'+('Long quotation. '.repeat(600))+'</dd></dl></li></ul></li><li>Second sense</li></ol><h4>Translations</h4><p>Unrelated translations</p><h3>Etymology 2</h3><p>Second origin</p><h4>Verb</h4><ol><li>Final sense</li></ol></div>'}}));
 check('Wiktionary quotations cannot crowd out later senses or original script',rows[0].text.includes('First sense')&&rows[0].text.includes('Second sense')&&rows[0].text.includes('漢字')&&!rows[0].text.includes('Long quotation'));
 check('Wiktionary keeps later etymologies and their sense associations',rows[0].text.includes('Etymology 2 / Verb')&&rows[0].text.includes('Second origin')&&rows[0].text.includes('Final sense')&&!rows[0].text.includes('Unrelated translations'));
 rows=await parse('wiktionary',JSON.stringify({parse:{title:'word',text:'<h2 id="Japanese">Japanese</h2><h3>Etymology 1</h3><p>'+('Long origin '.repeat(800))+'</p><h4>Noun</h4><ol><li>Early sense</li></ol><h3>Etymology 2</h3><p>Later origin</p><h4>Verb</h4><ol><li>Later sense</li></ol>'}}));
 check('Long lexical sections share the budget with later etymologies',rows[0].truncated&&rows[0].text.length<=3500&&rows[0].text.includes('Early sense')&&rows[0].text.includes('Later origin')&&rows[0].text.includes('Later sense'));
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
  const pending={role:'assistant',content:'Interrupted answer',incomplete:true};ai.session.messages.push(pending);ai.current={message:pending};ai.stop();
  const retry=body.querySelector('.ai-retry'),style=getComputedStyle(retry),icon=getComputedStyle(retry,'::before');
  check('Retry is a visible outlined button with an icon and matching height',!retry.hidden&&style.borderTopStyle==='solid'&&parseFloat(style.borderTopWidth)>0&&retry.getBoundingClientRect().height===body.querySelector('.ai-send').getBoundingClientRect().height&&icon.maskImage!=='none');
  let retried=0;ai.answer=()=>{retried++;};retry.click();check('Retry submits once and replaces the incomplete response',retried===1&&!ai.session.messages.includes(pending));
  ai.dictionariesPanel();check('Settings include all five built-in sources',body.querySelectorAll('.ai-provider-row').length===5);
  const first=body.querySelector('.ai-drag-handle');first.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));await new Promise(r=>setTimeout(r,10));check('Dictionary order is saved using the drag handle',ai.settings.dictionaries.sources[0].id==='naver');
  [...body.querySelectorAll('button')].find(b=>b.textContent==='添加来源').click();check('Adding a source exposes URL and extraction controls',body.textContent.includes('查询网址')&&body.textContent.includes('CSS'));
  return checks;
 }finally{ai.dismiss();panel.hidden=true;body.replaceChildren();}
})()""")
for name in checks:print('PASS',name)
