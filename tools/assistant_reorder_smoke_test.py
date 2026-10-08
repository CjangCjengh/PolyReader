"""Exercise touch sorting against stub API storage in the installed WebView."""
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])
results=[]
wait_js('window.polyReader?.state')
touch_ws=None

def touch(kind,x=0,y=0):
    global touch_ws
    if touch_ws is None:
        targets=json.load(urllib.request.urlopen('http://127.0.0.1:9229/json'))
        page=next(p for p in targets if '/app/index.html' in p.get('url',''))
        touch_ws=websocket.create_connection(page['webSocketDebuggerUrl'],timeout=10,suppress_origin=True)
    points=[] if kind in ('touchEnd','touchCancel') else [{'x':x,'y':y}]
    touch_ws.send(json.dumps({'id':1,'method':'Input.dispatchTouchEvent','params':{'type':kind,'touchPoints':points}}))
    while True:
        response=json.loads(touch_ws.recv())
        if response.get('id')==1:
            if 'error' in response:raise AssertionError(response['error'])
            break

def drag(source,target,end='touchEnd'):
    points=js(f"[...document.querySelectorAll('.ai-drag-handle')].filter(e=>!e.closest('.ai-dragging')).map(e=>{{const r=e.getBoundingClientRect();return {{x:r.x+r.width/2,y:r.y+r.height/2}};}})")
    a,b=points[source],points[target]
    touch('touchStart',**a)
    for i in range(1,9):touch('touchMove',a['x'],a['y']+(b['y']-a['y'])*i/8)
    if end:touch(end)

try:
    js(r"""(async()=>{
     const {Assistant}=await import('./assistant.js'),panel=document.getElementById('panel'),body=document.getElementById('panel-body');
     const f=window.reorderFixture={providers:Array.from({length:3},(_,i)=>({id:'fixture-'+i,name:'API '+(i+1),model:'fixture-model',enabled:true})),saves:[],errors:[],fail:false};
     f.ai=new Assistant({state:{},send(action,data){queueMicrotask(()=>{
      if(action==='aiConfig')f.ai.receive({id:data.id,type:'config',providers:structuredClone(f.providers)});
      else if(action==='aiSaveConfig'){
       if(f.fail){f.fail=false;f.ai.receive({id:data.id,type:'error',code:'connection'});return;}
       f.providers=structuredClone(data.providers);f.saves.push(f.providers.map(p=>p.id));f.ai.receive({id:data.id,type:'config',providers:structuredClone(f.providers)});
      }else throw Error(action);
     });},save(){},showPanel(title){panel.hidden=false;document.getElementById('panel-title').textContent=title;body.replaceChildren();return body;},closePanel(){},toast(message){f.errors.push(message);}});
     await f.ai.settingsPanel();
    })()""")
    order=lambda:js("[...document.querySelector('.ai-provider-list').children].map(e=>e.dataset.id)")
    drag(0,2)
    check('Touch drag saves one reordered list',order()==['fixture-1','fixture-2','fixture-0'] and js('reorderFixture.saves.length')==1)
    drag(2,0,'touchCancel')
    check('Cancelled gesture restores the original order',order()==['fixture-1','fixture-2','fixture-0'] and js('reorderFixture.saves.length')==1)
    js('reorderFixture.fail=true');drag(2,0)
    check('Save failure restores rows and reports the error',order()==['fixture-1','fixture-2','fixture-0'] and js('reorderFixture.errors.length')==1)
    js('reorderFixture.ai.settingsPanel()')
    check('Reopening settings retains the saved priority',order()==['fixture-1','fixture-2','fixture-0'])
    js("document.querySelector('.ai-drag-handle').dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}))")
    check('Keyboard sorting remains available',order()==['fixture-2','fixture-0','fixture-1'])
    drag(0,2,None);js('reorderFixture.ai.dismiss()');touch('touchEnd')
    check('Leaving during a drag cleans up and does not save',not js("!!document.querySelector('.ai-dragging')") and js('reorderFixture.saves.length')==2)
    js('reorderFixture.providers=Array.from({length:16},(_,i)=>({id:"fixture-"+i,name:"API "+(i+1),model:"fixture-model"}));reorderFixture.ai.settingsPanel()')
    js('document.getElementById("panel-body").scrollTop=0')
    start=js("(()=>{const r=document.querySelector('.ai-drag-handle').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()")
    bottom=js("document.getElementById('panel-body').getBoundingClientRect().bottom-8")
    touch('touchStart',**start);touch('touchMove',start['x'],bottom);time.sleep(.8);touch('touchEnd')
    check('Dragging near the edge scrolls a long API list',js('document.getElementById("panel-body").scrollTop')>40 and order().index('fixture-0')>3)
finally:
    js("reorderFixture?.ai.dismiss();document.getElementById('panel').hidden=true;document.getElementById('panel-body').replaceChildren();delete window.reorderFixture")
    if touch_ws:touch_ws.close()
