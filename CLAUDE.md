# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Jekyll-based personal blog hosted on GitHub Pages, using the Tale theme. The site belongs to Đorđe Relić (brlauuu), a PhD Candidate at Biozentrum, and serves as a writer-focused platform for essays and articles.

## Site Configuration

- **Jekyll Theme**: Tale (minimal theme for storytellers)
- **Theme Method**: remote_theme via `chesterhow/tale`
- **Ruby Version**: 3.3.4 (matches GitHub Pages environment)
- **GitHub Pages Gem**: ~> 232
- **Jekyll Version**: 3.10.0 (via github-pages gem)
- **Site URL**: https://brlauuu.github.io
- **Author**: Đorđe Relić
- **Social Links**: Twitter (@brlauuu), GitHub (brlauuu), LinkedIn (dorderelic)
- **Plugins**: jekyll-paginate, jekyll-remote-theme, jekyll-feed, jekyll-seo-tag, jekyll-sitemap
- **Archive System**: Automatic separation of recent (< 1 year) and archived (> 1 year) posts
- **Dark Mode**: Toggle-based dark mode with localStorage persistence and system preference detection

## Directory Structure

```
_posts/          # Blog posts (YYYY-MM-DD-title.md format)
_pages/          # Static pages (about, archive)
_includes/       # Custom HTML includes (head, dark-mode-toggle)
_layouts/        # Custom layouts (default, home)
assets/
  imgs/          # Images for posts and pages
  css/           # Custom CSS (dark-mode.css)
  js/            # JavaScript files (dark-mode.js)
_config.yml      # Jekyll configuration
index.html       # Homepage with recent posts
```

## Development Commands

### Local Development
```bash
# Install dependencies
bundle install

# Run local development server
bundle exec jekyll serve

# Build site (output to _site/)
bundle exec jekyll build
```

### Accessing Local Site
When running `jekyll serve`, the site is available at `http://localhost:4000`

## Content Structure

### Blog Posts
- Location: `_posts/`
- Naming: `YYYY-MM-DD-title.md`
- Format: Markdown with YAML front matter
- Required front matter:
  ```yaml
  ---
  layout: post
  title: "Post Title"
  author: "Đorđe Relić"
  tags: [tag1, tag2, tag3]  # Optional - posts can have tags or no tags
  ---
  ```
- **Tags**: Posts can optionally include tags for categorization
  - Add tags as an array in the front matter: `tags: [python, bioinformatics]`
  - Tags are displayed below the post title
  - Tags link to the tags page with anchor navigation
  - Posts without tags are perfectly valid

### Pages
- Location: `_pages/`
- Layout: Use `layout: post` for pages (Tale uses post layout for all content pages)
- Current pages:
  - `_pages/about.md` - Short, subtle about section with social links
  - `_pages/archive.md` - Shows posts older than 1 year, grouped by year
  - `_pages/tags.md` - Lists all posts organized by tags, alphabetically
- Navigation: Custom navigation in `_includes/navigation.html`
  - Posts (home)
  - Archive
  - Tags
  - About

### Archive System
The site uses an automatic archive system that separates recent and old content:

- **Home Page** (`index.html` with `_layouts/home.html`):
  - Shows only posts from the last year (365 days)
  - Automatically calculated based on current date vs. post date
  - Recent posts appear here
  - If no recent posts exist, displays a message with link to archive

- **Archive Page** (`_pages/archive.md`):
  - Shows only posts older than 1 year
  - Posts are grouped by year (most recent year first)
  - Each year section shows the month and day with post title
  - Displays message if no archived posts exist yet

**Important**: When adding a new post, the archive automatically updates. Posts older than 1 year will move from the home page to the archive. No manual intervention needed.

### Tags System

The site includes a tagging system for categorizing posts:

- **Tags Page** (`_pages/tags.md`): Lists all posts grouped by their tags
- **Tag Display**: Tags appear below post titles on individual post pages
- **Clickable Tags**: Tags link to the tags page with anchor navigation
- **Optional**: Posts can have multiple tags, a single tag, or no tags at all

**Adding tags to posts:**
```yaml
---
layout: post
title: "Your Post Title"
author: "Đorđe Relić"
tags: [tag1, tag2, tag3]
---
```

**Tags are:**
- Displayed alphabetically on the tags page
- Shown below the post title with links to tag sections
- Completely optional - omit the `tags:` line if not needed

### Dark Mode

The site includes a custom dark mode implementation:

- **Toggle Button**: Fixed-position button (bottom-right) with moon/sun icons
- **Automatic Detection**: Respects system preference (`prefers-color-scheme`)
- **Persistence**: User choice saved in localStorage
- **Smooth Transitions**: 0.3s ease transitions for theme changes

**Files:**
- `assets/css/dark-mode.css` - CSS variables and styling for both themes
- `assets/js/dark-mode.js` - Theme switching logic and localStorage handling
- `_includes/dark-mode-toggle.html` - Toggle button HTML
- `_includes/head.html` - Custom head with dark mode initialization (prevents flash)
- `_layouts/default.html` - Overridden layout to include toggle button

**Color Variables:**
- Light mode: White background, dark text (#555), blue links (#4a9ae1)
- Dark mode: Dark background (#1a1a1a), light text (#d4d4d4), bright blue links (#6bb6ff)

**Customization:**
To modify dark mode colors, edit the CSS variables in `assets/css/dark-mode.css` under the `[data-theme="dark"]` selector.

### Assets
- Images: `assets/imgs/`
- CSS: `assets/css/`
- JavaScript: `assets/js/`

## Tale Theme Details

Tale is a minimal Jekyll theme designed specifically for storytellers and writers:

- **Design Philosophy**: Content-first, distraction-free reading experience
- **Features**: Responsive design, pagination, syntax highlighting
- **Permalink Structure**: `/:year-:month-:day/:title`

### Customization

To customize the Tale theme:
- Override layouts by creating files in `_layouts/`
- Override includes by creating files in `_includes/`
- Add custom CSS in `assets/css/` directory
- Tale's default typography is optimized for readability

## Deployment

This site deploys automatically via GitHub Pages when pushing to the `master` branch. No manual build or deployment steps are required.

## Important Notes

- All dependencies are managed via `github-pages` gem to ensure compatibility
- Generated files (`_site/`, `.sass-cache/`, etc.) are gitignored
- The site excludes build configuration files as defined in `_config.yml`
