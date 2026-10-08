package dev.polyreader.app;

import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.provider.DocumentsContract;
import android.database.Cursor;
import android.util.AtomicFile;
import android.view.*;
import android.webkit.*;
import android.widget.Toast;
import org.json.*;
import org.xmlpull.v1.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.*;

/** Local library host with an optional, explicitly configured reading assistant. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final int IMPORT_BOOK = 10, IMPORT_FONT = 11, EXPORT_NOTES = 12;
    private WebView web;
    private android.widget.FrameLayout root;
    private BookWalkerReader nativeReader;
    private AiService assistant;
    private DictionaryService dictionaries;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler ui = new Handler(Looper.getMainLooper());
    private File books, fonts;
    private volatile boolean ready;
    private volatile boolean volumePaging;
    private boolean fullscreen;
    private boolean reading;
    private ActionMode readerSelectionMode;
    private String exportText = "";

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        books = new File(getFilesDir(), "books"); books.mkdirs();
        fonts = new File(getFilesDir(), "fonts"); fonts.mkdirs();
        assistant=new AiService(this,value->event("assistant",value));
        dictionaries=new DictionaryService(this,value->event("assistant",value));
        web = new WebView(this) {
            private boolean usesReaderActions() {
                HitTestResult hit=getHitTestResult();
                return reading && (hit==null || hit.getType()!=HitTestResult.EDIT_TEXT_TYPE);
            }
            @Override public ActionMode startActionMode(ActionMode.Callback callback) {
                return super.startActionMode(usesReaderActions()?readerActions(callback):callback);
            }
            @Override public ActionMode startActionMode(ActionMode.Callback callback,int type) {
                return super.startActionMode(usesReaderActions()?readerActions(callback):callback,type);
            }
        };
        web.setBackgroundColor(0xfff6f4ee);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(false);
        // Book sizes are selected explicitly in each reader; avoid applying the
        // device's accessibility text zoom a second time to EPUB layout.
        s.setTextZoom(100);
        s.setAllowFileAccess(false); s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false); s.setAllowUniversalAccessFromFileURLs(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(true); s.setSupportMultipleWindows(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return serve(r.getUrl()); }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                // Render only library-generated Blob chapter frames; external navigation stays blocked.
                return r.isForMainFrame() || !"blob".equals(r.getUrl().getScheme());
            }
            @Override public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
                ready = false; v.destroy(); recreate(); return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) {
                android.util.Log.d("PolyReader", m.messageLevel() + " " + m.message() + " @" + m.lineNumber()); return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "Native");
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true);
        root=new android.widget.FrameLayout(this){@Override public boolean dispatchTouchEvent(MotionEvent e){if(nativeReader!=null&&nativeReader.route(e))return true;return super.dispatchTouchEvent(e);}};
        root.addView(web,new android.widget.FrameLayout.LayoutParams(-1,-1));
        root.setOnApplyWindowInsetsListener((v,insets)->{applyCutoutInsets(insets);return insets;});
        setContentView(root);
        web.loadUrl(ORIGIN + "/app/index.html");
    }

    // Keep Chromium's selection handles and lifecycle while our toolbar owns the actions.
    private ActionMode.Callback2 readerActions(ActionMode.Callback original) {
        return new ActionMode.Callback2() {
            @Override public boolean onCreateActionMode(ActionMode mode,Menu menu) {
                original.onCreateActionMode(mode,menu);menu.clear();readerSelectionMode=mode;return true;
            }
            @Override public boolean onPrepareActionMode(ActionMode mode,Menu menu) {
                original.onPrepareActionMode(mode,menu);menu.clear();return true;
            }
            @Override public boolean onActionItemClicked(ActionMode mode,MenuItem item){return false;}
            @Override public void onDestroyActionMode(ActionMode mode){if(readerSelectionMode==mode)readerSelectionMode=null;original.onDestroyActionMode(mode);}
            @Override public void onGetContentRect(ActionMode mode,View view,android.graphics.Rect rect){
                if(original instanceof ActionMode.Callback2)((ActionMode.Callback2)original).onGetContentRect(mode,view,rect);
                else super.onGetContentRect(mode,view,rect);
            }
        };
    }

    private void applyCutoutInsets(WindowInsets insets) {
        DisplayCutout cutout=fullscreen&&insets!=null?insets.getDisplayCutout():null;
        int left=cutout==null?0:cutout.getSafeInsetLeft(),top=cutout==null?0:cutout.getSafeInsetTop();
        int right=cutout==null?0:cutout.getSafeInsetRight(),bottom=cutout==null?0:cutout.getSafeInsetBottom();
        int toolbarTop=fullscreen&&insets!=null?Math.max(top,insets.getStableInsetTop()):0;
        int toolbarBottom=fullscreen&&insets!=null?Math.max(bottom,insets.getStableInsetBottom()):0;
        if(ready){float density=getResources().getDisplayMetrics().density;
            web.evaluateJavascript("(()=>{const s=document.documentElement.style;s.setProperty('--cutout-top','"+(top/density)+"px');s.setProperty('--cutout-left','"+(left/density)+"px');s.setProperty('--cutout-right','"+(right/density)+"px');s.setProperty('--cutout-bottom','"+(bottom/density)+"px');s.setProperty('--toolbar-top','"+(toolbarTop/density)+"px');s.setProperty('--toolbar-bottom','"+(toolbarBottom/density)+"px');})()",null);
        }
    }

    private WebResourceResponse serve(Uri uri) {
        try {
            if (!"https".equals(uri.getScheme()) || !"appassets.androidplatform.net".equals(uri.getHost())) return denied();
            String p = uri.getPath();
            InputStream in; String type;
            if (p.startsWith("/app/") && !p.contains("..")) {
                in = getAssets().open(p.substring(1)); type = mime(p);
            } else if (p.matches("/books/[a-f0-9]{64}\\.epub")) {
                in = new FileInputStream(new File(books, p.substring(7))); type = "application/epub+zip";
            } else if (p.matches("/index/[a-f0-9]{64}")) {
                JSONArray entries=new JSONArray();
                try(ZipFile z=new ZipFile(new File(books,p.substring(7)+".epub"))){
                    Enumeration<? extends ZipEntry> all=z.entries();
                    while(all.hasMoreElements()){ZipEntry e=all.nextElement();if(!e.isDirectory()){JSONObject item=new JSONObject();item.put("name",e.getName());item.put("size",e.getSize());entries.put(item);}}
                }
                in=new ByteArrayInputStream(entries.toString().getBytes(StandardCharsets.UTF_8));type="application/json";
            } else if (p.matches("/entry/[a-f0-9]{64}/.+")) {
                String id=p.substring(7,71),name=p.substring(72);
                ZipFile z=new ZipFile(new File(books,id+".epub"));ZipEntry e=z.getEntry(name);
                if(e==null || e.isDirectory()){z.close();return denied();}
                in=new FilterInputStream(z.getInputStream(e)){@Override public void close() throws IOException{try{super.close();}finally{z.close();}}};type="application/octet-stream";
            } else if (p.matches("/fonts/[a-f0-9]{64}\\.font")) {
                in = new FileInputStream(new File(fonts, p.substring(7))); type = "font/otf";
            } else return denied();
            Map<String,String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", ORIGIN); headers.put("X-Content-Type-Options", "nosniff");
            headers.put("Cache-Control", "no-store");
            if (p.endsWith(".html")) headers.put("Content-Security-Policy", "default-src 'none'; script-src " + ORIGIN + "/app/; style-src 'unsafe-inline' " + ORIGIN + " blob:; img-src " + ORIGIN + " blob: data:; font-src " + ORIGIN + " blob: data:; connect-src " + ORIGIN + " blob:; frame-src blob: " + ORIGIN + "; media-src blob:; object-src 'none'; base-uri 'none'");
            return new WebResourceResponse(type, "UTF-8", 200, "OK", headers, in);
        } catch (Exception e) { return denied(); }
    }
    private WebResourceResponse denied() { return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", Collections.emptyMap(), new ByteArrayInputStream(new byte[0])); }
    private String mime(String p) {
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".otf")) return "font/otf";
        if (p.endsWith(".ttf")) return "font/ttf";
        return "text/plain";
    }
    private String read(String name, String fallback) {
        try (InputStream in = new AtomicFile(new File(getFilesDir(), name)).openRead()) { return new String(readBytes(in), StandardCharsets.UTF_8); }
        catch (Exception e) { return fallback; }
    }
    private void write(String name, String value) throws IOException {
        AtomicFile f = new AtomicFile(new File(getFilesDir(), name)); FileOutputStream out = null;
        try { out = f.startWrite(); out.write(value.getBytes(StandardCharsets.UTF_8)); f.finishWrite(out); }
        catch (IOException e) { if (out != null) f.failWrite(out); throw e; }
    }
    private JSONObject bootstrap() throws JSONException {
        JSONObject o = new JSONObject(); o.put("library", new JSONArray(read("library.json", "[]")));
        o.put("state", new JSONObject(read("state.json", "{}")));
        o.put("webview", WebView.getCurrentWebViewPackage() == null ? "unknown" : WebView.getCurrentWebViewPackage().versionName);
        return o;
    }
    void event(String type, Object value) {
        ui.post(() -> { if (ready) web.evaluateJavascript("window.receiveNative(" + JSONObject.quote(type) + "," + (value == null ? "null" : value.toString()) + ")", null); });
    }
    private void fail(Throwable e) { event("error", JSONObject.quote(e.getMessage() == null ? e.toString() : e.getMessage())); }
    private void choose(boolean font) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        if (!font) { i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/epub+zip", "text/plain", "application/octet-stream", "application/zip"}); i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true); }
        startActivityForResult(i, font ? IMPORT_FONT : IMPORT_BOOK);
    }
    private String displayName(Uri uri) {
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) { if (c != null && c.moveToFirst()) return c.getString(0); }
        catch (Exception ignored) { }
        return "file".equals(uri.getScheme()) && uri.getLastPathSegment()!=null ? uri.getLastPathSegment() : "Book.epub";
    }
    private void importUri(Uri uri, boolean font) {
        importUri(uri,font,null,false);
    }
    private void importUri(Uri uri, boolean font,String encoding,boolean open) {
        io.execute(() -> {
            File tmp = null,converted=null;
            try {
                String name = displayName(uri);
                tmp = File.createTempFile("import-", ".part", getCacheDir());
                MessageDigest sha = MessageDigest.getInstance("SHA-256"); long size = 0;
                try (InputStream in = getContentResolver().openInputStream(uri); OutputStream out = new FileOutputStream(tmp)) {
                    if (in == null) throw new IOException("无法读取所选文件");
                    byte[] buf = new byte[65536]; int n;
                    while ((n = in.read(buf)) != -1) { size += n; if (size > (font ? 32L : 256L)*1024*1024) throw new IOException("文件过大：书籍上限 256 MB，字体上限 32 MB"); out.write(buf,0,n); sha.update(buf,0,n); }
                }
                StringBuilder hex = new StringBuilder(); for (byte b : sha.digest()) hex.append(String.format(Locale.ROOT,"%02x", b));
                String id = hex.toString();boolean text=!font&&(name.toLowerCase(Locale.ROOT).endsWith(".txt")||"text/plain".equals(getContentResolver().getType(uri)));
                if(text){converted=File.createTempFile("text-", ".epub",getCacheDir());TextBook.convert(tmp,converted,name.replaceFirst("(?i)\\.txt$",""),id,encoding);tmp.delete();tmp=converted;}
                JSONObject item = font ? new JSONObject() : inspectBook(tmp);
                if(!font)item.put("format",text?"txt":"epub");
                item.put("id", id); item.put("filename", name); item.put("bytes", size);
                if (font) {
                    try (InputStream in = new FileInputStream(tmp)) { byte[] magic = new byte[4]; in.read(magic); String m = new String(magic,StandardCharsets.ISO_8859_1); if (!(m.equals("OTTO") || m.equals("ttcf") || (magic[0]==0 && magic[1]==1 && magic[2]==0 && magic[3]==0))) throw new IOException("请选择有效的 TTF / OTF 字体"); }
                }
                File dest = new File(font ? fonts : books, id + (font ? ".font" : ".epub"));
                if (!dest.exists() && !tmp.renameTo(dest)) throw new IOException("无法保存导入的文件");
                if (font) event("font", item);
                else {
                    JSONArray list = new JSONArray(read("library.json", "[]")); boolean found = false;
                    for (int i=0;i<list.length();i++) if (list.getJSONObject(i).optString("id").equals(id)) { found=true;list.put(i,item); }
                    if (!found) list.put(item);
                    write("library.json", list.toString());
                    if("content".equals(uri.getScheme())){JSONObject sources=new JSONObject(read("sources.json","{}"));sources.put(id,uri.toString());write("sources.json",sources.toString());}
                    event(open ? "openBook" : "imported", item);
                }
            } catch (java.nio.charset.CharacterCodingException e) {try{JSONObject q=new JSONObject();q.put("uri",uri.toString());q.put("filename",displayName(uri));q.put("open",open);event("textEncoding",q);}catch(Exception x){fail(x);}}
            catch (Throwable e) { fail(e); }
            finally { if (tmp != null) tmp.delete();if(converted!=null)converted.delete(); }
        });
    }
    private void retainGrant(Uri uri,int flags){
        int modes=flags&(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        if(modes!=0&&(flags&Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)!=0)
            try{getContentResolver().takePersistableUriPermission(uri,modes);}catch(SecurityException ignored){}
    }
    private boolean canDeleteSource(Uri uri){
        if(!"content".equals(uri.getScheme())||checkUriPermission(uri,android.os.Process.myPid(),android.os.Process.myUid(),Intent.FLAG_GRANT_WRITE_URI_PERMISSION)!=android.content.pm.PackageManager.PERMISSION_GRANTED)return false;
        try{
            if(DocumentsContract.isDocumentUri(this,uri)){
                try(Cursor c=getContentResolver().query(uri,new String[]{DocumentsContract.Document.COLUMN_FLAGS,DocumentsContract.Document.COLUMN_MIME_TYPE},null,null,null)){
                    if(c==null||!c.moveToFirst()||(c.getLong(0)&DocumentsContract.Document.FLAG_SUPPORTS_DELETE)==0||DocumentsContract.Document.MIME_TYPE_DIR.equals(c.getString(1)))return false;
                }
            }
            try(InputStream in=getContentResolver().openInputStream(uri)){return in!=null;}
        }catch(Exception e){return false;}
    }
    private void verifySource(String id,Uri uri)throws Exception{
        MessageDigest sha=MessageDigest.getInstance("SHA-256");long size=0;
        try(InputStream in=getContentResolver().openInputStream(uri)){
            if(in==null)throw new IOException("无法读取原文件，书架中的书已保留");
            byte[] b=new byte[65536];int n;
            while((n=in.read(b))!=-1){size+=n;if(size>256L*1024*1024)throw new IOException("原文件与导入时的内容不一致，未删除任何文件");sha.update(b,0,n);}
        }
        StringBuilder hex=new StringBuilder();for(byte b:sha.digest())hex.append(String.format(Locale.ROOT,"%02x",b));
        if(!id.equals(hex.toString()))throw new IOException("原文件与导入时的内容不一致，未删除任何文件");
    }
    private void removeFromLibrary(String id)throws Exception{
        JSONArray old=new JSONArray(read("library.json","[]")),list=new JSONArray();
        for(int i=0;i<old.length();i++)if(!old.getJSONObject(i).optString("id").equals(id))list.put(old.get(i));
        JSONObject sources=new JSONObject(read("sources.json","{}"));String source=sources.optString(id);sources.remove(id);write("sources.json",sources.toString());
        write("library.json",list.toString());new File(books,id+".epub").delete();
        event("library",list);
        boolean stillUsed=false;for(Iterator<String> keys=sources.keys();keys.hasNext();)if(source.equals(sources.optString(keys.next())))stillUsed=true;
        if(!source.isEmpty()&&!stillUsed)try{for(UriPermission grant:getContentResolver().getPersistedUriPermissions())if(source.equals(grant.getUri().toString()))getContentResolver().releasePersistableUriPermission(grant.getUri(),(grant.isReadPermission()?Intent.FLAG_GRANT_READ_URI_PERMISSION:0)|(grant.isWritePermission()?Intent.FLAG_GRANT_WRITE_URI_PERMISSION:0));}catch(SecurityException ignored){}
    }
    private void showRemovalOptions(String id){
        io.execute(()->{try{
            JSONArray list=new JSONArray(read("library.json","[]"));JSONObject book=null;
            for(int i=0;i<list.length();i++)if(id.equals(list.getJSONObject(i).optString("id")))book=list.getJSONObject(i);
            if(book==null)throw new IOException("这本书已不在书架中");
            String stored=new JSONObject(read("sources.json","{}")).optString(id);
            Uri source=stored.isEmpty()?null:Uri.parse(stored);
            boolean deletable=source!=null&&canDeleteSource(source);
            String[] options=deletable?new String[]{"仅从书架移除","同时删除 "+book.optString("format","epub").toUpperCase(Locale.ROOT)+" 原文件"}:new String[]{"仅从书架移除"};
            ui.post(()->{
                if(isFinishing()||isDestroyed())return;
                new AlertDialog.Builder(this).setTitle("移除书籍").setItems(options,(d,which)->{
                    if(which==0)io.execute(()->deleteBook(id,null));
                    else io.execute(()->confirmSourceDeletion(id,source));
                }).setNegativeButton("取消",null).show();
            });
        }catch(Exception e){fail(e);}});
    }
    // Called on the I/O executor; deletion requires a separate confirmation.
    private void confirmSourceDeletion(String id,Uri source){
        try{
            verifySource(id,source);String name=displayName(source);
            ui.post(()->{
                if(isFinishing()||isDestroyed())return;
                AlertDialog dialog=new AlertDialog.Builder(this).setTitle("删除原文件")
                    .setMessage(name+"\n\n将删除原文件和书架中的副本。阅读记录和笔记会保留。此操作无法在 PolyReader 中撤销。")
                    .setNegativeButton("取消",null)
                    .setPositiveButton("删除",(d,w)->io.execute(()->deleteBook(id,source))).create();
                dialog.setOnShowListener(d->{android.widget.TextView message=dialog.findViewById(android.R.id.message);if(message!=null)message.setTextSize(18);dialog.getButton(AlertDialog.BUTTON_POSITIVE).setTextSize(17);dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setTextSize(17);});
                dialog.show();
            });
        }catch(Exception e){fail(e);}
    }
    private void deleteBook(String id,Uri source){
        boolean sourceDeleted=false;
        try{
            if(source!=null){
                verifySource(id,source);
                boolean deleted=DocumentsContract.isDocumentUri(this,source)?DocumentsContract.deleteDocument(getContentResolver(),source):getContentResolver().delete(source,null,null)>0;
                if(!deleted)throw new IOException("原文件未能删除");
                sourceDeleted=true;
            }
            removeFromLibrary(id);
            event("notice",JSONObject.quote(sourceDeleted?"已删除原文件并移出书架":"已从书架移除"));
        }catch(Exception e){
            if(source==null)fail(e);
            else event("notice",JSONObject.quote(sourceDeleted?"原文件已删除，书架更新失败。请再执行仅从书架移除。":"原文件未能删除，书架中的书已保留。请检查文件权限或是否已移动。"));
        }
    }
    private JSONObject inspectBook(File f) throws Exception {
        try (ZipFile z = new ZipFile(f)) {
            long total=0; int count=0; Enumeration<? extends ZipEntry> it=z.entries();
            while(it.hasMoreElements()) { ZipEntry e=it.nextElement(); total+=Math.max(0,e.getSize()); if (++count>30000 || total>768L*1024*1024 || e.getSize()>64L*1024*1024) throw new IOException("EPUB 解压体积超出安全限制"); }
            String opf=null; XmlPullParser x=xml(z,"META-INF/container.xml");
            for(int t=x.getEventType();t!=XmlPullParser.END_DOCUMENT;t=x.next()) if(t==XmlPullParser.START_TAG && "rootfile".equals(x.getName())) { opf=x.getAttributeValue(null,"full-path"); break; }
            if(opf==null) throw new IOException("无效的 EPUB：缺少 package 文档");
            JSONObject o=new JSONObject(); x=xml(z,opf); boolean metadata=false;
            Map<String,String> manifest=new HashMap<>();String coverId=null,coverHref=null;
            for(int t=x.getEventType();t!=XmlPullParser.END_DOCUMENT;t=x.next()) {
                if(t==XmlPullParser.START_TAG) {
                    String tag=x.getName(); if(tag.equals("metadata")) metadata=true;
                    if(tag.equals("meta") && "cover".equals(x.getAttributeValue(null,"name")))coverId=x.getAttributeValue(null,"content");
                    if(tag.equals("item")){String id=x.getAttributeValue(null,"id"),href=x.getAttributeValue(null,"href"),props=x.getAttributeValue(null,"properties");manifest.put(id,href);if(props!=null && Arrays.asList(props.split("\\s+")).contains("cover-image"))coverHref=href;}
                    if(metadata && (tag.equals("title") || tag.equals("language") || tag.equals("creator"))) { String text=x.nextText(); if(!o.has(tag)) o.put(tag,text); }
                    if(tag.equals("spine")) o.put("direction",x.getAttributeValue(null,"page-progression-direction"));
                } else if(t==XmlPullParser.END_TAG && x.getName().equals("metadata")) metadata=false;
            }
            if(coverHref==null)coverHref=manifest.get(coverId);
            if(coverHref!=null){try{String path=new java.net.URI(null,null,"/"+opf,null).resolve(coverHref).getPath().substring(1);if(z.getEntry(path)!=null)o.put("cover",path);}catch(Exception ignored){}}
            if (z.getEntry("META-INF/encryption.xml") != null) {
                x=xml(z,"META-INF/encryption.xml");
                for(int t=x.getEventType();t!=XmlPullParser.END_DOCUMENT;t=x.next()) if(t==XmlPullParser.START_TAG && "EncryptionMethod".equals(x.getName())) {
                    String a=x.getAttributeValue(null,"Algorithm"); if(!"http://www.idpf.org/2008/embedding".equals(a) && !"http://ns.adobe.com/pdf/enc#RC".equals(a)) throw new IOException("这本书含加密内容，当前仅支持无 DRM EPUB");
                }
            }
            return o;
        }
    }
    private XmlPullParser xml(ZipFile z,String name) throws Exception {
        ZipEntry e=z.getEntry(name); if(e==null || e.getSize()>4*1024*1024) throw new IOException("无效的 EPUB 元数据");
        byte[] bytes; try(InputStream in=z.getInputStream(e)){ bytes=readBytes(in); }
        XmlPullParserFactory f=XmlPullParserFactory.newInstance(); f.setNamespaceAware(true);
        XmlPullParser x=f.newPullParser(); x.setFeature(XmlPullParser.FEATURE_PROCESS_DOCDECL,false); x.setInput(new ByteArrayInputStream(bytes),null); return x;
    }
    private static byte[] readBytes(InputStream in) throws IOException {
        ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[16384];int n;
        while((n=in.read(buf))!=-1)out.write(buf,0,n);return out.toByteArray();
    }
    private final class Bridge {
        @JavascriptInterface public String init() { try { ready=true; ui.post(() -> handleIntent(getIntent())); return bootstrap().toString(); } catch(Exception e){ return "{}"; } }
        @JavascriptInterface public void post(String raw) {
            if(raw==null || raw.length()>4*1024*1024) return;
            try {
                JSONObject o=new JSONObject(raw); String action=o.getString("action");
                if(action.startsWith("ai")){assistant.handle(o);return;}
                if(action.equals("dictionaryFetch")||action.equals("dictionaryCancel")){dictionaries.handle(o);return;}
                if(action.equals("save")) { String state=o.getJSONObject("state").toString(); io.execute(() -> { try { write("state.json",state); } catch(Exception e){fail(e);} }); return; }
                ui.post(() -> { try { perform(action,o); } catch(Exception e){fail(e);} });
            } catch(Exception e){ fail(e); }
        }
    }
    private void perform(String action,JSONObject o) throws Exception {
        switch(action) {
            case "bwOpen": {
                if(nativeReader!=null)nativeReader.close();
                nativeReader=new BookWalkerReader(this,root);web.setBackgroundColor(android.graphics.Color.TRANSPARENT);
                try{nativeReader.open(o);applyCutoutInsets(root.getRootWindowInsets());}catch(Exception e){nativeReader.close();nativeReader=null;throw e;}
                break;
            }
            case "bwClose": if(nativeReader!=null){nativeReader.close();nativeReader=null;}web.setBackgroundColor(0xfff6f4ee);break;
            case "bwSettings": if(nativeReader!=null)nativeReader.settings(o.getJSONObject("prefs"),true);break;
            case "bwGo": if(nativeReader!=null)nativeReader.go(o.getString("target"));break;
            case "bwTurn": if(nativeReader!=null)nativeReader.turn(o.getInt("direction"));break;
            case "bwAnnotate": if(nativeReader!=null)nativeReader.annotate(o.getJSONArray("notes"));break;
            case "bwClearSelection": if(nativeReader!=null)nativeReader.clearSelection();break;
            case "finishTextSelection": if(readerSelectionMode!=null)readerSelectionMode.finish();break;
            case "bwUi": if(nativeReader!=null){nativeReader.setModal(o.optBoolean("modal"));nativeReader.setSelectionBar(o.optJSONArray("selectionRect"));nativeReader.setChrome(o.optBoolean("chrome"),o.optJSONArray("chromeRects"));}break;
            case "exit": finish();break;
            case "import": choose(false); break;
            case "importText": importUri(Uri.parse(o.getString("uri")),false,o.getString("encoding"),o.optBoolean("open"));break;
            case "font": choose(true); break;
            case "window": {
                reading=o.optBoolean("reader");
                volumePaging=o.optBoolean("volume");
                if(o.optBoolean("awake")) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                boolean dark=o.optBoolean("dark"),full=o.optBoolean("fullscreen");
                fullscreen=full;
                WindowManager.LayoutParams p=getWindow().getAttributes(); p.screenBrightness=(float)o.optDouble("brightness",-1);
                p.layoutInDisplayCutoutMode=full?(Build.VERSION.SDK_INT>=30?WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS:WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES):WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT;
                getWindow().setAttributes(p);
                if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(!full);
                int orientation=o.optInt("orientation"); setRequestedOrientation(orientation==1?ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT:orientation==2?ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE:ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                int barColor=dark?0xff262626:0xfffafafa;
                getWindow().setStatusBarColor(full?android.graphics.Color.TRANSPARENT:barColor);
                getWindow().setNavigationBarColor(full?android.graphics.Color.TRANSPARENT:barColor);
                getWindow().setStatusBarContrastEnforced(false);
                getWindow().setNavigationBarContrastEnforced(false);
                int flags=(dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR) | (full?View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|(o.optBoolean("chrome")?0:View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY):0);
                web.setSystemUiVisibility(flags);
                getWindow().getDecorView().setSystemUiVisibility(flags);
                if(Build.VERSION.SDK_INT>=30){
                    WindowInsetsController controller=getWindow().getInsetsController();
                    int appearance=WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    if(controller!=null)controller.setSystemBarsAppearance(dark?0:appearance,appearance);
                }
                root.requestApplyInsets();
                break;
            }
            case "copy": ((android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("PolyReader",o.optString("text"))); break;
            case "openDictionary": {Uri uri=Uri.parse(o.optString("url"));if("https".equals(uri.getScheme())&&uri.getHost()!=null&&uri.getUserInfo()==null)startActivity(new Intent(Intent.ACTION_VIEW,uri));break;}
            case "export": exportText=o.optString("text"); startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"PolyReader-notes.json"),EXPORT_NOTES); break;
            case "removeBook": {String id=o.optString("id");if(id.matches("[a-f0-9]{64}"))showRemovalOptions(id);break;}
        }
    }
    private void handleIntent(Intent intent) { if(Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData()!=null){ Uri uri=intent.getData();retainGrant(uri,intent.getFlags()); intent.setData(null); importUri(uri,false,null,true); } }
    @Override protected void onNewIntent(Intent i){super.onNewIntent(i);setIntent(i);if(ready)handleIntent(i);}
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(result!=RESULT_OK || data==null)return;
        if(request==EXPORT_NOTES){Uri u=data.getData(); String text=exportText;io.execute(()->{try(OutputStream out=getContentResolver().openOutputStream(u)){out.write(text.getBytes(StandardCharsets.UTF_8));event("notice",JSONObject.quote("笔记已导出"));}catch(Exception e){fail(e);}});return;}
        if(data.getClipData()!=null) for(int i=0;i<data.getClipData().getItemCount();i++){Uri uri=data.getClipData().getItemAt(i).getUri();retainGrant(uri,data.getFlags());importUri(uri,false);}
        else if(data.getData()!=null){retainGrant(data.getData(),data.getFlags());importUri(data.getData(),request==IMPORT_FONT);}
    }
    @Override public void onBackPressed(){if(ready)web.evaluateJavascript("window.onNativeBack()",null);else super.onBackPressed();}
    @Override public boolean onKeyDown(int code,KeyEvent event){if(volumePaging && (code==KeyEvent.KEYCODE_VOLUME_DOWN || code==KeyEvent.KEYCODE_VOLUME_UP)){web.evaluateJavascript("window.nativeTurn("+(code==KeyEvent.KEYCODE_VOLUME_DOWN?1:-1)+")",null);return true;}return super.onKeyDown(code,event);}
    @Override protected void onPause(){super.onPause();if(ready)web.evaluateJavascript("window.clearReaderSelection?.();window.flushState?.()",null);}
    @Override protected void onDestroy(){ready=false;if(assistant!=null)assistant.close();if(dictionaries!=null)dictionaries.close();if(nativeReader!=null)nativeReader.close();io.shutdown();if(web!=null)web.destroy();super.onDestroy();}
}
