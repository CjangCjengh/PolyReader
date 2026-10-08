// Pointer capture stays on the list while its rows move, including on Android.
export function reorderList(list,{scroll,commit,error,announce}){
 let drag=null,frame=0,busy=false,disposed=false;
 const rows=()=>[...list.children];
 const order=()=>rows().map(row=>row.dataset.id);
 const restore=original=>list.append(...original);
 const notify=row=>announce(row,rows().indexOf(row)+1,rows().length);
 async function save(original,row){
  if(rows().every((r,i)=>r===original[i]))return;
  busy=true;list.inert=true;list.setAttribute('aria-busy','true');
  try{await commit(order());if(!disposed)notify(row);}
  catch(e){if(!disposed){restore(original);error(e);}}
  finally{busy=false;list.inert=false;list.removeAttribute('aria-busy');}
 }
 function position(){
  const d=drag;if(!d?.ghost)return;
  const top=d.y-d.offset,center=top+d.height/2;
  d.ghost.style.top=top+'px';
  const next=rows().find(row=>row!==d.row&&center<row.getBoundingClientRect().top+row.offsetHeight/2);
  if(next!==d.row.nextElementSibling)list.insertBefore(d.row,next||null);
 }
 function tick(){
  if(!drag?.ghost)return;
  const r=scroll.getBoundingClientRect(),edge=48,y=drag.y;
  const speed=y<r.top+edge?-Math.min(12,(r.top+edge-y)/4):y>r.bottom-edge?Math.min(12,(y-r.bottom+edge)/4):0;
  if(speed){scroll.scrollTop+=speed;position();}
  frame=requestAnimationFrame(tick);
 }
 function down(e){
  const handle=e.target.closest('.ai-drag-handle');
  if(!handle||!list.contains(handle)||busy||drag||!e.isPrimary||e.button!==0)return;
  e.preventDefault();handle.focus({preventScroll:true});
  const row=handle.closest('[data-id]'),rect=row.getBoundingClientRect();
  drag={row,original:rows(),id:e.pointerId,start:e.clientY,y:e.clientY,offset:e.clientY-rect.top,height:rect.height,rect};
  list.setPointerCapture(e.pointerId);
 }
 function move(e){
  const d=drag;if(!d||e.pointerId!==d.id)return;e.preventDefault();d.y=e.clientY;
  if(!d.ghost&&Math.abs(d.y-d.start)>4){
   d.ghost=d.row.cloneNode(true);d.ghost.classList.add('ai-dragging');d.ghost.setAttribute('aria-hidden','true');d.ghost.inert=true;
   Object.assign(d.ghost.style,{left:d.rect.left+'px',width:d.rect.width+'px',height:d.height+'px'});
   document.body.append(d.ghost);d.row.classList.add('ai-drag-placeholder');frame=requestAnimationFrame(tick);
  }
  position();
 }
 function finish(cancel=false){
  const d=drag;if(!d)return;drag=null;cancelAnimationFrame(frame);
  d.ghost?.remove();d.row.classList.remove('ai-drag-placeholder');
  if(list.hasPointerCapture(d.id))list.releasePointerCapture(d.id);
  if(cancel)restore(d.original);else void save(d.original,d.row);
 }
 const up=e=>{if(e.pointerId===drag?.id)finish();};
 const cancel=e=>{if(e.pointerId===drag?.id)finish(true);};
 function key(e){
  if(e.key==='Escape'&&drag){e.preventDefault();finish(true);return;}
  const handle=e.target.closest('.ai-drag-handle');if(!handle||busy||drag||!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
  e.preventDefault();const original=rows(),row=handle.closest('[data-id]'),i=original.indexOf(row);
  const target=e.key==='Home'?0:e.key==='End'?original.length-1:Math.max(0,Math.min(original.length-1,i+(e.key==='ArrowUp'?-1:1)));
  const next=original.filter(r=>r!==row);next.splice(target,0,row);restore(next);handle.focus({preventScroll:true});void save(original,row);
 }
 const events={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,lostpointercapture:cancel,keydown:key};
 for(const [name,fn] of Object.entries(events))list.addEventListener(name,fn);
 const blur=()=>finish(true);window.addEventListener('blur',blur);
 return ()=>{disposed=true;finish(true);for(const [name,fn] of Object.entries(events))list.removeEventListener(name,fn);window.removeEventListener('blur',blur);};
}
