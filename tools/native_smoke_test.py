"""0.3 reader regression on an installed debug APK. Restores reading state afterwards."""
import argparse,io,json,re,subprocess,time,urllib.request
from pathlib import Path
from PIL import Image
import websocket

ap=argparse.ArgumentParser();ap.add_argument('--serial',default='127.0.0.1:16384');args=ap.parse_args()
serial=args.serial
def adb(*args):return subprocess.check_output(['adb','-s',serial,*args],stderr=subprocess.STDOUT)
def js(expression):
    pid=adb('shell','pidof','dev.polyreader.app').decode().strip()
    adb('forward','tcp:9229','localabstract:webview_devtools_remote_'+pid)
    targets=json.load(urllib.request.urlopen('http://127.0.0.1:9229/json'))
    page=next(p for p in targets if '/app/index.html' in p.get('url',''))
    ws=websocket.create_connection(page['webSocketDebuggerUrl'],timeout=35,suppress_origin=True)
    try:
        ws.send(json.dumps({'id':1,'method':'Runtime.evaluate','params':{'expression':expression,'awaitPromise':True,'returnByValue':True,'userGesture':True}}))
        while True:
            m=json.loads(ws.recv())
            if m.get('id')!=1:continue
            if 'exceptionDetails' in m.get('result',{}):raise RuntimeError(m['result']['exceptionDetails'])
            return m.get('result',{}).get('result',{}).get('value')
    finally:ws.close()
def wait_js(expression,timeout=10):
    end=time.monotonic()+timeout
    while time.monotonic()<end:
        try:
            value=js(expression)
            if value:return value
        except (StopIteration,ConnectionError,urllib.error.URLError):pass
        time.sleep(.15)
    raise AssertionError('Timed out: '+expression)
def check(name,condition,details=None):
    if not condition:raise AssertionError(name+': '+repr(details))
    results.append({'name':name,'passed':True,'details':details});print('PASS',name,flush=True)
def setting(key,value):
    js("document.getElementById('panel-close').click();document.getElementById('settings-button').click();"+
       "(()=>{if(!document.getElementById('pref-"+key+"'))document.getElementById('style-button').click();const el=document.getElementById('pref-"+key+"');if(el.type==='checkbox')el.checked="+json.dumps(bool(value))+";else el.value="+json.dumps(str(value))+";el.dispatchEvent(new Event('change'));})();document.getElementById('panel-close').click();")
    time.sleep(.5)


results=[]
state=wait_js('window.polyReader?.state',15); original=json.dumps(state,ensure_ascii=False)
try:media_volume=int(re.search(r'volume is (\d+)',adb('shell','cmd','media_session','volume','--stream','3','--get').decode()).group(1))
except (subprocess.CalledProcessError,AttributeError):media_volume=None
work=Path(__file__).resolve().parents[1]/'work';work.mkdir(exist_ok=True)
report={'version':'0.4.0','device':adb('shell','getprop','ro.build.version.release').decode().strip(),'model':adb('shell','getprop','ro.product.model').decode().strip(),'checks':results}
def shot(name): (work/name).write_bytes(adb('exec-out','screencap','-p'))
def native_go(path):
    js('polyReader.engine.go('+json.dumps(path)+')');time.sleep(.55)
