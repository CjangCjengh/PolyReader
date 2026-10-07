"""Verify publisher typography and manual overrides in the installed WebView."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
wait_js('window.polyReader?.state')
checks=js(r"""(async()=>{
 const {contentCSS,layoutPrefs,profiles}=await import('./profiles.js');
 const frame=document.createElement('iframe');
 frame.style.cssText='position:fixed;left:0;top:0;width:360px;height:700px;z-index:100';
 document.body.append(frame);
 const d=frame.contentDocument,w=frame.contentWindow,checks=[];
 const check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name)};
 try{
  d.open();d.write('<style>body{font-family:sans-serif}h1{font-family:monospace;font-size:1.4em;text-align:center}p{font-family:serif;line-height:1.6em;margin:0.2em 0 0;text-indent:1em;text-align:justify}.hidden{font-size:0}</style><h1>Chapter</h1><p>가나다 라마바 사아자 차카타 파하 가나다 라마바 사아자 차카타 파하</p><p>\u202dabc\u202efed\u202c<span class="hidden">invisible</span></p>');d.close();
  const original=d.body.innerHTML,style=d.createElement('style');d.head.append(style);
  const prefs=layoutPrefs(profiles.find(p=>p.id==='ridi').defaults);
  const apply=async extra=>{style.textContent=contentCSS({...prefs,...extra});void d.body.offsetWidth;await d.fonts.ready};
  const p=d.querySelector('p'),css=()=>w.getComputedStyle(p),near=(a,b)=>Math.abs(parseFloat(a)-b)<.1;
  await apply({fontSize:25});
  check('Publisher body font and embedded heading family remain distinct',css().fontFamily==='serif'&&w.getComputedStyle(d.querySelector('h1')).fontFamily==='monospace');
  check('Publisher paragraph line height, spacing and indentation survive',near(css().lineHeight,40)&&near(css().marginTop,5)&&near(css().marginBottom,0)&&near(css().textIndent,25));
  check('Publisher paragraph and title alignment survive',css().textAlign==='justify'&&w.getComputedStyle(d.querySelector('h1')).textAlign==='center');
  const height=p.getBoundingClientRect().height;
  await apply({fontSize:32});
  check('Font-size control scales authored em dimensions and reflows text',near(css().fontSize,32)&&near(css().lineHeight,51.2)&&near(css().marginTop,6.4)&&p.getBoundingClientRect().height>height);
  await apply({fontSize:25,font:'sans',originalLineHeight:false,lineHeight:1.8,publisher:false,spacing:.7,align:'start'});
  check('Explicit font, line height, spacing and alignment override the book',css().fontFamily==='sans-serif'&&near(css().lineHeight,45)&&near(css().marginTop,17.5)&&css().textAlign==='start');
  await apply({fontSize:25,font:'ridi'});
  check('RIDI Batang selection loads its font',css().fontFamily.includes('RIDIBatang')&&d.fonts.check('25px RIDIBatang'));
  await apply({fontSize:25,theme:'night'});
  check('Night palette applies without replacing publisher typography',css().fontFamily==='serif'&&css().color==='rgb(190, 190, 190)');
  check('Hidden obfuscation text stays hidden through style changes',near(w.getComputedStyle(d.querySelector('.hidden')).fontSize,0));
  check('Styling preserves text nodes and CFI structure',d.body.innerHTML===original);
  // The same preset must also leave unstyled paragraphs at the WebView defaults.
  d.querySelector('style').textContent='body{font-family:sans-serif}.hidden{font-size:0}';
  await apply({fontSize:25});
  const withReader={font:css().fontFamily,line:css().lineHeight,margin:css().marginTop,align:css().textAlign};
  style.disabled=true;d.documentElement.style.fontSize='25px';
  const withoutReader={font:css().fontFamily,line:css().lineHeight,margin:css().marginTop,align:css().textAlign};
  check('Unstyled books keep their own fallback layout',JSON.stringify(withReader)===JSON.stringify(withoutReader));
  return checks;
 }finally{frame.remove()}
})()""")
for name in checks:print('PASS',name)
