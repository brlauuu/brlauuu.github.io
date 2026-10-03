---
permalink: /archive
layout: post
title: Archive
title_key: archive
---

{%- assign one_year_ago = site.time | date: "%s" | plus: 0 | minus: 31536000 -%}
{%- assign old_posts = "" | split: "" -%}
{%- for post in site.posts -%}
{%- assign post_time = post.date | date: "%s" | plus: 0 -%}
{%- if post_time < one_year_ago -%}{%- assign old_posts = old_posts | push: post -%}{%- endif -%}
{%- endfor -%}
{%- assign posts_by_year = old_posts | group_by_exp: "post", "post.date | date: '%Y'" -%}
<div class="archive">
{%- for year_group in posts_by_year -%}
{%- assign year_langs = year_group.items | map: "lang" | uniq | join: " " %}
<section class="archive-year" data-langs="{{ year_langs }}">
<h2 id="{{ year_group.name }}">{{ year_group.name }}</h2>
<ul>
{%- for post in year_group.items %}
<li data-langs="{{ post.lang }}">{% include date.html date=post.date format="month_day" %} » <a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
{%- endfor %}
</ul>
</section>
{%- endfor %}
{% include lang-empty.html all=site.posts shown=old_posts key="archive_empty" %}
</div>
