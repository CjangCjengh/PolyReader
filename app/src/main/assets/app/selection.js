const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Rectangles and viewport bounds use the host WebView's CSS pixels.
export function selectionPopup(rects,bounds,size,anchor,handles=[],vertical=false){
 const visible=rects.filter(r=>r.right>bounds.left&&r.left<bounds.right&&r.bottom>bounds.top&&r.top<bounds.bottom&&r.right>r.left&&r.bottom>r.top);
 if(!visible.length)return null;
 const distance=r=>anchor?Math.hypot(clamp(anchor.x,r.left,r.right)-anchor.x,clamp(anchor.y,r.top,r.bottom)-anchor.y):0;
 const r=visible.reduce((best,r)=>distance(r)<distance(best)?r:best);
 const x=clamp((r.left+r.right-size.width)/2,bounds.left,Math.max(bounds.left,bounds.right-size.width));
 const focus=anchor||(handles.length?{x:handles.reduce((n,h)=>n+(h.left+h.right)/2,0)/handles.length,y:handles.reduce((n,h)=>n+(h.top+h.bottom)/2,0)/handles.length}:null);
 const union={top:Math.min(...visible.map(r=>r.top)),bottom:Math.max(...visible.map(r=>r.bottom))};
 const xs=[x,bounds.left,bounds.right-size.width,...handles.flatMap(h=>[h.left-size.width-6,h.right+6])];
 const ys=[r.top-size.height-20,r.bottom+20,union.top-size.height-20,union.bottom+20,
  ...handles.flatMap(h=>[h.top-size.height-6,h.bottom+6]),bounds.top,bounds.bottom-size.height];
 if(focus){xs.unshift(focus.x-size.width/2);ys.unshift(focus.y-size.height-32,focus.y+32,focus.y-size.height/2);}
 const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 const clearHandles=box=>!handles.some(h=>overlap(box,{left:h.left-4,right:h.right+4,top:h.top-4,bottom:h.bottom+4})>0);
 const singleRow=!vertical&&Math.max(...visible.map(r=>r.top))<Math.min(...visible.map(r=>r.bottom));
 if(singleRow){
  const rowX=clamp((Math.min(...visible.map(r=>r.left))+Math.max(...visible.map(r=>r.right))-size.width)/2,bounds.left,bounds.right-size.width);
  for(const y of [union.top-size.height-20,Math.max(union.bottom+20,...handles.map(h=>h.bottom+6))]){
   const box={left:rowX,right:rowX+size.width,top:y,bottom:y+size.height};
   if(y>=bounds.top&&box.bottom<=bounds.bottom&&clearHandles(box))return {x:rowX,y};
  }
 }
 let best=null,score=Infinity;
 for(const px of xs)for(const py of ys){
  const p={x:clamp(px,bounds.left,bounds.right-size.width),y:clamp(py,bounds.top,bounds.bottom-size.height)};
  const box={left:p.x,right:p.x+size.width,top:p.y,bottom:p.y+size.height};
  if(!clearHandles(box))continue;
  const covered=visible.reduce((n,v)=>n+overlap(box,v),0);
  const cost=handles.length&&focus
   ?Math.hypot(p.x+size.width/2-focus.x,p.y+size.height/2-focus.y)+Math.min(1,covered/(size.width*size.height))*80+(p.y>focus.y?5:0)
   :covered*10+Math.abs(p.x-x)+Math.abs(p.y-(r.top-size.height-20));
  if(cost<score){best=p;score=cost;}
 }
 return best;
}
