"""Read-only XAPK / EPUB inventory. No DRM removal, account access, or binary patching."""
import argparse, hashlib, io, json, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

def inspect(path):
    p=Path(path)
    result={'name':p.name,'bytes':p.stat().st_size,'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest()}
    with zipfile.ZipFile(p) as z:
        if p.suffix.lower()=='.xapk':
            result['manifest']=json.loads(z.read('manifest.json'))
            result['apks']=[]
            for n in z.namelist():
                if not n.endswith('.apk'):continue
                with zipfile.ZipFile(io.BytesIO(z.read(n))) as apk:
                    result['apks'].append({'name':n,'dexFiles':[f for f in apk.namelist() if f.endswith('.dex')],
                      'readerAssets':[{'name':i.filename,'bytes':i.file_size} for i in apk.infolist()
                                      if i.filename.startswith(('lib/','assets/')) and any(k in i.filename.lower() for k in ['reader','publus','batang','.so'])]})
        else:
            container=ET.fromstring(z.read('META-INF/container.xml'))
            opf=next(e.attrib['full-path'] for e in container.iter() if e.tag.endswith('rootfile'))
            root=ET.fromstring(z.read(opf))
            result['opf']=opf; result['hasEncryptionXml']='META-INF/encryption.xml' in z.namelist()
            result['metadata']=[{'tag':e.tag.split('}')[-1],'text':e.text,'attributes':e.attrib} for e in root.iter() if e.tag.split('}')[-1] in ['title','language','spine']]
    return result

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('inputs',nargs='+');ap.add_argument('--out',default='work/inspection.json');args=ap.parse_args()
    out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps([inspect(p) for p in args.inputs],ensure_ascii=False,indent=2),encoding='utf-8');print(out)
