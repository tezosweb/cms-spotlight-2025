// fetch CMS data
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env, apiFetch, fileInfo } from './util.js';

// configuration
const cfg = {
  cmsHost       : env('CMS_HOST'),
  cmsKey        : env('CMS_KEY'),
  limitPosts    : env('LIMIT_POSTS', Infinity),
  includeDraft  : env('SHOW_DRAFT') === 'true',
  includeFuture : env('SHOW_FUTURE') === 'true',
  maxPostFetch  : 50,
  dataCache     : env('CMS_CACHE'),
  dataCacheTime : env('CMS_CACHE_MINS', 0) * 60 * 1000
};

// CMS API URLs
const api = {
  settings: { path: '/items/settings_spotlight' },
  organization: { path: '/items/organization', search: 'fields[]=id,name,slug,show&sort[]=sort&sort[]=id' },
  type: { path: '/items/post_type', search: 'fields[]=id,name,slug,show&sort[]=sort&sort[]=id' },
  topic: { path: '/items/topic_type', search: 'fields[]=id,name,slug,show&sort[]=sort&sort[]=id' },
  topicSpotlight: { path: '/items/topic_spotlight', search: 'fields[]=id,name,slug,show&sort[]=sort&sort[]=id' },
};

// global data store
const cmsData = {};

// fetch all data
export async function cmsFetch() {

  // cached CMS data?
  const cache = cfg.dataCache && cfg.dataCacheTime ? join(cfg.dataCache, `${ cfg.includeDraft ? 'd1' : 'd0'}-${ cfg.includeFuture ? 'f1' : 'f0' }-lim${ cfg.limitPosts === Infinity ? 'none' : cfg.limitPosts }.json`) : false;

  if (cache) {
    const cInfo = await fileInfo(cache);

    // read cache
    if (cInfo.isFile && Date.now() - cInfo.modified < cfg.dataCacheTime) {
      return JSON.parse( await readFile( cache, { encoding: 'utf8' } ) );
    }

  }

  // concurrent fetch of settings and referenced values
  const apiKeys = Object.keys(api);

  (await Promise.allSettled(
    apiKeys.map(c => apiFetch({
      uri: cfg.cmsHost + api[c].path,
      authKey: cfg.cmsKey,
      body: api[c].search
    }))
  )).forEach((r, idx) => {

    const key = apiKeys[idx], data = (r?.status === 'fulfilled' && r?.value?.ok && r.value?.body?.data);

    if (Array.isArray(data)) {

      cmsData[ key ] = [];
      data.forEach(d => {
        cmsData[ key ][ d.id ] = d;
      });

    }
    else {
      cmsData[ key ] = data;
    }

  });

  // post criteria
  const
    postPath = '/items/post',
    postFilter = `filter={"publish_spotlight":{"_eq":"true"},"status":{"_in":[${ cfg.includeDraft ? '"draft","review",' : '' }"published"]}${ cfg.includeFuture ? '' : ',"date":{"_lte": "$NOW"}'}}`,
    postFields = 'fields[]=status,date,organization,post_type,topic_type,topic_spotlight,index_post,feature_post,show_image,show_description,show_related,title,slug,description,content,tags,author,source,source_url,image.id,image.title,image_small.id',
    postSort = 'sort[]=-date';

  // get post count
  const postCount = parseFloat(
    (await apiFetch({
      uri: cfg.cmsHost + postPath,
      authKey: cfg.cmsKey,
      body: `${ postFilter }&aggregate[count]=*`
    }))?.body?.data?.[0]?.count || 0
  );

  // no posts
  if (!postCount) {
    cmsData.post = [];
    return cmsData;
  }

  // fetch concurrent batches of posts
  cmsData.post = (

    await Promise.allSettled(
      Array( Math.ceil( Math.min(postCount, cfg.limitPosts) / cfg.maxPostFetch ) )
        .fill(null)
        .map((p, idx) => apiFetch({
          uri: cfg.cmsHost + postPath,
          authKey: cfg.cmsKey,
          body: `${ postFilter }&${ postFields }&${ postSort }&limit=${ Math.min(cfg.limitPosts, cfg.maxPostFetch) }&page=${ idx + 1 }`
        }))
    )

  ).reduce((acc, cur) => (cur?.status === 'fulfilled' && cur?.value?.ok ? acc.concat(cur.value?.body?.data || []) : acc), []);

  // cache data
  if (cache) {
    await mkdir(cfg.dataCache, { recursive: true });
    await writeFile(cache, JSON.stringify(cmsData));
  }

  return cmsData;

}
