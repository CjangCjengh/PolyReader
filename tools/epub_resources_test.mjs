import assert from 'node:assert/strict';
import {resourceIndex} from '../app/src/main/assets/app/epub-resources.js';

const index=resourceIndex([
 {name:'OEBPS/Fonts/Heading.TTF',size:123},
 {name:'OEBPS/Fonts/Body.ttf',size:456},
 {name:'OEBPS/Fonts/BODY.TTF',size:789},
 {name:'OEBPS/Images/Café.PNG',size:15},
 {name:'OEBPS/Styles/Main.CSS',size:20},
]);
assert.equal(index.resolve('OEBPS/Fonts/Heading.TTF'),'OEBPS/Fonts/Heading.TTF');
assert.equal(index.resolve('oebps/fonts/heading.ttf'),'OEBPS/Fonts/Heading.TTF');
assert.equal(index.size('OEBPS/fonts/heading.ttf'),123);
assert.equal(index.resolve('OEBPS/Fonts/Body.ttf'),'OEBPS/Fonts/Body.ttf');
assert.equal(index.size('OEBPS/Fonts/BODY.TTF'),789);
assert.equal(index.resolve('OEBPS/Fonts/body.ttf'),null);
assert.equal(index.size('OEBPS/Fonts/body.ttf'),0);
assert.equal(index.resolve('OEBPS/images/CAFÉ.png'),'OEBPS/Images/Café.PNG');
assert.equal(index.resolve('OEBPS/styles/main.css'),'OEBPS/Styles/Main.CSS');
assert.equal(index.resolve('OEBPS/Fonts/Missing.ttf'),null);
assert.equal(index.resolve('Heading.TTF'),null);
assert.equal(index.resolve('https://example.org/Heading.TTF'),null);
console.log('PASS exact resource paths, unique casing fallback, size lookup, ambiguous names, Unicode and missing files');
