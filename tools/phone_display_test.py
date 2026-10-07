"""Pixel 8 reference-page regression; uses the two imported sample EPUBs.

The reference was captured at 1080x2400 / 420 dpi. Other displays need their
own line-break expectations. Device settings are read, never changed here.
"""
from pathlib import Path
import io,json,time
from PIL import Image
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])

results=[]
work=Path(__file__).resolve().parents[1]/'work'/'phone';work.mkdir(exist_ok=True)
original=json.dumps(wait_js('window.polyReader?.state'),ensure_ascii=False)
report={'version':'0.4.0','model':adb('shell','getprop','ro.product.model').decode().strip(),
        'android':adb('shell','getprop','ro.build.version.release').decode().strip(),
        'fontScale':adb('shell','settings','get','system','font_scale').decode().strip(),'checks':results}

def shot(name):
    time.sleep(.6);data=adb('exec-out','screencap','-p');(work/name).write_bytes(data)
    return Image.open(io.BytesIO(data)).convert('RGB')

def fullscreen(name,image):
    dims=js('({w:innerWidth*devicePixelRatio,h:innerHeight*devicePixelRatio})')
    check(name,abs(image.width-dims['w'])<3 and abs(image.height-dims['h'])<3,dims)

try:
    js("polyReader.home();(async()=>{const {profiles}=await import('./profiles.js');for(const p of profiles)polyReader.state.profiles[p.id]={...p.defaults,orientation:1};await polyReader.openBook(polyReader.library.find(x=>x.language==='ja'),'bookwalker');await polyReader.engine.go('item/xhtml/p-003.xhtml');})()")
    wait_js('polyReader.engine.location.index===14');time.sleep(.7)
    image=shot('bookwalker-day.png');fullscreen('Native page fills physical display including cutout area',image)
    check('Native day background reaches top edge',image.getpixel((0,0))==image.getpixel((0,200)),image.getpixel((0,0)))
    setting('fullscreen',False);check('Fullscreen switch restores system-bar area',js('innerHeight*devicePixelRatio')<image.height-100)
    setting('fullscreen',True);fullscreen('Fullscreen switch expands page again',shot('bookwalker-day.png'))
    setting('theme','nightLight');shot('bookwalker-night.png')
    setting('theme','amber');js("polyReader.engine.go('item/xhtml/p-002.xhtml')");shot('bookwalker-foreword.png')
    js("(async()=>{polyReader.home();await polyReader.openBook(polyReader.library.find(x=>x.language==='ko'),'ridi');await polyReader.engine.go('EPUB/Text/Section0001.html');})()")
    wait_js('polyReader.engine.location.index===7');image=shot('ridi-day.png');fullscreen('RIDI page fills physical display including cutout area',image)
    # Use rendered character ranges, excluding zero-width hidden/formatting text.
    lines=js(r"""(()=>{const d=polyReader.engine.doc,p=d.querySelectorAll('p')[3],walker=d.createTreeWalker(p,4),lines={};let n;while(n=walker.nextNode()){for(let i=0;i<n.length;i++){const r=d.createRange();r.setStart(n,i);r.setEnd(n,i+1);const b=r.getBoundingClientRect();if(b.width>.1&&b.height>1)(lines[Math.round(b.top)]??=[]).push([b.left,n.textContent[i]]);}}return Object.values(lines).map(a=>a.sort((x,y)=>x[0]-y[0]).map(x=>x[1]).join(''));})()""")
    expected=json.loads((work.parent/'reference-lines.json').read_text(encoding='utf-8'))
    check('RIDI level 8 has the same six paragraph lines as the reference',lines==expected,{'lineCount':len(lines)})
    js("polyReader.setChrome(true)")
    control=js("({y:document.querySelector('#home').getBoundingClientRect().top,cutout:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cutout-top'))||0})")
    check('Reader controls remain below camera cutout',control['y']>=control['cutout'],control)
    shot('ridi-menu.png');js("polyReader.setChrome(false)")
    setting('theme','night');shot('ridi-night.png');setting('theme','beige')
    js('polyReader.turn(1)');time.sleep(.4);shot('ridi-body.png')
    js('polyReader.home()');time.sleep(.4)
    check('Bookshelf restores normal system-bar layout',js('innerHeight*devicePixelRatio')<image.height-100)
    shot('bookshelf.png')
    report['passed']=True
finally:
    js('polyReader.home();(()=>{const s=polyReader.state;for(const k of Object.keys(s))delete s[k];Object.assign(s,'+original+');window.flushState()})();polyReader.home()')
    (work/'display-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
