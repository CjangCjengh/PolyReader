package dev.polyreader.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;

/** Bounded, cancellable transport for dictionary adapters. No browser cookies or API keys. */
final class DictionaryService {
    private final AiService.Events events;
    private final ConnectivityManager connectivity;
    private final ExecutorService workers=Executors.newFixedThreadPool(4);
    private final ScheduledExecutorService timer=Executors.newSingleThreadScheduledExecutor();
    private final ConcurrentHashMap<String,Job> jobs=new ConcurrentHashMap<>();
    private static final class Job {
        volatile boolean cancelled, timedOut;
        volatile HttpURLConnection connection;
        void cancel(){cancelled=true;if(connection!=null)connection.disconnect();}
    }
    DictionaryService(Context context,AiService.Events events){this.events=events;connectivity=(ConnectivityManager)context.getSystemService(Context.CONNECTIVITY_SERVICE);}
    private URI publicUri(String value)throws Exception {
        URI uri=new URI(value);
        if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getPort()>0&&uri.getPort()!=443)
            throw new IllegalArgumentException();
        String host=uri.getHost();
        if(host.equalsIgnoreCase("localhost")||host.toLowerCase(java.util.Locale.ROOT).endsWith(".local")||host.indexOf('.')<0&&host.indexOf(':')<0)throw new IllegalArgumentException();
        NetworkCapabilities network=connectivity.getNetworkCapabilities(connectivity.getActiveNetwork());
        // VPN DNS may map public hostnames into its private tunnel address range.
        // Literal private addresses remain invalid, including after redirects.
        boolean tunneled=network!=null&&network.hasTransport(NetworkCapabilities.TRANSPORT_VPN)&&!host.matches("[0-9.]+")&&host.indexOf(':')<0;
        for(InetAddress address:InetAddress.getAllByName(host)){
            if(address.isAnyLocalAddress()||address.isLoopbackAddress()||address.isLinkLocalAddress()||address.isMulticastAddress())throw new IllegalArgumentException();
            if(!tunneled&&(address.isSiteLocalAddress()||address instanceof Inet6Address&&(address.getAddress()[0]&0xfe)==0xfc))throw new IllegalArgumentException();
        }
        return uri;
    }
    void handle(JSONObject input){
        String id=input.optString("id");
        if("dictionaryCancel".equals(input.optString("action"))){Job job=jobs.get(id);if(job!=null)job.cancel();return;}
        if(id.isEmpty())return;
        if(jobs.size()>=8){emit(id,0,"busy","","");return;}
        Job job=new Job();if(jobs.putIfAbsent(id,job)!=null)return;
        int timeout=Math.max(500,Math.min(12000,input.optInt("timeout",7000)));
        ScheduledFuture<?> deadline=timer.schedule(()->{job.timedOut=true;if(job.connection!=null)job.connection.disconnect();},timeout,TimeUnit.MILLISECONDS);
        workers.execute(()->{
            String url=input.optString("url");
            try{
                if(url.length()>4096)throw new IllegalArgumentException();
                String method=input.optString("method","GET"),body=input.optString("body");
                if(!method.equals("GET")&&!method.equals("POST")||body.length()>4096)throw new IllegalArgumentException();
                for(int redirects=0;redirects<=3;redirects++){
                    if(job.cancelled||job.timedOut)throw new InterruptedIOException();
                    URI uri=publicUri(url);
                    HttpURLConnection c=(HttpURLConnection)uri.toURL().openConnection();job.connection=c;
                    c.setInstanceFollowRedirects(false);c.setConnectTimeout(timeout);c.setReadTimeout(timeout);
                    c.setRequestProperty("User-Agent","PolyReader/"+BuildConfig.VERSION_NAME+" (dictionary lookup)");
                    c.setRequestProperty("Accept","application/json, text/html;q=0.9, text/plain;q=0.8");
                    c.setRequestProperty("Referer","https://"+uri.getHost()+"/");
                    c.setRequestMethod(method);
                    if(method.equals("POST")){
                        c.setDoOutput(true);c.setRequestProperty("Content-Type","application/x-www-form-urlencoded; charset=utf-8");
                        byte[] bytes=body.getBytes(StandardCharsets.UTF_8);c.setFixedLengthStreamingMode(bytes.length);
                        try(OutputStream out=c.getOutputStream()){out.write(bytes);}
                    }
                    int status=c.getResponseCode();
                    if(status>=300&&status<400){
                        String location=c.getHeaderField("Location");if(location==null||redirects==3)throw new IOException();
                        url=uri.resolve(location).toString();method="GET";body="";c.disconnect();continue;
                    }
                    if(status!=200){emit(id,status,status==404?"not_found":status==403||status==429?"blocked":"unavailable","",url);return;}
                    String content;
                    try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
                        byte[] bytes=new byte[8192];int n;
                        while((n=in.read(bytes))!=-1){if(job.cancelled||job.timedOut)throw new InterruptedIOException();if(out.size()+n>1536*1024)throw new IOException();out.write(bytes,0,n);}
                        content=out.toString("UTF-8");
                    }
                    if(!job.cancelled)emit(id,status,job.timedOut?"timeout":"",job.timedOut?"":content,url);return;
                }
            }catch(Exception e){if(!job.cancelled)emit(id,0,job.timedOut||e instanceof SocketTimeoutException?"timeout":e instanceof IllegalArgumentException?"invalid_config":"unavailable","","");}
            finally{deadline.cancel(false);if(job.connection!=null)job.connection.disconnect();jobs.remove(id,job);}
        });
    }
    private void emit(String id,int status,String error,String body,String url){
        try{events.emit(new JSONObject().put("id",id).put("type","done").put("status",status).put("error",error).put("body",body).put("url",url));}catch(JSONException ignored){}
    }
    void close(){for(Job job:jobs.values())job.cancel();workers.shutdownNow();timer.shutdownNow();}
}
