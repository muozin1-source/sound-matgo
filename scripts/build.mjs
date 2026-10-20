import { stripTypeScriptTypes } from 'node:module';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
async function visit(relative=''){
  for(const entry of await readdir(path.join(root,'vendor/engine',relative),{withFileTypes:true})){
    const name=path.join(relative,entry.name);
    if(entry.isDirectory()){await visit(name);continue;}
    if(!name.endsWith('.ts'))continue;
    const source=await readFile(path.join(root,'vendor/engine',name),'utf8');
    let js=stripTypeScriptTypes(source,{mode:'transform'});
    js=js.replace(/(\bfrom\s*['"])(\.[^'"]+)(['"])/g,(_,a,b,c)=>a+(b.endsWith('.js')?b:b+'.js')+c);
    js='/* Derived from itsent-lab/hwatu, Copyright (c) 2026 NSJ. MIT: licenses/Hwatu-MIT.txt */\n'+js;
    const dest=path.join(root,'engine',name.replace(/\.ts$/,'.js'));
    await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,js);
  }
}
await visit();console.log('Browser-ready engine generated. No npm install needed.');
