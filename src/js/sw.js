// PWA service worker
'use strict';

const CACHE = 'TEZOSSPOTLIGHT::' + __VERSION__;

// install event
self.addEventListener('install', event => {

  console.log('service worker: install');

  event.waitUntil(
    self.skipWaiting()
  );

});


// activate event
self.addEventListener('activate', event => {

  console.log('service worker: activate');

  // delete old caches
  event.waitUntil(
    cacheClearOld()
      .then(() => self.clients.claim())
  );

});


// fetch event
self.addEventListener('fetch', event => {

  console.log('service worker: fetch');

});


// clear old caches
function cacheClearOld() {

  return caches.keys()
    .then(keylist => {

      return Promise.all(
        keylist
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      );

    });

}
