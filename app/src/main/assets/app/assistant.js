import {translator,languages} from './i18n.js';
import {prompts,aspects,sourceLanguage,observePreference,buildMessages} from './assistant-prompts.js';
import {extractContext} from './assistant-context.js';
import {BookTools,bookTools,toolInstruction} from './assistant-tools.js';
import {reorderList} from './reorder.js';
import {DictionaryTools,dictionaryTool,dictionaryInstruction} from './dictionary-sources.js';
import {dictionaryPanel} from './dictionary-settings.js';
import {renderMarkdown} from './markdown.js';
export {renderMarkdown} from './markdown.js';

const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(label,fn,cls)=>{const e=element('button',label,cls);e.type='button';e.onclick=fn;return e;};
const $=id=>document.getElementById(id);
export class Assistant {
 constructor({state,send,save,showPanel,closePanel,toast,navigate}){
  Object.assign(this,{state,send,save,showPanel,closePanel,toast,navigate});this.pending=new Map();this.providers=[];this.locale=state.uiLanguage||'zh-CN';this.t=translator(this.locale);
  state.assistant??={};this.settings=state.assistant;
  const viewport=()=>{
   const v=window.visualViewport,s=document.documentElement.style,height=v?.height||innerHeight,keyboard=innerHeight-height>100;
   s.setProperty('--ai-height',height+'px');s.setProperty('--ai-bottom',Math.max(0,innerHeight-height-(v?.offsetTop||0))+'px');
   s.setProperty('--ai-safe-bottom',keyboard?'0px':'var(--toolbar-bottom,0px)');s.setProperty('--ai-compose-gap',keyboard?'8px':'14px');
  };window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);viewport();
  for(const [k,v] of Object.entries({before:3,after:3,maxChars:12000,answerLanguage:'auto',learn:true,retrieval:true,preferences:[]}))this.settings[k]??=v;
  this.settings.dictionaries??={enabled:true,timeout:10};
  this.dictionaryTools=new DictionaryTools({settings:this.settings.dictionaries,fetcher:this.dictionaryFetch.bind(this),progress:(key,values)=>{if(this.current){this.current.phase=this.t(key,values);this.statusText();}}});
 }
 receive(e){const request=this.pending.get(e.id);if(!request)return;request.event?.(e);if(['config','models','done'].includes(e.type)){this.pending.delete(e.id);request.resolve(e);}else if(e.type==='error'){this.pending.delete(e.id);request.reject(Object.assign(Error(this.error(e)),{code:e.code}));}}
 error(e){return this.t(e.code==='timeout'?'timeoutError':e.code,{status:e.status});}
 rpc(action,data={},event){const id=crypto.randomUUID();const promise=new Promise((resolve,reject)=>this.pending.set(id,{resolve,reject,event,action}));this.send(action,{...data,id});promise.id=id;return promise;}
 cancel(id){if(!id)return;const pending=this.pending.get(id);this.send(pending?.action==='dictionaryFetch'?'dictionaryCancel':'aiCancel',{id});if(pending){this.pending.delete(id);pending.reject(Object.assign(Error('cancelled'),{cancelled:true}));}}
 async dictionaryFetch(request,signal){
  if(signal?.aborted)throw Error('cancelled');const rpc=this.rpc('dictionaryFetch',request),cancel=()=>this.cancel(rpc.id);
  signal?.addEventListener('abort',cancel,{once:true});let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;cancel();},request.timeout||7000);
  try{return await rpc;}catch(e){if(timedOut)throw Error('timeout');throw e;}finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
 }
 dictionariesPanel(){dictionaryPanel(this);}
 dismiss(){if(this.opening)return;this.dictionaryTestAbort?.abort();this.disposeReorder?.();this.disposeReorder=null;this.view=null;this.viewVersion=(this.viewVersion||0)+1;this.stop();clearInterval(this.clock);$('panel').classList.remove('ai-panel','ai-chat');}
 panel(title,view){this.dictionaryTestAbort?.abort();this.disposeReorder?.();this.disposeReorder=null;this.opening=true;const p=this.showPanel(title);this.opening=false;this.view=view;this.viewVersion=(this.viewVersion||0)+1;$('panel').classList.remove('ai-chat');$('panel').classList.add('ai-panel');return p;}
 showError(error){if(!error.cancelled)this.toast(error.message);}
 async config(){const result=await this.rpc('aiConfig');this.providers=result.providers;return this.providers;}
 async persistProviders(providers){const result=await this.rpc('aiSaveConfig',{providers});this.providers=result.providers;return this.providers;}
 row(parent,label,control){const row=element('label',null,'ai-field');row.append(element('span',label),control);parent.append(row);return control;}
 input(value='',type='text'){const input=element('input');input.type=type;input.value=value;input.autocomplete='off';input.spellcheck=false;return input;}
 select(options,value){const input=element('select');for(const [id,label] of options){const option=element('option',label);option.value=id;input.append(option);}input.value=value;return input;}
 async settingsPanel(){
  const p=this.panel(this.t('assistant'),'settings'),version=this.viewVersion;
  p.append(element('p',this.t('apiHint'),'ai-muted'));
  try{await this.config();if(version!==this.viewVersion)return;}catch(e){this.showError(e);return;}
  const list=element('div',null,'ai-provider-list'),status=element('span',null,'ai-visually-hidden');status.setAttribute('role','status');p.append(list,status);
  for(const provider of this.providers){
   const card=element('div',null,'ai-provider ai-provider-row');card.dataset.id=provider.id;
   const name=button(provider.name||provider.model,()=>this.providerPanel(provider),'ai-provider-name');name.append(element('small',provider.model));card.append(name);
   const handle=button('',()=>{},'ai-drag-handle');handle.setAttribute('aria-label',this.t('reorderApi',{name:provider.name||provider.model}));
   const grip=element('span');grip.setAttribute('aria-hidden','true');handle.append(grip);handle.disabled=this.providers.length<2;
   card.append(handle);if(provider.enabled===false)card.classList.add('ai-disabled');list.append(card);
  }
  this.disposeReorder=reorderList(list,{scroll:p,commit:async ids=>{
   p.inert=true;try{await this.persistProviders(ids.map(id=>this.providers.find(provider=>provider.id===id)));}finally{p.inert=false;}
  },error:e=>this.showError(e),announce:(row,position,total)=>{status.textContent=this.t('apiPosition',{name:row.querySelector('.ai-provider-name').firstChild.textContent,position,total});}});
  if(!this.providers.length)p.append(element('p',this.t('noApi'),'ai-muted'));
  p.append(button(this.t('addApi'),()=>this.providerPanel(null),'panel-action'),button(this.t('dictionaries'),()=>this.dictionariesPanel(),'panel-action'),button(this.t('advanced'),()=>this.advancedPanel(),'panel-action'),button(this.t('preferences'),()=>this.preferencesPanel(),'panel-action'));
 }
 providerPanel(existing){
  const p=this.panel(existing?this.t('edit'):this.t('addApi'),'provider'),provider=existing?structuredClone(existing):{id:crypto.randomUUID(),name:'',base:'',model:'',params:{},enabled:true,timeout:40};
  const name=this.row(p,this.t('name'),this.input(provider.name)),base=this.row(p,this.t('base'),this.input(provider.base,'url')),key=this.row(p,this.t('key'),this.input('','password'));
  key.placeholder=provider.hasKey?this.t('keySaved'):'';
  const model=this.row(p,this.t('model'),this.input(provider.model));
  const status=element('p',null,'ai-muted');
  const fetch=button(this.t('fetchModels'),async()=>{fetch.disabled=true;status.textContent='…';try{
   const result=await this.rpc('aiModels',{provider:{...provider,base:base.value.trim(),key:key.value.trim()}});
   const picker=this.select([['',this.t('chooseModel')],...result.models.map(m=>[m,m])],'');picker.onchange=()=>{if(picker.value)model.value=picker.value;};status.replaceChildren(picker);
  }catch(e){status.textContent=e.message;}finally{fetch.disabled=false;}});p.append(fetch,status);
  const enabled=this.input('','checkbox');enabled.checked=provider.enabled!==false;this.row(p,this.t('enabled'),enabled);
  const timeout=this.row(p,this.t('timeout'),this.input(provider.timeout,'number'));timeout.min=10;timeout.max=180;
  const details=element('details');details.append(element('summary',this.t('parameters')));p.append(details);
  const initial=provider.params||{},format=Object.hasOwn(initial,'reasoning_effort')?'reasoning_effort':initial.thinking?'thinking':Object.hasOwn(initial,'thinking_budget')?'thinking_budget':'enable_thinking';
  const wire=this.row(details,this.t('wireFormat'),this.select([['enable_thinking','enable_thinking'],['thinking_budget','enable_thinking + thinking_budget'],['reasoning_effort','reasoning_effort'],['thinking','thinking.type']],format));
  const preset=p=>wire.value==='reasoning_effort'?(p.reasoning_effort==='none'?'off':p.reasoning_effort||'default'):wire.value==='thinking'?(p.thinking?.type==='disabled'?'off':p.thinking?.type==='enabled'?'on':'default'):p.enable_thinking===false?'off':p.enable_thinking===true?(wire.value==='thinking_budget'?({1024:'low',4096:'medium',8192:'high'}[p.thinking_budget]||'custom'):'on'):'default';
  const options=()=>[['default',this.t('serverDefault')],['off',this.t('off')],...(['enable_thinking','thinking'].includes(wire.value)?[['on',this.t('on')]]:[['low',this.t('low')],['medium',this.t('medium')],['high',this.t('high')],...(wire.value==='reasoning_effort'?[['max',this.t('max')]]:[])]),['custom',this.t('custom')]];
  const value=preset(initial),effort=this.row(details,this.t('thinkingLevel'),this.select(options(),options().some(([key])=>key===value)?value:'custom'));
  const params=this.row(details,this.t('extraParams'),element('textarea'));params.value=JSON.stringify(provider.params||{},null,2);params.spellcheck=false;
  wire.onchange=()=>{effort.replaceChildren(...this.select(options(),'default').children);effort.value='default';};
  effort.onchange=()=>{if(effort.value==='custom')return;let obj;try{obj=JSON.parse(params.value||'{}');if(!obj||Array.isArray(obj)||typeof obj!=='object')throw Error();}catch{this.toast(this.t('invalidJson'));return;}for(const k of ['enable_thinking','reasoning_effort','thinking','thinking_budget'])delete obj[k];
   const value=effort.value;if(value!=='default'){if(['enable_thinking','thinking_budget'].includes(wire.value)){obj.enable_thinking=value!=='off';if(wire.value==='thinking_budget'&&value!=='off')obj.thinking_budget={low:1024,medium:4096,high:8192}[value];}else if(wire.value==='thinking')obj.thinking={type:value==='off'?'disabled':'enabled'};else obj.reasoning_effort=value==='off'?'none':value;}params.value=JSON.stringify(obj,null,2);};
  const persist=async()=>{let extra;try{extra=JSON.parse(params.value||'{}');if(!extra||Array.isArray(extra)||typeof extra!=='object')throw Error();}catch{throw Error(this.t('invalidJson'));}
   if(!base.value.trim()||!model.value.trim()||(!provider.hasKey&&!key.value.trim()))throw Error(this.t('required'));
   const updated={...provider,name:name.value.trim()||model.value.trim(),base:base.value.trim().replace(/\/+$/,''),key:key.value.trim(),model:model.value.trim(),enabled:enabled.checked,timeout:+timeout.value,params:extra};
   const list=this.providers.filter(p=>p.id!==updated.id),index=this.providers.findIndex(p=>p.id===updated.id);list.splice(index<0?list.length:index,0,updated);await this.persistProviders(list);provider.hasKey=true;key.value='';return updated;
  };
  p.append(button(this.t('save'),async()=>{try{await persist();this.toast(this.t('saved'));this.settingsPanel();}catch(e){this.showError(e)}},'primary'));
  p.append(button(this.t('test'),async()=>{try{const updated=await persist();status.textContent='…';const result=await this.rpc('aiChat',{providerId:updated.id,messages:[{role:'user',content:'Reply only: OK'}]});status.textContent=this.t('testOK')+' · '+Math.round(result.seconds*10)/10+'s';}catch(e){status.textContent=e.message;}},'panel-action'));
  if(existing)p.append(button(this.t('remove'),async()=>{try{await this.persistProviders(this.providers.filter(p=>p.id!==provider.id));this.settingsPanel();}catch(e){this.showError(e)}},'panel-action danger'));
 }
 advancedPanel(){
  const p=this.panel(this.t('advanced'),'advanced'),s=this.settings,t=this.t;
  const fields={};for(const [key,label,min,max] of [['before','contextBefore',0,12],['after','contextAfter',0,12],['maxChars','contextLimit',1000,24000]]){const input=this.input(s[key],'number');input.min=min;input.max=max;fields[key]={input,min,max};this.row(p,t(label),input);}
  const language=this.row(p,t('answerLanguage'),this.select([['auto',t('auto')],...languages],s.answerLanguage));
  const learn=this.input('','checkbox');learn.checked=s.learn;this.row(p,t('learn'),learn);p.append(element('p',t('learnHint'),'ai-muted'));
  const retrieval=this.input('','checkbox');retrieval.checked=s.retrieval;this.row(p,t('retrieval'),retrieval);p.append(element('p',t('retrievalHint'),'ai-muted'));
  const prompt=this.row(p,t('prompt'),element('textarea'));prompt.classList.add('ai-prompt');prompt.value=s.prompt||prompts(this.locale).explain;p.append(element('p',t('promptHint'),'ai-muted'));
  const learning=this.row(p,t('learnPrompt'),element('textarea'));learning.value=s.learnPrompt||prompts(this.locale).learn;
  p.append(button(t('resetPrompt'),()=>{prompt.value=prompts(this.locale).explain;learning.value=prompts(this.locale).learn;}));
  p.append(button(t('save'),()=>{for(const [key,{input,min,max}] of Object.entries(fields))s[key]=Math.min(max,Math.max(min,Math.round(+input.value)||min));s.answerLanguage=language.value;s.learn=learn.checked;s.retrieval=retrieval.checked;s.prompt=prompt.value.trim().slice(0,12000);s.learnPrompt=learning.value.trim().slice(0,4000);this.save();this.toast(t('saved'));this.settingsPanel();},'primary'));
 }
 preferencesPanel(){
  const p=this.panel(this.t('preferences'),'preferences'),t=this.t,s=this.settings;
  p.append(element('p',t('learnHint'),'ai-muted'));
  for(const pref of s.preferences.filter(p=>!p.dismissed)){
   const card=element('div',null,'ai-provider'),text=element('textarea');text.value=pref.text||t(pref.aspect);text.onchange=()=>{pref.text=text.value.slice(0,300);this.save();};card.append(text);
   const scope=this.select([['*',t('allLanguages')],...languages],pref.language||'*');scope.onchange=()=>{pref.language=scope.value;this.save();};card.append(scope);
   const active=this.input('','checkbox');active.checked=!!pref.enabled;active.onchange=()=>{pref.enabled=active.checked;pref.manual=true;this.save();};this.row(card,t('enabled'),active);
   card.append(element('small',pref.enabled?t('activePreference'):t('candidate',{count:pref.count||0})),button(t('remove'),()=>{pref.dismissed=true;pref.enabled=false;this.save();this.preferencesPanel();},'danger'));p.append(card);
  }
  if(!s.preferences.some(p=>!p.dismissed))p.append(element('p',t('noPreferences'),'ai-muted'));
  p.append(button(t('addPreference'),()=>{s.preferences.push({id:crypto.randomUUID(),text:'',language:'*',enabled:true,manual:true});this.save();this.preferencesPanel();},'panel-action'),button(t('clearCandidates'),()=>{s.preferences=s.preferences.filter(p=>p.enabled||p.manual||p.dismissed);this.save();this.preferencesPanel();},'panel-action'));
 }
 async explain(book,selection,item){
  this.stop();const p=this.panel(this.t('explain'),'preparing'),version=this.viewVersion;p.append(element('p',this.t('contextLoading')));
  try{await this.config();if(version!==this.viewVersion)return;if(!this.providers.some(p=>p.enabled!==false)){this.settingsPanel();return;}
   const context=await extractContext(book,selection,this.settings);if(version!==this.viewVersion)return;
   this.dictionaryTools.references.clear();
   this.bookTools=new BookTools(book,{progress:(key,values)=>{if(this.current){this.current.phase=this.t(key,values);this.statusText();}}});
   if(context.chapter&&selection.cfi)this.bookTools.references.set(context.chapter+':'+context.startParagraph,{cfi:selection.cfi});
   this.session={id:crypto.randomUUID(),bookId:item.id,title:item.title==='-'?item.filename:item.title,language:sourceLanguage(context.passage,item.language),context,messages:[]};this.chatPanel();this.answer();
  }catch(e){if(version===this.viewVersion){p.replaceChildren(element('p',this.t(e.message)==e.message?e.message:this.t(e.message)));}}
 }
 chatPanel(book){
  if(book&&this.bookTools?.book!==book){this.bookTools.book=book;this.bookTools.cache.clear();}
  const p=this.panel(this.t('explain'),'chat'),t=this.t,session=this.session;$('panel').classList.add('ai-chat');
  const quote=element('blockquote',session.context.selected,'ai-quote');p.append(quote);
  const details=element('details',null,'ai-context');details.append(element('summary',t('context')+(session.context.limited?' · '+t('contextLimited'):'')),element('div',[...session.context.before,session.context.passage,...session.context.after].join('\n\n')));p.append(details);
  this.transcript=element('div',null,'ai-transcript');p.append(this.transcript);for(const m of session.messages)this.messageNode(m);
  this.status=element('div',null,'ai-status');this.status.setAttribute('role','status');p.append(this.status);
  const form=element('form',null,'ai-compose'),input=element('textarea');input.placeholder=t('followup');input.rows=1;input.maxLength=6000;
  input.addEventListener('input',()=>{input.style.height='48px';input.style.height=Math.min(120,Math.max(48,input.scrollHeight+2))+'px';});
  const send=button(t('send'),()=>form.requestSubmit(),'primary ai-send');this.stopButton=button(t('stop'),()=>this.stop(),'ai-stop');this.stopButton.hidden=!this.current;
  this.retry=button(t('retry'),()=>{this.session.messages=this.session.messages.filter(m=>!m.incomplete);this.chatPanel();this.answer();});this.retry.hidden=true;
  form.append(input,send,this.stopButton,this.retry);form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text||this.current)return;input.value='';input.style.height='48px';const m={role:'user',content:text};session.messages.push(m);this.messageNode(m);this.answer(text);};p.append(form);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();form.requestSubmit();}});
 }
 renderMessage(node,message){
  const session=this.session;
  renderMarkdown(node,message.content,message.role==='assistant'?{streaming:!!message.incomplete,openLink:url=>this.send('openLink',{url}),citation:id=>{
   if(id.startsWith('D')){const source=this.dictionaryTools.references.get(id);return source?button(source.source,()=>this.send('openLink',{url:source.url}),'ai-citation'):null;}
   const source=this.bookTools?.references.get(id);
   return source?button(this.t('source'),()=>this.navigate?.(session.bookId,source.cfi),'ai-citation'):null;
  }}:undefined);
 }
 messageNode(message){const node=element('div',null,'ai-message '+message.role);this.renderMessage(node,message);if(message.role==='assistant'&&!message.incomplete)this.messageActions(node,message);this.transcript.append(node);return node;}
 messageActions(node,message){
  const copy=button(this.t('copy'),()=>{this.send('copy',{text:message.content.replace(/\s*\[\d+:\d+\]/g,'').replace(/\[D\d+\]/g,id=>{const r=this.dictionaryTools.references.get(id.slice(1,-1));return r?'['+r.source+']('+r.url+')':'';})});this.toast(this.t('copied'));},'ai-copy');
  const icon=element('span',null,'ai-copy-icon');icon.setAttribute('aria-hidden','true');copy.prepend(icon);node.append(copy);
 }
 statusText(){if(!this.status||this.view!=='chat'||!this.current)return;const c=this.current;if(c.phase){this.status.textContent=c.phase;return;}let status=this.t(c.text?'streaming':c.thinking?'thinking':'connecting',{seconds:Math.floor((performance.now()-c.start)/1000)});this.status.textContent=(c.model?c.model+' · ':'')+status;}
 stop(){if(this.current){this.current.abort?.abort();this.current.message.incomplete=true;this.cancel(this.current.id);this.current=null;if(this.status)this.status.textContent=this.t('stopped');if(this.stopButton)this.stopButton.hidden=true;if(this.retry)this.retry.hidden=false;}clearInterval(this.clock);}
 async answer(followup){
  if(this.current||!this.session)return;const session=this.session,requestMessages=buildMessages(this.settings,session,this.locale,this.t),retrieve=this.settings.retrieval&&this.bookTools,lookup=this.dictionaryTools.available(session.language);
  const tools=[...(retrieve?bookTools:[]),...(lookup?[dictionaryTool]:[])];
  if(retrieve)requestMessages[0].content+='\n'+toolInstruction;
  if(lookup)requestMessages[0].content+='\n'+dictionaryInstruction(this.locale);
  const message={role:'assistant',content:'',incomplete:true};session.messages.push(message);const node=this.messageNode(message),current={message,start:performance.now(),text:'',prefix:'',model:'',thinking:false,abort:new AbortController()};this.current=current;this.stopButton.hidden=false;this.retry.hidden=true;
  const scroll=()=>{this.transcript.scrollTop=this.transcript.scrollHeight;};this.clock=setInterval(()=>this.statusText(),1000);this.statusText();scroll();let tokens=0,remainingTools=4;
  try{
   for(let round=0;round<=4;round++){
    current.phase='';
    const rpc=this.rpc('aiChat',{messages:requestMessages,...(tools.length?{tools,toolChoice:round===4||remainingTools<=0?'none':'auto'}:{})},event=>{
     if(this.current!==current)return;
     if(event.type==='attempt'){current.text=current.prefix;message.content=current.prefix;this.renderMessage(node,message);current.model=event.model;current.thinking=false;if(event.attempt>1)this.status.textContent=this.t('switching',{model:event.model});}
     if(event.type==='delta'){const stick=this.transcript.scrollHeight-this.transcript.scrollTop-this.transcript.clientHeight<70;current.text+=event.text;message.content=current.text;current.thinking=event.thinking;this.renderMessage(node,message);if(stick)scroll();this.statusText();}
     if(event.type==='failed')this.status.textContent=this.error(event);
    });current.id=rpc.id;
    const result=await rpc;if(this.current!==current)return;
    const usage=result.usage?.completion_tokens_details?.reasoning_tokens;if(Number.isFinite(usage))tokens+=usage;
    if(result.toolCalls?.length&&tools.length&&round<4){
     requestMessages.push({role:'assistant',content:current.text.slice(current.prefix.length)||null,tool_calls:result.toolCalls,...(result.reasoning?{reasoning_content:result.reasoning}:{})});
     current.prefix=current.text?current.text.trimEnd()+'\n\n':'';
     const outputs=await Promise.all(result.toolCalls.map(async call=>{
      if(remainingTools--<=0)return {error:'tool_budget_exhausted'};
      try{
       if(call.function.name==='lookup_dictionary'&&lookup)return await this.dictionaryTools.execute(call,current.abort.signal);
       if(retrieve&&bookTools.some(t=>t.function.name===call.function.name))return await this.bookTools.execute(call,current.abort.signal);
       return {error:'unknown_tool'};
      }catch(e){return {error:e.message};}
     }));
     if(this.current!==current||current.abort.signal.aborted)return;
     for(let i=0;i<result.toolCalls.length;i++){
      const content=JSON.stringify(outputs[i]);requestMessages.push({role:'tool',tool_call_id:result.toolCalls[i].id,content});session.evidence=[...(session.evidence||[]),content.slice(0,14000)].slice(-4);
     }
     if(round===3||remainingTools<=0)requestMessages.push({role:'user',content:this.t('toolLimit')});continue;
    }
    if(result.toolCalls?.length&&!current.text)throw Error(this.t('all_failed'));
    message.incomplete=false;this.renderMessage(node,message);let status=this.t('complete',{model:current.model,seconds:Math.round((performance.now()-current.start)/100)/10});
    if(tokens>0)status+=' · '+this.t('thinkingTokens',{tokens});this.status.textContent=status;
    if(result.finishReason==='length')node.append(element('p',this.t('truncated'),'ai-muted'));
    this.messageActions(node,message);
    if(followup&&this.settings.learn)this.learn(followup,session);break;
   }
  }catch(e){if(!e.cancelled&&this.current===current&&this.view==='chat'){this.status.textContent=e.message;this.retry.hidden=false;}}
  finally{if(this.current===current){this.current=null;this.stopButton.hidden=true;clearInterval(this.clock);}}
 }
 async learn(question,session){
  try{let output='';await this.rpc('aiChat',{messages:[{role:'system',content:this.settings.learnPrompt||prompts(this.locale).learn},{role:'user',content:JSON.stringify({language:session.language,followup:question})}]},e=>{if(e.type==='attempt')output='';if(e.type==='delta')output+=e.text;});
   if(!this.settings.learn)return;const match=output.match(/\{[^{}]*\}/),aspect=match?JSON.parse(match[0]).aspect:null;if(!aspects.includes(aspect))return;
   const learned=observePreference(this.settings,{aspect,language:session.language,session:session.id});this.save();if(learned&&this.view==='chat')this.toast(this.t('learned',{text:this.t(aspect)}));
  }catch{}
 }
}
