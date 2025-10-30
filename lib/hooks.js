// function hooks
import { normalize } from './util.js';


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

  if (!tacs.tagScore || !data.showRelated || !data.filename || !data.title || !data.isHTML) return;

  const scoreMap = new Map();

  // matching tag scores (weighted by tacs.tagScore)
  if (data.tags) {

    data.tags.forEach(t => {

      tacs.tag.get(t.ref).forEach(p => {
        scoreMap.set(p.slug, (scoreMap.get(p.slug) || 0) + tacs.tagScore.get(t.ref));
      });

    });

  }

  // matching author (+3)
  if (data.author) {

    tacs.group.get( normalize(data.author) )?.forEach(a => {
      scoreMap.set(a.slug, (scoreMap.get(a.slug) || 0) + 3);
    });

  }

  // matching organization (+1)
  if (data.organization) {

    tacs.group.get(data.organization).forEach(o => {
      scoreMap.set(o.slug, (scoreMap.get(o.slug) || 0) + 1);
    });

  }

  // remove current post
  scoreMap.delete( data.slug );

  // create array of posts ordered by score
  data.related = Array.from(scoreMap, ([slug, score]) => ({ slug, score }))
    .sort((a, b) => b.score - a.score || b.date - a.date )
    .map(p => tacs.all.get( p.slug ));

}


// processPostRender hook: add further HTML meta data
export function postrenderMeta( output, data ) {
  if (data.isHTML) {
    output = output.replace('</head>', '<meta name="generator" content="Publican.dev">\n</head>');
  }
  return output;
}
