---
permalink: /tags
layout: post
title: Tags
---

{% comment %} Get all tags from all posts {% endcomment %}
{% assign all_tags = "" | split: "" %}
{% for post in site.posts %}
  {% if post.tags %}
    {% for tag in post.tags %}
      {% unless all_tags contains tag %}
        {% assign all_tags = all_tags | push: tag %}
      {% endunless %}
    {% endfor %}
  {% endif %}
{% endfor %}

{% comment %} Sort tags alphabetically {% endcomment %}
{% assign sorted_tags = all_tags | sort %}

{% if sorted_tags.size > 0 %}
  {% for tag in sorted_tags %}
<h2 id="{{ tag | slugify }}">{{ tag }}</h2>

  {% for post in site.posts %}
    {% if post.tags contains tag %}
- {{ post.date | date: "%Y-%m-%d" }} » [{{ post.title }}]({{ post.url }})
    {% endif %}
  {% endfor %}

  {% endfor %}
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
