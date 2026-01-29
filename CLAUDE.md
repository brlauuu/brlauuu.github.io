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
- **Pagination**: 5 posts per page

## Directory Structure

```
_posts/          # Blog posts (YYYY-MM-DD-title.md format)
_pages/          # Static pages (about, archive)
_includes/       # Custom HTML includes (for theme overrides)
assets/
  imgs/          # Images for posts and pages
_config.yml      # Jekyll configuration
index.html       # Homepage with paginated post list
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
  ---
  ```

### Pages
- Location: `_pages/`
- Layout: Use `layout: post` for pages (Tale uses post layout for all content pages)
- Current pages:
  - `_pages/about.md` - Short, subtle about section with social links
  - `_pages/archive.md` - Chronological list of all posts
- Navigation defined in `_config.yml` under `navigation`

### Assets
- Images: `assets/imgs/`

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
