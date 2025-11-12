// client-side "load more" page list navigation
(async () => {

  // load more enabled?
  const loadMore = document.querySelector('.loadmore');
  if (!loadMore || !DOMParser) return;

  // setup
  const
    parser = new DOMParser(),
    pageList = document.querySelector('nav.pagelist'),
    showCount = loadMore.querySelector('#showcount'),
    lmButton = loadMore.querySelector('button'),
    lmButtonText = lmButton?.textContent;

  let
    next = nextPageURL(),
    countTotal = parseFloat( showCount.textContent || 0),
    loading = false;

  // enable "show more" functionality
  if (lmButton) {

    document.body.classList.add('loadmore');
    document.title = document.title.replace(/\(page.+?\)/i, '');

    // restore previous state
    const ct = parseFloat( sessionStorage.getItem(`ct-${ location.pathname }`) || 0);
    while (next && countTotal < ct) {
      await loadMoreHandler();
    }

    lmButton.addEventListener('click', loadMoreHandler);

  }


  // load next set of articles
  async function loadMoreHandler() {

    if (loading || !next) return;

    // loading state
    loading = true;
    lmButton.classList.add('loading');
    lmButton.textContent = 'Loading';

    try {

      // load page HTML
      const nextPage = await fetchNext(next);

      // find next page
      next = nextPageURL( nextPage );

      // get articles
      const article = nextPage.querySelector('nav.pagelist');

      if (article) {

        // update count
        countTotal += article.childElementCount;
        showCount.textContent = countTotal;

        // store current count state
        sessionStorage.setItem(`ct-${ location.pathname }`, countTotal);

        // append new articles
        pageList.append( ...article.children );

      }

    }
    catch {
      console.log('Load more failed');
      next = false;
    }

    // not loading state
    lmButton.classList.remove('loading');
    lmButton.textContent = lmButtonText;
    loading = false;

    // all shown - hide next button
    if (!next) lmButton.style.display = 'none';

  }


  // load HTML page
  async function fetchNext(url) {

    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${ res.status }`);
        return res.text();
      })
      .then(html => {
        return parser.parseFromString(html, 'text/html');
      });

  }


  // get next page URL
  function nextPageURL(doc = document) {
    return doc.querySelector('nav.pagination li.next a')?.href;
  }

})();
