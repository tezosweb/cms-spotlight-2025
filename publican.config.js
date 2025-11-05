// Publican configuration
import pkg from './package.json' with {type: 'json'};
import { Publican, tacs } from 'publican';
import esbuild from 'esbuild';

import { cmsFetch } from './lib/cmsFetch.js';
import { env, normalize } from './lib/util.js';

import * as fnNav from './lib/nav.js';
import * as fnFormat from './lib/format.js';
import * as fnHooks from './lib/hooks.js';

const
  // fetch CMS data
  cmsData = await cmsFetch(),

  // Publican configuration
  publican = new Publican(),
  isDev = (env('NODE_ENV') === 'development'),
  isProd = !!env('PRODUCTION'),
  src = env('SOURCE_DIR', './src/'),
  dest = env('BUILD_DIR', './build/'),
  devPort = env('SERVE_PORT', 8000),
  domainProd = env('SITE_DOMAIN'),
  domain = isDev ? `http://localhost:${ devPort }` : domainProd,

  // site configuration
  imgRoot = env('CMS_ASSET', '/media/'),
  imgTrans = env('CMS_IMAGE_TRANS', ''),
  imgThumbTrans = env('CMS_THUMB_TRANS', ''),
  imgSocialTrans = env('CMS_SOCIAL_TRANS', ''),
  orgRoot = env('SITE_ORGROOT', 'author'),
  rssMax = env('SITE_RSS_MAX', 10),
  postsMax = cmsData.settings?.posts_maximum || 12,
  relatedMax = cmsData.settings?.related_maximum || 6,
  organization = cmsData.organization || [],
  postType = cmsData.type || [],
  postTopic = cmsData.topicSpotlight || [],

  // normalized tag map
  tagMap = new Map(),

  // image set
  imgSet = new Set();

// content defaults
publican.config.dir.content = env('CONTENT_DIR');
publican.config.dir.template = env('TEMPLATE_DIR');
publican.config.dir.build = dest;
publican.config.root = env('BUILD_ROOT', '/');

// template defaults
const templateDefault = env('TEMPLATE_DEFAULT', 'default.html');
publican.config.defaultHTMLTemplate = templateDefault;
publican.config.dirPages.template = env('TEMPLATE_LIST', templateDefault);
publican.config.tagPages.template = env('TEMPLATE_TAG', templateDefault);

// default syntax language
publican.config.markdownOptions.prism.defaultLanguage = 'bash';

// menus disabled
publican.config.nav = false;

// directory index disabled
publican.config.dirPages = false;

// tag index
publican.config.tagPages.root = env('SITE_TAGROOT', 'tag');
publican.config.tagPages.template = env('TEMPLATE_TAG');
publican.config.tagPages.size = postsMax;

// group index
publican.config.groupPages = {
  sortBy: 'date',
  sortOrder: -1,
  size: postsMax,
  index: 'monthly',
  template: env('TEMPLATE_GROUP', templateDefault),
  list: {
    'article': {
      root: ''
    },
    'featured': {
      root: 'featured'
    }
  }
};

// create groups from organizations
organization.forEach(org => {

  if (org) publican.config.groupPages.list[ org.name ] = {
    root: `${ orgRoot }/${ org.slug }/`
  };

});

// pass-through files
publican.config.passThrough.add({ from: './src/media/', to: './media/' });

// processRenderStart hook: create tacs.tagScore Map
publican.config.processRenderStart.add( fnHooks.renderstartTagScore );

// processPreRender hook: determine related posts
publican.config.processPreRender.add( fnHooks.prerenderRelated );

// processPostRender hook: add <meta> tags
publican.config.processPostRender.add( fnHooks.postrenderMeta );

// add posts from CMS
let videoActive = false, podcastActive = false, homeFeatured = null, rssCount = 0;
const
  cmsImg = imgRoot.replaceAll('/', '\\/'),
  reImg = new RegExp('(' + cmsImg + '[\\w|-]+)[^)|"|\\s]*', 'gim'),
  repImg = `$1${ imgTrans }`,
  reCmsImg = new RegExp('(' + cmsImg + '[^"|)|\\s]+)', 'gi'),
  repYT = '\n<youtube-lite video="$1"></youtube-lite>\n';