try:
    js("polyReader.home();(async()=>{const {profiles}=await import('./profiles.js');for(const p of profiles)polyReader.state.profiles[p.id]={...p.defaults,orientation:1};})()")
    check('Grid bookshelf with covers',js("document.querySelectorAll('.book-card img').length>=2 && !document.querySelector('.hero')"))
    check('No book count',js("!document.querySelector('#book-count')"))
    js("document.querySelector('.book-card').dispatchEvent(new KeyboardEvent('keydown',{key:'F10',shiftKey:true}));document.querySelector('#panel-body .panel-action').click()")
    check('Reader picker uses names only',js("Array.from(document.querySelectorAll('.mode-card')).map(x=>x.textContent)")==['BOOK☆WALKER','RIDI'])
    js("document.querySelector('#panel-close').click()")
    check('No persistent page footer',js("!document.querySelector('#page-info')"))
    info=js("(async()=>{await polyReader.openBook(polyReader.library.find(x=>x.language==='ja'),'bookwalker');return {engine:polyReader.profile.engine,frame:document.body.classList.contains('native-reader'),prefs:polyReader.state.profiles.bookwalker}})()")
    check('Japanese mounts native PUBLUS/MARS adapter',info['engine']=='bookwalker' and info['frame'],info['prefs'])
    js("document.querySelector('#style-button').click()")
    check('BOOK WALKER font control is 160 percent',js("document.querySelector('#pref-fontSize').value==='160' && document.querySelector('#pref-fontSize').nextElementSibling.textContent==='160%'"))
    themes=js("Array.from(document.querySelector('#pref-theme').options).map(o=>[o.value,o.text])")
    check('Polished settings copy',not any('截图' in str(t) for t in themes) and js("!document.querySelector('#panel-body').textContent.includes('截图')"))
    js("document.querySelector('#panel-close').click()")
    native_go('item/xhtml/p-003.xhtml');wait_js('polyReader.engine.location.index===14')
    first=js('polyReader.engine.location.cfi');shot('native-day.png')
    js('polyReader.turn(1)');wait_js('polyReader.engine.location.cfi!=='+json.dumps(first))
    second=js('polyReader.engine.location.cfi');check('Native next page changes CFI',first!=second)
    js('polyReader.turn(-1)');wait_js('polyReader.engine.location.cfi==='+json.dumps(first))
    check('Native previous returns to same page',True)
    native_go('item/xhtml/p-002.xhtml');wait_js('polyReader.engine.location.cfi!=='+json.dumps(first))
    js('polyReader.engine.back()');wait_js('polyReader.engine.location.cfi==='+json.dumps(first))
    check('Native jump-back restores previous location',True)
    dims=js('({w:innerWidth*devicePixelRatio,h:innerHeight*devicePixelRatio})');w,h=int(dims['w']),int(dims['h'])
    adb('shell','input','swipe',str(w//4),str(h//2),str(w*3//4),str(h//2),'200');time.sleep(.6)
    check('Native right swipe advances',js('polyReader.engine.location.cfi')!=first)
    before=js('polyReader.engine.location.cfi');adb('shell','input','keyevent','25');time.sleep(.6)
    check('Native volume-key paging',js('polyReader.engine.location.cfi')!=before)
    setting('volume',False);before=js('polyReader.engine.location.cfi');adb('shell','input','keyevent','25');time.sleep(.4)
    check('Native volume paging can be disabled',js('polyReader.engine.location.cfi')==before)
    setting('volume',True)
    native_go('item/xhtml/p-003.xhtml');time.sleep(.4)
    adb('shell','input','tap',str(w//2),str(h//2));time.sleep(.5)
    adb('shell','uiautomator','dump','/sdcard/polyreader-ui.xml')
    ui=adb('shell','cat','/sdcard/polyreader-ui.xml').decode()
    check('BOOK WALKER reference toolbar has four controls',js("document.querySelectorAll('#reader-bottom nav button').length===4 && !document.body.classList.contains('chrome-hidden') && getComputedStyle(document.querySelector('#reader-top')).backgroundColor==='rgb(255, 255, 255)'"))
    shot('native-menu.png')
    # Hide the menu and verify native text selection feeds the shared note editor.
    adb('shell','input','tap',str(w//2),str(h//2));time.sleep(.4)
    adb('shell','input','swipe',str(int(w*.565)),str(int(h*.2125)),str(int(w*.565)),str(int(h*.2125)),'900')
    wait_js("!document.querySelector('#selection-bar').hidden")
    js("document.querySelector('#selection-highlight').click();document.querySelector('#panel-body textarea').value='polyreader-regression';document.querySelector('#panel-body .primary').click()")
    n=js("polyReader.state.books[polyReader.active.id].notes.find(n=>n.note==='polyreader-regression')")
    check('Native selection can create CFI highlight',bool(n and n['text'] and n['cfi'].startswith('epubcfi(')),n)
    def marker_pixels():
        image=Image.open(io.BytesIO(adb('exec-out','screencap','-p'))).convert('RGB')
        color=tuple(int(n['color'][x:x+2],16) for x in (1,3,5))
        return sum(count for count,rgb in image.getcolors(image.width*image.height) if max(abs(a-b) for a,b in zip(color,rgb))<9)
    time.sleep(.4);painted=marker_pixels()
    js('polyReader.engine.annotate([])');time.sleep(.4);cleared=marker_pixels()
    check('Native highlight paints and clears on page',painted>cleared+100,{'paintedPixels':painted,'clearedPixels':cleared})
    js('polyReader.engine.annotate(polyReader.state.books[polyReader.active.id].notes)');time.sleep(.3)
    native_notes=js('polyReader.state.books[polyReader.active.id].notes.length')
    js("document.querySelector('#add-bookmark').click();window.flushState()")
    check('Native bookmark persists in shared book state',js('polyReader.state.books[polyReader.active.id].notes.length')>native_notes)
    ko=js('polyReader.state.profiles.ridi');setting('theme','night');time.sleep(.7);native_go('item/xhtml/p-003.xhtml');shot('native-night.png')
    check('Changing Japanese theme leaves Korean preferences intact',js('polyReader.state.profiles.ridi')==ko)
    before=js('polyReader.engine.location.cfi');js('polyReader.home()');time.sleep(.2)
    js("polyReader.openBook(polyReader.library.find(x=>x.language==='ja'),'bookwalker')")
    wait_js('polyReader.engine.location.cfi==='+json.dumps(before));check('Native reopen restores CFI',True)
    info=js("(async()=>{polyReader.home();await polyReader.openBook(polyReader.library.find(x=>x.language==='ko'),'ridi');await polyReader.engine.go('EPUB/Text/Section0001.html');const d=polyReader.engine.doc,s=d.defaultView.getComputedStyle(d.querySelector('p'));return {reader:!!d.defaultView.ReaderJS.Reader,font:s.fontFamily,bg:d.defaultView.getComputedStyle(d.documentElement).backgroundColor,spacing:s.wordSpacing,pages:polyReader.engine.pages}})()")
    check('Korean RIDI engine uses screenshot sans-serif preset',info['reader'] and info['font']=='sans-serif' and info['bg']=='rgb(240, 232, 209)',info)
    js("document.querySelector('#style-button').click()")
    check('RIDI font control uses level 8',js("document.querySelector('#pref-fontSize').value==='8'"))
    check('Both readers offer identical theme choices',js("Array.from(document.querySelector('#pref-theme').options).map(o=>[o.value,o.text])")==themes)
    js("document.querySelector('#panel-close').click()")
    setting('theme','amber')
    check('RIDI can use BOOK WALKER warm background',js("polyReader.engine.doc.defaultView.getComputedStyle(polyReader.engine.doc.documentElement).backgroundColor")=='rgb(235, 210, 165)')
    setting('theme','beige');before=js('polyReader.engine.location.cfi');adb('shell','input','keyevent','25');time.sleep(.4)
    check('RIDI volume down advances',js('polyReader.engine.location.cfi')!=before)
    adb('shell','input','keyevent','24');time.sleep(.4)
    check('RIDI volume up returns',js('polyReader.engine.location.cfi')==before)
    shot('ridi-day.png');before=js('polyReader.engine.location.page')
    adb('shell','input','swipe',str(w*3//4),str(h//2),str(w//4),str(h//2),'200');time.sleep(.5)
    check('Korean physical left swipe advances one page',js('polyReader.engine.location.page')==before+1)
    js("polyReader.engine.go('EPUB/Text/Section0001.html')");time.sleep(.3);setting('theme','night');shot('ridi-night.png')
    check('Korean night palette',js("polyReader.engine.doc.defaultView.getComputedStyle(polyReader.engine.doc.documentElement).backgroundColor")=='rgb(0, 0, 0)')
    setting('flow','scrolled');js('polyReader.turn(1)');time.sleep(.4)
    check('Korean continuous scrolling remains available',js('polyReader.engine.frame.contentWindow.scrollY')>0)
    setting('flow','paginated')
    js("document.querySelector('#search-button').click();document.querySelector('#panel-body input').value='영민';document.querySelector('#panel-body form').dispatchEvent(new Event('submit',{cancelable:true}))")
    count=wait_js("document.querySelectorAll('#panel-body li').length",15);check('Korean full-text search',count>0,{'results':count})
    js("document.querySelector('#panel-body li button').click()");time.sleep(.3)
    check('Search navigation closes panel',js("document.querySelector('#panel').hidden"))
    check('External network request denied',js("fetch('https://example.invalid/probe').then(()=>false).catch(()=>true)"))
    js('polyReader.home();window.flushState()');time.sleep(.4);saved=js('polyReader.state')
    adb('shell','am','force-stop','dev.polyreader.app');adb('shell','am','start','-n','dev.polyreader.app/.MainActivity');time.sleep(.9);wait_js('!!window.polyReader')
    check('Cold restart preserves modes, preferences, positions and notes',js('polyReader.state')==saved)
    report['passed']=True
finally:
    try:
        if media_volume is not None:adb('shell','cmd','media_session','volume','--stream','3','--set',str(media_volume))
        js('polyReader.home();(()=>{const s=polyReader.state;for(const k of Object.keys(s))delete s[k];Object.assign(s,'+original+');window.flushState()})()')
    finally:
        (work/'native-smoke-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
