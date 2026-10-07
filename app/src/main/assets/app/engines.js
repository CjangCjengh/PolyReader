import './compat.js';
import './vendor/foliate/view.js';
import {EPUB} from './vendor/foliate/epub.js';
import * as CFI from './vendor/foliate/epubcfi.js';
import {Overlayer} from './vendor/foliate/overlayer.js';
import {SectionProgress} from './vendor/foliate/progress.js';
import {contentCSS,palette} from './profiles.js';

const delay=ms=>new Promise(r=>setTimeout(r,ms));
export async function loadBook(id){
 const origin='https://appassets.androidplatform.net';
 const entries=await (await fetch(`${origin}/index/${id}`)).json();
 const map=new Map(entries.map(e=>[e.name,e.size]));
 const url=name=>`${origin}/entry/${id}/${name.split('/').map(encodeURIComponent).join('/')}`;
 const book=await new EPUB({
   loadText:async name=>map.has(name)?(await fetch(url(name))).text():null,
   loadBlob:async(name,type)=>map.has(name)?new Blob([await(await fetch(url(name))).arrayBuffer()],{type}):null,
   getSize:name=>map.get(name)||0
 }).init();
 // Content is untrusted. Remove executable/navigation elements before a section gets a Blob URL.
 book.transformTarget?.addEventListener('data',({detail})=>{
   if(/html|svg\+xml/.test(detail.type)) detail.data=Promise.resolve(detail.data).then(data=>{
     const type=detail.type.includes('xhtml')?'application/xhtml+xml':detail.type.includes('svg')?'image/svg+xml':'text/html';
     const doc=new DOMParser().parseFromString(data,type);
     if(doc.querySelector('parsererror')) throw new Error('EPUB 章节 XML 格式错误');
     doc.querySelectorAll('script,iframe,object,embed,form,base,meta[http-equiv]').forEach(x=>x.remove());
     for(const e of doc.querySelectorAll('*')) for(const a of [...e.attributes]) {
       if(/^on/i.test(a.name)||((/href$|^src$|^action$/i.test(a.name))&&/^\s*(javascript|vbscript|file|content):/i.test(a.value))) e.removeAttribute(a.name);
     }
     if(doc.body && !doc.body.textContent.trim() && doc.body.querySelector('img,svg'))doc.body.setAttribute('data-poly-image','true');
     return new XMLSerializer().serializeToString(doc);
   });
 });
 book.localId=id;return book;
}
export function cfiFor(book,index,range){return CFI.joinIndir(book.sections[index].cfi??CFI.fake.fromIndex(index),CFI.fromRange(range));}
function rangeFor(book,cfi,doc){return book.resolveCFI(cfi).anchor(doc);}

