// Capture paint semantics before the reader applies its palette. Attributes keep
// text nodes and EPUB CFI paths intact, including nested spans and ruby.
export function capturePublisherStyles(doc){
 const win=doc.defaultView,styles=new Map();
 const css=el=>{if(!styles.has(el)){const s=win.getComputedStyle(el);styles.set(el,{color:s.color,fill:s.webkitTextFillColor,stroke:parseFloat(s.webkitTextStrokeWidth),position:s.position,breakInside:s.breakInside});}return styles.get(el);};
 const transparent=color=>color==='transparent'||/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(color);
 const clear=[],stroked=[],overlays=new Set();
 for(const el of doc.body.querySelectorAll('*')){
   const s=css(el);
   if(transparent(s.fill||s.color))clear.push(el);
   if(!(s.stroke>0))continue;
   stroked.push(el);
   let absolute=false;
   for(let ancestor=el;ancestor&&ancestor!==doc.body;ancestor=ancestor.parentElement){
     const a=css(ancestor);absolute||=a.position==='absolute';
     if(absolute&&a.breakInside.startsWith('avoid')){overlays.add(ancestor);break;}
   }
 }
 clear.forEach(el=>el.setAttribute('data-poly-clear-text',''));
 stroked.forEach(el=>el.setAttribute('data-poly-stroked-text',''));
 overlays.forEach(el=>{
   el.setAttribute('data-poly-text-overlay','');
   const s=win.getComputedStyle(el);
   // Give edge strokes the same small inset as the RIDI text canvas.
   if(parseFloat(s.marginLeft)===0&&parseFloat(s.marginRight)===0)el.setAttribute('data-poly-overlay-inset','');
 });
}
