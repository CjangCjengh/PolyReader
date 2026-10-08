import {profiles,themeOptions,palette,isDarkTheme,layoutPrefs,migrateState,highlightColors,highlightStyle} from './profiles.js';
import {loadBook,engineRegistry,cfiFor} from './engines.js';
import {selectionPopup} from './selection.js';
import {TextSelection} from './text-selection.js';

const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
const send=(action,data={})=>window.Native?.post(JSON.stringify({action,...data}));
let state,library=[],book,active,profile,engine,selection,loading=false,searchToken=0,fontForProfile=null;
let toastTimer,saveTimer,settingsTimer,settingsView='reading';
let handleDrag,selectionDragging=false,pendingOpen;
const blend=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
const prefs=()=>state.profiles[profile.id];
const bookState=()=>state.books[active.id]??=( {notes:[],locations:{}} );
const flush=()=>{clearTimeout(saveTimer);send('save',{state});};
const save=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(flush,180);};
const toast=text=>{$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);};
const error=e=>{console.error(e);busy(false);toast(e.message||String(e));};
function busy(on,text='正在排版…'){loading=on;$('loading').hidden=!on;$('loading-text').textContent=text;if(!on)setTimeout(openRequestedBook,0);}
function openRequestedBook(){
 if(!pendingOpen||loading)return;
 const item=pendingOpen;pendingOpen=null;
 const mode=profiles.find(p=>p.id===state.books[item.id]?.mode)||profiles.find(p=>p.lang===item.language?.toLowerCase().split(/[-_]/)[0])||profiles.find(p=>p.id==='ridi')||profiles[0];
 openBook(item,mode.id);
}
function setChrome(visible){if(visible)clearSelection();document.body.classList.toggle('chrome-hidden',!visible);if(active){applyWindow();syncNativeUI();}}
function showPanel(title){clearSelection();if(active)setChrome(false);$('panel-title').textContent=title;$('panel-body').replaceChildren();$('scrim').hidden=false;$('panel').hidden=false;return $('panel-body');}
function closePanel(){searchToken++;$('panel').hidden=true;$('scrim').hidden=true;}
function actionButton(parent,title,callback,cls='panel-action'){const b=node('button',title,cls);b.onclick=callback;parent.append(b);return b;}
function caption(item){return item.title||item.filename.replace(/\.(epub|txt)$/i,'');}
function renderLibrary(){
 const query=$('filter').value.toLowerCase();$('books').replaceChildren();$('empty').hidden=!!library.length;
 for(const item of [...library].sort((a,b)=>(state.books[b.id]?.lastRead||0)-(state.books[a.id]?.lastRead||0))){
   if(!`${caption(item)} ${item.creator||''}`.toLowerCase().includes(query))continue;
   const card=node('article',null,'book-card');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',caption(item));
   const cover=node('div','▤','book-cover');if(item.cover){const img=node('img');img.src=`https://appassets.androidplatform.net/entry/${item.id}/${item.cover.split('/').map(encodeURIComponent).join('/')}`;img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:inherit';img.onerror=()=>img.remove();cover.replaceChildren(img);}card.append(cover);
   const text=node('div',null,'book-details');text.append(node('h3',caption(item)));
   const saved=state.books[item.id],mode=profiles.find(p=>p.id===saved?.mode);
   const percent=Math.round((saved?.location?.fraction||0)*100);text.append(node('div',`${percent}%${mode?' · '+mode.name:''}`,'book-meta'));const meter=node('progress');meter.max=100;meter.value=percent;meter.setAttribute('aria-label','阅读进度 '+percent+'%');text.append(meter);card.append(text);
   const open=()=>mode?openBook(item,mode.id):chooseMode(item);bindBookActions(card,open,()=>bookMenu(item));$('books').append(card);
 }
}
function bindBookActions(card,open,menu){
 let press,consumed=false;
 const cancel=()=>{clearTimeout(press?.timer);press=null;};
 const show=()=>{if(consumed)return;consumed=true;cancel();menu();};
 card.setAttribute('aria-haspopup','dialog');card.setAttribute('aria-keyshortcuts','Shift+F10');
 card.onpointerdown=e=>{cancel();consumed=false;if(!e.isPrimary||e.button!==0)return;press={id:e.pointerId,x:e.clientX,y:e.clientY,timer:setTimeout(show,500)};};
 card.onpointermove=e=>{if(press&&(e.pointerId!==press.id||Math.hypot(e.clientX-press.x,e.clientY-press.y)>10))cancel();};
 card.onpointerup=card.onpointercancel=card.onpointerleave=cancel;
 card.oncontextmenu=e=>{e.preventDefault();if(press||e.button===2)show();};
 card.ondragstart=e=>e.preventDefault();
 card.onclick=e=>{if(consumed){e.preventDefault();e.stopPropagation();consumed=false;return;}open();};
 card.onkeydown=e=>{if(e.target!==card)return;if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();consumed=false;show();}else if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
}
function bookMenu(item){const p=showPanel(caption(item));actionButton(p,'选择阅读器',()=>chooseMode(item));actionButton(p,'移除书籍',()=>{
 const q=showPanel('移除书籍');q.append(node('p',caption(item)),node('p','仅移出书架会保留原文件；阅读记录和笔记都会保留。'));
 actionButton(q,'仅从书架移除',()=>{send('delete',{id:item.id});closePanel()});
 actionButton(q,`同时删除 ${(item.format||'epub').toUpperCase()} 原文件`,()=>{closePanel();send('deleteSource',{id:item.id})},'panel-action danger');
});}
function chooseMode(item){const p=showPanel('选择阅读器');
 for(const x of profiles){const b=node('button',null,'mode-card');b.append(node('strong',x.name));b.onclick=()=>{closePanel();openBook(item,x.id)};p.append(b);}
}
async function openBook(item,mode){
 if(loading)return;clearTimeout(settingsTimer);clearSelection();closePanel();flush();busy(true,'正在打开书籍…');
 const previous=active?.id===item.id&&engine?engine.location:null;
 try{
   if(engine){engine.destroy();engine=null;}
   if(active?.id!==item.id||!book){book?.destroy?.();book=await loadBook(item.id);}
   active=item;profile=profiles.find(x=>x.id===mode)||profiles[0];const bs=bookState();bs.notes??=[];bs.locations??={};bs.mode=profile.id;bs.lastRead=Date.now();
   $('shelf').hidden=true;$('reading').hidden=false;document.body.classList.add('chrome-hidden');$('reading-title').textContent=caption(item);$('mode-caption').textContent=profile.name;
   const Engine=engineRegistry.get(profile.engine);engine=new Engine();
   const location=previous||bs.location||bs.locations[profile.id];
   applyWindow();
   let openTimeout;
   await Promise.race([engine.mount($('reader-stage'),book,layoutPrefs(prefs()),state.fonts?.[profile.id],{
     content:attachContent,location:updateLocation,notice:toast,error,redraw:redrawNotes,footnote:showFootnote
   },location),new Promise((_,reject)=>{openTimeout=setTimeout(()=>reject(new Error('章节加载超时，请重新打开或切换阅读器')),20000);})]).finally(()=>clearTimeout(openTimeout));
   busy(false);if(engine.location)updateLocation(engine.location);save();
 }catch(e){engine?.destroy?.();engine=null;book?.destroy?.();book=null;active=null;$('reading').hidden=true;$('shelf').hidden=false;error(e);}
}
function updateLocation(loc){
 if(!active||loading)return;
 if(selection&&bookState().location?.cfi!==loc.cfi)clearSelection();
 const bs=bookState();bs.location=loc;bs.locations[profile.id]=loc;bs.lastRead=Date.now();
 $('progress').value=Math.round(Math.max(0,Math.min(1,loc.fraction))*1000);const page=profile.engine==='bookwalker'?engine.pageCount:null;const count=page?`${page.page} / ${page.pages} 页 · `:loc.pages?`本章 ${loc.page} / ${loc.pages} · `:'';$('reading-progress').textContent=count+Math.round(loc.fraction*100)+'%';syncNativeUI();

 updateBookmarkButton();save();
}
function applyWindow(){
 const p=prefs(),[bg,fg]=palette(p);document.body.dataset.reader=profile.id;document.documentElement.style.setProperty('--reader-bg',bg);document.documentElement.style.setProperty('--reader-ink',fg);
 const dark=isDarkTheme(p);document.body.classList.toggle('dark-reader',dark);const bw=profile.id==='bookwalker';$('style-button').querySelector('span').textContent=bw?'样式':'阅读样式';$('notes-button').querySelector('span').textContent=bw?'书签':'读书笔记';$('settings-button').querySelector('span').textContent=bw?'设置':'阅读设置';document.documentElement.style.setProperty('--chrome-bg',dark?'#262626':bw?'#ffffff':blend(bg,fg,.05));document.documentElement.style.setProperty('--chrome-ink',dark?'#d0d0d0':bw?'#827b75':'#797768');document.documentElement.style.setProperty('--card',dark?'#242929':'#fffef9');document.documentElement.style.setProperty('--ink',dark?'#dce3de':'#23372f');document.documentElement.style.setProperty('--paper',dark?'#181b1b':'#f6f4ee');document.documentElement.style.setProperty('--line',dark?'#3d4641':'#e3e5dc');
 send('window',{reader:true,volume:p.volume,awake:p.awake,fullscreen:p.fullscreen,brightness:p.brightness,orientation:p.orientation,dark,chrome:!document.body.classList.contains('chrome-hidden')});
}
function home(){
 if(loading)return;clearTimeout(settingsTimer);clearSelection();flush();engine?.destroy();engine=null;book?.destroy?.();book=null;active=null;closePanel();$('reading').hidden=true;$('shelf').hidden=false;document.body.classList.remove('chrome-hidden');send('window',{reader:false,volume:false,awake:false,fullscreen:false,brightness:-1,orientation:0,dark:false});
 for(const k of ['--card','--ink','--paper','--line'])document.documentElement.style.removeProperty(k);renderLibrary();
}
async function turn(dir){if(engine&&!loading)try{clearSelection();await engine.turn(dir);}catch(e){error(e)}}
function clearSelection(clearNative=true){
 const previous=selection;selection=null;handleDrag=null;selectionDragging=false;$('selection-bar').hidden=true;
 $('selection-start').hidden=$('selection-end').hidden=true;
 if(clearNative&&previous?.native)send('bwClearSelection');
 else if(clearNative&&previous?.doc)previous.doc.polySelection?.clear();
 syncNativeUI();
}
function selectionRects(s){
 if(s.native){const [left,top,right,bottom]=s.rect.map(v=>v/devicePixelRatio);return [{left,top,right,bottom}];}
 const frame=s.doc.defaultView.frameElement,bounds=frame?.getBoundingClientRect()||{left:0,top:0};
 return (s.ranges||[s.range]).flatMap(r=>[...r.getClientRects()]).map(r=>({left:r.left+bounds.left,top:r.top+bounds.top,right:r.right+bounds.left,bottom:r.bottom+bounds.top}));
}
function positionSelection(){
 if(!selection||!active||!$('panel').hidden)return;
 const bar=$('selection-bar'),style=getComputedStyle(document.documentElement),inset=key=>parseFloat(style.getPropertyValue(key))||0;
 const handles=(selection.handles||[]).map(a=>({left:a[0]/devicePixelRatio,top:a[1]/devicePixelRatio,right:a[2]/devicePixelRatio,bottom:a[3]/devicePixelRatio}));
 for(const [id,start] of [['selection-start',true],['selection-end',false]]){
   const handle=$(id),controller=selection.doc?.polySelection;handle.hidden=!controller?.supported||!controller.range;
   if(!handle.hidden){const p=controller.endpoint(start);if(!p){handle.hidden=true;continue;}handle.dataset.corner=p.corner;handle.style.left=p.x+'px';handle.style.top=p.y+'px';handles.push(handle.getBoundingClientRect());}
 }
 if(handleDrag||selectionDragging){bar.hidden=true;syncNativeUI();return;}
 bar.hidden=false;
 const position=selectionPopup(selectionRects(selection),{left:12+inset('--cutout-left'),right:innerWidth-12-inset('--cutout-right'),top:12+inset('--cutout-top'),bottom:innerHeight-12-inset('--toolbar-bottom')},bar.getBoundingClientRect(),selection.anchor,handles,prefs().writing==='vertical');
 if(!position){bar.hidden=true;syncNativeUI();return;}
 bar.style.left=position.x+'px';bar.style.top=position.y+'px';syncNativeUI();
}
function showSelection(value){
 if(!active||!$('panel').hidden)return;
 selection=value;if(!document.body.classList.contains('chrome-hidden'))setChrome(false);positionSelection();
}
function selectionData(controller,index){
 const ranges=controller.ranges?.map(r=>r.cloneRange());
 return {text:controller.text,range:controller.range.cloneRange(),ranges,cfi:cfiFor(book,index,controller.range),cfis:ranges?.map(r=>cfiFor(book,index,r))};
}
function attachContent(doc,index){
 let touch,anchor,ignoreClickUntil=0,selectionTimer;
 const controller=doc.polySelection=new TextSelection(doc);
 const selected=()=>{
   if(!active||!engine?.contents().some(c=>c.doc===doc))return;
   const s=doc.getSelection();if(!s||s.isCollapsed||!s.toString().trim()){if(!controller.range&&selection?.doc===doc)clearSelection(false);return;}
   const r=s.getRangeAt(0).cloneRange();controller.set(r);
   showSelection({...selectionData(controller,index),doc,index,anchor});
   if(controller.supported)send('finishTextSelection');
 };
 doc.addEventListener('selectionchange',()=>{clearTimeout(selectionTimer);selectionTimer=setTimeout(selected,60)});
 doc.addEventListener('contextmenu',e=>e.preventDefault());
 doc.defaultView.addEventListener('scroll',()=>{if(selection?.doc===doc)positionSelection()},{passive:true});
 doc.addEventListener('touchstart',e=>{const t=e.changedTouches[0],frame=doc.defaultView.frameElement?.getBoundingClientRect();anchor={x:t.clientX+(frame?.left||0),y:t.clientY+(frame?.top||0)};touch={x:t.clientX,y:t.clientY,time:Date.now(),selected:selection?.doc===doc};if(prefs().flow==='paginated')e.stopImmediatePropagation();},{passive:true,capture:true});
 doc.addEventListener('touchmove',e=>{if(touch&&prefs().flow==='paginated'){e.stopImmediatePropagation();if(Math.abs(e.changedTouches[0].clientX-touch.x)>15)e.preventDefault();}},{passive:false,capture:true});
 doc.addEventListener('touchend',e=>{if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y,elapsed=Date.now()-touch.time,wasSelected=touch.selected;touch=null;if(prefs().flow==='paginated')e.stopImmediatePropagation();if(wasSelected&&elapsed<350&&Math.hypot(dx,dy)<12){e.preventDefault();ignoreClickUntil=Date.now()+500;clearSelection();return;}if(controller.range||doc.getSelection()?.toString())return;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)&&elapsed<900&&prefs().flow==='paginated'){e.preventDefault();turn(prefs().writing==='vertical'?(dx>0?1:-1):(dx<0?1:-1));}},{passive:false,capture:true});
 doc.addEventListener('click',e=>{
   if(Date.now()<ignoreClickUntil)return;
   if(e.target.closest('a'))return;
   if(doc.getSelection()?.toString().trim()){selected();return;}
   if(controller.range){clearSelection();return;}
   clearSelection();
   const ratio=e.clientX/doc.defaultView.innerWidth;
   if(ratio<.22)turn(prefs().writing==='vertical'?1:-1);
   else if(ratio>.78)turn(prefs().writing==='vertical'?-1:1);
   else setChrome(document.body.classList.contains('chrome-hidden'));
 });
 doc.addEventListener('dblclick',e=>{const img=e.target.closest('img,svg');if(!img)return;const p=showPanel('插图');const copy=img.cloneNode(true);copy.style.cssText='width:100%;height:auto;max-height:70vh;object-fit:contain';p.append(copy);});
}
function flattenedToc(items,depth=0,out=[]){for(const x of items||[]){out.push({...x,depth});flattenedToc(x.subitems,depth+1,out);}return out;}
function toc(){const p=showPanel('目录'),list=node('ul',null,'item-list');p.append(list);const items=flattenedToc(book.toc);if(!items.length)book.sections.forEach((s,i)=>items.push({label:`章节 ${i+1}`,href:i,depth:0}));for(const t of items){const li=node('li'),b=node('button',t.label||'未命名章节');b.style.paddingLeft=(5+t.depth*16)+'px';b.onclick=()=>{closePanel();engine.go(t.href).catch(error)};li.append(b);list.append(li);}}
async function showFootnote(href){try{const{index,anchor}=book.resolveHref(href);const doc=await book.sections[index].createDocument();const target=anchor(doc);const p=showPanel('注释');p.append(node('p',target?.textContent||'没有找到注释内容'));actionButton(p,'前往注释所在位置',()=>{closePanel();engine.go(href).catch(error)});}catch(e){error(e)}}
function settingLabel(p,text){p.append(node('div',text,'section-label'));}
function selectSetting(parent,key,label,options){const row=node('div',null,'row'),l=node('label',label),s=node('select');s.id='pref-'+key;l.htmlFor=s.id;for(const[v,text]of options){const o=node('option',text);o.value=v;s.append(o);}s.value=prefs()[key];s.onchange=()=>changePref(key,typeof prefs()[key]==='number'?+s.value:s.value);row.append(l,s);parent.append(row);}
function rangeSetting(parent,key,label,min,max,step=1,suffix=''){const format=value=>key==='brightness'?(value<0?'自动':Math.round(value*100)+'%'):value+suffix;const row=node('div',null,'row'),l=node('label',label),s=node('input'),o=node('output',format(prefs()[key]));s.type='range';s.id='pref-'+key;l.htmlFor=s.id;s.min=min;s.max=max;s.step=step;s.value=prefs()[key];s.oninput=()=>{o.textContent=format(+s.value)};s.onchange=()=>changePref(key,+s.value);row.append(l,s,o);parent.append(row);}
function boolSetting(parent,key,label){const row=node('div',null,'row'),l=node('label',label),s=node('input');s.type='checkbox';s.id='pref-'+key;l.htmlFor=s.id;s.checked=prefs()[key];s.onchange=()=>changePref(key,s.checked);row.append(l,s);parent.append(row);}
const styleKeys=new Set(['theme','fontSize','font','lineHeight','originalLineHeight','publisher','spacing','align','margin','topMargin','bottomMargin','writing','ruby','spread']);
function settings(view='reading'){
 settingsView=view;const isStyle=view==='style',p=showPanel(profile.name+(isStyle?' · 阅读样式':' · 阅读设置'));
 if(isStyle){
 selectSetting(p,'theme','阅读背景',themeOptions);
 const f=profile.fontControl;rangeSetting(p,'fontSize','字号',f.min,f.max,f.step,f.suffix);selectSetting(p,'font','字体',profile.engine==='bookwalker'?[['serif','リュウミン'],['sans','ゴシックMB101']]:[['original','原书'],['serif','系统衬线'],['sans','系统黑体'],['ridi','RIDI Batang'],['garuda','Garuda'],...(state.fonts?.[profile.id]?[['custom',state.fonts[profile.id].filename]]:[])]);
 if(profile.engine!=='bookwalker')actionButton(p,'导入 TTF / OTF 字体',()=>{fontForProfile=profile.id;send('font')});
 if(profile.engine!=='bookwalker'){boolSetting(p,'originalLineHeight','原书行距');boolSetting(p,'publisher','原书段间距');}
 if(!prefs().originalLineHeight)rangeSetting(p,'lineHeight','行距',1.2,2.6,.05);
 if(profile.engine!=='bookwalker'){if(!prefs().publisher)rangeSetting(p,'spacing','段间距',0,1.5,.05);selectSetting(p,'align','对齐',[['original','原书'],['start','左对齐'],['justify','两端对齐']]);}
 rangeSetting(p,'margin','左右留白',0,60);rangeSetting(p,'topMargin','顶部留白',0,120);rangeSetting(p,'bottomMargin','底部留白',0,100);
 if(profile.engine==='foliate'){selectSetting(p,'writing','文字方向',[['vertical','纵排'],['horizontal','横排']]);boolSetting(p,'ruby','显示日文注音');boolSetting(p,'spread','宽屏双页');}
 }else{
 if(profile.engine!=='bookwalker')selectSetting(p,'flow','阅读方式',[['paginated','分页'],['scrolled','连续滚动']]);
 boolSetting(p,'animation','翻页动画');
 selectSetting(p,'orientation','屏幕方向',[[0,'跟随系统'],[1,'锁定竖屏'],[2,'锁定横屏']]);boolSetting(p,'volume','音量键翻页');boolSetting(p,'awake','阅读时保持亮屏');boolSetting(p,'fullscreen','隐藏系统状态栏');
 rangeSetting(p,'brightness','亮度',0,1,.05);actionButton(p,prefs().brightness<0?'亮度：跟随系统':'恢复系统亮度',()=>{changePref('brightness',-1);settings()});
 }
 actionButton(p,isStyle?'恢复默认样式':'恢复默认设置',()=>{for(const [key,value]of Object.entries(profile.defaults))if(key!=='preset'&&styleKeys.has(key)===isStyle)prefs()[key]=value;save();applyWindow();engine.settings(layoutPrefs(prefs()),state.fonts?.[profile.id]).catch(error);settings(view);});
}
function changePref(key,value){prefs()[key]=value;save();applyWindow();clearTimeout(settingsTimer);settingsTimer=setTimeout(()=>engine.settings(layoutPrefs(prefs()),state.fonts?.[profile.id]).catch(error),100);if(key==='publisher'||key==='originalLineHeight')settings(settingsView);}
function currentBookmark(){return active&&engine?.location?bookState().notes.find(n=>n.type==='bookmark'&&n.cfi===engine.location.cfi):null;}
function updateBookmarkButton(){const marked=!!currentBookmark(),button=$('add-bookmark');button.setAttribute('aria-pressed',String(marked));button.setAttribute('aria-label',marked?'移除当前位置书签':'添加当前位置书签');}
function addBookmark(){if(!engine?.location)return;const bs=bookState(),marked=currentBookmark();if(marked)bs.notes=bs.notes.filter(n=>n.id!==marked.id);else bs.notes.push({id:Date.now()+'',type:'bookmark',cfi:engine.location.cfi,index:engine.location.index,label:engine.location.label||`阅读进度 ${Math.round(engine.location.fraction*100)}%`,time:new Date().toISOString()});save();updateBookmarkButton();toast(marked?'已移除书签':'已添加书签');}
function notes(){const p=showPanel('书签与笔记'),list=node('ul',null,'item-list');p.append(list);const all=bookState().notes;
 const add=actionButton(p,currentBookmark()?'移除当前位置书签':'添加当前位置书签',()=>{addBookmark();notes()},'panel-action bookmark-action');add.id='bookmark-current';p.prepend(add);
 if(!all.length)p.append(node('p','还没有书签或笔记。'));
 for(const n of all){const li=node('li'),b=node('button');b.append(node('span',n.type==='bookmark'?'♧ '+n.label:n.text),node('small',n.note||new Date(n.time).toLocaleDateString()));b.onclick=()=>{closePanel();engine.go(n.cfi).catch(error)};const del=node('button','×','remove');del.setAttribute('aria-label','删除记录');del.onclick=()=>{bookState().notes=all.filter(x=>x.id!==n.id);save();updateBookmarkButton();if(profile.engine==='foliate'&&n.type==='highlight')(n.cfis||[n.cfi]).forEach(cfi=>engine.view.deleteAnnotation({value:cfi}));else redrawNotes();notes();};li.append(b,del);list.append(li);}
 actionButton(p,'导出这本书的笔记（JSON）',()=>send('export',{text:JSON.stringify({format:'polyreader-notes',version:1,title:caption(active),bookId:active.id,notes:all},null,2)}));
}
function editNote(){if(!selection)return;const s=selection,p=showPanel('高亮与笔记');p.append(node('div',s.text,'quote'));let color=highlightColors[0];const colors=node('div',null,'swatches');for(const c of highlightColors){const b=node('button');b.style.backgroundColor=highlightStyle(prefs(),c).background;b.setAttribute('aria-label','选择 '+c);b.classList.toggle('selected',c===color);b.onclick=()=>{color=c;for(const child of colors.children)child.classList.toggle('selected',child===b)};colors.append(b);}p.append(colors);const input=node('textarea');input.placeholder='写下你的想法（可选）';p.append(input);actionButton(p,'保存高亮',()=>{bookState().notes.push({id:Date.now()+'',type:'highlight',cfi:s.cfi,cfis:s.cfis,index:s.index,text:s.text,note:input.value,color,time:new Date().toISOString()});save();clearSelection();closePanel();redrawNotes();toast('已保存');},'primary');}
function redrawNotes(){if(engine&&active)engine.annotate(bookState().notes||[]).catch(e=>console.warn(e));}
function searchPanel(){const p=showPanel('全文搜索'),form=node('form',null,'searchbox'),input=node('input'),go=node('button','搜索','primary');input.type='search';input.placeholder='搜索书中内容';input.setAttribute('aria-label','搜索内容');form.append(input,go);p.append(form);const status=node('small'),list=node('ul',null,'item-list');p.append(status,list);form.onsubmit=e=>{e.preventDefault();runSearch(input.value,status,list)};input.focus();}
async function runSearch(query,status,list){
 if(!query.trim())return;const token=++searchToken;list.replaceChildren();let count=0;
 try{for(let index=0;index<book.sections.length;index++){
   if(token!==searchToken)return;status.textContent=`正在搜索 ${index+1} / ${book.sections.length}…`;
   const doc=await book.sections[index].createDocument();if(!doc?.body)continue;
   const nodes=[],starts=[];let text='';const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('script,style,rt,rp')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});let n;
   while(n=walker.nextNode()){nodes.push(n);starts.push(text.length);text+=n.textContent;}
   for(let at=text.indexOf(query);at!==-1&&count<150;at=text.indexOf(query,at+query.length)){
     if(token!==searchToken)return;
     const begin=starts.findLastIndex(x=>x<=at),end=starts.findLastIndex(x=>x<at+query.length);if(begin<0||end<0)continue;
     const r=doc.createRange();r.setStart(nodes[begin],at-starts[begin]);r.setEnd(nodes[end],at+query.length-starts[end]);const cfi=cfiFor(book,index,r);
     const li=node('li'),button=node('button',text.slice(Math.max(0,at-28),at+query.length+48).replace(/\s+/g,' '));button.append(node('small',`章节 ${index+1}`));button.onclick=()=>{closePanel();engine.go(cfi).catch(error)};li.append(button);list.append(li);count++;
   }
   if(count>=150)break;await new Promise(r=>setTimeout(r,0));
 }if(token===searchToken)status.textContent=count?`${count}${count===150?'（已达显示上限）':''} 个结果`:'没有找到匹配文字';}catch(e){status.textContent='搜索失败：'+e.message;}
}
function more(){const p=showPanel('更多');actionButton(p,'选择阅读器',()=>chooseMode(active));actionButton(p,'跳回书首',()=>{closePanel();engine.go(0).catch(error)});actionButton(p,'关于 PolyReader',about);}
function about(){const p=showPanel('关于 PolyReader');p.append(node('h3','PolyReader'),node('div','0.4.12','about-version'),node('p','本地 EPUB / TXT 阅读器'),node('p','阅读器：BOOK☆WALKER、RIDI、RIDI Thai。每个阅读器独立保存字号、主题和操作设置。'));actionButton(p,'组件与许可',async()=>{const q=showPanel('组件与许可');q.append(node('p','BOOK☆WALKER 7.9.2：PUBLUS/MARS 排版内核，字体为リュウミン和ゴシックMB101。相关组件保留原版权。'),node('p','RIDI Reader.js 1.0.61、Foliate JS：MIT；RIDIBatang：SIL OFL 1.1；Garuda：GPL 2.0 或更新版本（含字体嵌入例外）。'));for(const f of ['vendor/ridi/LICENSE','vendor/foliate/LICENSE','fonts/RIDIBatang-LICENSE.txt','fonts/Garuda-LICENSE.txt']){const t=await(await fetch(f)).text();const pre=node('pre',t);pre.style.cssText='white-space:pre-wrap;font:11px/1.6 monospace';q.append(pre)}q.append(node('p','zip.js：BSD-3-Clause；fflate：MIT。相关版权声明保留在对应源文件中。'));});}

