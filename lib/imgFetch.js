// copy images from CMS to file system
import { Worker } from 'node:worker_threads';
import { mkdir, appendFile, readFile, writeFile, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { env } from './util.js';

const
  mediaDir = env('MEDIA_BUILD_DIR', './build.media/'),
  mediaMap = join( mediaDir, env('MEDIA_BUILD_MAP', 'images.json') ),
  mediaLoadMax = env('MEDIA_LOAD_MAX', 10),
  mediaTimeout = env('MEDIA_TIMEOUT', 10) * 1000,
  mediaNotExist = env('MEDIA_FAIL_IMG', 'media/favicon/favicon512.png'),
  mediaSymlink = env('MEDIA_SYMLINK', 'false').toLowerCase() === 'true';

let imgMap;

export const mediaImgDir = join( mediaDir, env('MEDIA_BUILD_SUB', 'images'), '/' );


// fetch all images
export async function imgFetch( imgSet ) {

  // load image map
  await imgMapLoad();
  if (!imgMap) return false;

  try {

    // process new images
    const newMap = await processImages( imgSet );

    // merge and save
    if (newMap) {
      imgMap = new Map([ ...imgMap, ...newMap ]);
      await imgMapSave();
    }

  }
  catch (e) {
    console.error(`IMAGE ERROR: ${ e }`);
    return false;
  }

  // successfully processed
  return true;

}


// process images in a worker thread, updates imgMap
function processImages( imgSet ) {

  // set of new images
  const imgNew = imgSet.difference( new Set( imgMap.keys() ) );

  return new Promise((resolve, reject) => {

    if (!imgNew.size) {
      resolve( null );
      return;
    }

    console.log(`Processing ${ imgNew.size } new images...`);

    let ret = null;
    const worker = new Worker('./lib/worker-images.js', { workerData: { imgNew, mediaImg: mediaImgDir, mediaLoadMax, mediaTimeout, imgCount: imgMap.size } });

    // processing timeout
    let timeout = setTimeout(() => {
      console.error('Terminating image worker (timeout)');
      timeout = null;
      worker.terminate();
    }, mediaTimeout * imgSet.size);

    worker.on('message', result => {
      ret = result;
    });

    worker.on('error', e => {
      console.error('worker error:', e);
    });

    worker.on('exit', () => {
      timeout && clearTimeout(timeout);
      if (ret) resolve( ret );
      else reject( null );
    });

  });

}


// load image map
async function imgMapLoad() {

  // create image map files
  try {
    await mkdir(mediaImgDir, { recursive: true });
    await appendFile(mediaMap, '');
  }
  catch {
    console.log(`Cannot access static image data: ${ mediaMap }`);
    return false;
  }

  // open and parse image map file
  try {

    const mapJSON = await readFile(mediaMap, 'utf8');
    imgMap = new Map( JSON.parse(mapJSON) );

  }
  catch {
    imgMap = new Map();
  }

  return true;

}


// save image map
async function imgMapSave() {

  // convert to array
  const imgData = Array.from(imgMap, ([url, data]) => [url, data]);

  try {
    await writeFile(mediaMap, JSON.stringify( imgData ), 'utf8');
  }
  catch {
    console.log(`Cannot write static image data: ${ mediaMap }`);
    return false;
  }

  return true;

}


// symlink files
export function symlinkMedia(buildDir, mediaDir) {

  if (!mediaSymlink) return false;

  return () => {

    setTimeout(async () => {

      try {
        await symlink( resolve(mediaImgDir), resolve(buildDir, mediaDir) );
      }
      catch (e) {
        if (e.code !== 'EEXIST') console.log(e);
      }

    }, 500);

  };

}


// image Map lookup
export function imgLookup(url) {

  return imgMap?.get(url) || { i: mediaNotExist };

}
