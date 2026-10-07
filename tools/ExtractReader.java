import org.jf.dexlib2.*;
import org.jf.dexlib2.iface.*;
import org.jf.dexlib2.iface.instruction.*;
import org.jf.dexlib2.iface.reference.*;
import org.jf.dexlib2.immutable.ImmutableDexFile;
import org.jf.dexlib2.writer.pool.DexPool;
import java.io.*;
import java.util.*;

/** Retain the original reader bytecode and its actual type dependencies, without the vendor Application. */
class ExtractReader {
 static Map<String,ClassDef> all=new HashMap<>();static Set<String> keep=new TreeSet<>();static ArrayDeque<String> todo=new ArrayDeque<>();
 static void type(String t){if(t==null)return;while(t.startsWith("["))t=t.substring(1);if(all.containsKey(t)&&keep.add(t))todo.add(t);}
 static void ref(Reference r){
  if(r instanceof TypeReference t)type(t.getType());
  if(r instanceof FieldReference f){type(f.getDefiningClass());type(f.getType());}
  if(r instanceof MethodReference m){type(m.getDefiningClass());type(m.getReturnType());for(CharSequence t:m.getParameterTypes())type(t.toString());}
  if(r instanceof MethodProtoReference m){type(m.getReturnType());for(CharSequence t:m.getParameterTypes())type(t.toString());}
 }
 public static void main(String[]args)throws Exception{
  var container=DexFileFactory.loadDexContainer(new File(args[0]),Opcodes.forApi(29));
  for(String n:container.getDexEntryNames())for(ClassDef c:container.getEntry(n).getDexFile().getClasses())all.put(c.getType(),c);
  for(String t:all.keySet())if(t.startsWith("Lcom/access_company/")||t.startsWith("Ljp/bpsinc/")||t.matches("L(a1|b1|m6|n6|o6|p6)/.*"))type(t);
  while(!todo.isEmpty()){
   ClassDef c=all.get(todo.remove());type(c.getSuperclass());for(String t:c.getInterfaces())type(t);
   for(Field f:c.getFields())type(f.getType());
   for(Method m:c.getMethods()){
    type(m.getReturnType());for(CharSequence t:m.getParameterTypes())type(t.toString());
    var impl=m.getImplementation();if(impl==null)continue;
    for(var b:impl.getTryBlocks())for(var h:b.getExceptionHandlers())type(h.getExceptionType());
    for(Instruction i:impl.getInstructions()){if(i instanceof ReferenceInstruction r)ref(r.getReference());if(i instanceof DualReferenceInstruction r)ref(r.getReference2());}
   }
  }
  List<ClassDef> chosen=new ArrayList<>();for(String t:keep)chosen.add(all.get(t));
  DexPool.writeTo(args[1],new ImmutableDexFile(Opcodes.forApi(29),chosen));
  System.out.println("Reader classes: "+chosen.size()+" / "+all.size());
  try(var out=new PrintWriter(args[1]+".classes.txt")){keep.forEach(out::println);}
 }
}
