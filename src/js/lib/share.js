// share via app and social media
const cfgShare = {
  selector  : '.share',
  appHash   : '#shareapp',
  width     : 800,
  height    : 800,
  margin    : 20
};

// page information
let pageInfo;

// get all share sections
Array.from( document.querySelectorAll( cfgShare.selector ) ).forEach(share => {

  // share click
  share.addEventListener('click', shareHandler);

  // enable app links
  if (navigator.share) {
    Array.from( share.querySelectorAll( '[hidden]' ) ).forEach(applink => applink.removeAttribute('hidden'));
  }

});


// share click handler
function shareHandler(e) {

  const t = e?.target?.closest('a');
  if (!t) return;

  // share API?
  if (t.hash === cfgShare.appHash) {

    e.preventDefault();

    pageInfo = pageInfo || {
      url   : location.href,
      title : document.title,
      text  : document.querySelector('.description')?.textContent || ''
    };

    navigator.share( pageInfo );
    return;

  }

  // social link?
  if (!t.href || t.protocol !== 'https:' || t.hostname === location.hostname) return;

  // open popup
  e.preventDefault();

  const
    sw = screen.availWidth || 1024,
    sh = screen.availHeight || 700,
    pw = Math.min(cfgShare.width, (sw - cfgShare.margin * 2)),
    ph = Math.min(cfgShare.height, (sh - cfgShare.margin * 2)),
    px = Math.floor((sw - pw) / 2),
    py = Math.floor((sh - ph) / 2);

  window.open(
    t.href,
    'social',
    `popup,noopener,noreferrer,width=${ pw },height=${ ph },left=${ px },top=${ py }`
  );

}
