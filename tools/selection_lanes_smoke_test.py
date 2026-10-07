"""Check intentional line changes and stability after crossing a line."""
from pathlib import Path
exec(Path(__file__).with_name('handles_smoke_test.py').read_text(encoding='utf-8').split('try:\n    js')[0])
try:
    js("window._baseReceive??=window.receiveNative;window.receiveNative=(type,v)=>{if(type==='bookwalker'&&v.kind==='selection')window._nativeSelection=v.value;return window._baseReceive(type,v)}")
    js("for(const p of Object.values(polyReader.state.profiles))p.awake=true")
    density=js('devicePixelRatio')
    for reader,lang in [('bookwalker','ja'),('ridi','ko')]:
        js("(async()=>{polyReader.home();await polyReader.openBook(polyReader.library.find(x=>x.language==="+json.dumps(lang)+"),"+json.dumps(reader)+");await polyReader.engine.go("+json.dumps(fixtures[reader]['chapter'])+")})()")
        time.sleep(.5);select(reader);before=selection_value(reader)['text']
        drag(handles(reader)[1],[-48*density,0] if reader=='bookwalker' else [0,40*density])
        check(reader+' deliberately crosses to next line',len(selection_value(reader)['text'])>len(before))
        for sign in [-1,1]:
            before=selection_value(reader)['text']
            drag(handles(reader)[1],[sign*5*density,0] if reader=='bookwalker' else [0,sign*5*density])
            check(reader+' remains in new line after small drift '+str(sign),selection_value(reader)['text']==before)
        check(reader+' multiline menu avoids both handles',unobstructed(reader))
        shot(reader+'-multiline-handles.png')
    report['passed']=True
finally:
    js('polyReader.home();(()=>{const s=polyReader.state;for(const k of Object.keys(s))delete s[k];Object.assign(s,'+original+');window.flushState()})();polyReader.home()')
    (work/'selection-lanes-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
