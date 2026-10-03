---
permalink: /tags
layout: post
title: Tags
title_key: tags
---

{% comment %} Get all tags from all posts {% endcomment %}
{% assign tags = site.tags | sort %}
{% assign tagged_posts = site.posts | where_exp: "post", "post.tags.size > 0" %}
<script type="application/json" id="constellation-data">{"tags":[{% for tag in tags %}{"name":{{ tag[0] | jsonify | replace: "<", "\u003C" }},"slug":{{ tag[0] | slugify | jsonify | replace: "<", "\u003C" }},"count":{{ tag[1] | size }}}{% unless forloop.last %},{% endunless %}{% endfor %}],"posts":[{% for post in tagged_posts %}{"url":{{ post.url | relative_url | jsonify | replace: "<", "\u003C" }},"title":{{ post.title | jsonify | replace: "<", "\u003C" }},"lang":{{ post.lang | jsonify }},"tags":[{% for t in post.tags %}{{ t | slugify | jsonify | replace: "<", "\u003C" }}{% unless forloop.last %},{% endunless %}{% endfor %}]}{% unless forloop.last %},{% endunless %}{% endfor %}]}</script>
{% include constellation.html %}
{% include lang-empty.html all=tagged_posts shown=tagged_posts %}

{% if tags.size > 0 %}
<div class="tags-page" data-langs="{{ tagged_posts | map: 'lang' | uniq | join: ' ' }}">
  <div class="tag-index">
    <h2>{% include t.html key="tag_index" %}</h2>
    <ul class="tag-chip-list">
      {% for tag in tags %}
        {% assign tag_name = tag[0] %}
        {% assign tag_posts = tag[1] %}
        {% assign tag_langs = tag_posts | map: "lang" | uniq | join: " " %}
      <li data-langs="{{ tag_langs }}">
        <a class="tag-chip" href="#{{ tag_name | slugify }}">
          {{ tag_name }} {% include lang-counts.html posts=tag_posts %}
        </a>
      </li>
      {% endfor %}
    </ul>
  </div>

  <div class="tag-sections">
    {% for tag in tags %}
      {% assign tag_name = tag[0] %}
      {% assign tag_posts = tag[1] %}
        {% assign tag_langs = tag_posts | map: "lang" | uniq | join: " " %}
    <section class="tag-section" data-langs="{{ tag_langs }}" id="{{ tag_name | slugify }}">
      <h2 class="tag-heading">#{{ tag_name }} {% include lang-counts.html posts=tag_posts %}</h2>
      <ul class="tag-posts">
        {% for post in tag_posts %}
        <li data-langs="{{ post.lang }}">
          <span class="tag-date">{{ post.date | date: "%Y-%m-%d" }}</span>
          <a href="{{ post.url }}">{{ post.title }}</a>
        </li>
        {% endfor %}
      </ul>
    </section>
    {% endfor %}
  </div>
</div>
{% else %}
*No tagged posts yet. Add tags to your posts using the front matter:*

```yaml
---
layout: post
title: "Your Title"
tags: [tag1, tag2]
---
```
{% endif %}
