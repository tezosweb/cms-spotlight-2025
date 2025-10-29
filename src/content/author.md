---
title: Authors
description: The following tags have been used on posts throughout this site.
template: list.html
priority: 0.2
---

<nav class="taglist"><ul>
${ tacs.config.organization.filter(o => o?.slug && tacs.group.get(o.name)?.length).map(o => `<li><a href="${ tacs.config.orgRoot }${ o.slug }">${ o.name } <sup>${ tacs.group.get(o.name)?.length }</sup></a></li>`) }
</ul></nav>
