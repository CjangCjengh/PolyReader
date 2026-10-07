"""Generate a small, original EPUB used to test EPUB script isolation."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import sys

def create(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(path, 'w') as z:
        z.writestr('mimetype', 'application/epub+zip')
        z.writestr('META-INF/container.xml', '''<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>''', compress_type=ZIP_DEFLATED)
        z.writestr('book.opf', '''<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">polyreader-security-fixture-v1</dc:identifier><dc:title>PolyReader 安全测试</dc:title><dc:language>ja</dc:language><meta property="dcterms:modified">2026-10-07T00:00:00Z</meta></metadata><manifest><item id="main" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="main"/></spine></package>''', compress_type=ZIP_DEFLATED)
        z.writestr('nav.xhtml', '''<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>目录</title></head><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">测试</a></li></ol></nav></body></html>''', compress_type=ZIP_DEFLATED)
        z.writestr('chapter.xhtml', '''<html xmlns="http://www.w3.org/1999/xhtml"><head><title>隔离测试</title><script>window.top.__epubScriptProbe = true;</script></head><body><h1>安全测试</h1><p>これはテストです。<ruby>読書<rt>どくしょ</rt></ruby>を楽しむ。</p><p>오프라인 독서 테스트입니다.</p><img src="missing.jpg" onerror="window.top.__epubEventProbe = true;"/><a href="javascript:window.top.__epubLinkProbe=true">无效脚本链接</a><p>脚本和事件应被移除，文字仍能阅读。</p></body></html>''', compress_type=ZIP_DEFLATED)
    return path

if __name__ == '__main__':
    print(create(sys.argv[1] if len(sys.argv)>1 else 'work/fixture.epub'))
