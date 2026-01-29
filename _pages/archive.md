---
permalink: /archive
layout: post
title: Archive
---

{% for post in site.posts %}
- {{ post.date | date: "%Y-%m-%d" }} » [{{ post.title }}]({{ post.url }})
{% endfor %}
