// register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register( __ROOT__ + 'sw.js?' + __VERSION__ );
}
