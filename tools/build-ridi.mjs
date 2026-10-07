// npm install --no-save esbuild@0.25.11, then node tools/build-ridi.mjs
import {build} from 'esbuild';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const output=new URL('app/src/main/assets/app/vendor/ridi/reader.js',root);
await build({absWorkingDir:fileURLToPath(root),entryPoints:['vendor-src/ridi/src/android/index.es6'],bundle:true,loader:{'.es6':'js'},resolveExtensions:['.es6','.js'],format:'iife',globalName:'ReaderJS',target:'chrome80',outfile:fileURLToPath(output)});
let text='/*! RIDI Reader.js 1.0.61 | MIT | https://github.com/ridi/Reader.js */\n'+await readFile(output,'utf8');
for(const path of ['android/libs','common/libs'])for(const name of (await readdir(new URL('vendor-src/ridi/src/'+path+'/',root))).filter(x=>x.endsWith('.js')).sort())text+='\n;\n'+await readFile(new URL('vendor-src/ridi/src/'+path+'/'+name,root),'utf8');
await writeFile(output,text);
console.log('Rebuilt RIDI from the vendored, unmodified official source.');
