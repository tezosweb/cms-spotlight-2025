// Publican configuration
import pkg from './package.json' with {type: 'json'};
import { Publican, tacs } from 'publican';
import esbuild from 'esbuild';

import { cmsFetch } from './lib/cmsFetch.js';
import { mediaImgDir, imgFetch, symlinkMedia, imgLookup } from './lib/imgFetch.js';
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

// blocked common tags and organizations
const tagBlock = 'tezos,xtz,tz,crypto,currency,coin,article,post,blog,item,piece,story,paper,essay'
  .split(',')
  .concat( organization.filter(o => o).map(o => o.name) )
  .map(t => normalize(t));

// add posts from CMS
let videoActive = false, podcastActive = false, homeFeatured = null, rssCount = 0;
const
  cmsImg = imgRoot.replaceAll('/', '\\/'),
  reImg = new RegExp('(' + cmsImg + '[\\w|-]+)[^)|"|\\s]*', 'gim'),
  repImg = `$1${ imgTrans }`,
  reCmsImg = new RegExp(cmsImg + '[^"|)|\\s]+', 'gi'),
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
      postTopic?.[ p.topic_spotlight ]?.name || '',   // Spotlight topic
      pType                                           // post type
    ]
      .concat(p.tags || [])                           // tags
      .map(t => t.replace(/\s+/g, ' ').trim())
      .filter(t => t && !tagBlock.includes( normalize(t) ))
      .map(t => {
        const nt = normalize(t);
        if (!tagMap.has(nt)) tagMap.set(nt, t);
        return tagMap.get(nt);
      });

    tags = [ ...new Set(tags) ];

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
    `${ p.slug }/index.md`,
    content,
    {
      title: (p.title || '').replaceAll('"', '&quot;'),
      description: String(p.description || '').replaceAll('"', '&quot;'),
      status: p.status,
      date: p.date,
      menu: false,
      priority: 1,
      index: 'monthly',
      topic: postTopic?.[ p.topic_spotlight ]?.name || '',
      topicSlug: postTopic?.[ p.topic_spotlight ]?.slug || '',
      featured: p.feature_post,
      imageHero,
      imageThumb,
      imageSocial,
      imageAlt,
      showDescription: p.show_description,
      showRelated: p.show_related,
      author: p.author,
      source: p.source,
      sourceURL: p.source_url,
      tags,
      groups,
      groupLink: org ? `${ orgRoot }/${ org.slug }` : '',
      organization: org ? org.name : ''
    }
  );

});

// update topics if videos or podcasts exist
if (videoActive) postTopic.push({ ...videoActive, show: true });
if (podcastActive) postTopic.push({ ...podcastActive, show: true });

// pass-through files
publican.config.passThrough.add({ from: './src/media/favicon/', to: './media/favicon/' });
publican.config.passThrough.add({ from: './src/media/fonts/', to: './media/fonts/' });
publican.config.passThrough.add({ from: './src/media/static/', to: './media/static/' });

// processRenderStart hook: create tacs.tagScore Map
publican.config.processRenderStart.add( fnHooks.renderstartTagScore );

// processPreRender hook: determine related posts
publican.config.processPreRender.add( fnHooks.prerenderRelated );

// processPostRender hook: add <meta> tags
publican.config.processPostRender.add( fnHooks.postrenderMeta );

