package dev.polyreader.app;

import android.content.Context;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/** OpenAI-compatible streaming transport. The WebView never receives stored keys. */
final class AiService {
    interface Events{void emit(JSONObject event);}
    private final AiConfigStore store;
    private final Events events;
    private final ExecutorService workers=Executors.newFixedThreadPool(3);
    private final ScheduledExecutorService timer=Executors.newSingleThreadScheduledExecutor();
    private final ConcurrentHashMap<String,Job> jobs=new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String,Long> cooldown=new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String,Integer> failures=new ConcurrentHashMap<>();
    private static final class Job{volatile boolean cancelled,timedOut;volatile HttpURLConnection connection;void cancel(){cancelled=true;if(connection!=null)connection.disconnect();}}
    AiService(Context context,Events events){store=new AiConfigStore(context);this.events=events;}
    void handle(JSONObject input){
        String id=input.optString("id"),action=input.optString("action");
        if(action.equals("aiCancel")){Job job=jobs.get(id);if(job!=null)job.cancel();return;}
        if(id.isEmpty())return;
        if(jobs.size()>=6){emit(id,"error","code","busy");return;}
        Job job=new Job();if(jobs.putIfAbsent(id,job)!=null)return;
        workers.execute(()->{try{
            switch(action){
                case "aiConfig": emit(id,"config","providers",store.publicConfig());break;
                case "aiSaveConfig":store.save(input.getJSONArray("providers"));cooldown.clear();failures.clear();emit(id,"config","providers",store.publicConfig());break;
                case "aiModels":models(id,input,job);break;
                case "aiChat":chat(id,input,job);break;
            }
        }catch(Exception e){if(!job.cancelled)emit(id,"error","code",e instanceof IllegalArgumentException?"invalid_config":"connection");}
        finally{if(job.connection!=null)job.connection.disconnect();jobs.remove(id,job);}});
    }
    private void emit(String id,String type,Object... fields){try{JSONObject e=new JSONObject().put("id",id).put("type",type);for(int i=0;i<fields.length;i+=2)e.put((String)fields[i],fields[i+1]);events.emit(e);}catch(JSONException ignored){}}
    private HttpURLConnection connect(JSONObject p,String path,Job job)throws Exception{
        if(job.cancelled)throw new InterruptedIOException();
        HttpURLConnection c=(HttpURLConnection)new URL(AiConfigStore.base(p.getString("base"))+path).openConnection();job.connection=c;
        c.setInstanceFollowRedirects(false);c.setConnectTimeout(12000);c.setReadTimeout(p.optInt("timeout",40)*1000);
        c.setRequestProperty("Authorization","Bearer "+p.getString("key"));c.setRequestProperty("Accept","text/event-stream, application/json");
        return c;
    }
    private void models(String id,JSONObject input,Job job)throws Exception{
        JSONObject p=new JSONObject(input.getJSONObject("provider").toString());
        if(p.optString("key").isEmpty()){JSONArray all=store.read();for(int i=0;i<all.length();i++)if(all.getJSONObject(i).optString("id").equals(p.optString("id"))&&all.getJSONObject(i).optString("base").equals(p.optString("base")))p.put("key",all.getJSONObject(i).optString("key"));}
        HttpURLConnection c=connect(p,"/models",job);int status=c.getResponseCode();if(status!=200){emit(id,"error","code","http","status",status);return;}
        String body=readLimited(c.getInputStream(),2*1024*1024);JSONArray data=new JSONObject(body).optJSONArray("data"),names=new JSONArray();
        if(data!=null)for(int i=0;i<data.length();i++)names.put(data.getJSONObject(i).optString("id"));emit(id,"models","models",names);
    }
    private void chat(String id,JSONObject input,Job job)throws Exception{
        JSONArray messages=input.getJSONArray("messages");if(messages.length()>64||messages.toString().length()>160000)throw new IllegalArgumentException("messages");
        for(int i=0;i<messages.length();i++){String role=messages.getJSONObject(i).optString("role");if(!Arrays.asList("system","user","assistant","tool").contains(role))throw new IllegalArgumentException("role");}
        JSONArray all=store.read();List<JSONObject> providers=new ArrayList<>();
        String only=input.optString("providerId");
        for(int i=0;i<all.length();i++){JSONObject p=all.getJSONObject(i);if(p.optBoolean("enabled",true)&&(only.isEmpty()||only.equals(p.optString("id"))))providers.add(p);}
        if(providers.isEmpty()){emit(id,"error","code","no_provider");return;}
        long now=System.currentTimeMillis();boolean available=providers.stream().anyMatch(p->cooldown.getOrDefault(p.optString("id"),0L)<=now);
        int attempt=0;
        for(JSONObject p:providers){
            if(job.cancelled)return;String pid=p.optString("id");if(available&&cooldown.getOrDefault(pid,0L)>now)continue;
            emit(id,"attempt","provider",p.optString("name"),"model",p.optString("model"),"attempt",++attempt);
            job.timedOut=false;long started=System.nanoTime();
            ScheduledFuture<?> deadline=timer.schedule(()->{job.timedOut=true;if(job.connection!=null)job.connection.disconnect();},Math.max(90,p.optInt("timeout",40)*3),TimeUnit.SECONDS);
            try{
                JSONObject body=new JSONObject(p.optJSONObject("params")==null?"{}":p.getJSONObject("params").toString());
                if(!body.has("max_tokens")&&!body.has("max_completion_tokens"))body.put("max_tokens",4096);
                if(!body.has("stream_options"))body.put("stream_options",new JSONObject().put("include_usage",true));
                body.put("model",p.getString("model")).put("messages",messages).put("stream",true);
                if(input.optJSONArray("tools")!=null){body.put("tools",input.getJSONArray("tools"));body.put("tool_choice",input.optString("toolChoice","auto"));}
                HttpURLConnection c=connect(p,"/chat/completions",job);c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json; charset=utf-8");
                byte[] bytes=body.toString().getBytes(StandardCharsets.UTF_8);c.setFixedLengthStreamingMode(bytes.length);try(OutputStream out=c.getOutputStream()){out.write(bytes);}
                int status=c.getResponseCode();if(status!=200)throw new HttpFailure(status);
                Stream stream=new Stream(id,job);
                if(c.getContentType()!=null&&c.getContentType().contains("application/json"))stream.json(new JSONObject(readLimited(c.getInputStream(),1024*1024)),false);
                else try(BufferedReader reader=new BufferedReader(new InputStreamReader(c.getInputStream(),StandardCharsets.UTF_8))){
                    String line;StringBuilder data=new StringBuilder();
                    while(!job.cancelled&&!job.timedOut&&(line=reader.readLine())!=null){
                        if(line.isEmpty()){if(data.length()>0){if(stream.event(data.toString()))break;data.setLength(0);}}
                        else if(line.startsWith("data:")){if(data.length()>0)data.append('\n');data.append(line.substring(5).trim());if(data.length()>1024*1024)throw new IOException();}
                    }
                    if(data.length()>0)stream.event(data.toString());
                }
                if(job.cancelled)return;if(job.timedOut||!stream.finished||(stream.answer.length()==0&&stream.tools.length()==0))throw new IOException();
                stream.validateTools();stream.flush();failures.remove(pid);cooldown.remove(pid);
                emit(id,"done","usage",stream.usage,"finishReason",stream.finishReason,"seconds",(System.nanoTime()-started)/1e9,"toolCalls",stream.tools,"reasoning",stream.reasoning.toString());return;
            }catch(Exception e){
                if(job.cancelled)return;int count=failures.merge(pid,1,Integer::sum);if(count>=2)cooldown.put(pid,System.currentTimeMillis()+120000);
                emit(id,"failed","code",job.timedOut||e instanceof SocketTimeoutException?"timeout":e instanceof HttpFailure?"http":"connection","status",e instanceof HttpFailure?((HttpFailure)e).status:0);
            }finally{deadline.cancel(false);if(job.connection!=null)job.connection.disconnect();job.connection=null;}
        }
        if(!job.cancelled)emit(id,"error","code","all_failed");
    }
    private final class Stream{
        final String id;final Job job;final StringBuilder answer=new StringBuilder(),pending=new StringBuilder(),reasoning=new StringBuilder();final JSONArray tools=new JSONArray();long last;int reasoningChars;boolean finished;String finishReason="stop";JSONObject usage=new JSONObject();
        Stream(String id,Job job){this.id=id;this.job=job;}
        boolean event(String data)throws Exception{if(data.equals("[DONE]")){finished=true;return true;}json(new JSONObject(data),true);return false;}
        void json(JSONObject data,boolean streaming)throws Exception{
            if(data.has("error"))throw new IOException();if(data.optJSONObject("usage")!=null)usage=data.getJSONObject("usage");
            JSONArray choices=data.optJSONArray("choices");if(choices==null||choices.length()==0)return;
            JSONObject choice=choices.getJSONObject(0),delta=choice.optJSONObject(streaming?"delta":"message");
            if(delta!=null){String content=text(delta.opt("content"));if(content.isEmpty())content=text(delta.opt("refusal"));answer.append(content);pending.append(content);
                String thought=text(delta.opt("reasoning_content"))+text(delta.opt("reasoning"));reasoning.append(thought);reasoningChars+=thought.length();if(answer.length()>100000||reasoning.length()>100000)throw new IOException();
                JSONArray calls=delta.optJSONArray("tool_calls");if(calls!=null)for(int i=0;i<calls.length();i++){
                    JSONObject part=calls.getJSONObject(i);int index=part.optInt("index",i);if(index<0||index>3)throw new IOException();
                    JSONObject tool=tools.optJSONObject(index);if(tool==null){tool=new JSONObject().put("id","").put("type","function").put("function",new JSONObject().put("name","").put("arguments",""));tools.put(index,tool);}
                    if(part.has("id"))tool.put("id",part.getString("id"));JSONObject fn=part.optJSONObject("function"),target=tool.getJSONObject("function");
                    if(fn!=null){for(String field:new String[]{"name","arguments"})target.put(field,target.optString(field)+fn.optString(field));if(target.optString("arguments").length()>16000)throw new IOException();}
                }
                if(System.nanoTime()-last>60_000_000)flush();}
            if(!choice.isNull("finish_reason")){finished=true;finishReason=choice.optString("finish_reason","stop");}
            if(!streaming)finished=true;
        }
        void flush(){if(!job.cancelled)emit(id,"delta","text",pending.toString(),"thinking",answer.length()==0&&reasoningChars>0,"usage",usage);pending.setLength(0);last=System.nanoTime();}
        void validateTools()throws Exception{
            Set<String> ids=new HashSet<>();
            for(int i=0;i<tools.length();i++){
                JSONObject call=tools.optJSONObject(i);if(call==null)throw new IOException();
                String callId=call.optString("id");JSONObject fn=call.getJSONObject("function");
                if(callId.isEmpty()||!ids.add(callId)||fn.optString("name").isEmpty())throw new IOException();
                new JSONObject(fn.optString("arguments","{}"));
            }
        }
    }
    private static String text(Object value){if(value instanceof String)return (String)value;if(value instanceof JSONArray){StringBuilder s=new StringBuilder();JSONArray a=(JSONArray)value;for(int i=0;i<a.length();i++){JSONObject p=a.optJSONObject(i);if(p!=null)s.append(p.optString("text"));}return s.toString();}return "";}
    private static String readLimited(InputStream in,int max)throws IOException{try(InputStream source=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buf=new byte[8192];int n;while((n=source.read(buf))!=-1){if(out.size()+n>max)throw new IOException();out.write(buf,0,n);}return out.toString("UTF-8");}}
    private static final class HttpFailure extends IOException{final int status;HttpFailure(int status){this.status=status;}}
    void close(){for(Job job:jobs.values())job.cancel();workers.shutdownNow();timer.shutdownNow();}
}
