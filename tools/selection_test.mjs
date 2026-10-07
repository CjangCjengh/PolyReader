import assert from 'node:assert/strict';
import {selectionPopup} from '../app/src/main/assets/app/selection.js';
import {highlightStyle,highlightColors,selectionStyle} from '../app/src/main/assets/app/profiles.js';
const bounds={left:12,right:400,top:62,bottom:850},size={width:278,height:56};
const middle={left:190,right:220,top:300,bottom:350};
assert.deepEqual(selectionPopup([middle],bounds,size),{x:66,y:224});
const upper={left:15,right:38,top:70,bottom:105};
assert.deepEqual(selectionPopup([upper],bounds,size),{x:12,y:125});
assert.equal(selectionPopup([{left:-40,right:-20,top:90,bottom:130}],bounds,size),null);
assert.equal(selectionPopup([middle,{left:210,right:280,top:610,bottom:640}],bounds,size,{x:240,y:622}).y,534);
for(const r of [middle,upper,{left:385,right:410,top:800,bottom:839}]){
 const p=selectionPopup([r],bounds,size);assert(p.x>=bounds.left&&p.x+size.width<=bounds.right&&p.y>=bounds.top&&p.y+size.height<=bounds.bottom);
}
const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const tall={left:180,right:260,top:70,bottom:790},ends=[{left:240,right:284,top:140,bottom:184},{left:180,right:224,top:250,bottom:294}];
const nearby=selectionPopup([tall],bounds,size,null,ends);
assert(nearby.y<350,'Long vertical selections keep the menu near their handles');
for(const rects of [[middle],[{left:25,right:380,top:150,bottom:760}],[upper,{left:20,right:350,top:160,bottom:200}]]){
 const handles=[{left:10,right:54,top:rects[0].bottom-12,bottom:rects[0].bottom+32},
  {left:170,right:214,top:rects.at(-1).bottom-12,bottom:rects.at(-1).bottom+32}];
 const p=selectionPopup(rects,bounds,size,{x:190,y:rects.at(-1).bottom},handles);
 assert(p,'Menu fits around the handle targets');
 assert(handles.every(h=>!intersects(h,{left:p.x,right:p.x+size.width,top:p.y,bottom:p.y+size.height})));
}
const luminance=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
for(const theme of ['night','nightLight'])for(const color of highlightColors){
 const s=highlightStyle({theme},color),a=luminance(s.foreground),b=luminance(s.background);
 assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);
 assert.equal(color,highlightStyle({theme:'beige'},color).background);
}
for(const theme of ['night','nightLight','beige','amber']){
 const s=selectionStyle({theme}),a=luminance(s.foreground),b=luminance(s.background);
 assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);
}
console.log('PASS selection placement, viewport edges, anchor choice and highlight contrast');
