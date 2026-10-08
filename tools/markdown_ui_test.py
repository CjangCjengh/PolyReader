"""Check Markdown structure, streamed citations and safe links in Android WebView."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
wait_js('window.polyReader?.state')
checks=js(r'''(async()=>{
 const {renderMarkdown}=await import('./markdown.js');
 const checks=[],check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name);};
 const root=document.createElement('div');root.className='ai-message';root.style.cssText='position:fixed;left:0;top:0;width:320px;max-height:500px;overflow:auto;z-index:100;background:var(--card)';
 document.body.append(root);
 const citation=id=>['2:3','D1'].includes(id)?Object.assign(document.createElement('button'),{className:'ai-citation',textContent:id==='D1'?'Weblio':'原文'}):null;
 try{
  renderMarkdown(root,'> 原文 **重点**\n> 第二行\n>\n> > *嵌套引用*\n\n解释正文');
  check('Quoted paragraphs and nested quotes render as blocks',root.querySelectorAll('blockquote').length===2&&root.querySelector('blockquote strong')?.textContent==='重点'&&root.querySelector('blockquote blockquote em')?.textContent==='嵌套引用'&&!root.textContent.includes('>'));
  check('Quotes have a visible border and compact spacing',parseFloat(getComputedStyle(root.querySelector('blockquote')).borderInlineStartWidth)>0);
  renderMarkdown(root,'## 用法\n\n3. 第一个解释\n   - 子项\n     > 例句\n4. 第二个解释\n\n**粗体** / *斜体* / ~~修正~~\n\n---');
  check('Headings, list nesting and start numbers are preserved',root.querySelector('h2')?.textContent==='用法'&&root.querySelector('ol')?.start===3&&root.querySelector('ol > li > ul blockquote'));
  check('Emphasis, strikethrough and separators render',root.querySelector('strong')&&root.querySelector('em')&&root.querySelector('s')&&root.querySelector('hr'));
  renderMarkdown(root,'| 词语 | 读音 | 解释 | 来源 |\n| :--- | :---: | ---: | --- |\n| **迚も** | とても | 怎么也 | [D1] |',{citation});
  check('Tables retain formatting, alignment and source buttons',root.querySelectorAll('thead th').length===4&&root.querySelector('tbody strong')?.textContent==='迚も'&&root.querySelector('th:nth-child(2)').style.textAlign==='center'&&root.querySelector('td .ai-citation')?.textContent==='Weblio');
  check('Wide tables scroll within the answer',root.scrollWidth===root.clientWidth&&getComputedStyle(root.querySelector('.ai-table')).overflowX==='auto');
  const code='> literal\n\n**literal** [D1]\n<img src=x onerror=alert(1)>\n';
  renderMarkdown(root,'```text\n'+code+'```\n\n`[2:3]` and `[D`',{citation,streaming:true});
  check('Code preserves newlines, HTML and literal source markers',root.querySelector('pre code')?.textContent===code&&root.querySelectorAll('.ai-citation').length===0&&root.querySelector('p code:last-child')?.textContent==='[D'&&!root.querySelector('img'));
  let opened;
  renderMarkdown(root,'[词条](https://example.org/entry?q=word&lang=ja) and <https://example.org/other>',{openLink:url=>opened=url});
  root.querySelector('a').click();check('Web links use the app callback',opened==='https://example.org/entry?q=word&lang=ja'&&root.querySelectorAll('a').length===2);
  renderMarkdown(root,'<img src=x onerror="alert(1)"><script>alert(1)</script>\n\n[bad](javascript:alert%281%29) [bad](data:text/html,test) [local](file:///secret) [credentials](https://name:password@example.org/)\n\n![Illustration](https://example.org/image.png) &lt;tag&gt;',{openLink(){}});
  check('Untrusted HTML and unsafe URLs stay inert',!root.querySelector('img,script,iframe,object,[onerror]')&&[...root.querySelectorAll('a')].every(a=>a.href==='https://example.org/image.png')&&root.textContent.includes('<tag>'));
  renderMarkdown(root,'> **解释 [2:3]** 与 *词条 [D1]*，未知 [9:9]。',{citation});
  check('Citations remain interactive inside formatted quotes',root.querySelector('blockquote strong .ai-citation')?.textContent==='原文'&&root.querySelector('blockquote em .ai-citation')?.textContent==='Weblio'&&!root.textContent.includes('[9:9]'));
  for(const suffix of ['[','[2','[2:','[2:3','[D','[D1']){
   renderMarkdown(root,'> Evidence '+suffix,{citation,streaming:true});
   check('Incomplete streamed citation stays hidden: '+suffix,root.querySelector('blockquote')?.textContent==='Evidence ');
  }
  const streamed='> **引用** [D1]\n\n1. *说明*\n2. `例子`\n\n| a | b |\n| --- | --- |\n| c | d |';
  for(let i=1;i<=streamed.length;i++)renderMarkdown(root,streamed.slice(0,i),{citation,streaming:true});
  check('Incremental output settles into the full Markdown structure',root.querySelector('blockquote strong')?.textContent==='引用'&&root.querySelectorAll('ol li').length===2&&root.querySelector('table'));
  renderMarkdown(root,'Literal [2:3] and [D1]');check('Ordinary user text preserves bracketed references',root.textContent==='Literal [2:3] and [D1]');
  return checks;
 }finally{root.remove();}
})()''')
for name in checks:print('PASS',name)
