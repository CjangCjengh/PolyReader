package dev.polyreader.app;

import java.io.*;
import java.nio.*;
import java.nio.charset.*;
import java.nio.file.Files;
import java.util.*;
import java.util.zip.*;

/** Turns a local text file into the same private, offline reading format. */
final class TextBook {
    static final Set<String> ENCODINGS=new HashSet<>(Arrays.asList("UTF-8","UTF-16LE","UTF-16BE","GB18030","Shift_JIS","EUC-KR","windows-1252"));
    static String convert(File input,File output,String title,String id,String encoding)throws IOException {
        if(input.length()>16L*1024*1024)throw new IOException("TXT 文件上限为 16 MB");
        byte[] bytes=Files.readAllBytes(input.toPath());int offset=0;
        if(encoding==null){
            encoding="UTF-8";
            if(bytes.length>=3&&(bytes[0]&255)==239&&(bytes[1]&255)==187&&(bytes[2]&255)==191)offset=3;
            else if(bytes.length>=2&&(bytes[0]&255)==255&&(bytes[1]&255)==254){encoding="UTF-16LE";offset=2;}
            else if(bytes.length>=2&&(bytes[0]&255)==254&&(bytes[1]&255)==255){encoding="UTF-16BE";offset=2;}
        }
        if(!ENCODINGS.contains(encoding))throw new IOException("不支持的文本编码");
        String text=Charset.forName(encoding).newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes,offset,bytes.length-offset)).toString();
        text=text.replace("\uFEFF", "").replace("\r\n","\n").replace('\r','\n');
        StringBuilder clean=new StringBuilder();int kana=0,hangul=0,han=0;
        for(int i=0;i<text.length();){int c=text.codePointAt(i);i+=Character.charCount(c);if(c==9||c==10||(c>=32&&c<=0xD7FF)||(c>=0xE000&&c<=0xFFFD)||(c>=0x10000&&c<=0x10FFFF))clean.appendCodePoint(c);if(c>=0x3040&&c<=0x30FF)kana++;if(c>=0xAC00&&c<=0xD7AF)hangul++;if(c>=0x4E00&&c<=0x9FFF)han++;}
        text=clean.toString();if(text.trim().isEmpty())throw new IOException("TXT 文件没有可阅读的内容");
        String lang=hangul>kana&&hangul>20?"ko":kana>5?"ja":han>0?"zh":"en";
        ArrayList<String> sections=new ArrayList<>();StringBuilder part=new StringBuilder();
        for(String line:text.split("\n",-1)){
            // Bound chapter size even when a source contains one very long line.
            for(int start=0;start<Math.max(1,line.length());){int end=Math.min(line.length(),start+12000);if(end<line.length()&&Character.isHighSurrogate(line.charAt(end-1)))end--;String slice=line.substring(start,end);part.append(slice.isEmpty()?"<p class=\"blank\">&#160;</p>":"<p>"+xml(slice)+"</p>");start=end;if(part.length()>=16000){sections.add(part.toString());part.setLength(0);}if(line.isEmpty())break;}
        }
        if(part.length()>0)sections.add(part.toString());
        try(ZipOutputStream zip=new ZipOutputStream(new FileOutputStream(output))){
            byte[] mime="application/epub+zip".getBytes(StandardCharsets.US_ASCII);CRC32 crc=new CRC32();crc.update(mime);ZipEntry entry=new ZipEntry("mimetype");entry.setMethod(ZipEntry.STORED);entry.setSize(mime.length);entry.setCrc(crc.getValue());zip.putNextEntry(entry);zip.write(mime);zip.closeEntry();
            put(zip,"META-INF/container.xml","<?xml version=\"1.0\"?><container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\"><rootfiles><rootfile full-path=\"book.opf\" media-type=\"application/oebps-package+xml\"/></rootfiles></container>");
            StringBuilder manifest=new StringBuilder("<item id=\"nav\" href=\"nav.xhtml\" media-type=\"application/xhtml+xml\" properties=\"nav\"/>");StringBuilder spine=new StringBuilder(),nav=new StringBuilder();
            for(int i=0;i<sections.size();i++){String file="text-"+i+".xhtml",label=sections.size()==1?title:"第 "+(i+1)+" 节";manifest.append("<item id=\"s").append(i).append("\" href=\"").append(file).append("\" media-type=\"application/xhtml+xml\"/>");spine.append("<itemref idref=\"s").append(i).append("\"/>");nav.append("<li><a href=\"").append(file).append("\">").append(xml(label)).append("</a></li>");
                put(zip,file,"<?xml version=\"1.0\" encoding=\"utf-8\"?><html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\""+lang+"\"><head><title>"+xml(label)+"</title><style>html{writing-mode:"+(lang.equals("ja")?"vertical-rl":"horizontal-tb")+"}body{margin:0}p{margin:0 0 1em;white-space:pre-wrap;overflow-wrap:break-word}.blank{min-height:1em}</style></head><body>"+sections.get(i)+"</body></html>");
            }
            put(zip,"nav.xhtml","<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:epub=\"http://www.idpf.org/2007/ops\"><head><title>目录</title></head><body><nav epub:type=\"toc\"><ol>"+nav+"</ol></nav></body></html>");
            put(zip,"book.opf","<?xml version=\"1.0\" encoding=\"utf-8\"?><package xmlns=\"http://www.idpf.org/2007/opf\" version=\"3.0\" unique-identifier=\"bookid\"><metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\"><dc:identifier id=\"bookid\">urn:sha256:"+id+"</dc:identifier><dc:title>"+xml(title)+"</dc:title><dc:language>"+lang+"</dc:language><meta property=\"dcterms:modified\">2026-01-01T00:00:00Z</meta></metadata><manifest>"+manifest+"</manifest><spine page-progression-direction=\""+(lang.equals("ja")?"rtl":"ltr")+"\">"+spine+"</spine></package>");
        }
        return lang;
    }
    private static String xml(String s){return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;");}
    private static void put(ZipOutputStream z,String name,String value)throws IOException{ZipEntry e=new ZipEntry(name);e.setTime(0);z.putNextEntry(e);z.write(value.getBytes(StandardCharsets.UTF_8));z.closeEntry();}
}
