"""Exercise SAF removal using disposable EPUB/TXT fixtures on a test device."""
import hashlib, uuid, zipfile
from xml.etree import ElementTree as ET
from pathlib import Path
exec(Path(__file__).with_name('native_smoke_test.py').read_text(encoding='utf-8').split('results=[]')[0])

wait_js('window.polyReader?.state')
original=js('polyReader.state');active=js('({id:polyReader.active?.id,mode:polyReader.profile?.id})')
tag=uuid.uuid4().hex[:8];name='PolyReader-delete-'+tag+'.epub';other='PolyReader-other-'+tag+'.txt'
folder=Path('work/deletion-test');folder.mkdir(parents=True,exist_ok=True)
fixture=folder/name
with zipfile.ZipFile(fixture,'w') as z:
    z.writestr('mimetype','application/epub+zip')
    z.writestr('META-INF/container.xml','<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
    z.writestr('book.opf','<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">'+tag+'</dc:identifier><dc:title>Removal test</dc:title><dc:language>en</dc:language></metadata><manifest><item id="c" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c"/></spine></package>')
    z.writestr('chapter.xhtml','<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Test</title></head><body><p>Disposable removal fixture.</p></body></html>')
ident=hashlib.sha256(fixture.read_bytes()).hexdigest();remote='/sdcard/Download/'+name;remote_other='/sdcard/Download/'+other
(folder/other).write_text('Different disposable file '+tag,encoding='utf-8')
def exists(path):return subprocess.run(['adb','-s',serial,'shell','test','-f',path],stdout=subprocess.DEVNULL).returncode==0
def listed():return js('polyReader.library.some(b=>b.id==='+json.dumps(ident)+')')
def tree():
    for attempt in range(3):
        try:
            adb('shell','uiautomator','dump','/sdcard/polyreader-removal-test-ui.xml');break
        except subprocess.CalledProcessError:
            if attempt==2:raise
            time.sleep(.5)
    return ET.fromstring(adb('shell','cat','/sdcard/polyreader-removal-test-ui.xml'))
def tap(label):
    for _ in range(3):
        nodes=[n for n in tree().iter('node') if n.get('text')==label or n.get('content-desc')==label]
        if nodes:
            box=list(map(int,re.findall(r'\d+',nodes[-1].get('bounds'))));adb('shell','input','tap',str((box[0]+box[2])//2),str((box[1]+box[3])//2));time.sleep(.4);return
        time.sleep(.3)
    raise AssertionError('UI control not found: '+label)
def options():
    js('Native.post(JSON.stringify({action:"removeBook",id:'+json.dumps(ident)+'}))');time.sleep(.4)
    return [n.get('text') for n in tree().iter('node') if n.get('text','').startswith(('仅从书架','同时删除'))]

def request():
    assert options()==['仅从书架移除','同时删除 EPUB 原文件']
    tap('同时删除 EPUB 原文件')
def import_fixture():
    js('polyReader.home();document.getElementById("import-button").click()');tap(name)
    wait_js('polyReader.library.some(b=>b.id==='+json.dumps(ident)+')')
def forget_source():
    sources=json.loads(adb('exec-out','run-as','dev.polyreader.app','cat','files/sources.json'))
    sources.pop(ident,None)
    subprocess.run(['adb','-s',serial,'exec-in','run-as','dev.polyreader.app','tee','files/sources.json'],input=json.dumps(sources).encode(),stdout=subprocess.DEVNULL,check=True)
try:
    assert not exists(remote) and not exists(remote_other)
    adb('push',str(fixture),remote);adb('push',str(folder/other),remote_other)
    import_fixture()
    js('polyReader.state.books['+json.dumps(ident)+']={notes:[{id:"retained-note",note:"Keep this note"}],locations:{}};window.flushState()')
    js("const c=[...document.querySelectorAll('.book-card')].find(c=>c.textContent.includes('Removal test'));c.dispatchEvent(new KeyboardEvent('keydown',{key:'F10',shiftKey:true}));[...document.querySelectorAll('#panel-body button')].find(b=>b.textContent==='移除书籍').click()")
    assert [n.get('text') for n in tree().iter('node') if n.get('text','').startswith(('仅从书架','同时删除'))]==['仅从书架移除','同时删除 EPUB 原文件']
    tap('仅从书架移除')
    wait_js('!polyReader.library.some(b=>b.id==='+json.dumps(ident)+')');assert exists(remote)
    assert js('polyReader.state.books['+json.dumps(ident)+'].notes[0].id')=='retained-note'
    print('PASS shelf-only removal preserves the original file and notes',flush=True)
    import_fixture()
    adb('shell','am','force-stop','dev.polyreader.app');adb('shell','am','start','-n','dev.polyreader.app/.MainActivity');time.sleep(1.5);wait_js('window.polyReader?.state')
    request();tree();(folder/'confirmation.png').write_bytes(adb('exec-out','screencap','-p'));tap('取消');assert listed() and exists(remote)
    print('PASS persisted source access survives restart; confirmation cancel preserves book',flush=True)
    request()
    (folder/'changed.txt').write_text('Changed source '+tag,encoding='utf-8');adb('push',str(folder/'changed.txt'),remote)
    tap('删除');wait_js("document.getElementById('toast').textContent.includes('原文件未能删除')")
    assert listed() and exists(remote)
    print('PASS changed source is checked again and not deleted',flush=True)
    adb('push',str(fixture),remote)
    adb('shell','rm','-f',remote)
    assert options()==['仅从书架移除'];tap('取消');assert listed()
    print('PASS unavailable source only offers shelf removal',flush=True)
    adb('push',str(fixture),remote);forget_source()
    assert options()==['仅从书架移除'];tap('取消')
    assert listed() and exists(remote)
    assert all(n.get('package')=='dev.polyreader.app' for n in tree().iter('node'))
    print('PASS unknown source stays in the app with shelf-only removal',flush=True)
    import_fixture();request();tap('删除')
    wait_js('!polyReader.library.some(b=>b.id==='+json.dumps(ident)+')')
    assert not exists(remote)
    assert js('polyReader.state.books['+json.dumps(ident)+'].notes[0].id')=='retained-note'
    print('PASS saved source deletes directly after confirmation; notes remain',flush=True)
    # TXT identity refers to the original bytes, not the converted reading copy.
    ident=hashlib.sha256((folder/other).read_bytes()).hexdigest()
    js('polyReader.home();document.getElementById("import-button").click()');tap(other)
    wait_js('polyReader.library.some(b=>b.id==='+json.dumps(ident)+')')
    assert options()==['仅从书架移除','同时删除 TXT 原文件']
    tap('同时删除 TXT 原文件');tap('删除')
    wait_js('!polyReader.library.some(b=>b.id==='+json.dumps(ident)+')');assert not exists(remote_other)
    print('PASS TXT original-file deletion and label',flush=True)
finally:
    adb('shell','input','keyevent','4');adb('shell','am','start','-n','dev.polyreader.app/.MainActivity');time.sleep(1.5)
    js('polyReader.home()')
    if listed():options();tap('仅从书架移除')
    restore='(()=>{const s=polyReader.state;for(const k of Object.keys(s))delete s[k];Object.assign(s,'+json.dumps(original,ensure_ascii=False)+');window.flushState()})()'
    js(restore)
    if active.get('id'):
        js('polyReader.openBook(polyReader.library.find(b=>b.id==='+json.dumps(active['id'])+'),'+json.dumps(active['mode'])+')');time.sleep(.7);js(restore)
    # Only the two uniquely named files created by this test are removed.
    adb('shell','rm','-f',remote,remote_other)
    assert js('polyReader.state')==original
    print('Test fixtures removed; reading state restored',flush=True)