window.receiveNative=(type,value)=>{
 if(type==='bookwalker'){
   if(engine?.token!==value.token)return;
   engine.receive(value).catch(error);
   if(value.kind==='chrome')setChrome(value.value);
   if(value.kind==='pages'){engine.pageCount=value.value;if(engine.location)updateLocation(engine.location);}
   if(value.kind==='link')engine.go(value.value).catch(error);
   const actions={home,toc,settings,search:searchPanel,notes,bookmark:addBookmark,mode:()=>chooseMode(active),back:()=>engine.back().catch(error)};
   if(value.kind==='action')actions[value.value]?.();
   if(value.kind==='fraction')engine.fraction(value.value).catch(error);
   if(value.kind==='size')changePref('fontSize',value.value);
   if(value.kind==='selection'){if(value.value?.text&&value.value.text!=='null'&&value.value.rect)showSelection({...value.value,index:engine.location?.index,native:true});else clearSelection(false);}
   if(value.kind==='selectionDragging'){selectionDragging=!!value.value;positionSelection();}
   return;
 }

 if(type==='textEncoding'){const p=showPanel('文本编码');p.append(node('p',value.filename));for(const [encoding,label] of [['GB18030','中文 · GB18030'],['Shift_JIS','日文 · Shift-JIS'],['EUC-KR','韩文 · EUC-KR'],['UTF-16LE','UTF-16 LE'],['UTF-16BE','UTF-16 BE'],['windows-1252','西欧 · Windows-1252']])actionButton(p,label,()=>{closePanel();send('importText',{uri:value.uri,encoding,open:!!value.open})});return;}
 if(type==='error'){engine?.reject?.(new Error(value));error(new Error(value));return;}
 if(type==='notice'){toast(value);return;}
 if(type==='imported'||type==='openBook'){const i=library.findIndex(x=>x.id===value.id);if(i<0)library.push(value);else library[i]=value;renderLibrary();if(type==='openBook'){pendingOpen=value;openRequestedBook();}else toast('已导入：'+caption(value));}
 if(type==='library'){library=value;renderLibrary();}
 if(type==='font'){const id=fontForProfile||profile?.id;if(!id)return;state.fonts??={};state.fonts[id]=value;state.profiles[id].font='custom';state.profiles[id].publisher=false;save();if(profile?.id===id){engine.settings(layoutPrefs(prefs()),value).catch(error);settings('style');}toast('已导入字体');}
};
const bootstrap=window.Native?JSON.parse(window.Native.init()):{state:{},library:[],webview:'browser'};
state=migrateState(bootstrap.state||{});library=bootstrap.library||[];save();
$('import-button').onclick=()=>send('import');$('about-button').onclick=about;$('filter').oninput=renderLibrary;$('home').onclick=home;$('panel-close').onclick=closePanel;$('scrim').onclick=closePanel;
$('toc-button').onclick=toc;$('search-button').onclick=searchPanel;$('settings-button').onclick=()=>settings();$('style-button').onclick=()=>settings('style');$('notes-button').onclick=notes;$('add-bookmark').onclick=addBookmark;$('reader-more').onclick=more;
$('jump-back').onclick=()=>engine.back?.().catch(error);$('progress').onchange=()=>engine.fraction(+$('progress').value/1000).catch(error);
$('selection-bar').addEventListener('pointerdown',e=>e.preventDefault());
for(const [id,start] of [['selection-start',true],['selection-end',false]]){
 const handle=$(id);
 handle.addEventListener('pointerdown',e=>{
   const controller=selection?.doc?.polySelection;if(!controller?.range)return;
   e.preventDefault();handle.setPointerCapture(e.pointerId);
   const drag=controller.begin(start,e.clientX,e.clientY);if(!drag)return;
   handleDrag={id:e.pointerId,controller,drag};positionSelection();
 });
 handle.addEventListener('pointermove',e=>{
   const d=handleDrag;if(!d||d.id!==e.pointerId||!selection)return;e.preventDefault();
   if(d.controller.move(d.drag,e.clientX,e.clientY)){
     showSelection({...selection,...selectionData(d.controller,selection.index),anchor:{x:e.clientX,y:e.clientY}});
   }
 });
 const finish=e=>{if(handleDrag?.id===e.pointerId){handleDrag=null;positionSelection();}};
 handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('lostpointercapture',finish);
 handle.addEventListener('contextmenu',e=>e.preventDefault());
}
$('selection-copy').onclick=()=>{if(selection){send('copy',{text:selection.text});clearSelection();toast('已复制')}};$('selection-highlight').onclick=editNote;$('selection-close').onclick=()=>clearSelection();
window.onNativeBack=()=>{if(!$('panel').hidden)closePanel();else if(selection)clearSelection();else if(active&&!document.body.classList.contains('chrome-hidden'))setChrome(false);else if(active)home();else send('exit');};
window.nativeTurn=turn;window.flushState=flush;window.clearReaderSelection=clearSelection;
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearSelection();flush()}});
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(e.key==='Escape')window.onNativeBack();if(active&&e.key==='ArrowRight')turn(prefs().writing==='vertical'?-1:1);if(active&&e.key==='ArrowLeft')turn(prefs().writing==='vertical'?1:-1);});
// Debug builds expose diagnostics through WebView's standard remote debugging interface.
window.polyReader={get engine(){return engine},get book(){return book},get active(){return active},get profile(){return profile},get state(){return state},get library(){return library},openBook,home,turn,setChrome};
renderLibrary();

function syncNativeUI(){if(profile?.engine==='bookwalker'&&engine){send('bwUi',{modal:!$('panel').hidden||!$('loading').hidden,selectionRect:$('selection-bar').hidden?null:(r=>[r.left,r.top,r.right,r.bottom].map(x=>x*devicePixelRatio))($('selection-bar').getBoundingClientRect()),chrome:!document.body.classList.contains('chrome-hidden'),chromeRects:document.body.classList.contains('chrome-hidden')?[]:['reader-top','reader-bottom','add-bookmark'].map(id=>(r=>[r.left,r.top,r.right,r.bottom].map(x=>x*devicePixelRatio))($(id).getBoundingClientRect()))});}}
new MutationObserver(syncNativeUI).observe(document.body,{attributes:true,subtree:true,attributeFilter:['hidden','class']});
window.addEventListener('resize',()=>{clearSelection();if(engine&&active){clearTimeout(settingsTimer);settingsTimer=setTimeout(()=>engine.settings(layoutPrefs(prefs()),state.fonts?.[profile.id]).catch(error),200);}});

window.addEventListener('resize',()=>setTimeout(syncNativeUI,100));
