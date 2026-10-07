"""Selection and bookmark regression using an imported Japanese and Korean EPUB."""
from pathlib import Path
import io,json,time,xml.etree.ElementTree as ET
from PIL import Image
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])

root=Path(__file__).resolve().parents[1]
fixtures=json.loads((root/'work/selection-fixtures.json').read_text(encoding='utf-8'))
work=root/'work'/('emu044' if serial.startswith('127.') else 'phone044');work.mkdir(exist_ok=True)
results=[];original=json.dumps(wait_js('window.polyReader?.state'),ensure_ascii=False)
report={'version':'0.4.4','checks':results,'passed':False}

def tap(id):
    xy=js("(()=>{const r=document.getElementById("+json.dumps(id)+").getBoundingClientRect();return [Math.round((r.x+r.width/2)*devicePixelRatio),Math.round((r.y+r.height/2)*devicePixelRatio)]})()")
    adb('shell','input','tap',str(xy[0]),str(xy[1]));time.sleep(.3)

def select(reader):
    if reader=='bookwalker':
        ratio=fixtures[reader]['touch']
        xy=js('[Math.round(innerWidth*devicePixelRatio*'+str(ratio[0])+'),Math.round(innerHeight*devicePixelRatio*'+str(ratio[1])+')]')
    else:
        xy=js("(()=>{const e=polyReader.engine,d=e.doc,r=d.createRange(),w=d.createTreeWalker(d.body,4);let n;while(n=w.nextNode()){if(n.parentElement.closest('style,script,h1,h2')||n.textContent.trim().length<12)continue;for(let i=0;i<n.length;i++){r.setStart(n,i);r.setEnd(n,i+1);const b=r.getBoundingClientRect();if(b.width>8&&b.top>innerHeight*.32&&b.bottom<innerHeight*.75&&b.left>60&&b.right<innerWidth-40)return [Math.round((b.x+b.width/2)*devicePixelRatio),Math.round((b.y+b.height/2)*devicePixelRatio)]}}})()")
    assert xy,'No visible selectable text'
    adb('shell','input','swipe',str(xy[0]),str(xy[1]),str(xy[0]),str(xy[1]),'850')
    wait_js("!document.getElementById('selection-bar').hidden")
    return xy

def shot(name):
    data=adb('exec-out','screencap','-p');(work/name).write_bytes(data)
    return Image.open(io.BytesIO(data)).convert('RGB')

def pixels(color):
    im=Image.open(io.BytesIO(adb('exec-out','screencap','-p'))).convert('RGB')
    rgb=tuple(int(color[i:i+2],16) for i in (1,3,5))
    return sum(count for count,c in im.getcolors(im.width*im.height) if max(abs(a-b) for a,b in zip(rgb,c))<7)

