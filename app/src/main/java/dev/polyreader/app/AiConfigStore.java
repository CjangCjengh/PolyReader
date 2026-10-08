package dev.polyreader.app;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import org.json.*;
import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;

/** API credentials stay in app-private storage, encrypted with Android Keystore. */
final class AiConfigStore {
    private final AtomicFile file;
    private static final String ALIAS="polyreader.api.config";
    AiConfigStore(Context context){file=new AtomicFile(new File(context.getFilesDir(),"assistant-api.enc"));}
    private javax.crypto.SecretKey key()throws Exception{
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(store.containsAlias(ALIAS))return (javax.crypto.SecretKey)store.getKey(ALIAS,null);
        KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    synchronized JSONArray read()throws Exception{
        if(!file.getBaseFile().exists())return new JSONArray();
        try(DataInputStream in=new DataInputStream(file.openRead())){
            int length=in.readUnsignedByte();if(length!=12)throw new IOException("config");
            byte[] iv=new byte[length];in.readFully(iv);
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,iv));
            ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buffer=new byte[4096];int count;
            while((count=in.read(buffer))!=-1)bytes.write(buffer,0,count);
            return new JSONArray(new String(cipher.doFinal(bytes.toByteArray()),StandardCharsets.UTF_8));
        }
    }
    synchronized JSONArray publicConfig()throws Exception{
        JSONArray result=read();for(int i=0;i<result.length();i++){JSONObject p=result.getJSONObject(i);p.put("hasKey",!p.optString("key").isEmpty());p.remove("key");}return result;
    }
    static String base(String value)throws Exception{
        String normalized=value.trim().replaceAll("/+$","");URI u=new URI(normalized);
        if(!"https".equalsIgnoreCase(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null||u.getQuery()!=null||u.getFragment()!=null)throw new IllegalArgumentException("base");
        return normalized;
    }
    synchronized void save(JSONArray input)throws Exception{
        if(input.length()>20)throw new IllegalArgumentException("providers");
        JSONArray old=read(),result=new JSONArray();Set<String> ids=new HashSet<>();
        for(int i=0;i<input.length();i++){
            JSONObject p=new JSONObject(input.getJSONObject(i).toString());String id=p.optString("id");
            if(!id.matches("[A-Za-z0-9_-]{1,80}")||!ids.add(id))throw new IllegalArgumentException("id");
            p.put("base",base(p.optString("base")));String secret=p.optString("key").trim();
            if(secret.isEmpty())for(int j=0;j<old.length();j++){JSONObject prior=old.getJSONObject(j);if(id.equals(prior.optString("id")))secret=prior.optString("key");}
            if(secret.isEmpty()||secret.length()>4096||secret.contains("\n")||secret.contains("\r")||p.optString("model").trim().isEmpty())throw new IllegalArgumentException("credentials");
            JSONObject params=p.optJSONObject("params");if(params==null)params=new JSONObject();
            for(String forbidden:new String[]{"model","messages","stream","tools","tool_choice","functions","function_call"})if(params.has(forbidden))throw new IllegalArgumentException("params");
            if(params.toString().length()>16000)throw new IllegalArgumentException("params");
            p.put("params",params);p.put("key",secret);p.put("timeout",Math.max(10,Math.min(180,p.optInt("timeout",40))));p.remove("hasKey");result.put(p);
        }
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
        byte[] encrypted=cipher.doFinal(result.toString().getBytes(StandardCharsets.UTF_8));FileOutputStream out=null;
        try{out=file.startWrite();out.write(cipher.getIV().length);out.write(cipher.getIV());out.write(encrypted);file.finishWrite(out);}
        catch(Exception e){if(out!=null)file.failWrite(out);throw e;}
    }
}
