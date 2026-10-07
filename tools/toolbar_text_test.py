"""Physical toolbar taps and imported TXT smoke tests on the user's Pixel 8.
Requires the temporary PolyReader-04.txt fixture imported through Android SAF.
"""
from pathlib import Path
import json,time
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
results=[];work=Path(__file__).resolve().parents[1]/'work'/'phone04';work.mkdir(exist_ok=True)
original=json.dumps(wait_js('window.polyReader?.state'),ensure_ascii=False)
report={'version':'0.4.0','checks':results}
def tap(id):
    xy=js("(()=>{const r=document.getElementById("+json.dumps(id)+").getBoundingClientRect();return [Math.round((r.x+r.width/2)*devicePixelRatio),Math.round((r.y+r.height/2)*devicePixelRatio)]})()")
    adb('shell','input','tap',str(xy[0]),str(xy[1]));time.sleep(.35)
try:
    for lang,reader,path in [('ja','bookwalker','item/xhtml/p-003.xhtml'),('ko','ridi','EPUB/Text/Section0001.html')]:
        js("(async()=>{polyReader.home();await polyReader.openBook(polyReader.library.find(x=>x.language==="+json.dumps(lang)+" && x.format!=='txt'),"+json.dumps(reader)+");await polyReader.engine.go("+json.dumps(path)+");})()")
        time.sleep(.8);before=js('({w:innerWidth,h:innerHeight,cfi:polyReader.engine.location.cfi})')
        js('polyReader.setChrome(true)');time.sleep(.5)
        check(reader+' toolbar keeps reading position and viewport',js('({w:innerWidth,h:innerHeight,cfi:polyReader.engine.location.cfi})')==before)
        geometry=js("(()=>{const p=document.querySelector('#progress').getBoundingClientRect(),b=[...document.querySelectorAll('#reader-bottom nav button')].map(x=>x.getBoundingClientRect());return {count:b.length,gap:innerHeight-p.bottom,lastBottom:Math.max(...b.map(r=>r.bottom)),navInset:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--toolbar-bottom'))||0}})()")
        check(reader+' four buttons and safe progress-bar clearance',geometry['count']==4 and geometry['gap']>140 and geometry['lastBottom']<=js('innerHeight')-geometry['navInset'],geometry)
        (work/(reader+'-menu.png')).write_bytes(adb('exec-out','screencap','-p'))
        tap('style-button');check(reader+' physical style button opens font controls',js("!document.querySelector('#panel').hidden && !!document.querySelector('#pref-fontSize')"))
        tap('panel-close');js('polyReader.setChrome(true)');tap('settings-button');check(reader+' physical settings button opens operation controls',js("!!document.querySelector('#pref-volume')"))
        tap('panel-close');js('polyReader.setChrome(true)');tap('reader-more')
        if reader=='ridi':check('RIDI has no listening controls',js("!document.querySelector('#panel-body').textContent.includes('朗读') && document.querySelector('#selection-speak').hidden"))
        tap('panel-close');js('polyReader.setChrome(false)')
    check('No empty-shelf import instruction',js("!document.querySelector('#empty').textContent.trim()"))
    fixture=js("polyReader.library.find(x=>x.filename==='PolyReader-04.txt')")
    check('TXT imported through the system file picker',bool(fixture and fixture['format']=='txt' and fixture['language']=='ja'))
    for reader in ['bookwalker','ridi']:
        js("(async()=>{polyReader.home();await polyReader.openBook(polyReader.library.find(x=>x.id==="+json.dumps(fixture['id'])+"),"+json.dumps(reader)+");})()")
        time.sleep(.7);first=js('polyReader.engine.location.cfi');js('polyReader.turn(1)');wait_js('polyReader.engine.location.cfi!=='+json.dumps(first))
        second=js('polyReader.engine.location.cfi');check('TXT pages in '+reader,first!=second)
        js('polyReader.home()');js('polyReader.openBook(polyReader.library.find(x=>x.id==='+json.dumps(fixture['id'])+'),'+json.dumps(reader)+')')
        wait_js('polyReader.engine.location.cfi==='+json.dumps(second));check('TXT position reopens in '+reader,True)
        (work/(reader+'-txt.png')).write_bytes(adb('exec-out','screencap','-p'))
    report['passed']=True
finally:
    js('polyReader.home();(()=>{const s=polyReader.state;for(const k of Object.keys(s))delete s[k];Object.assign(s,'+original+');window.flushState()})();polyReader.home()')
    (work/'toolbar-text-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
