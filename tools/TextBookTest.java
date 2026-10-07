package dev.polyreader.app;
import java.io.*;
import java.nio.charset.*;
import java.nio.file.*;
import java.util.zip.*;
import javax.xml.parsers.*;

public class TextBookTest {
    static int passed;
    public static void main(String[] args)throws Exception {
        Path work=Files.createTempDirectory("polyreader-text-test-");
        try {
            String jp="日本語の小説です。これは文字と段落の確認です。\n\n  & <tag> 😀\n";
            check(work,jp.getBytes(StandardCharsets.UTF_8),null,"ja","UTF-8 and XML escaping");
            check(work,("\uFEFF"+jp).getBytes(StandardCharsets.UTF_16LE),null,"ja","UTF-16 BOM");
            check(work,"中文小说测试，保留每一个段落。".getBytes(Charset.forName("GB18030")),"GB18030","zh","Chinese legacy encoding");
            check(work,jp.replace("😀","").getBytes(Charset.forName("Shift_JIS")),"Shift_JIS","ja","Japanese legacy encoding");
            check(work,"이것은 한글 소설의 문장입니다. 문단과 글자와 여백을 확인하는 테스트입니다.".getBytes(Charset.forName("EUC-KR")),"EUC-KR","ko","Korean legacy encoding");
            check(work,("Long line 😀 ".repeat(5000)).getBytes(StandardCharsets.UTF_8),null,"en","Large line splits safely");
            Path input=work.resolve("input.txt"),output=work.resolve("output.epub");Files.write(input,new byte[]{(byte)0xff,1,2});
            try{TextBook.convert(input.toFile(),output.toFile(),"Test","abc",null);throw new AssertionError("Malformed UTF-8 was accepted");}catch(CharacterCodingException expected){passed++;}
            Files.writeString(input," \n\t");try{TextBook.convert(input.toFile(),output.toFile(),"Test","abc",null);throw new AssertionError("Empty book was accepted");}catch(IOException expected){passed++;}
            System.out.println("PASS "+passed+" TXT conversion cases");
        }finally{try(var files=Files.list(work)){for(Path p:files.toList())Files.deleteIfExists(p);}Files.deleteIfExists(work);}
    }
    static void check(Path work,byte[] bytes,String encoding,String language,String label)throws Exception{
        Path input=work.resolve("input.txt"),output=work.resolve("output.epub");Files.write(input,bytes);
        if(!TextBook.convert(input.toFile(),output.toFile(),"Test & <book>","abc",encoding).equals(language))throw new AssertionError(label);
        try(ZipFile zip=new ZipFile(output.toFile())){
            if(zip.getEntry("mimetype").getMethod()!=ZipEntry.STORED)throw new AssertionError("EPUB mimetype must be stored");
            var factory=DocumentBuilderFactory.newInstance();factory.setNamespaceAware(true);factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
            var entries=zip.entries();while(entries.hasMoreElements()){var e=entries.nextElement();if(e.getName().endsWith(".xhtml")||e.getName().endsWith(".xml")||e.getName().endsWith(".opf"))try(var in=zip.getInputStream(e)){factory.newDocumentBuilder().parse(in);}}
        }
        passed++;System.out.println("PASS "+label);
    }
}
