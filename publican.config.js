// Publican configuration
import pkg from './package.json' with {type: 'json'};
import { Publican, tacs } from 'publican';
import esbuild from 'esbuild';

import { cmsFetch } from './lib/cmsFetch.js';
import { env } from './lib/util.js';

// import * as fnNav from './lib/nav.js';
// import * as fnFormat from './lib/format.js';
// import * as fnHooks from './lib/hooks.js';

const
  publican = new Publican(),
  isDev = (env('NODE_ENV') === 'development'),
  src = env('SOURCE_DIR', './src/'),
  dest = env('BUILD_DIR', './build/'),
  devPort = env('SERVE_PORT', 8000),

  // fetch CMS data
  cmsData = await cmsFetch();

// Publican defaults
publican.config.dir.content = env('CONTENT_DIR');
publican.config.dir.template = env('TEMPLATE_DIR');
publican.config.dir.build = dest;
publican.config.root = env('BUILD_ROOT', '/');

// default templates
publican.config.defaultHTMLTemplate = env('TEMPLATE_DEFAULT', 'default.html');
publican.config.dirPages.template = env('TEMPLATE_LIST');
publican.config.tagPages.template = env('TEMPLATE_TAG');

// default syntax language
publican.config.markdownOptions.prism.defaultLanguage = 'bash';

// menus disabled
publican.config.nav = false;

// directory index disabled
publican.config.dirPages = false;

// tag index
publican.config.tagPages.root = env('SITE_TAGROOT', 'tag');
publican.config.tagPages.template = env('TEMPLATE_TAG');
publican.config.tagPages.size = 12;

// group index
publican.config.groupPages = {
  sortBy: 'date',
  sortOrder: -1,
  size: 12,
  index: 'monthly',
  template: env('TEMPLATE_GROUP'),
};

// replacement strings
publican.config.replace = new Map([
  [ '__/', publican.config.root ],
  [ ' style="text-align:end"', ' class="right"' ],
  [ ' style="text-align:right"', ' class="right"' ],
  [ ' style="text-align:center"', ' class="center"' ],
  [ '<table>', '<div class="tablescroll"><table>' ],
  [ '</table>', '</table></div>' ]
]);

// build options
publican.config.minify.enabled = !isDev;  // minify in production mode
publican.config.watch = isDev;            // watch in development mode
publican.config.logLevel = isDev ? 2 : 0; // output verbosity

// jsTACs globals
tacs.config = tacs.config || {};
tacs.config.isDev = isDev;
tacs.config.version = pkg.version;
tacs.config.language = env('SITE_LANGUAGE', 'en');
tacs.config.domain = isDev ? `http://localhost:${ devPort }` : env('SITE_DOMAIN');
tacs.config.title = env('SITE_TITLE');
tacs.config.description = env('SITE_DESCRIPTION');
tacs.config.author = env('SITE_AUTHOR');
tacs.config.wordCountShow = env('SITE_WORDCOUNTSHOW', 0);

// jsTACS functions
tacs.fn = tacs.fn || {};

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
    '__DOMAIN__': `'${ tacs.config.domain }'`,
    '__ROOT__': `'${ publican.config.root }'`,
    // '__GTMID__': `'${ (cmsData?.settings?.Google_Tag_Manager_ID || '').trim() }'`,
    // '__PHKEY__': `'${ (cmsData?.settings?.PostHog_API_Key || '').trim() }'`,
    // '__PHDEF__': `'${ (cmsData?.settings?.PostHog_defaults || '').trim() }'`,
    // '__PHPRO__': `'${ (cmsData?.settings?.PostHog_profile || '').trim() }'`,
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
