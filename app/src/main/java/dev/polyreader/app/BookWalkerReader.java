package dev.polyreader.app;

import android.content.*;
import android.content.res.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.widget.*;
import dalvik.system.DexClassLoader;
import org.json.*;
import java.io.*;
import java.lang.reflect.*;
import java.util.*;
import java.util.function.Consumer;

/** Adapter around the supplied BOOK WALKER PUBLUS/MARS reader, with no vendor Application. */
final class BookWalkerReader {
    private static ClassLoader loader;
    private final MainActivity host;
    private final FrameLayout root;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private Object page, book;
    private String activeSelectionCfi;
    private Context context;
    private final ArrayList<android.graphics.RectF> chromeBounds=new ArrayList<>();
    private boolean menus, modal, closed;
    private String token;
    private JSONObject preferences;
    private final Set<String> highlightIds=new HashSet<>();
    private final Map<String,String> highlightStyles=new HashMap<>();
    private JSONArray annotations=new JSONArray();
    private boolean routeGesture;
    private final android.graphics.RectF selectionBar=new android.graphics.RectF();
    private int selectionRevision;
    private boolean hasSelection,selectionTap;
    private float touchX,touchY;
    private long touchTime;
    BookWalkerReader(MainActivity host, FrameLayout root) { this.host=host;this.root=root; }
    private Class<?> cls(String name) throws Exception { return Class.forName(name,true,loader); }
    private static Object call(Object target,String name,Object...args) throws Exception {
        Class<?> type=target instanceof Class?(Class<?>)target:target.getClass();
        for(Method m:type.getMethods()) if(m.getName().equals(name)&&m.getParameterCount()==args.length) {
            m.setAccessible(true);return m.invoke(target instanceof Class?null:target,args);
        }
        throw new NoSuchMethodException(type+"."+name);
    }
    private Object listener(String name,InvocationHandler handler)throws Exception {
        return Proxy.newProxyInstance(loader,new Class[]{cls(name)},(p,m,a)->{
            if(m.getDeclaringClass()==Object.class){if(m.getName().equals("hashCode"))return System.identityHashCode(p);if(m.getName().equals("equals"))return p==a[0];return "PolyReaderListener";}
            return handler.invoke(p,m,a);
        });
    }
    private Object callback(Consumer<Object> action)throws Exception {return listener("a1.B",(p,m,a)->{ui.post(()->{if(!closed)action.accept(a[0]);});return null;});}
    private static void copyBytes(InputStream in,OutputStream out)throws IOException{byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);}
    private File asset(String name)throws Exception {
        File file=new File(host.getFilesDir(),"bookwalker-792/"+name);file.getParentFile().mkdirs();
        if(!file.exists()||file.length()==0)try(InputStream in=host.getAssets().open("bookwalker/"+name);OutputStream out=new FileOutputStream(file)){copyBytes(in,out);}
        return file;
    }
    private void initialize()throws Exception {
        File apk=asset("engine.apk"),split=asset("engine-density.apk");apk.setReadOnly();
        if(loader==null){
            loader=new DexClassLoader(apk.toString(),host.getCodeCacheDir().toString(),host.getApplicationInfo().nativeLibraryDir,host.getClassLoader());
            String[][] constants={{"DA","da","/"},{"DA","Ja",")"},{"DA","La",","},{"DA","HB","="},{"DA","CB",":"},{"DA","Sa","-"},{"DA","Va","."},{"DA","EB",";"},{"DA","Ea","'"},{"DA","Ca","%"},{"DA","Ma",", "},{"DA","ka","0"},{"DA","ma","1"},{"DA","Za",".jpeg"},{"DA","aa",".jpg"},{"DA","ba",".png"},{"AA","Ka","spine"},{"AA","Ta","version"},{"AA","FA","!"},{"AA","LA","/"}};
            for(String[] c:constants)cls("util001.framework.init."+c[0]).getField(c[1]).set(null,c[2]);
            cls("jp.bpsinc.chromium.base.CommandLine").getMethod("init",String[].class).invoke(null,(Object)new String[]{"polyreader","--single-process"});
        }
        for(String name:new String[]{"libnfserif.otf.enc","libnfsans.otf.enc"}){
            File font=new File(host.getFilesDir(),"fonts/"+name);font.getParentFile().mkdirs();
            if(!font.exists())try(InputStream in=host.getAssets().open("bookwalker/fonts/"+name);OutputStream out=new FileOutputStream(font)){copyBytes(in,out);}
        }
        AssetManager assets=AssetManager.class.getConstructor().newInstance();Method add=AssetManager.class.getMethod("addAssetPath",String.class);add.invoke(assets,apk.toString());add.invoke(assets,split.toString());
        Resources resources=new Resources(assets,host.getResources().getDisplayMetrics(),host.getResources().getConfiguration());
        Resources.Theme theme=resources.newTheme();theme.applyStyle(android.R.style.Theme_Material_Light_NoActionBar,true);
        context=new ContextWrapper(host){
            @Override public Resources getResources(){return resources;}
            @Override public AssetManager getAssets(){return assets;}
            @Override public Resources.Theme getTheme(){return theme;}
            @Override public ClassLoader getClassLoader(){return loader;}
            @Override public Context getApplicationContext(){return this;}
            @Override public void registerComponentCallbacks(ComponentCallbacks c){host.getApplication().registerComponentCallbacks(c);}
            @Override public void unregisterComponentCallbacks(ComponentCallbacks c){host.getApplication().unregisterComponentCallbacks(c);}
        };
    }
    void open(JSONObject args)throws Exception {
        token=args.getString("token");initialize();
        page=cls("com.access_company.bookreader.BookPageView").getConstructor(Context.class,android.util.AttributeSet.class).newInstance(context,null);
        root.addView((View)page,0,new FrameLayout.LayoutParams(-1,-1));
        call(page,"setViewerErrorListener",listener("a1.I",(p,m,a)->{emit("error",String.valueOf(a[0]));return null;}));
        call(page,"setPageChangeListener",listener("com.access_company.bookreader.C",(p,m,a)->{ui.post(this::position);return null;}));
        call(page,"setTapEventListener",listener("com.access_company.bookreader.L",(p,m,a)->{
            if(m.getName().equals("o"))ui.post(()->{try{call(page,"w1",((Number)call(a[0],"d")).floatValue(),((Number)call(a[0],"e")).floatValue());}catch(Exception e){error(e);}});
            if(m.getName().equals("s"))ui.post(()->{try{
                String target=String.valueOf(call(a[0],"b"));
                if(target.equals("INTERNAL_LINK")){emit("link",String.valueOf(call(a[0],"c")));return;}
                if(!target.equals("NONE"))return;
                if(hasSelection){clearSelection();return;}
                float x=((Number)call(a[0],"d")).floatValue()/((View)page).getWidth();
                if(x<.22)turn(1);else if(x>.78)turn(-1);else setMenus(!menus);
            }catch(Exception e){error(e);}});
            return null;
        }));
        call(page,"setSelectionListener",listener("a1.E",(p,m,a)->{
            if(m.getName().equals("i"))ui.post(this::selection);
            if(m.getName().equals("e"))ui.post(this::selectionEnded);
            return null;
        }));
        settings(args.getJSONObject("prefs"),false);
        String id=args.getString("bookId");if(!id.matches("[a-f0-9]{64}"))throw new IOException("无效的书籍标识");
        book=cls("b1.G").getConstructor(String.class).newInstance(new File(host.getFilesDir(),"books/"+id+".epub").toString());
        String uri=args.optString("location");
        call(page,"d1",book,uri.isEmpty()?null:Uri.parse(normalize(uri)));
        setMenus(false);
        ui.postDelayed(this::position,1200);
    }
    private String normalize(String uri){return uri.startsWith("epubcfi(")?"#"+uri:uri;}
    void settings(JSONObject p,boolean refresh)throws Exception {
        preferences=p;
        Object c=call(page,"getConfiguration");
        call(c,"a0",false);call(c,"b0",false); // SDK running title and page number.
        call(c,"K",Color.parseColor(p.getString("background")));call(c,"L",Color.parseColor(p.getString("background")));call(c,"O",Color.parseColor(p.getString("foreground")));
        // Use text-range markers for selection fill; line fills include unused ruby space.
        JSONObject selection=p.getJSONObject("selection");
        Field selectionBackground=c.getClass().getDeclaredField("c"),selectionForeground=c.getClass().getDeclaredField("d");
        selectionBackground.setAccessible(true);selectionForeground.setAccessible(true);
        selectionBackground.setInt(c,Color.TRANSPARENT);
        selectionForeground.setInt(c,Color.parseColor(selection.getString("foreground")));
        call(c,"Z","ORyuminPr6N-Reg");call(c,"Y","OGothicMB101Pr6N-Medium");call(c,"c0","ORyuminPr6N-Reg");
        call(c,"N",Math.max(50,Math.min(300,p.optInt("fontSize",160))));
        call(c,"U",(float)p.optDouble("lineHeight",1.75));
        call(c,"W",cls("a1.y").getConstructor(int.class,int.class,int.class,int.class).newInstance((int)Math.round(p.getDouble("margin")),(int)Math.round(p.getDouble("topMargin")),(int)Math.round(p.getDouble("margin")),(int)Math.round(p.getDouble("bottomMargin"))));
        call(c,"T",Enum.valueOf((Class)cls("com.access_company.bookreader.p$c"),p.optBoolean("spread")?"DOUBLE":"SINGLE"));
        call(c,"M",Enum.valueOf((Class)cls("com.access_company.bookreader.p$a"),p.optString("font").equals("sans")?"SANS_SERIF":"AUTHOR"));
        call(page,"setSlideAnimationDuration",p.optBoolean("animation")?200:0);call(page,"setCurlAnimationDuration",p.optBoolean("animation")?200:0);
        if(refresh){call(page,"j1");annotate(annotations);}
    }
    void go(String target)throws Exception{clearSelection();call(page,"y0",Uri.parse(normalize(target)),callback(x->position()));setMenus(false);}
    void turn(int direction)throws Exception{clearSelection();call(page,"v0",Enum.valueOf((Class)cls("a1.z"),direction>0?"LEFT":"RIGHT"),callback(x->position()));setMenus(false);}
    private void position(){if(closed||page==null)return;try{call(page,"n1",callback(x->{if(x!=null){emit("location",x.toString());try{int[] numbers=(int[])call(page,"getCurrentPageNumbers");int total=((Number)call(page,"getPageCountWithoutAdvertisement")).intValue();if(numbers!=null&&numbers.length>0&&total>0){JSONObject count=new JSONObject();count.put("page",numbers[0]);count.put("pages",total);emit("pages",count);}}catch(Exception ignored){}}}));}catch(Exception e){error(e);}}
    private void selection(){
        if(closed||page==null)return;
        try{
            Uri range=(Uri)call(page,"getSelectionRange");
            android.graphics.RectF rect=(android.graphics.RectF)call(page,"getSelectionRect");
            if(range==null||rect==null||rect.isEmpty()){selectionEnded();return;}
            hasSelection=true;int revision=++selectionRevision;
            String cfi=range.toString().replaceFirst("^#","");
            if(!cfi.equals(activeSelectionCfi)){activeSelectionCfi=cfi;annotate(annotations);}
            JSONArray bounds=new JSONArray(new float[]{rect.left,rect.top,rect.right,rect.bottom});
            call(page,"p1",range,callback(text->{try{
                if(revision!=selectionRevision||!hasSelection)return;
                JSONObject value=new JSONObject();value.put("cfi",range.toString().replaceFirst("^#",""));value.put("text",String.valueOf(text));value.put("rect",bounds);emit("selection",value);
            }catch(Exception e){error(e);}}));
        }catch(Exception e){error(e);}
    }
    private void selectionEnded(){if(activeSelectionCfi!=null){activeSelectionCfi=null;if(!closed)try{annotate(annotations);}catch(Exception e){error(e);}}hasSelection=false;++selectionRevision;selectionBar.setEmpty();emit("selection",JSONObject.NULL);}
    void clearSelection()throws Exception{selectionEnded();if(page!=null)call(page,"q0");}
    void annotate(JSONArray notes)throws Exception{
        annotations=notes;ArrayList<Object> marks=new ArrayList<>();Set<String> next=new HashSet<>();
        Map<String,String> styles=new HashMap<>();
        JSONObject colors=preferences.optJSONObject("highlightColors");
        for(int i=0;i<notes.length();i++){
            JSONObject n=notes.getJSONObject(i);if(!n.optString("type").equals("highlight"))continue;
            String id=n.getString("id"),color=n.getString("color");
            if(colors!=null)color=colors.optString(color,color);
            next.add(id);
            styles.put(id,n.getString("cfi")+":"+color);
            marks.add(cls("a1.G").getConstructor(String.class,String.class,String.class,int.class).newInstance(id,n.getString("cfi").replaceFirst("^#",""),"normal",Color.parseColor(color)));
        }
        if(activeSelectionCfi!=null){
            String id="__polyreader_selection__",color=preferences.getJSONObject("selection").getString("background");
            next.add(id);styles.put(id,activeSelectionCfi+":"+color);
            marks.add(cls("a1.G").getConstructor(String.class,String.class,String.class,int.class).newInstance(id,activeSelectionCfi,"normal",Color.parseColor(color)));
        }
        // The app's legacy text-index helper needs extra account-era initialization.
        // Feed standard EPUB CFI markers to MARS directly using the SDK's own mapper.
        Method map=page.getClass().getDeclaredMethod("i0",List.class);map.setAccessible(true);
        Object nativeMarks=map.invoke(page,marks);
        android.view.ViewGroup view=(android.view.ViewGroup)page;
        for(int i=0;i<view.getChildCount();i++){View child=view.getChildAt(i);if(cls("jp.bpsinc.android.mars.core.w").isInstance(child)){for(String id:highlightIds)if(!next.contains(id)||!Objects.equals(highlightStyles.get(id),styles.get(id)))call(child,"C1",id);call(child,"setMarkers",nativeMarks);highlightIds.clear();highlightIds.addAll(next);highlightStyles.clear();highlightStyles.putAll(styles);break;}}

    }
    private void emit(String kind,Object value){if(closed)return;try{JSONObject o=new JSONObject();o.put("token",token);o.put("kind",kind);o.put("value",value);host.event("bookwalker",o);}catch(Exception e){error(e);}}
    private void error(Throwable e){while(e.getCause()!=null)e=e.getCause();android.util.Log.e("BookWalkerReader",e.toString(),e);emit("error",e.toString());}
    void setChrome(boolean visible,JSONArray bounds){menus=visible;chromeBounds.clear();if(bounds!=null)for(int i=0;i<bounds.length();i++){JSONArray r=bounds.optJSONArray(i);if(r!=null)chromeBounds.add(new android.graphics.RectF((float)r.optDouble(0),(float)r.optDouble(1),(float)r.optDouble(2),(float)r.optDouble(3)));}}
    void setModal(boolean value){modal=value;}
    void setSelectionBar(JSONArray bounds){if(bounds==null){selectionBar.setEmpty();return;}selectionBar.set((float)bounds.optDouble(0),(float)bounds.optDouble(1),(float)bounds.optDouble(2),(float)bounds.optDouble(3));}
    void setMenus(boolean visible){menus=visible;emit("chrome",visible);}
    private boolean inChrome(float x,float y){if(!menus)return false;for(android.graphics.RectF r:chromeBounds)if(r.contains(x,y))return true;return false;}
    boolean route(MotionEvent e){
        if(e.getActionMasked()==MotionEvent.ACTION_DOWN){
            routeGesture=!closed&&!modal&&page!=null&&!selectionBar.contains(e.getX(),e.getY())&&!inChrome(e.getX(),e.getY());
            selectionTap=hasSelection;touchX=e.getX();touchY=e.getY();touchTime=e.getEventTime();
        }
        if(!routeGesture||closed||page==null)return false;
        if(e.getActionMasked()==MotionEvent.ACTION_UP&&selectionTap&&hasSelection&&e.getEventTime()-touchTime<350&&Math.hypot(e.getX()-touchX,e.getY()-touchY)<ViewConfiguration.get(host).getScaledTouchSlop()){
            MotionEvent cancel=MotionEvent.obtain(e);cancel.setAction(MotionEvent.ACTION_CANCEL);((View)page).dispatchTouchEvent(cancel);cancel.recycle();
            try{clearSelection();}catch(Exception ex){error(ex);}return true;
        }
        ((View)page).dispatchTouchEvent(e);return true;
    }
    void close(){closed=true;ui.removeCallbacksAndMessages(null);if(page!=null){try{call(page,"n0");}catch(Exception ignored){}root.removeView((View)page);page=null;}}
}
