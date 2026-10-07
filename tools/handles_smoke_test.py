"""Physical selection-handle drags on an installed debug APK; restores book state."""
from pathlib import Path
exec(Path(__file__).with_name('selection_smoke_test.py').read_text(encoding='utf-8').split('try:\n    js')[0])

def selection_value(reader):
    if reader=='bookwalker':return js('window._nativeSelection')
    return js("({text:polyReader.engine.doc.polySelection.text,cfi:null})")

def handles(reader):
    if reader=='ridi':
        return js("['selection-start','selection-end'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [(r.x+r.width/2)*devicePixelRatio,(r.y+r.height/2)*devicePixelRatio]})")
    # Native handles are drawn on the SDK canvas. Locate their circular blue fills.
    im=Image.open(io.BytesIO(adb('exec-out','screencap','-p'))).convert('RGB')
    points={(x,y) for y in range(im.height) for x in range(im.width)
            if (lambda r,g,b:r<90 and 90<g<180 and 160<b<240 and b>g+30)(*im.getpixel((x,y)))}
    circles=[]
    while points:
        seed=points.pop();group=[seed];queue=[seed]
        while queue:
            x,y=queue.pop()
            for p in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if p in points:points.remove(p);group.append(p);queue.append(p)
        if len(group)>25:
            xs,ys=zip(*group);w=max(xs)-min(xs)+1;h=max(ys)-min(ys)+1
            if .7<w/h<1.4:circles.append([sum(xs)/len(xs),sum(ys)/len(ys)])
    assert len(circles)==2,('Expected two circular handles',circles)
    return sorted(circles,key=lambda p:p[1])

def drag(point,delta):
    end=[point[i]+delta[i] for i in range(2)]
    adb('shell','input','swipe',*[str(round(n)) for n in point+end],'950');time.sleep(.35)

try:
    js("window._baseReceive??=window.receiveNative;window.receiveNative=(type,v)=>{if(type==='bookwalker'&&v.kind==='selection')window._nativeSelection=v.value;return window._baseReceive(type,v)}")
    js("for(const p of Object.values(polyReader.state.profiles))p.awake=true")
    density=js('devicePixelRatio')
    for reader,lang in [('bookwalker','ja'),('ridi','ko')]:
        js("(async()=>{polyReader.home();await polyReader.openBook(polyReader.library.find(x=>x.language==="+json.dumps(lang)+"),"+json.dumps(reader)+");await polyReader.engine.go("+json.dumps(fixtures[reader]['chapter'])+")})()")
        time.sleep(.5);select(reader);initial=selection_value(reader);location=js('polyReader.engine.location.cfi')
        h=handles(reader);check(reader+' shows two handles',len(h)==2)
        drag(h[1],[0,90*density] if reader=='bookwalker' else [95*density,35*density])
        extended=selection_value(reader)
        check(reader+' end handle extends selection',len(extended['text'])>len(initial['text']),extended['text'])
        check(reader+' drag preserves page',js('polyReader.engine.location.cfi')==location)
        h=handles(reader)
        drag(h[0],[0,26*density] if reader=='bookwalker' else [18*density,0])
        trimmed=selection_value(reader)
        check(reader+' start handle trims selection',0<len(trimmed['text'])<len(extended['text']),trimmed['text'])
        check(reader+' actions return after drag',js("!document.getElementById('selection-bar').hidden"))
        shot(reader+'-handles.png')
        tap('selection-highlight')
        check(reader+' note uses adjusted text',js("document.querySelector('#panel-body .quote').textContent")==trimmed['text'])
        js("document.querySelector('#panel-body textarea').value='handle-regression';document.querySelector('#panel-body .primary').click()")
        time.sleep(.4)
        note=js("polyReader.state.books[polyReader.active.id].notes.findLast(n=>n.note==='handle-regression')")
        check(reader+' saves adjusted range',note['text']==trimmed['text'] and (reader!='bookwalker' or note['cfi']==trimmed['cfi']))
        if reader=='ridi':check('RIDI handles dismiss after save',js("document.getElementById('selection-start').hidden&&document.getElementById('selection-end').hidden&&polyReader.engine.doc.polySelection.range===null"))
    report['passed']=True
finally:
    js('polyReader.home();(()=>{const s=polyReader.state;for(const k of Object.keys(s))delete s[k];Object.assign(s,'+original+');window.flushState()})();polyReader.home()')
    (work/'handles-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
