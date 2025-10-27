// function hooks

// processRenderStart hook: modify titles and descriptions
export function renderstartData( tacs ) {

  tacs.all.forEach(p => {

    if (p.isTagIndex) {

      const posts = `post${ p.childPageTotal === 1 ? '' : 's' }`;
      p.title = `&ldquo;${ p.isTagIndex }&rdquo; ${ posts }`;
      p.description = `List of ${ tacs.fn.format.number( p.childPageTotal ) } ${ posts } using the tag &ldquo;${ p.isTagIndex }&rdquo;.`;

    }
  });

}


// processRenderStart hook: calculate tacs.tagScore { rel: score } Map
// lesser-used tags have a higher score
export function renderstartTagScore( tacs ) {

  if (!tacs.tagList.length) return;

  // maximum tag count
  const countMax = tacs.tagList[0].count + 1;

  // tag score Map
  tacs.tagScore = new Map();
  tacs.tagList.forEach(t => tacs.tagScore.set(t.ref, countMax - t.count));

}


// processPreRender hook: related posts, generated at pre-render time
export function prerenderRelated( data, tacs ) {

  if (!tacs.tagScore || !data.filename || !data.title || !data.isHTML || !data.tags) return;

  const relScore = [];

  // calculate other post relevency scores
  tacs.all.forEach((post, slug) => {

    if (data.slug == slug || !post.filename || !post.title || !post.isHTML || !post.tags) return;

    let score = 0;

    // calculate matching tag scores
    data.tags.forEach(dTag => {
      post.tags.forEach(pTag => {
        if (dTag.ref === pTag.ref) score += tacs.tagScore.get( dTag.ref );
      });
    });

    // calculate matching directory scores
    const
      dDir = data.link.split('/').filter(d => d),
      pDir = post.link.split('/').filter(d => d);

    let i = 0;
    while (i >= 0) {

      if (dDir[i] && dDir[i] === pDir[i]) {
        i++;
        score += i;
      }
      else i = -1;

    }

    // record related
    if (score) relScore.push( { slug, score } );

  });


  // add to related posts sorted by score
  data.related = relScore
    .sort((a, b) => b.score - a.score || b.date - a.date )
    .map(p => tacs.all.get( p.slug ) );

}


// processPostRender hook: add further HTML meta data
export function postrenderMeta( output, data ) {
  if (data.isHTML) {
    output = output.replace('</head>', '<meta name="generator" content="Publican.dev">\n</head>');
  }
  return output;
}