// fetch and copy images in production mode
if (isProd) {

  const imgRep = await imgFetch( imgSet );

  // static image replacement
  if (imgRep) {

    // image file symlink
    const symlinkFn = symlinkMedia(dest, './media/image/');

    if (symlinkFn) {
      publican.config.processRenderEnd.add( symlinkFn );
    }
    else {
      // image file copy
      publican.config.passThrough.add({ from: mediaImgDir, to: './media/image/' });
    }

    // <img> regular expression
    const reImgTagFind = new RegExp(`<img\\s+src=['|"|\\\\]*(${ cmsImg }.+?)['|"|\\\\]*?\\s+(.*?)>`, 'gism');

    // processPostRender hook: replace CMS with static images
    publican.config.processPostRender.add( (output, data) => {

      const
        isJSON = data.slug.endsWith('.json'),
        quot = isJSON ? '\\"' : '"';

      if (data.isHTML || data.isXML || isJSON) {

        output = output
          .replace(
            reImgTagFind, // replace <img> tags
            (match, url, attr) => {

              const rep = imgLookup( url );
              return `<img src=${ quot }${ data.isXML || isJSON ? domainProd : '' }${ publican.config.root }${ rep.i.includes('/') ? rep.i : 'media/image/' + rep.i }${ quot }${ rep.w ? ` width=${ quot }${ rep.w }${ quot }` : ''}${ rep.h ? ` height=${ quot }${ rep.h }${ quot }` : ''} ${ attr }>`;

            }
          )
          .replace(
            reCmsImg,   // replace other references
            url => {

              const rep = imgLookup( url );
              return `${ domainProd }${ publican.config.root }${ rep.i.includes('/') ? rep.i : 'media/image/' + rep.i }`;

            }
          );

      }

      return output;

    });

  }

}

// replacement strings
publican.config.replace = new Map([
  [ '__/', publican.config.root ],
  [ ' style="text-align:left"', '' ],
  [ ' style="text-align:start"', '' ],
  [ ' style="text-align:end"', ' class="right"' ],
  [ ' style="text-align:right"', ' class="right"' ],
  [ ' style="text-align:center"', ' class="center"' ],
  [ /[^<div class="tablescroll">]<table>/gm, '<div class="tablescroll"><table>' ],
  [ /<\/table>[^</div>]/gm, '</table></div>' ],
  [ /<p>(<img.+?>)<\/p>/gim, '$1' ],                                        // <p> around <img>
  [ /<img(\b(?![^>]*\balt\s*=)[^>]*)>/gism, '<img$1 alt="illustration">' ], // <img> alt
  [ /<img(\b(?![^>]*\bloading\s*=)[^>]*)>/gism, '<img$1 loading="lazy">' ], // <img> lazy loading
  [ /alt=""/gim, 'alt="decoration"' ],                                      // empty alt
  [ /<p>(<youtube-lite.+?><\/youtube-lite>)<\/p>/gim, '$1' ],               // <p> around <youtube-lite>
  [ /<\/blockquote>\s*<blockquote>/gi, '' ],                                // multiple <blockquote>
  [ '&feedquot;', '\\"' ],                                                  // JSON feed replace
  [ '&feedtab;', '\\t' ],
  [ '&feedcr;', '\\n' ],
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
tacs.config.domainProd = domainProd;
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
  sourcemap = isDev && 'linked',
  define = {
    '__ISDEV__': JSON.stringify(isDev),
    '__VERSION__': `'${ tacs.config.version }'`,
    '__DOMAIN__': `'${ domainProd }'`,
    '__ROOT__': `'${ publican.config.root }'`,
    '__GTMID__': `'${ tacs.config.GTMID }'`,
    '__PHKEY__': `'${ tacs.config.PostHog.key }'`,
    '__PHDEF__': `'${ tacs.config.PostHog.def }'`,
    '__PHPRO__': `'${ tacs.config.PostHog.pro }'`,
  },
  drop = (isDev ? [] : ['debugger', 'console']);

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

// bundle main JS
const buildJS = await esbuild.context({

  entryPoints: [ `${ src }js/main.js` ],
  format: 'esm',
  bundle: true,
  target,
  external: [],
  define,
  drop,
  logLevel,
  minify,
  sourcemap,
  outdir: `${ dest }js/`

});

// bundle service worker
const buildSW = await esbuild.context({

  entryPoints: [ `${ src }js/sw.js` ],
  format: 'esm',
  bundle: true,
  target,
  external: [],
  define,
  drop,
  logLevel,
  minify,
  sourcemap,
  outdir: `${ dest }`

});

// single service worker build
await buildSW.rebuild();
buildSW.dispose();


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
