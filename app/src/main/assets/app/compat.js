// Foliate is pinned; supply newer collection APIs for Android WebView 110.
if(!Object.groupBy)Object.groupBy=(iterable,key)=>{const o=Object.create(null);let i=0;for(const value of iterable){const k=key(value,i++);(o[k]??=[]).push(value)}return o;};
if(!Map.groupBy)Map.groupBy=(iterable,key)=>{const m=new Map();let i=0;for(const value of iterable){const k=key(value,i++);if(!m.has(k))m.set(k,[]);m.get(k).push(value)}return m;};
if(!Promise.withResolvers)Promise.withResolvers=function(){let resolve,reject;const promise=new this((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject};};
