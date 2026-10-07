// Preferences belong to reader IDs, independently of a book's language.
export const profiles = [
  {id:'bookwalker',name:'BOOK☆WALKER',engine:'bookwalker',lang:'ja',fontControl:{min:50,max:300,step:10,suffix:'%'},defaults:{preset:'bookwalker',fontSize:160,lineHeight:1.75,spacing:0,margin:9,topMargin:64,bottomMargin:12,theme:'amber',font:'serif',flow:'paginated',writing:'vertical',align:'original',publisher:true,ruby:true,animation:false,volume:true,awake:false,fullscreen:true,brightness:-1,orientation:0,spread:false}},
  {id:'ridi',name:'RIDI',engine:'ridi',lang:'ko',fontControl:{min:1,max:12,step:1,suffix:''},defaults:{preset:'ridi',fontSize:8,lineHeight:1.45,spacing:1,margin:20,topMargin:78,bottomMargin:27,theme:'beige',font:'sans',flow:'paginated',writing:'horizontal',align:'start',publisher:false,ruby:true,animation:false,volume:true,awake:false,fullscreen:true,brightness:-1,orientation:0,spread:false}}
];
export const themes={amber:['#ebd2a5','#5a4114'],beige:['#f0e8d1','#32312f'],paper:['#fffdf7','#292b28'],white:['#ffffff','#222222'],sepia:['#eee3c9','#40382b'],green:['#dfe9da','#2d3a2d'],night:['#000000','#bebebe'],nightLight:['#000000','#d2d2d2']};
export const themeOptions=[['amber','暖黄'],['beige','米色'],['paper','纸白'],['white','纯白'],['sepia','茶色'],['green','浅绿'],['night','夜间'],['nightLight','夜间 · 亮字']];
export function palette(p){return themes[p.theme]||themes.paper;}
export function isDarkTheme(p){return p.theme==='night'||p.theme==='nightLight';}
export function selectionStyle(p){return isDarkTheme(p)?{background:'#29465e',foreground:'#f3f3f3'}:{background:'#bad6e8',foreground:'#202b32'};}
export const highlightColors=['#e4c56a','#8abc9b','#97bde0','#dba0a8'];
const darkHighlights=['#514219','#244634','#283f59','#532e3a'];
export function highlightStyle(p,color=highlightColors[0]){
 const index=highlightColors.indexOf(color);
 return {background:isDarkTheme(p)?darkHighlights[Math.max(0,index)]:color,foreground:palette(p)[1]};
}
// RIDI 26.9.1 EpubRenderingContext's original phone scale (base 18 dp).
export const ridiFontRatios=[.8,.85,.9,.95,1,1.1,1.25,1.4,1.6,1.8,2.05,2.3];
const ridiTabletRatios=[.7,.8,.9,.95,1,1.1,1.25,1.48,1.8,2,2.25,2.5];
export function ridiFontSize(level,shortEdge=412){const ratios=shortEdge>=720?ridiTabletRatios:ridiFontRatios;return Math.floor((shortEdge>=600?22:18)*ratios[Math.max(0,Math.min(11,Math.round(level)-1))]);}
export function layoutPrefs(p){return {...p,fontSize:p.preset==='ridi'?ridiFontSize(p.fontSize,Math.min(window.screen.width,window.screen.height)):p.fontSize};}
export function migrateState(state){
 state.version=1;state.books??={};state.profiles??={};
 if((state.readerSettingsVersion||0)<1){
   for(const [oldId,id] of [['japanese','bookwalker'],['korean','ridi']]){
     const old=state.profiles[oldId];
     if(old&&!state.profiles[id]){
       const migrated={...old,preset:id};
       migrated.fontSize=id==='bookwalker'?(old.fontSize===26?160:Math.max(50,Math.min(300,Math.round((old.fontSize||26)*100/16/10)*10))):ridiFontRatios.reduce((best,_,i)=>Math.abs(ridiFontSize(i+1)-(old.fontSize||25))<Math.abs(ridiFontSize(best)-(old.fontSize||25))?i+1:best,8);
       if(old.theme==='day')migrated.theme=id==='bookwalker'?'amber':'beige';
       if(old.theme==='night'&&id==='bookwalker')migrated.theme='nightLight';
       delete migrated.referenceScale;state.profiles[id]=migrated;
     }
     delete state.profiles[oldId];
     if(state.fonts?.[oldId]){state.fonts[id]??=state.fonts[oldId];delete state.fonts[oldId];}
     for(const b of Object.values(state.books)){
       if(b.mode===oldId)b.mode=id;
       if(b.locations?.[oldId]){b.locations[id]??=b.locations[oldId];delete b.locations[oldId];}
     }
   }
   state.readerSettingsVersion=1;
 }
 if((state.readerSettingsVersion||0)<2){
   const r=state.profiles.ridi;
   // Update the previous default pair; retain margins the user customized.
   if(r?.topMargin===79&&r.bottomMargin===28){r.topMargin=78;r.bottomMargin=27;}
   state.readerSettingsVersion=2;
 }
 for(const p of profiles)state.profiles[p.id]={...p.defaults,...state.profiles[p.id],preset:p.id};
 return state;
}
export function contentCSS(p,customFont){
 const [bg,fg]=palette(p);
 const family=p.font==='custom'&&customFont?`'UserFont'`:p.font==='ridi'?"'RIDIBatang',serif":p.font==='sans'?'sans-serif':'serif';
 return `@font-face{font-family:RIDIBatang;src:url("https://appassets.androidplatform.net/app/fonts/RIDIBatang.otf")} ${customFont?`@font-face{font-family:UserFont;src:url("https://appassets.androidplatform.net/fonts/${customFont.id}.font")}`:''}
 html{background:${bg}!important;color:${fg}!important;font-size:${p.fontSize}px!important;writing-mode:${p.writing==='vertical'?'vertical-rl':'horizontal-tb'}!important;-webkit-writing-mode:${p.writing==='vertical'?'vertical-rl':'horizontal-tb'}!important;line-break:strict!important;}
 body{color:${fg}!important;background:transparent!important;font-size:1rem!important;writing-mode:inherit!important;-webkit-writing-mode:inherit!important;font-family:${family}!important;line-height:${p.lineHeight}!important;}
 p,div,li,blockquote,dd{font-family:${family}!important;line-height:${p.lineHeight}!important;}p{${p.publisher?'':`margin-block-start:${p.spacing}em!important;margin-block-end:${p.spacing}em!important;`}${p.align==='original'?'':`text-align:${p.align}!important;`}word-break:normal;overflow-wrap:break-word;${p.preset==='ridi'?'word-spacing:normal!important;':''}}
 ${p.font==='custom'||p.font==='sans'||p.font==='serif'?`body,p,div,li{font-family:${family}!important}`:''}
 body,p,div,span,li,h1,h2,h3,h4{color:${fg}!important;}body *:not(img):not(svg):not(image):not(mark){background-color:transparent!important}
 html:has(body[data-poly-image]){writing-mode:horizontal-tb!important;-webkit-writing-mode:horizontal-tb!important}
 body[data-poly-image]{text-align:center!important}body[data-poly-image]>div{height:100%!important;text-align:center!important}body[data-poly-image] img,body[data-poly-image] svg{display:block;margin:auto!important;object-fit:contain!important}
 img,svg{max-width:100%;max-height:100%;object-fit:contain}a{color:inherit}pre{white-space:pre-wrap}ruby{ruby-position:over}rt{font-size:0.5em}${p.ruby?'':'rt,rp{display:none!important}'}
 ::selection{background:${selectionStyle(p).background};color:${selectionStyle(p).foreground}}mark{background:${highlightStyle(p).background}!important;color:${fg}!important}
 `;
}
