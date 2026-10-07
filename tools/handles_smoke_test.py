"""Physical selection-handle drags on an installed debug APK; restores book state."""
from pathlib import Path
exec(Path(__file__).with_name('selection_smoke_test.py').read_text(encoding='utf-8').split('try:\n    js')[0])

def selection_value(reader):
    if reader=='bookwalker':return js('window._nativeSelection')
    return js("({text:polyReader.engine.doc.polySelection.text,cfi:null})")

def handles(reader):
    if reader=='ridi':
        return js("['selection-start','selection-end'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [(r.x+r.width/2)*devicePixelRatio,(r.y+r.height/2)*devicePixelRatio]})")
    return js("window._nativeSelection.handles.map(r=>[(r[0]+r[2])/2,(r[1]+r[3])/2])")

def unobstructed(reader):
    return js("(()=>{const b=document.getElementById('selection-bar').getBoundingClientRect(),hs="+("window._nativeSelection.handles.map(r=>({left:r[0]/devicePixelRatio,top:r[1]/devicePixelRatio,right:r[2]/devicePixelRatio,bottom:r[3]/devicePixelRatio}))" if reader=='bookwalker' else "['selection-start','selection-end'].map(id=>document.getElementById(id).getBoundingClientRect())")+";return hs.every(h=>b.right<=h.left||b.left>=h.right||b.bottom<=h.top||b.top>=h.bottom)})()")

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
        check(reader+' menu avoids both handle targets',unobstructed(reader))
        for endpoint in [0,1]:
            for sign in [-1,1]:
                before=selection_value(reader)['text'];h=handles(reader)
                drag(h[endpoint],[sign*5*density,0] if reader=='bookwalker' else [0,sign*5*density])
                check(reader+' small perpendicular drag stays on same text '+str((endpoint,sign)),selection_value(reader)['text']==before)
        h=handles(reader)
        drag(h[1],[0,90*density] if reader=='bookwalker' else [95*density,35*density])
        extended=selection_value(reader)
        check(reader+' end handle extends selection',len(extended['text'])>len(initial['text']),extended['text'])
        check(reader+' drag preserves page',js('polyReader.engine.location.cfi')==location)
        h=handles(reader)
        drag(h[0],[0,26*density] if reader=='bookwalker' else [18*density,0])
        trimmed=selection_value(reader)
        check(reader+' start handle trims selection',0<len(trimmed['text'])<len(extended['text']),trimmed['text'])
        check(reader+' actions return after drag',js("!document.getElementById('selection-bar').hidden"));check(reader+' adjusted menu avoids handles',unobstructed(reader))
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
