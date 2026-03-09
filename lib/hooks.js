// function hooks
import { createHash } from 'node:crypto';
import { normalize } from './util.js';


// processRenderStart hook: generate inline scripts and CSP hashes
export function renderstartInlineScripts( tacs ) {

  tacs.script = new Map();
  tacs.script.set('speculation', cspScript(`{"prerender":[{"where":{"href_matches":"${ tacs.root }*"},"eagerness":"moderate"}]}`, 'speculationrules'));

}


// processPreRender hook: generate page inline scripts and CSP hashes
export function prerenderInlineScripts( data, tacs ) {

  data.script = new Map();
  data.script.set('schema', cspScript(
    '{' +
      '"@context":"http://schema.org/",' +
      '"@type":"TechArticle",' +
      '"proficiencyLevel":"beginner",' +
      `"headline":"${ data.title || tacs.config.title }",` +
      `"description":"${ data.description || tacs.config.description }",` +
      `"datePublished":"${ tacs.fn.format.dateISO( data.date ) }T00:00:00+00:00",` +
      `"dateModified":"${ tacs.fn.format.dateISO( data.date ) }T00:00:00+00:00",` +
      `"mainEntityOfPage":{"@type":"WebPage","@id":"${ tacs.config.domain }${ data.link }"},` +
      `"image":"${ data.imageSocial || `${ tacs.config.domain }${ tacs.root }media/favicon/favicon512.png` }",` +
      `"author":{"@type":"Person","name":"${ data.author || tacs.config.author }",` +
      `"publisher":{"@type":"Organization","name":"${ data.organization || 'Tezos' }"},` +
      `"inLanguage":"${ tacs.config.language }",` +
      '"contentLocation":"online",' +
      '"accessMode":["textual"],' +
      '"accessModeSufficient":"textual",' +
      '"isFamilyFriendly":true,' +
      `"wordCount":${ data.wordCount || 0 }` +
    '}',
    'application/ld+json'
  ));

}


// create hash a string
export function cspScript(code, type) {
  return {
    code: `<script${ type ? ` type="${ type }"` : '' }>${ code }</script>`,
    hash: createHash('sha256').update(code).digest('base64')
  };
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
