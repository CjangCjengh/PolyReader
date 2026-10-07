"""Verify bookshelf reflow and scrolling with temporary DOM cards, preserving the library."""
from pathlib import Path
import json,time
source=Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8')
exec(source.split('results=[]')[0])
results=[]
work=Path(__file__).resolve().parents[1]/'work'
def orient(n):
    js('window.Native.post(JSON.stringify({action:"window",orientation:'+str(n)+',brightness:-1}))')
    wait_js('innerWidth '+('>' if n==2 else '<')+' innerHeight');time.sleep(.5)
def grid():
    return js("(()=>{const el=document.querySelector('#books'),cards=[...el.children],cols=getComputedStyle(el).gridTemplateColumns.split(' ').length;return {columns:cols,width:innerWidth,rows:new Set(cards.map(c=>Math.round(c.getBoundingClientRect().top))).size,overflow:document.documentElement.scrollWidth>innerWidth+1,scroll:document.documentElement.scrollHeight>innerHeight}})()")
try:
    js('polyReader.home()');orient(1)
    js("(()=>{const el=document.querySelector('#books'),base=el.firstElementChild;for(let i=0;i<18;i++)el.append(base.cloneNode(true));})()")
    portrait=grid();check('Portrait bookshelf fills multiple columns and rows',portrait['columns']>=3 and portrait['rows']>1 and not portrait['overflow'],portrait)
    js('window.scrollTo(0,600)');check('Bookshelf scrolls vertically',js('scrollY')>0)
    orient(2);landscape=grid();check('Landscape bookshelf adds columns without horizontal overflow',landscape['columns']>portrait['columns'] and not landscape['overflow'],landscape)
finally:
    js('polyReader.home();window.scrollTo(0,0)')
    (work/'grid-smoke-results.json').write_text(json.dumps({'version':'0.4.0','checks':results,'passed':len(results)==3},indent=2),encoding='utf-8')
