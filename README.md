# Tezos Spotlight 2025

[Tezos Spotlight](https://spotlight.tezos.com/) static site generation. Uses:

1. Content Management System: [Directus](https://directus.io/)
1. Static Site Generator: [Publican](https://publican.dev/)
1. CSS/JS build system: [esbuild](https://esbuild.github.io/)
1. Live reload development server: [LiveLocalhost](https://publican.dev/livelocalhost/)

SSG requirements:

1. [Node.js](https://nodejs.org/) v20 or above.


## Installation

Clone repository and install modules:

```bash
npm i
```

Create [configuration files](#sample-configuration-files) as shown below.


## Build development site

The development build limits the number of posts, caches CMS data, references CMS image assets, and starts a live reload server:

```bash
npm start
```

and open the `localhost` address shown in a browser.


## Build preview site

The preview build shows draft posts, future posts, and references CMS image assets:

```bash
npm run preview
```


## Build staging/production site

The staging build contains final published posts and copies all CMS assets to the build directory:

```bash
npm run staging
```

A staging build creates files in a local directory. The staging and production websites use buckets with clones of the built files.


## Sample configuration files

Create the following four configuration files in the project root.


### `.env` defaults

Defines default settings used irrespective of the build type. The files below can override any setting.

```ini
# Directus location and API key
CMS_HOST=https://<CMS-address>
CMS_ASSET=https://<CMS-address>/assets/
CMS_KEY=<CMS-API-KEY>
CMS_IMAGE_TRANS="?width=1000&amp;format=auto"
CMS_THUMB_TRANS="?width=600&amp;format=auto"
CMS_SOCIAL_TRANS="?width=800&amp;format=jpg"

# esbuild browser target
BROWSER_TARGET="chrome135,firefox135,safari17.3"

# source files
SOURCE_DIR=./src/

# content files
CONTENT_DIR=./src/content/

# template files
TEMPLATE_DIR=./src/template/
TEMPLATE_DEFAULT=default.html
TEMPLATE_LIST=list.html
TEMPLATE_TAG=list.html
TEMPLATE_GROUP=list.html

# root
BUILD_ROOT=/

# site information
SITE_DOMAIN="https://spotlight.tezos.com"
SITE_LANGUAGE="en-US"
SITE_VERSION="1.0.0"
SITE_TITLE="Tezos Spotlight"
SITE_DESCRIPTION="Tezos articles, videos, podcasts and other media published by the Tezos community."
SITE_AUTHOR="Tezos"
SITE_SOCIAL="@tezos"
SITE_TAGROOT="tag"
SITE_ORGROOT="author"
SITE_WORDS_MINUTE=200
SITE_THEME_COLOR="#121212"
```


### `.env.dev` development build defaults

Limit the number of posts, cache CMS data, and reference CMS image assets:

```ini
# build mode
NODE_ENV=development

# development server port
SERVE_PORT=8301

# SSG configuration
BUILD_DIR=./build/

# maximum posts to render
LIMIT_POSTS=30

# show drafts
SHOW_DRAFT=true

# show future-dated posts
SHOW_FUTURE=true

# CMS data caching
CMS_CACHE=./build._cache/
CMS_CACHE_MINS=600
```


### `.env.preview` preview build defaults

Include draft posts, include future posts, and reference CMS image assets:

```ini
# build mode
NODE_ENV=production

# SSG configuration
BUILD_DIR=./build.preview/

# show drafts
SHOW_DRAFT=true

# show future-dated posts
SHOW_FUTURE=true
```


### `.env.staging` production build defaults

Contains published posts and copies CMS assets to the build directory:

```ini
# build mode
NODE_ENV=production

# is production build?
PRODUCTION=true

# SSG configuration
BUILD_DIR=./build.staging/
```
