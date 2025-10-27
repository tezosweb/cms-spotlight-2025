// formatting functions
import { tacs } from 'publican';

// default language
function lang(locale) {
  return locale || tacs?.config?.language || 'en-US';
}


// create a date
function cDate(d) {
  d = new Date(d);
  return +d && !isNaN(d) && d instanceof Date ? d : new Date();
}


// friendly number format
export function number(num, locale) {

  return new Intl.NumberFormat(lang(locale), {})
    .format( num );

}

// number rounding (to 1 under 1000, 10 under 10,000, 100 under 100,000 etc.)
export function numberRound(num) {

  const round = Math.pow(10, Math.max(0, String( parseInt(num) ).length - 3));
  return number( Math.ceil(num / round) * round );

}

// friendly date format
export function dateHuman(d, locale) {

  return new Intl.DateTimeFormat(lang(locale), { dateStyle: 'long' })
    .format( cDate(d) );

}

// UTC date format, e.g. "Wed, 1 Jan 2025 07:30:00 GMT"
export function dateUTC( d ) {
  return cDate(d).toUTCString();
}

// ISO date format, e.g. "2025-01-01"
export function dateISO( d ) {
  return cDate(d).toISOString().slice(0, 10);
}

// date year, e.g. "2025"
export function dateYear( d ) {
  return cDate(d).getUTCFullYear();
}

// RSS feed
export function rss( str, domain ) {

  domain = domain || tacs?.config?.domain || '';

  const
    absRegEx = new RegExp(`(\\s(action|cite|data|href|ping|poster|src|srcset)="{0,1})${ tacs.root }`, 'gi'),
    replace = `$1${ domain }${ tacs.root }`;

  return str.trim()
    .replaceAll(/\s*tabindex="*.*?"*>/gi, '>')              // remove tabindexes
    .replaceAll(/\s*<a.*?class="*headlink"*>#<\/a>/gi, '')  // remove headlinks
    .replaceAll(absRegEx, replace);                         // use absolute URLs

}


// <article> link
export function articleLink( data, headTag = 'h2' ) {

  if (!data?.link || !data?.title) return '';

  return `
    <article>
      <a href="${ data.link }">
        <${ headTag }>${ data.title }</${ headTag }>
        ${ data.description ? `<p>${ data.description }</p>` : '' }
        ${ data.date ? `<p class="pubdate"><time datetime="${ dateISO( data.date ) }">${ dateHuman( data.date ) }</time></p>` : '' }
        ${ data?.wordCount >= tacs.config.wordCountShow ? `<p class="wordcount">${ numberRound( data.wordCount ) } words, ${ numberRound( Math.ceil( data.wordCount / 200 ) ) }-minute read</p>` : '' }
      </a>
    </article>
  `;

}
