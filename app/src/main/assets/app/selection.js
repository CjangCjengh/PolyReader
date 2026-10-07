const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Rectangles and viewport bounds use the host WebView's CSS pixels.
export function selectionPopup(rects,bounds,size,anchor){
 const visible=rects.filter(r=>r.right>bounds.left&&r.left<bounds.right&&r.bottom>bounds.top&&r.top<bounds.bottom&&r.right>r.left&&r.bottom>r.top);
 if(!visible.length)return null;
 const distance=r=>anchor?Math.hypot(clamp(anchor.x,r.left,r.right)-anchor.x,clamp(anchor.y,r.top,r.bottom)-anchor.y):0;
 const r=visible.reduce((best,r)=>distance(r)<distance(best)?r:best);
 const x=clamp((r.left+r.right-size.width)/2,bounds.left,Math.max(bounds.left,bounds.right-size.width));
 const above=r.top-size.height-12,below=r.bottom+12;
 const y=above>=bounds.top?above:below+size.height<=bounds.bottom?below:clamp(above,bounds.top,bounds.bottom-size.height);
 return {x,y};
}
