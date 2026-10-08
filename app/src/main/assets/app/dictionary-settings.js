import {defaultSources,validateSource,DictionaryTools} from './dictionary-sources.js';
import {reorderList} from './reorder.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn,cls='panel-action')=>{const n=el('button',text,cls);n.type='button';n.onclick=fn;return n;};
export function dictionaryPanel(ai){
 const p=ai.panel(ai.t('dictionaries'),'dictionaries'),t=ai.t,s=ai.settings.dictionaries;
 s.sources??=structuredClone(defaultSources);
 const enabled=ai.input('','checkbox');enabled.checked=s.enabled!==false;enabled.onchange=()=>{s.enabled=enabled.checked;ai.save();};ai.row(p,t('dictionaryEnabled'),enabled);
 p.append(el('p',t('dictionaryHint'),'ai-muted'));
 const timeout=ai.input(s.timeout??10,'number');timeout.min=4;timeout.max=15;timeout.onchange=()=>{s.timeout=Math.max(4,Math.min(15,+timeout.value||10));timeout.value=s.timeout;ai.save();};ai.row(p,t('dictionaryTimeout'),timeout);
 const list=el('div',null,'ai-provider-list'),status=el('span',null,'ai-visually-hidden');status.setAttribute('role','status');p.append(list,status);
 for(const source of s.sources){
  const row=el('div',null,'ai-provider ai-provider-row');row.dataset.id=source.id;
  const name=button(source.name,()=>sourcePanel(ai,source),'ai-provider-name');name.append(el('small',source.languages.join(', ')+' · '+t({meaning:'dictionaryMeaning',etymology:'dictionaryEtymology',both:'dictionaryBoth'}[source.purpose])));row.append(name);
  const handle=button('',()=>{},'ai-drag-handle');handle.setAttribute('aria-label',t('reorderApi',{name:source.name}));handle.append(el('span'));row.append(handle);
  if(source.enabled===false)row.classList.add('ai-disabled');list.append(row);
 }
 ai.disposeReorder=reorderList(list,{scroll:p,commit:ids=>{s.sources=ids.map(id=>s.sources.find(v=>v.id===id));ai.save();},error:e=>ai.showError(e),announce:(row,position,total)=>{status.textContent=t('apiPosition',{name:s.sources.find(s=>s.id===row.dataset.id).name,position,total});}});
 if(!s.sources.length)p.append(el('p',t('dictionaryEmpty'),'ai-muted'));
 p.append(button(t('addDictionary'),()=>s.sources.length>=20?ai.toast(t('dictionaryLimit')):sourcePanel(ai,null)));
}
function sourcePanel(ai,existing){
 const p=ai.panel(existing?.name||ai.t('addDictionary'),'dictionary-source'),t=ai.t;
 const source=existing?structuredClone(existing):{id:crypto.randomUUID(),name:'',adapter:'custom',languages:['en'],purpose:'both',enabled:true,url:'',format:'html',selector:'',method:'GET'};
 const fields={};
 fields.name=ai.row(p,t('dictionaryName'),ai.input(source.name));
 fields.languages=ai.row(p,t('dictionaryLanguages'),ai.input(source.languages.join(', ')));p.append(el('p',t('dictionaryLanguagesHint'),'ai-muted'));
 fields.purpose=ai.row(p,t('dictionaryPurpose'),ai.select([['meaning',t('dictionaryMeaning')],['etymology',t('dictionaryEtymology')],['both',t('dictionaryBoth')]],source.purpose));
 fields.enabled=ai.input('','checkbox');fields.enabled.checked=source.enabled!==false;ai.row(p,t('enabled'),fields.enabled);
 if(source.adapter==='custom'){
  fields.url=ai.row(p,t('dictionaryTemplate'),ai.input(source.url,'url'));fields.url.placeholder='https://example.org/search?q={query}';p.append(el('p',t('dictionaryTemplateHint'),'ai-muted'));
  fields.method=ai.row(p,t('dictionaryMethod'),ai.select([['GET','GET'],['POST','POST']],source.method));
  fields.body=ai.row(p,t('dictionaryBody'),ai.input(source.body));fields.body.placeholder='query={query}';
  const updateMethod=()=>fields.body.parentElement.hidden=fields.method.value!=='POST';fields.method.onchange=updateMethod;updateMethod();
  fields.format=ai.row(p,t('dictionaryFormat'),ai.select([['html',t('dictionaryHtml')],['json',t('dictionaryJson')]],source.format));
  fields.selector=ai.row(p,t('dictionarySelector'),ai.input(source.selector));fields.selector.placeholder='.definition';
  fields.path=ai.row(p,t('dictionaryPath'),ai.input(source.path));fields.path.placeholder='data.entries.*.definition';
  const hint=el('p',t('dictionaryPathHint'),'ai-muted');p.append(hint);
  const updateFormat=()=>{const json=fields.format.value==='json';fields.path.parentElement.hidden=!json;hint.hidden=!json;fields.selector.parentElement.hidden=json;};fields.format.onchange=updateFormat;updateFormat();
  fields.link=ai.row(p,t('dictionaryLink'),ai.input(source.link,'url'));
 }else p.append(el('p',t('dictionaryBuiltin'),'ai-muted'));
 const value=()=>{
  const next={...source};for(const [key,input] of Object.entries(fields))next[key]=key==='enabled'?input.checked:key==='languages'?input.value.split(',').map(v=>v.trim()).filter(Boolean):input.value.trim();
  try{return validateSource(next);}catch{throw Error(t('dictionaryInvalid'));}
 };
 p.append(button(t('save'),()=>{try{const next=value(),sources=ai.settings.dictionaries.sources,index=sources.findIndex(s=>s.id===next.id);if(index<0)sources.push(next);else sources[index]=next;ai.save();ai.toast(t('saved'));dictionaryPanel(ai);}catch(e){ai.showError(e)}},'primary'));
 const query=ai.row(p,t('dictionaryQuery'),ai.input('')),result=el('div',null,'dictionary-preview');
 let testing;
 const test=button(t('dictionaryTest'),async()=>{
  if(testing){testing.abort();testing=null;test.textContent=t('dictionaryTest');return;}
  try{
   const next=value();if(!query.value.trim())throw Error(t('required'));
   const controller=new AbortController();testing=controller;test.textContent=t('stop');const version=ai.viewVersion;
   ai.dictionaryTestAbort=controller;result.textContent=t('dictionaryLooking',{name:next.name,query:query.value.trim()});
   const tools=new DictionaryTools({settings:{sources:[{...next,enabled:true}]},fetcher:ai.dictionaryFetch.bind(ai)});
   const data=await tools.execute({function:{name:'lookup_dictionary',arguments:JSON.stringify({query:query.value,language:next.languages.find(l=>l!=='*')||'en',purpose:'both'})}},controller.signal);
   if(version!==ai.viewVersion||controller.signal.aborted)return;result.replaceChildren();
   for(const r of data.results){result.append(el('p',t('dictionaryStatus',{name:r.source,status:t('dictionary_'+r.status)})));for(const e of r.entries){result.append(el('strong',e.title),el('pre',e.text),button(t('dictionaryOpen'),()=>ai.send('openLink',{url:e.url})));}}
  }catch(e){if(e.message!=='cancelled')result.textContent=e.message;}finally{testing=null;ai.dictionaryTestAbort=null;test.textContent=t('dictionaryTest');}
 });p.append(test,result);
 if(existing)p.append(button(t('remove'),()=>{ai.settings.dictionaries.sources=ai.settings.dictionaries.sources.filter(s=>s.id!==existing.id);ai.save();dictionaryPanel(ai);},'panel-action danger'));
}
