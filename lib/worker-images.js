// process new images
import { workerData, parentPort } from 'node:worker_threads';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { imageMeta } from 'image-meta';

// passed data
const
  imgNew = workerData.imgNew,
  mediaImg = workerData.mediaImg,
  mediaLoadMax = workerData.mediaLoadMax,
  mediaTimeout = workerData.mediaTimeout;

let imgCount = workerData.imgCount || 0;


// process images in parallel, maximum of mediaLoadMax at a time
const
  img = chunk([...imgNew], mediaLoadMax),
  pImg = new Map();

for (let c = 0; c < img.length; c++) {

  (
    await Promise.allSettled(
      img[c].map(i => imgFetch(i, mediaTimeout))
    )
  ).forEach((v, i) => {

    // add image details to Map
    if (v.value && v.status === 'fulfilled') pImg.set( img[c][i], v.value );

  });

}

// pass back
parentPort.postMessage( pImg );


// fetch image
export function imgFetch(url, timeout = 10000) {

  url = url.replaceAll('&amp;', '&');

  const
    controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), timeout),
    opt = {
      method: 'GET',
      headers: {
        'Accept': 'image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br, zstd'
      },
      signal: controller.signal
    };

  const ret = {};

  // return fetch Promise
  return fetch(url, opt)
    .then(res => {

      // get buffer
      return res.arrayBuffer();

    })
    .then(buf => {

      // set return data and write file
      const
        buffer = Buffer.from(buf),
        info = imageMeta(buffer);

      ret.i = `${ imgCount.toString(36) }.${ info?.type || 'jpg' }`;
      ret.w = info?.width || 400;
      ret.h = info?.height || 300;
      imgCount++;

      return writeFile(join( mediaImg, ret.i ), buffer);

    })
    .then(() => ret)
    .catch(err => {
      console.error(`IMAGE FAIL: ${ url } - ${ err.name || 'error' }\n${ err.message }`);
      return null;
    })
    .finally(() => {
      clearTimeout(timer);
    });

}


// split array into chunks of chunkSize
export function chunk(array, chunkSize = 1) {

  if (chunkSize <= 0) return [];

  const
    chunked = [],
    aCopy = [...array];

  while (aCopy.length) chunked.push( aCopy.splice(0, chunkSize) );
  return chunked;

}
