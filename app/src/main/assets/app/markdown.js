import MarkdownIt from './vendor/markdown-it/markdown-it.mjs';

const markdown=new MarkdownIt({html:false,breaks:true,linkify:false,maxNesting:32});
const tags=new Set(['p','h1','h2','h3','h4','h5','h6','blockquote','ul','ol','li','strong','em','s','table','thead','tbody','tr','th','td']);

function webUrl(value){
 try{const url=new URL(value);return /^https?:$/.test(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}
}

// Parse Markdown, then create only text and known DOM elements. Raw HTML stays literal.
export function renderMarkdown(root,text,{citation,streaming=false,openLink}={}){
 const fragment=document.createDocumentFragment();
 const appendText=(parent,value)=>{
  if(!citation||parent.closest?.('a')){parent.append(document.createTextNode(value));return;}
  for(const part of value.split(/(\[(?:\d+:\d+|D\d+)\])/g)){
   const match=part.match(/^\[(\d+:\d+|D\d+)\]$/);
   if(match){const link=citation(match[1]);if(link)parent.append(link);}else parent.append(document.createTextNode(part));
  }
 };
 const linkNode=value=>{
  const url=webUrl(value),node=document.createElement(url?'a':'span');
  if(url){node.href=url;node.rel='noopener noreferrer';node.onclick=e=>{e.preventDefault();openLink?.(url);};}
  return node;
 };
 const render=(tokens,parent)=>{
  let current=parent;const stack=[];
  for(const token of tokens){
   if(token.hidden)continue;
   if(token.type==='inline'){render(token.children||[],current);continue;}
   if(token.type==='text'){appendText(current,token.content);continue;}
   if(token.type==='code_inline'){const code=document.createElement('code');code.textContent=token.content;current.append(code);continue;}
   if(token.type==='fence'||token.type==='code_block'){
    const pre=document.createElement('pre'),code=document.createElement('code');code.textContent=token.content;pre.append(code);current.append(pre);continue;
   }
   if(token.type==='softbreak'||token.type==='hardbreak'){current.append(document.createElement('br'));continue;}
   if(token.type==='hr'){current.append(document.createElement('hr'));continue;}
   if(token.type==='image'){
    const link=linkNode(token.attrGet('src'));link.textContent=token.content||token.attrGet('src')||'';current.append(link);continue;
   }
   if(token.nesting===1){
    const node=token.type==='link_open'?linkNode(token.attrGet('href')):document.createElement(tags.has(token.tag)?token.tag:'span');
    if(token.tag==='ol'&&/^\d+$/.test(token.attrGet('start')||''))node.start=Number(token.attrGet('start'));
    if(token.tag==='th'||token.tag==='td'){
     const align=token.attrGet('style')?.match(/^text-align:(left|center|right)$/)?.[1];if(align)node.style.textAlign=align;
    }
    if(token.tag==='table'){
     const wrap=document.createElement('div');wrap.className='ai-table';wrap.tabIndex=0;wrap.append(node);current.append(wrap);
    }else current.append(node);
    stack.push(current);current=node;continue;
   }
   if(token.nesting===-1){current=stack.pop()||parent;continue;}
   if(token.content)current.append(document.createTextNode(token.content));
  }
 };
 render(markdown.parse(String(text),{}),fragment);
 // Suppress unfinished source markers while preserving literal examples inside code.
 if(citation){
  const walker=document.createTreeWalker(fragment,NodeFilter.SHOW_TEXT);let tail,node;
  while(node=walker.nextNode())if(node.data)tail=node;
  if(tail&&!tail.parentElement?.closest('code,pre,a,button'))tail.data=tail.data.replace(streaming?/\[(?:D\d*|\d+(?::\d*)?)?$/:/\[(?:D\d*|\d+:\d*)$/,'');
 }
 root.replaceChildren(fragment);
}
