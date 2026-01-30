---
permalink: /tags
layout: post
title: Tags
---

{% comment %} Get all tags from all posts {% endcomment %}
{% assign tags = site.tags | sort %}

{% if tags.size > 0 %}
<div class="tags-page">
  <div class="tag-index">
    <h2>Tag index</h2>
    <ul class="tag-chip-list">
      {% for tag in tags %}
        {% assign tag_name = tag[0] %}
        {% assign tag_posts = tag[1] %}
      <li>
        <a class="tag-chip" href="#{{ tag_name | slugify }}">
          {{ tag_name }} <span class="tag-count">{{ tag_posts | size }}</span>
        </a>
      </li>
      {% endfor %}
    </ul>
  </div>

  <div class="tag-sections">
    {% for tag in tags %}
      {% assign tag_name = tag[0] %}
      {% assign tag_posts = tag[1] %}
    <section class="tag-section" id="{{ tag_name | slugify }}">
      <h2 class="tag-heading">#{{ tag_name }} <span class="tag-count">{{ tag_posts | size }}</span></h2>
      <ul class="tag-posts">
        {% for post in tag_posts %}
        <li>
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
