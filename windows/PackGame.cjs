'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) throw new Error('Usage: node PackGame.cjs <game root> <new output directory>');
const source = fs.realpathSync(sourceArg);
const output = path.resolve(outputArg);
if (fs.existsSync(output)) throw new Error('Packed output directory already exists: ' + output);

const files = new Map();
const text = relative => fs.readFileSync(path.join(source, relative), 'utf8');
const isCode = relative => /\.(?:js|css|html)$/i.test(relative);
const isImage = relative => /\.(?:png|webp|jpe?g|gif)$/i.test(relative);
const digest = buffer => createHash('sha256').update(buffer).digest('hex');

function add(relative) {
  if (files.has(relative)) return;
  const filename = path.resolve(source, relative);
  if (!filename.startsWith(source + path.sep) || fs.realpathSync(filename) !== filename ||
      !fs.statSync(filename).isFile()) {
    throw new Error('Unexpected game resource: ' + relative);
  }
  files.set(relative, filename);
}

const globals = { CHARACTER_ASSETS: {} };
globals.window = globals;
vm.createContext(globals);
vm.runInContext(text('skins.js'), globals, { filename: 'skins.js' });
vm.runInContext(text('stages.js'), globals, { filename: 'stages.js' });
const skinIds = new Set(globals.FIGHTER_SKINS.map(skin => skin.id));
for (const skin of globals.FIGHTER_SKINS) {
  for (const file of [skin.preview, skin.assetFile, skin.selectionPreview?.src]) if (file) add(file);
}
for (const [id, stage] of Object.entries(globals.ARENA_STAGES)) {
  if (!id.startsWith('campaign-') && !skinIds.has(id)) continue;
  const extensions = stage.wings && (stage.extensionSrc || 'assets/stages/' + stage.id + '-extensions.png');
  for (const file of [stage.src, stage.fallbackSrc, stage.groundBand?.src, extensions]) if (file) add(file);
}

const monsters = require(path.join(source, 'monsters.js')).types;
for (const monster of Object.values(monsters)) {
  if (monster.image) add(monster.image);
  for (const frame of Object.values(monster.frames || {})) if (frame.image) add(frame.image);
}
for (const name of ['echo', 'fist']) add('assets/monsters/morris/' + name + '.webp');
for (const icon of fs.readdirSync(path.join(source, 'assets/menu-hub/icons'))) {
  if (/\.(?:svg|txt)$/.test(icon)) add('assets/menu-hub/icons/' + icon);
}
add('vendor/THREE-LICENSE.txt');
add('index.html');
for (const [, relative] of text('index.html').matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) add(relative);

// Map iteration also visits assets added by a referenced script.
for (const [relative, filename] of files) {
  if (!isCode(relative) || relative === 'stages.js' || relative.startsWith('vendor/')) continue;
  const contents = fs.readFileSync(filename, 'utf8');
  for (const [, asset] of contents.matchAll(/["'](assets\/[\w./+-]+\.(?:js|css|png|webp|jpe?g|gif|svg|ttf|woff2))["']/gi)) {
    add(asset);
  }
}

function write(relative, contents) {
  const target = path.join(output, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, { flag: 'wx' });
}
const imagePaths = new Map();
for (const [relative, filename] of files) {
  if (isImage(relative)) imagePaths.set(digest(fs.readFileSync(filename)), relative);
}

let references = 0;
let extraImages = 0;
const mimeExtensions = { png: 'png', webp: 'webp', jpeg: 'jpg', gif: 'gif' };
for (const [relative, filename] of files) {
  const contents = fs.readFileSync(filename);
  if (!relative.startsWith('assets/') || !relative.endsWith('.js')) {
    write(relative, contents);
    continue;
  }
  // The Windows launcher serves these unchanged image bytes from the same local origin.
  const linked = contents.toString('utf8').replace(/data:image\/([\w+.-]+);base64,([a-z0-9+/=]+)/gi, (_, format, data) => {
    const image = Buffer.from(data, 'base64');
    const hash = digest(image);
    if (!imagePaths.has(hash)) {
      const extension = mimeExtensions[format.toLowerCase()];
      if (!extension) throw new Error('Unknown embedded image format: ' + format);
      const asset = 'assets/packed/' + hash + '.' + extension;
      write(asset, image);
      imagePaths.set(hash, asset);
      extraImages++;
    }
    references++;
    return imagePaths.get(hash);
  });
  write(relative, linked);
}

console.log('Packed ' + files.size + ' runtime files and linked ' + references +
  ' embedded images (' + extraImages + ' separate files).');
