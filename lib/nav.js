// navigation functions
import { tacs } from 'publican';

// site tag list
export function tagList(classPrefix = 'taglist', classMin = 1, classMax = 5) {

  if (!tacs?.tagList?.length) return;

  const
    minCount = tacs.tagList.at(-1).count,
    maxCount = tacs.tagList.at(0).count,
    rangeCount = maxCount - minCount;

  let ret = tacs.tagList.map(i => {

    const classNum = Math.round(((i.count - minCount) / rangeCount) * (classMax - classMin)) + classMin;
    return `<li class="${ classPrefix + classNum }"><a href="${ i.link }">${ i.tag } <sup>${ i.count }</sup></a></li>`;

  }).join('\n');

  if (ret) ret = `<nav class="${ classPrefix }"><ul>\n${ ret }\n</ul></nav>`;

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