/** Contract: mount, settings, go, turn, fraction, contents, annotate, destroy. */
export class FoliateEngine {
 async mount(host,book,prefs,custom,callbacks,location){
   Object.assign(this,{book,callbacks,prefs,custom});
   this.view=document.createElement('foliate-view');host.append(this.view);
   this.view.addEventListener('load',({detail})=>callbacks.content(detail.doc,detail.index));
   this.view.addEventListener('external-link',e=>{e.preventDefault();callbacks.notice('此链接指向外部网站，离线阅读器未打开它');});
   this.view.addEventListener('link',e=>{
     if((e.detail.a.getAttribute('epub:type')||'').includes('noteref')) {e.preventDefault();callbacks.footnote(e.detail.href);}
   });
   this.view.addEventListener('relocate',({detail})=>{
     const renderer=this.view.renderer;
     this.location={cfi:detail.cfi,index:detail.section?.current??0,fraction:detail.fraction||0,label:detail.tocItem?.label||'',page:Math.max(1,Math.round(renderer.page??1)),pages:Math.max(1,(renderer.pages??3)-2)};
     callbacks.location(this.location);
   });
   this.view.addEventListener('draw-annotation',e=>e.detail.draw(Overlayer.highlight,{color:e.detail.annotation.color}));
   this.view.addEventListener('create-overlay',()=>setTimeout(()=>callbacks.redraw(),0));
   await this.view.open(book);await this.settings(prefs,custom,false);
   await this.view.init({lastLocation:location?.cfi,showTextStart:false});
 }
 async settings(prefs,custom,restore=true){
   this.prefs=prefs;this.custom=custom;const r=this.view.renderer,loc=this.location?.cfi;
   r.setAttribute('flow',prefs.flow);r.setAttribute('margin',prefs.margin+'px');
   this.view.style.paddingTop=prefs.topMargin+'px';this.view.style.paddingBottom=prefs.bottomMargin+'px';r.setAttribute('margin','0px');r.setAttribute('gap',(200*prefs.margin/Math.max(1,this.view.clientWidth))+'%');r.setAttribute('max-column-count',prefs.spread?'2':'1');
   r.setAttribute('max-inline-size','950px');r.setAttribute('max-block-size','2000px');
   r.toggleAttribute('animated',prefs.animation);r.setStyles?.(contentCSS(prefs,custom));
   if(restore&&loc){await delay(60);await this.view.goTo(loc);}
 }
 async go(target){await this.view.goTo(target);}
 async turn(direction){await (direction>0?this.view.renderer.next():this.view.renderer.prev());}
 async fraction(value){await this.view.goToFraction(value);}
 contents(){return this.view.renderer.getContents();}
 async annotate(notes){for(const n of notes) if(n.type==='highlight') await this.view.addAnnotation({value:n.cfi,color:n.color});}
 destroy(){this.view.close();this.view.remove();}
}

