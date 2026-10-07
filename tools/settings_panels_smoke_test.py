"""Check that appearance and operation panels have distinct controls and resets."""
from pathlib import Path
import json,time
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
original=json.dumps(wait_js('window.polyReader?.state'),ensure_ascii=False)
try:
 for language,reader in [('ja','bookwalker'),('ko','ridi')]:
  js("(async()=>{polyReader.home();await polyReader.openBook(polyReader.library.find(x=>x.language==="+json.dumps(language)+"),"+json.dumps(reader)+")})()")
  time.sleep(.5)
  checks=js(r"""(async()=>{
   const checks=[],check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name)},ids=()=>[...document.querySelectorAll('#panel-body [id^="pref-"]')].map(x=>x.id);
   const click=id=>document.getElementById(id).click(),s=polyReader.state.profiles[polyReader.profile.id];
   click('style-button');const style=ids();check('Appearance panel has typography only',style.includes('pref-fontSize')&&style.includes('pref-theme')&&!style.includes('pref-volume')&&!style.includes('pref-animation'));
   if(polyReader.profile.id==='ridi'){
    click('pref-originalLineHeight');check('Line-height toggle remains in appearance panel',!!document.getElementById('pref-lineHeight')&&!document.getElementById('pref-volume'));
    click('pref-originalLineHeight');
   }
   click('panel-close');click('settings-button');const operations=ids();
   check('Operation panel has screen and paging controls',operations.includes('pref-volume')&&operations.includes('pref-orientation')&&operations.includes('pref-animation'));
   check('The two panels have no duplicate setting controls',!operations.some(id=>style.includes(id)));
   s.theme='green';s.volume=false;click('panel-close');click('style-button');
   [...document.querySelectorAll('#panel-body button')].find(x=>x.textContent==='恢复默认样式').click();
   await new Promise(r=>setTimeout(r,350));check('Appearance reset preserves operation preference',s.volume===false&&s.theme===polyReader.profile.defaults.theme);
   s.theme='green';click('panel-close');click('settings-button');
   [...document.querySelectorAll('#panel-body button')].find(x=>x.textContent==='恢复默认设置').click();
   await new Promise(r=>setTimeout(r,350));check('Operation reset preserves appearance preference',s.theme==='green'&&s.volume===polyReader.profile.defaults.volume);
   click('panel-close');return checks;
  })()""")
  for name in checks:print('PASS',reader,name,flush=True)
finally:
 js('polyReader.home();(()=>{const s=polyReader.state;for(const k of Object.keys(s))delete s[k];Object.assign(s,'+original+');window.flushState()})();polyReader.home()')