cmsData.post.forEach(p => {

  const pType = postType?.[ p.post_type ]?.slug || '';
  videoActive = videoActive || (pType === 'video' && postType?.[ p.post_type ]);
  podcastActive = podcastActive || (pType === 'podcast' && postType?.[ p.post_type ]);

  // organization
  const org = p.organization && organization[ p.organization ];

  // indexed posts tags/groups
  let tags = [];
  const groups = [];

  if (p.index_post) {

    // normalize tags
    tags = [
      postTopic?.[ p.topic_spotlight ]?.slug || '',   // Spotlight topic
      pType                                           // post type
    ]
      .concat(p.tags || [])                           // tags
      .map(t => t.replace(/\s+/g, ' ').trim())
      .filter(t => t &&
      t.toLowerCase() !== 'tezos' &&
      t.toLowerCase() !== 'article'
      )
      .map(t => {
        const nt = normalize(t);
        if (!tagMap.has(nt)) tagMap.set(nt, t);
        return tagMap.get(nt);
      });

    // add to groups
    if (p.feature_post) {
      homeFeatured = homeFeatured || p.slug;
      groups.push( 'featured' );
    }
    if (p.slug !== homeFeatured) {
      groups.push( 'article' );
    }
    if (rssCount < rssMax) {
      rssCount++;
      groups.push( 'rss' );
    }
    if (p.author) groups.push( normalize(p.author) );
    if (org) groups.push( org.name );
  }

  // images
  const
    imageHero = p.show_image && p.image?.id ? `${ imgRoot }${ p.image.id }${ imgTrans }` : '',
    imageSmall = p.image_small?.id || p.image?.id ? `${ imgRoot }${ p.image_small?.id || p.image.id }` : '',
    imageThumb = imageSmall ? `${ imageSmall }${ imgThumbTrans }` : '',
    imageSocial = imageSmall ? `${ imageSmall }${ imgSocialTrans }` : '',
    imageAlt = (p.image?.title || '').replace(/[^\w|'|-]/g, ' ').replace(/\s+/g, ' ');

  // update image and video blocks in content
  const content = ('\n' + (p.content || '') + '\n')
    .replace(reImg, repImg)
    .replace(/\s[![**VIDEO**\](]*https:\/\/youtu\.be\/([a-z0-9\-_]+).*?\s/gi, repYT)
    .replace(/\s[![**VIDEO**\](]*https:\/\/[www.]*youtube\.\w+\/watch\?v=([a-z0-9\-_]+).*?\s/gi, repYT)
    .replace(/<iframe\s.*src="https:\/\/[www.]*youtube\.\w+\/embed\/([a-z0-9\-_]+).+<\/iframe>/gim, repYT)
    .trim();

  // record images
  if (isProd) {

    // CMS fields
    if (imageHero) imgSet.add(imageHero);
    if (imageThumb) imgSet.add(imageThumb);
    if (imageSocial) imgSet.add(imageSocial);

    // from content
    content.match(reCmsImg)?.forEach(u => imgSet.add(u));

  }

  publican.addContent(
    `${ p.slug }/index.md`,`
---
title: ${ (p.title || '').replaceAll('"', '&quot;') }
description: ${ (p.description || '').replaceAll('"', '&quot;') }
status: ${ p.status }
date: ${ p.date }
menu: false
priority: 1
index: monthly
topic: ${ postTopic?.[ p.topic_spotlight ]?.name || '' }
topicSlug: ${ postTopic?.[ p.topic_spotlight ]?.slug || '' }
${ p.feature_post ? 'featured: true' : '' }
${ imageHero ? `imageHero: ${ imageHero }` : ''}
${ imageThumb ? `imageThumb: ${ imageThumb }` : ''}
${ imageSocial ? `imageSocial: ${ imageSocial }` : ''}
${ imageAlt ? `imageAlt: ${ imageAlt }` : ''}
${ p.show_description ? 'showDescription: true' : '' }
${ p.show_related ? 'showRelated: true' : '' }
${ p.author ? `author: ${ p.author }` : '' }
${ p.source ? `source: ${ p.source }` : '' }
${ p.source_url ? `sourceURL: ${ p.source_url }` : '' }
${ tags.length ? `tags: ${ tags.join(',') }` : '' }
${ groups.length ? `groups: ${ groups.join(',') }` : ''}
${ org ? `groupLink: ${ orgRoot }/${ org.slug }/\norganization: ${ org.name }` : '' }
---
${ content }
`
  );
});

// update topics if videos or podcasts exist
if (videoActive) postTopic.push({ ...videoActive, show: true });
if (podcastActive) postTopic.push({ ...podcastActive, show: true });

// replacement strings
publican.config.replace = new Map([
  [ '__/', publican.config.root ],
  [ ' style="text-align:left"', '' ],
  [ ' style="text-align:start"', '' ],
  [ ' style="text-align:end"', ' class="right"' ],
  [ ' style="text-align:right"', ' class="right"' ],
  [ ' style="text-align:center"', ' class="center"' ],
  [ '<table>', '<div class="tablescroll"><table>' ],
  [ '</table>', '</table></div>' ],
  [ /<p>(<img.+?>)<\/p>/gim, '$1' ],                                        // <p> around <img>
  [ /<img(\b(?![^>]*\balt\s*=)[^>]*)>/gism, '<img$1 alt="illustration">' ], // <img> alt
  [ /<img(\b(?![^>]*\bloading\s*=)[^>]*)>/gism, '<img$1 loading="lazy">' ], // <img> lazy loading
  [ /alt=""/gim, 'alt="decoration"' ],                                      // empty alt
  [ /<p>(<youtube-lite.+?><\/youtube-lite>)<\/p>/gim, '$1' ],               // <p> around <youtube-lite>
  [ /<\/blockquote>\s*<blockquote>/gi, '' ],                  // multiple <blockquote>
]);

// build options
publican.config.minify.enabled = !isDev;  // minify in production mode
publican.config.watch = isDev;            // watch in development mode
publican.config.logLevel = isDev ? 2 : 1; // output verbosity

// jsTACs globals
tacs.config = tacs.config || {};
tacs.config.isDev = isDev;
tacs.config.isProd = isProd;
tacs.config.version = pkg.version;
tacs.config.language = env('SITE_LANGUAGE', 'en');
tacs.config.domain = domain;
tacs.config.title = env('SITE_TITLE');
tacs.config.description = env('SITE_DESCRIPTION');
tacs.config.author = env('SITE_AUTHOR');
tacs.config.social = env('SITE_SOCIAL');
tacs.config.wordsPerMinute = env('SITE_WORDS_MINUTE', 200) || 200;
tacs.config.themeColor = env('SITE_THEME_COLOR', '#fff');
tacs.config.cspImage = isProd ? '' : imgRoot;

// CMS globals
tacs.config.keywords = (cmsData.settings.keywords || []).join(', ');
tacs.config.postsMax = postsMax;
tacs.config.relatedMax = relatedMax;
tacs.config.relatedTitle = (cmsData.settings?.related_title || '').trim().replace(/\s+/g, ' ');
tacs.config.relatedContent = (cmsData.settings?.related_content || '').split('\n').map(p => p.replace(/\s+/g, ' ').trim()).filter(p => p).map(p => `<p>${ p }</p>`).join('\n');
tacs.config.canonical = cmsData.settings?.canonical_url;
tacs.config.footerLinks = cmsData.settings?.footer_links || [];
tacs.config.socialLinks = cmsData.settings?.social_links || [];
tacs.config.tagRoot = publican.config.root + publican.config.tagPages.root + '/';
tacs.config.topic = postTopic;
tacs.config.orgRoot = publican.config.root + orgRoot + '/';
tacs.config.organization = organization;
tacs.config.GTMID = (isProd && (cmsData.settings?.Google_Tag_Manager_ID || '').trim()) || '';
tacs.config.PostHog = {
  key: (isProd && (cmsData.settings?.PostHog_API_Key || '').trim()) || '',
  def: (isProd && (cmsData.settings?.PostHog_defaults || '').trim()) || '',
  pro: (isProd && (cmsData.settings?.PostHog_profile || '').trim()) || ''
};

// jsTACS functions
tacs.fn = tacs.fn || {};
tacs.fn.nav = fnNav;
tacs.fn.format = fnFormat;

// clear build directory
await publican.clean();

// build site
await publican.build();

// ___________________________________________________________
// esbuild configuration for CSS, JavaScript, and local server
const
  target = env('BROWSER_TARGET', '').split(','),
  logLevel = isDev ? 'info' : 'error',
  minify = !isDev,
  sourcemap = isDev && 'linked';

// bundle CSS
const buildCSS = await esbuild.context({

  entryPoints: [ `${ src }css/main.css` ],
  bundle: true,
  target,
  external: ['/media/fonts/*', '/media/images/*'],
  loader: {
    '.woff2': 'file',
    '.avif': 'file',
    '.webp': 'file',
    '.png': 'file',
    '.jpg': 'file',
    '.svg': 'dataurl'
  },
  logLevel,
  minify,
  sourcemap,
  outdir: `${ dest }css/`

});

// bundle JS
const buildJS = await esbuild.context({

  entryPoints: [ `${ src }js/main.js` ],
  format: 'esm',
  bundle: true,
  target,
  external: [],
  define: {
    '__ISDEV__': JSON.stringify(isDev),
    '__VERSION__': `'${ tacs.config.version }'`,
    '__DOMAIN__': `'${ domainProd }'`,
    '__ROOT__': `'${ publican.config.root }'`,
    '__GTMID__': `'${ tacs.config.GTMID }'`,
    '__PHKEY__': `'${ tacs.config.PostHog.key }'`,
    '__PHDEF__': `'${ tacs.config.PostHog.def }'`,
    '__PHPRO__': `'${ tacs.config.PostHog.pro }'`,
  },
  drop: isDev ? [] : ['debugger', 'console'],
  logLevel,
  minify,
  sourcemap,
  outdir: `${ dest }js/`

});

if (publican.config.watch) {

  // watch for file changes
  await buildCSS.watch();
  await buildJS.watch();

  // development server
  const { livelocalhost } = await import('livelocalhost');

  livelocalhost.servedir = dest;
  livelocalhost.serveport = devPort;
  livelocalhost.accessLog = false;
  livelocalhost.start();

}
else {

  // single build
  await buildCSS.rebuild();
  buildCSS.dispose();

  await buildJS.rebuild();
  buildJS.dispose();

}
