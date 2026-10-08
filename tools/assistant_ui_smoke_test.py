"""Exercise streaming UI, failover, follow-ups and tool orchestration without API calls."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
wait_js('window.polyReader?.state')
checks=js(r"""(async()=>{
 const {Assistant,renderMarkdown}=await import('./assistant.js'),checks=[],check=(n,ok)=>{if(!ok)throw Error(n);checks.push(n)};
 const panel=document.getElementById('panel'),body=document.getElementById('panel-body'),requests=[];
 let mode='fallback',calls=0,ai,navigated,copied;
 const send=(action,data)=>{
  if(action==='aiCancel')return;if(action==='copy'){copied=data.text;return;}if(action!=='aiChat')throw Error(action);requests.push(data);const number=++calls;
  setTimeout(()=>{
   const emit=(type,value={})=>ai.receive({id:data.id,type,...value});emit('attempt',{model:'Fixture',attempt:1});
   if(mode==='cancel'){emit('delta',{text:'partial'});return;}
   if(mode==='fallback'){emit('delta',{text:'discarded partial'});emit('failed',{code:'timeout'});emit('attempt',{model:'Fallback',attempt:2});emit('delta',{text:'**Final meaning**'});emit('done',{seconds:1,usage:{},toolCalls:[]});return;}
   if(mode==='tools'&&number===1){emit('done',{seconds:1,usage:{},toolCalls:[{id:'lookup',type:'function',function:{name:'read_passage',arguments:'{"chapter":2,"start":3,"count":1}'}}]});return;}
   if(mode==='budget'&&number<=2){emit('done',{seconds:1,usage:{},toolCalls:Array.from({length:3},(_,i)=>({id:'lookup-'+number+'-'+i,type:'function',function:{name:'read_passage',arguments:'{"chapter":2,"start":3,"count":1}'}}))});return;}
   emit('delta',{text:'Evidence confirms the meaning. [2:3]'});emit('done',{seconds:1,usage:{},toolCalls:[]});
  },20);
 };
 ai=new Assistant({state:{assistant:{learn:false,retrieval:true}},send,save(){},showPanel(title){panel.hidden=false;document.getElementById('panel-title').textContent=title;body.replaceChildren();return body;},closePanel(){panel.hidden=true;},toast(){},navigate(id,cfi){navigated={id,cfi}}});
 const session=()=>({id:crypto.randomUUID(),bookId:'fixture',title:'Fixture',language:'ja',context:{selected:'意味',passage:'本文',before:[],after:[]},messages:[]});
 try{
  ai.session=session();ai.chatPanel();await ai.answer();
  check('Fallback replaces partial text instead of mixing answers',ai.session.messages[0].content==='**Final meaning**'&&!body.textContent.includes('discarded'));
  check('Streamed Markdown is readable',body.querySelector('.ai-message strong')?.textContent==='Final meaning');
  ai.session.messages.push({role:'user',content:'读音呢？'});await ai.answer('读音呢？');
  check('Follow-up sends prior answer and current question',requests.at(-1).messages.some(m=>m.content==='**Final meaning**')&&requests.at(-1).messages.at(-1).content==='读音呢？');
  mode='tools';calls=0;requests.length=0;ai.session=session();ai.bookTools={references:new Map([['2:3',{cfi:'source-cfi'}]]),async execute(call){check('Harness executes only the requested book lookup',call.function.name==='read_passage');return {paragraphs:[{citation:'2:3',text:'Evidence'}]};}};
  ai.chatPanel();await ai.answer();check('Tool results are returned in a separate tool message',requests[1].messages.some(m=>m.role==='tool'&&m.tool_call_id==='lookup'));
  body.querySelector('.ai-citation').click();check('Source button resolves to the book location',navigated?.id==='fixture'&&navigated?.cfi==='source-cfi');
  check('Readable inline source labels replace internal coordinates',body.querySelector('.ai-message p .ai-citation')?.textContent==='原文'&&!body.querySelector('.ai-message').textContent.includes('[2:3]'));
  body.querySelector('.ai-source').click();check('Copied answers omit internal coordinates',copied==='Evidence confirms the meaning.');
  check('Final answer follows retrieval',ai.session.messages.at(-1).content.includes('[2:3]')&&!ai.session.messages.at(-1).incomplete);
  const fixture=document.createElement('div'),citation=id=>id==='2:3'?Object.assign(document.createElement('button'),{textContent:'原文'}):null;
  for(const suffix of ['[','[2','[2:','[2:3']){renderMarkdown(fixture,'Evidence '+suffix,{citation,streaming:true});check('Partial streamed source is withheld: '+suffix,fixture.textContent==='Evidence ');}
  renderMarkdown(fixture,'**Evidence [2:3]** and unknown [9:9]. <img src=x onerror=alert(1)>',{citation});
  check('References inside Markdown stay safe and unknown locations are omitted',fixture.querySelector('strong button')?.textContent==='原文'&&!fixture.textContent.includes('[9:9]')&&!fixture.querySelector('img'));
  renderMarkdown(fixture,'Literal user text [2:3]');check('User text keeps its literal brackets',fixture.textContent==='Literal user text [2:3]');
  mode='budget';calls=0;requests.length=0;let lookups=0;ai.bookTools.execute=async()=>{lookups++;return {text:'Evidence'}};ai.session=session();ai.chatPanel();await ai.answer();
  check('Four-operation limit also covers parallel tool calls',lookups===4&&requests[2].toolChoice==='none'&&requests[2].messages.some(m=>m.role==='tool'&&m.content.includes('tool_budget_exhausted')));
  mode='cancel';ai.session=session();ai.chatPanel();const promise=ai.answer();await new Promise(r=>setTimeout(r,50));ai.stop();await promise;
  check('Stopping retains partial output but excludes it from future history',ai.session.messages.at(-1).content==='partial'&&ai.session.messages.at(-1).incomplete&&ai.pending.size===0);
  ai.providerPanel({id:'fixture',name:'Fixture',base:'https://example.invalid/v1',hasKey:true,model:'fixture',params:{reasoning_effort:'high'}});
  let controls=body.querySelectorAll('details select');check('Existing reasoning strength is reflected in settings',controls[0].value==='reasoning_effort'&&controls[1].value==='high');
  controls[0].value='enable_thinking';controls[0].dispatchEvent(new Event('change'));controls[1].value='on';controls[1].dispatchEvent(new Event('change'));
  const params=JSON.parse(body.querySelector('details textarea').value);check('Thinking switch does not add an unsupported token budget',params.enable_thinking===true&&Object.keys(params).length===1);
  return checks;
 }finally{ai.dismiss();panel.hidden=true;body.replaceChildren();}
})()""")
for name in checks:print('PASS',name)
