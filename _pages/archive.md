---
permalink: /archive
layout: post
title: Archive
---

{% comment %}
Calculate the timestamp for 1 year ago
Current time minus 31536000 seconds (365 days)
{% endcomment %}
{% assign one_year_ago = site.time | date: "%s" | plus: 0 | minus: 31536000 %}

{% comment %} Group posts by year and filter for posts older than 1 year {% endcomment %}
{% assign posts_by_year = site.posts | group_by_exp: "post", "post.date | date: '%Y'" %}

{% for year_group in posts_by_year %}
  {% comment %} Check if any posts in this year are older than 1 year {% endcomment %}
  {% assign has_old_posts = false %}
  {% for post in year_group.items %}
    {% assign post_time = post.date | date: "%s" | plus: 0 %}
    {% if post_time < one_year_ago %}
      {% assign has_old_posts = true %}
      {% break %}
    {% endif %}
  {% endfor %}

  {% if has_old_posts %}
## {{ year_group.name }}

    {% for post in year_group.items %}
      {% assign post_time = post.date | date: "%s" | plus: 0 %}
      {% if post_time < one_year_ago %}
- {{ post.date | date: "%B %-d" }} » [{{ post.title }}]({{ post.url }})
      {% endif %}
    {% endfor %}

  {% endif %}
{% endfor %}

{% comment %} If no archived posts exist yet {% endcomment %}
{% assign has_any_old_posts = false %}
{% for post in site.posts %}
  {% assign post_time = post.date | date: "%s" | plus: 0 %}
  {% if post_time < one_year_ago %}
    {% assign has_any_old_posts = true %}
    {% break %}
  {% endif %}
{% endfor %}

{% unless has_any_old_posts %}
*No archived posts yet. Posts older than one year will appear here.*
{% endunless %}
