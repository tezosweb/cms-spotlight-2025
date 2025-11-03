// navigation functions
import { tacs } from 'publican';

// site tag list
export function tagList(classPrefix = 'taglist') {

  if (!tacs?.tagList?.length) return;

  const
    list = [],
    fLen = tacs.group.get('featured')?.length || 0;

  // featured
  if (fLen) list.push({ link: `<a href="${ tacs.root }featured/" class="featured">Featured <sup>${ fLen }</sup></a>` , count: fLen });

  // organizations
  tacs.config.organization
    .filter(o => o?.show && tacs.group.get(o.name)?.length)
    .forEach(o => list.push({ link: `<a href="${ tacs.config.orgRoot }${ o.slug }/">${ o.name } <sup>${ tacs.group.get(o.name).length }</sup></a>`, count: tacs.group.get(o.name).length }));

  // tags
  tacs.tagList.forEach(t => list.push({ link: `<a href="${ t.link }">${ t.tag } <sup>${ t.count }</sup></a>`, count: t.count }));

  // sort
  list.sort((a, b) => b.count - a.count);

  // format
  let ret = list.map(l => `<li>${ l.link }</li>`).join('');
  if (ret) ret = `<nav class="${ classPrefix }"><ul class="linklist">\n${ ret }\n</ul></nav>`;

  return ret;

};


// paged navigation
export function pagination( pagination ) {

  if (!(pagination?.href?.length > 1)) return;

  const
    pt = pagination.pageTotal,
    pc = pagination.pageCurrent;

  let ret = '', last = 0;

  // back
  ret += `<li class="back">${ pagination.hrefBack ? `<a href="${ pagination.hrefBack }" title="previous index page">` : '<span>' }&#9668;${ pagination.hrefBack ? '</a>' : '</span>' }</li>\n`;

  pagination.href.forEach((page, pIdx)  => {

    const
      maxp = pc === 0 || pc + 1 === pt ? 3 : 2,
      current = pIdx === pc;

    if (current || pIdx === 0 || pIdx + 1 === pt || pt < 7 || (pIdx + maxp > pc && pIdx - maxp < pc)) {

      last = pIdx;
      if (current) {
        ret += `<li class="current"><strong>${ pIdx + 1 }</strong></li>`;
      }
      else {
        ret += `<li><a href="${ page }">${ pIdx + 1 }</a></li>`;
      }

    }
    else {

      if (last + 1 === pIdx) {
        ret += '<li class="gap">&hellip;</li>';
      }

    }

  });


  // next
  ret += `<li class="next">${ pagination.hrefNext ? `<a href="${ pagination.hrefNext }" title="next index page">` : '<span>' }&#9658;${ pagination.hrefNext ? '</a>' : '</span>' }</li>\n`;

  return `<nav class="pagination"><ul>${ ret }</ul></nav>`;

}