export class RidiEngine {
 async mount(host,book,prefs,custom,callbacks,location){
   Object.assign(this,{book,prefs,custom,callbacks,index:0,busy:false,history:[]});
   this.progress=new SectionProgress(book.sections,1500,1600);
   this.frame=document.createElement('iframe');this.frame.id='ridi-frame';this.frame.title='RIDI Reader.js';
   this.frame.setAttribute('sandbox','allow-same-origin allow-scripts');host.append(this.frame);
   this.observer=new ResizeObserver(()=>{clearTimeout(this.resizeTimer);this.resizeTimer=setTimeout(()=>{if(this.reader&&!this.busy)this.settings(this.prefs,this.custom).catch(callbacks.error)},180)});this.observer.observe(host);
   await this.go(location?.cfi||0);
 }
 async open(index,anchor=0){
   if(index<0||index>=this.book.sections.length)return;
   this.busy=true;
   try{
     if(this.index!==index)this.book.sections[this.index]?.unload?.();
     this.index=index;const src=await this.book.sections[index].load();
     await new Promise((resolve,reject)=>{this.frame.onload=resolve;this.frame.onerror=()=>reject(new Error('章节加载失败'));this.frame.src=src;});
     const w=this.frame.contentWindow,doc=w.document;
     this.doc=doc;this.reader=null;
     await new Promise((resolve,reject)=>{const script=doc.createElement('script');script.src='https://appassets.androidplatform.net/app/vendor/ridi/reader.js';script.onload=resolve;script.onerror=()=>reject(new Error('RIDI 内核加载失败'));doc.head.append(script);});
     w.android={dipToPixel:x=>x};
     this.style=doc.createElement('style');this.style.dataset.poly='layout';doc.head.append(this.style);
     await this.layout();
     doc.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;e.preventDefault();const href=this.book.sections[index].resolveHref?.(a.getAttribute('href'))||a.getAttribute('href');if(this.book.isExternal(href)){this.callbacks.notice('离线模式未打开外部链接');return;}if((a.getAttribute('epub:type')||'').includes('noteref'))this.callbacks.footnote(href);else this.go(href).catch(this.callbacks.error);});
     this.callbacks.content(doc,index);
     w.addEventListener('scroll',()=>{clearTimeout(this.scrollTimer);this.scrollTimer=setTimeout(()=>this.emitLocation(),120)});
     await this.moveAnchor(anchor);
     this.emitLocation();this.callbacks.redraw();
   }finally{this.busy=false;}
 }
 async layout(){
   const doc=this.doc,w=this.frame.contentWindow,p=this.prefs;
   const W=Math.max(100,this.frame.clientWidth),H=Math.max(100,this.frame.clientHeight),m=Math.min(p.margin,W/5),top=p.topMargin??m,bottom=p.bottomMargin??m,cw=W-2*m,ch=H-top-bottom;
   const scroll=p.flow==='scrolled';
   this.style.textContent=contentCSS({...p,writing:'horizontal'},this.custom)+`
     html{width:${W}px!important;height:${scroll?'auto':H+'px'}!important;margin:0!important;padding:0!important;overflow-x:hidden!important;overflow-y:${scroll?'auto':'hidden'}!important;}
     body{box-sizing:content-box!important;width:${cw}px!important;max-width:none!important;min-width:0!important;height:${scroll?'auto':ch+'px'}!important;max-height:none!important;margin:${top}px ${m}px ${bottom}px!important;padding:0!important;column-width:${scroll?'auto':cw+'px'}!important;column-gap:${2*m}px!important;column-fill:auto!important;column-count:auto!important;position:static!important;}
     img,svg{max-width:${cw}px!important;max-height:${ch}px!important;break-inside:avoid!important;}body>div{max-width:100%}h1,h2,h3{break-after:avoid}::-webkit-scrollbar{display:none}
   `;
   // Force style resolution before waiting, so newly selected fonts participate in pagination.
   void doc.documentElement.offsetWidth;
   await doc.fonts.ready;
   await Promise.all([...doc.images].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.addEventListener('load',r,{once:true});img.addEventListener('error',r,{once:true});setTimeout(r,2500)})));
   const context=new w.ReaderJS.Context(cw,ch,2*m,w.devicePixelRatio,false,scroll);
   context.chromeMajorVersion=+(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]||110);
   this.reader=new w.ReaderJS.Reader(doc.documentElement,context,0,this.book.sections[this.index].id);
   await delay(30);
   this.pageUnit=scroll?H:W;this.pages=Math.max(1,scroll?Math.ceil(doc.documentElement.scrollHeight/H):this.reader.calcPageCount());
 }
 async settings(prefs,custom){
   while(this.busy&&!this.destroyed)await delay(20);
   if(this.destroyed)return;
   this.busy=true;const cfi=this.location?.cfi;
   try{Object.assign(this,{prefs,custom});await this.layout();if(cfi)await this.moveAnchor(rangeFor(this.book,cfi,this.doc));this.emitLocation();this.callbacks.redraw();}finally{this.busy=false;}
 }
 async moveAnchor(anchor){
   const w=this.frame.contentWindow,scroll=this.prefs.flow==='scrolled';
   let offset=0;
   if(typeof anchor==='function')anchor=anchor(this.doc);
   if(typeof anchor==='number')offset=scroll?anchor*Math.max(0,this.doc.documentElement.scrollHeight-this.frame.clientHeight):Math.floor(anchor*Math.max(0,this.pages-1))*this.pageUnit;
   else if(anchor){const rects=anchor.getClientRects?.();const r=(rects&&[...rects].find(x=>x.width>0&&x.height>0))||anchor.getBoundingClientRect();offset=scroll?r.top+w.scrollY:Math.floor((r.left+w.scrollX)/this.pageUnit)*this.pageUnit;}
   this.reader.scrollTo(Math.max(0,offset));await delay(35);
 }
 async go(target,remember=true){
   if(remember&&this.location?.cfi&&target!==this.location.cfi){this.history.push(this.location.cfi);if(this.history.length>64)this.history.shift();}
   while(this.busy&&!this.destroyed)await delay(20);
   if(this.destroyed)return;
   let index,anchor=0;
   if(typeof target==='number')index=target;
   else ({index,anchor}=target.startsWith('epubcfi(')?this.book.resolveCFI(target):this.book.resolveHref(target));
   if(this.reader&&index===this.index){await this.moveAnchor(anchor);this.emitLocation();}
   else await this.open(index,anchor);
 }
 async back(){const cfi=this.history.pop();if(cfi)await this.go(cfi,false);else this.callbacks.notice('没有可返回的跳转位置');}
 async turn(dir){
   if(this.busy||!this.reader)return;
   const w=this.frame.contentWindow,scroll=this.prefs.flow==='scrolled';
   const offset=scroll?w.scrollY:w.scrollX,max=scroll?Math.max(0,this.doc.documentElement.scrollHeight-this.frame.clientHeight):(this.pages-1)*this.pageUnit;
   if((dir>0&&offset>=max-3)||(dir<0&&offset<=3)) {
     let index=this.index+dir;while(this.book.sections[index]?.linear==='no')index+=dir;
     if(index<0||index>=this.book.sections.length){this.callbacks.notice(dir>0?'已到书末':'已到书首');return;}
     await this.open(index,dir>0?0:1);
   } else {this.reader.scrollTo(Math.max(0,Math.min(max,offset+dir*this.pageUnit)),this.prefs.animation);await delay(this.prefs.animation?260:35);this.emitLocation();}
 }
 async fraction(value){while(this.busy&&!this.destroyed)await delay(20);if(this.destroyed)return;const[index,anchor]=this.progress.getSection(value);if(index!==this.index)await this.open(index,anchor);else{await this.moveAnchor(anchor);this.emitLocation();}}
 emitLocation(){
   if(!this.reader)return;
   const w=this.frame.contentWindow,doc=this.doc,scroll=this.prefs.flow==='scrolled',offset=scroll?w.scrollY:w.scrollX;
   const page=Math.max(0,Math.round(offset/this.pageUnit)),frac=scroll?offset/Math.max(1,doc.documentElement.scrollHeight):page/this.pages;
   let range=doc.createRange();range.selectNodeContents(doc.body);range.collapse(true);
   // Persist a standard CFI for both engines. Locate a visible text range without mutating the DOM.
   outer:for(const node of this.reader.content.nodes){
     if(node.nodeType!==3||!node.textContent.trim())continue;
     const r=doc.createRange();r.selectNodeContents(node);const rects=[...r.getClientRects()];
     if(!rects.some(r=>r.left>=0&&r.left<this.frame.clientWidth&&r.top>=0&&r.top<this.frame.clientHeight))continue;
     let low=0,high=node.length;
     while(low<high){const mid=(low+high)>>1;r.setStart(node,mid);r.setEnd(node,Math.min(mid+1,node.length));const b=r.getBoundingClientRect();if(scroll?b.bottom<0:b.right<0)low=mid+1;else high=mid;}
     r.setStart(node,Math.min(low,node.length));r.collapse(true);range=r;break outer;
   }
   this.location={index:this.index,cfi:cfiFor(this.book,this.index,range),fraction:this.progress.getProgress(this.index,frac).fraction,page:page+1,pages:this.pages,label:''};
   this.callbacks.location(this.location);
 }
 contents(){return this.doc?[{doc:this.doc,index:this.index}]:[];}
 async annotate(notes){
   const win=this.frame.contentWindow;
   let styles=this.doc.querySelector('style[data-poly="highlights"]');if(!styles){styles=this.doc.createElement('style');styles.dataset.poly='highlights';this.doc.head.append(styles);}styles.textContent='';
   if(win.CSS?.highlights){win.CSS.highlights.clear();let n=0;for(const note of notes){if(note.type!=='highlight')continue;try{const resolved=this.book.resolveCFI(note.cfi);if(resolved.index!==this.index)continue;const name='poly'+n++;win.CSS.highlights.set(name,new win.Highlight(resolved.anchor(this.doc)));styles.textContent+=`::highlight(${name}){background-color:${note.color};color:inherit}`;}catch{}}}
 }
 destroy(){this.destroyed=true;clearTimeout(this.resizeTimer);clearTimeout(this.scrollTimer);this.observer.disconnect();this.frame.remove();}
}
export class BookWalkerEngine {
 async mount(host,book,prefs,custom,callbacks,location){
   Object.assign(this,{book,prefs,callbacks,token:crypto.randomUUID(),location,history:[]});
   this.progress=new SectionProgress(book.sections,1500,1600);
   document.body.classList.add('native-reader');
   this.ready=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
   window.Native.post(JSON.stringify({action:'bwOpen',token:this.token,bookId:book.localId,prefs:this.nativePrefs(prefs),location:location?.cfi||''}));
   return this.ready;
 }
 nativePrefs(p){const[background,foreground]=palette(p);return {...p,background,foreground};}
 async receive(event){
   if(event.token!==this.token||this.destroyed)return;
   if(event.kind==='error'){this.reject?.(new Error(event.value));this.callbacks.error(new Error(event.value));return;}
   if(event.kind!=='location')return;
   const cfi=event.value.replace(/^#/, '');if(!cfi.startsWith('epubcfi('))return;
   try{
     const {index,anchor}=this.book.resolveCFI(cfi);
     if(this.docIndex!==index){this.doc=await this.book.sections[index].createDocument();this.docIndex=index;}
     let part=0;try{const r=anchor(this.doc),before=this.doc.createRange();before.selectNodeContents(this.doc.body);before.setEnd(r.startContainer,r.startOffset);part=before.toString().length/Math.max(1,this.doc.body.textContent.length);}catch{}
     this.location={cfi,index,fraction:this.progress.getProgress(index,part).fraction,label:'',page:0,pages:0};
     this.callbacks.location(this.location);if(this.resolve){this.callbacks.redraw();this.resolve();this.resolve=null;}
   }catch(e){this.callbacks.error(e);this.resolve?.();this.resolve=null;}
 }
 async settings(prefs){this.prefs=prefs;window.Native.post(JSON.stringify({action:'bwSettings',prefs:this.nativePrefs(prefs)}));}
 async go(target,remember=true){if(typeof target==='number')target=this.book.sections[target].cfi||CFI.fake.fromIndex(target);if(remember&&this.location?.cfi&&target!==this.location.cfi){this.history.push(this.location.cfi);if(this.history.length>64)this.history.shift();}window.Native.post(JSON.stringify({action:'bwGo',target}));}
 async back(){const cfi=this.history.pop();if(cfi)await this.go(cfi,false);else this.callbacks.notice('没有可返回的跳转位置');}
 async turn(direction){window.Native.post(JSON.stringify({action:'bwTurn',direction}));}
 async fraction(value){const[index,part]=this.progress.getSection(value);const doc=await this.book.sections[index].createDocument();const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT);let offset=Math.floor(doc.body.textContent.length*part),node;while(node=walker.nextNode()){if(offset<=node.length)break;offset-=node.length;}if(node){const range=doc.createRange();range.setStart(node,offset);range.collapse(true);await this.go(cfiFor(this.book,index,range));}else await this.go(index);}
 contents(){return this.doc?[{doc:this.doc,index:this.docIndex}]:[];}
 async annotate(notes){window.Native.post(JSON.stringify({action:'bwAnnotate',notes}));}
 destroy(){this.destroyed=true;window.Native.post(JSON.stringify({action:'bwClose'}));document.body.classList.remove('native-reader');}
}
export const engineRegistry=new Map([['foliate',FoliateEngine],['ridi',RidiEngine],['bookwalker',BookWalkerEngine]]);