try:
    js("window._baseReceive??=window.receiveNative;window.receiveNative=(type,v)=>{if(type==='bookwalker'&&v.kind==='selection')window._nativeSelection=v.value;return window._baseReceive(type,v)}")
    js("for(const p of Object.values(polyReader.state.profiles))p.awake=true")
    for reader,lang,theme in [('bookwalker','ja','amber'),('ridi','ko','beige')]:
        path=fixtures[reader]['chapter']
        js("(async()=>{polyReader.home();await polyReader.openBook(polyReader.library.find(x=>x.language==="+json.dumps(lang)+"),"+json.dumps(reader)+");await polyReader.engine.go("+json.dumps(path)+")})()")
        setting('theme',theme);time.sleep(.4)
        js('polyReader.setChrome(true)');time.sleep(.25)
        check(reader+' bookmark stays inside toolbar',js("(()=>{const a=document.querySelector('#add-bookmark').getBoundingClientRect(),b=document.querySelector('#reader-top').getBoundingClientRect();return a.top>=b.top&&a.bottom<=b.bottom})()"))
        tap('notes-button');check(reader+' explicit bookmark action',js("document.querySelector('#bookmark-current').textContent.includes('当前位置书签')"))
        was=js("document.getElementById('add-bookmark').getAttribute('aria-pressed')")
        tap('bookmark-current');check(reader+' bookmark state changes',js("document.getElementById('add-bookmark').getAttribute('aria-pressed')")!=was)
        tap('bookmark-current');tap('panel-close');js('polyReader.setChrome(false)');time.sleep(.2)
        check(reader+' bookmark clears the reading area',js("document.querySelector('#add-bookmark').getBoundingClientRect().bottom<=0"))
        point=select(reader)
        bounds=js("({bar:document.querySelector('#selection-bar').getBoundingClientRect().toJSON(),font:parseFloat(getComputedStyle(document.querySelector('#selection-copy')).fontSize),dpr:devicePixelRatio,w:innerWidth,h:innerHeight})")
        b=bounds['bar'];px,py=[n/bounds['dpr'] for n in point]
        distance=max(b['top']-py,py-b['bottom'],0)
        check(reader+' popup follows physical selection',distance<170 and b['left']>=0 and b['right']<=bounds['w'] and b['top']>=0 and b['bottom']<=bounds['h'],{'distance':distance,'font':bounds['font']})
        check(reader+' selection controls are readable',bounds['font']>=17 and b['height']>=48)
        check(reader+' selection actions',js("[...document.querySelectorAll('#selection-bar button')].map(x=>x.textContent).join('|')")== '复制|高亮 / 笔记|取消')
        shot(reader+'-selection.png')
        if reader=='ridi':
            adb('shell','uiautomator','dump','/sdcard/polyreader-selection-ui.xml')
            ui=ET.fromstring(adb('exec-out','cat','/sdcard/polyreader-selection-ui.xml'))
            check('RIDI system selection toolbar stays hidden',not any('floating_toolbar' in n.get('resource-id','') or 'floating_popup' in n.get('resource-id','') for n in ui.iter('node')))
            check('RIDI custom selection remains active',js("!!polyReader.engine.doc.polySelection?.range && polyReader.engine.doc.defaultView.CSS.highlights.has('polyreader_selection')"))
        tap('selection-close');time.sleep(.6)
        check(reader+' cancel stays dismissed',js("document.getElementById('selection-bar').hidden"))
        select(reader);before=js('polyReader.engine.location.cfi')
        xy=js('[Math.round(innerWidth*devicePixelRatio*.5),Math.round(innerHeight*devicePixelRatio*.82)]')
        adb('shell','input','tap',str(xy[0]),str(xy[1]));time.sleep(.6)
        check(reader+' outside tap dismisses without paging',js("document.getElementById('selection-bar').hidden && document.body.classList.contains('chrome-hidden')") and js('polyReader.engine.location.cfi')==before)
        select(reader);adb('shell','input','keyevent','4');time.sleep(.4)
        check(reader+' back dismisses selection',js("document.getElementById('selection-bar').hidden && !!polyReader.active"))
        select(reader);js('polyReader.turn(1)');time.sleep(.5)
        check(reader+' paging dismisses selection',js("document.getElementById('selection-bar').hidden"))
        js('polyReader.engine.go('+json.dumps(path)+')');time.sleep(.4)
        select(reader);tap('selection-highlight')
        check(reader+' note editor replaces selection popup',js("document.getElementById('selection-bar').hidden && !document.getElementById('panel').hidden"))
        js("document.querySelector('#panel-body textarea').value='selection-regression';document.querySelector('#panel-body .primary').click()")
        time.sleep(.6);check(reader+' saved highlight leaves no floating popup',js("document.getElementById('selection-bar').hidden && document.getElementById('panel').hidden"))
        note=js("polyReader.state.books[polyReader.active.id].notes.findLast(n=>n.note==='selection-regression')")
        assert note
        setting('theme','night');time.sleep(.7)
        color=js("import('./profiles.js').then(m=>m.highlightStyle({theme:'night'},"+json.dumps(note['color'])+").background)")
        painted=pixels(color);shot(reader+'-highlight-night.png')
        js('polyReader.engine.annotate([])');time.sleep(.4);cleared=pixels(color)
        check(reader+' night highlight paints a dark background',painted>cleared+80,{'painted':painted,'cleared':cleared})
        js('polyReader.engine.annotate(polyReader.state.books[polyReader.active.id].notes)')
        check(reader+' theme keeps annotation data intact',js("polyReader.state.books[polyReader.active.id].notes.findLast(n=>n.note==='selection-regression').color")==note['color'])
        select(reader);image=shot(reader+'-selection-night.png')
        box=js("(()=>{if(polyReader.profile.id==='bookwalker')return window._nativeSelection.rect;const r=polyReader.engine.doc.polySelection.range.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom].map(n=>n*devicePixelRatio)})()")
        colors=image.crop(tuple(round(n) for n in box)).getcolors(image.width*image.height)
        count=lambda rgb:sum(n for n,c in colors if max(abs(a-b) for a,b in zip(rgb,c))<7)
        check(reader+' night selection uses a dark blue background',count((41,70,94))>80)
        check(reader+' night selection uses light text',count((243,243,243))>20)
        tap('selection-close')
    report['passed']=True
finally:
    js('polyReader.home();(()=>{const s=polyReader.state;for(const k of Object.keys(s))delete s[k];Object.assign(s,'+original+');window.flushState()})();polyReader.home()')
    (work/'selection-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    adb('shell','rm','-f','/sdcard/polyreader-selection-ui.xml')
