// EPUB paths are case-sensitive. Tolerate a casing typo only when the archive
// contains exactly one matching resource; exact names always take precedence.
export function resourceIndex(entries){
 const sizes=new Map(entries.map(({name,size})=>[name,size])),folded=new Map();
 for(const name of sizes.keys()){
   const key=name.toLowerCase();
   folded.set(key,folded.has(key)?null:name);
 }
 const resolve=name=>sizes.has(name)?name:folded.get(name.toLowerCase())??null;
 return {resolve,size:name=>sizes.get(resolve(name))??0};
}
