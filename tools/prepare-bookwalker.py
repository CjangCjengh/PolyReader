"""Prepare the local BOOK WALKER 7.9.2 reader module from the user's XAPK.

Uses jadx's dexlib2 to retain reader bytecode and its dependencies. Does not
decompile/recompile Java, initialize accounts, or decrypt any book contents.
Run with Python 3, JDK 21 and --jadx-lib pointing to the JADX library directory.
"""
import argparse,hashlib,json,subprocess,urllib.request,zipfile
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('xapk',type=Path)
p.add_argument('--java',default='java')
p.add_argument('--jadx-lib',type=Path,required=True)
a=p.parse_args()
root=Path(__file__).resolve().parents[1]
work=root/'work'/'bookwalker-build';work.mkdir(parents=True,exist_ok=True)
assets=root/'app/src/main/assets/bookwalker';assets.mkdir(parents=True,exist_ok=True)
libs=root/'app/src/main/jniLibs/arm64-v8a';libs.mkdir(parents=True,exist_ok=True)
base='jp.bookwalker.kreader.android.epub.apk'
with zipfile.ZipFile(a.xapk) as z:
    for name in [base,'config.arm64_v8a.apk','config.mdpi.apk']:
        (work/name).write_bytes(z.read(name))
subprocess.run([a.java,'-cp',str(Path(a.jadx_lib)/'*'),str(root/'tools/ExtractReader.java'),str(work/base),str(work/'reader.dex')],check=True)
with zipfile.ZipFile(work/base) as original,zipfile.ZipFile(assets/'engine.apk','w') as out:
    for entry in original.infolist():
        name=entry.filename
        if name in ('AndroidManifest.xml','resources.arsc') or name.startswith(('res/','assets/cjh_','assets/publus_reader/','assets/5885/')):
            # Native Chromium opens ICU and pak files by fd and cannot read compressed entries.
            out.writestr(name,original.read(entry),compress_type=zipfile.ZIP_STORED if name.startswith('assets/cjh_') else zipfile.ZIP_DEFLATED)
    out.writestr('classes.dex',(work/'reader.dex').read_bytes(),compress_type=zipfile.ZIP_DEFLATED)
(assets/'engine-density.apk').write_bytes((work/'config.mdpi.apk').read_bytes())
names=['liball_in_one.cr.so','libmars-android.so','libmars-android-entry.so','libbrdex.so','libffmpeg.cr.so','libjnibpspdfium.so','libpublus-utils.so']
with zipfile.ZipFile(work/'config.arm64_v8a.apk') as z:
    for name in names:(libs/name).write_bytes(z.read('lib/arm64-v8a/'+name))
fonts=assets/'fonts';fonts.mkdir(exist_ok=True)
font_sources=[]
for name in ['libnfserif','libnfsans']:
    url='https://member.bookwalker.jp/custom/fonts/android/'+name+'.so'
    payload=urllib.request.urlopen(url,timeout=60).read()
    if hashlib.md5(payload[16:]).digest()!=payload[:16]:raise ValueError('Font transport checksum mismatch')
    # The official transport has a 16-byte checksum header. The remaining encrypted
    # font package is consumed unchanged by MARS's custom-font provider.
    target=fonts/(name+'.otf.enc');target.write_bytes(payload[16:])
    font_sources.append({'url':url,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
manifest={'source':a.xapk.name,'source_sha256':hashlib.sha256(a.xapk.read_bytes()).hexdigest(),'version':'7.9.2','abi':'arm64-v8a','font_sources':font_sources}
(assets/'provenance.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Prepared',assets)
