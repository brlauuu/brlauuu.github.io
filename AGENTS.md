# Repository Guidelines

## Project Structure & Module Organization
- `_posts/` holds blog posts in `YYYY-MM-DD-title.md` format.
- `_pages/` contains static pages like `about.md`, `archive.md`, and `tags.md`.
- `_includes/` and `_layouts/` override the Tale theme’s HTML templates.
- `assets/` stores site assets: `assets/imgs/`, `assets/css/`, `assets/js/`.
- `_config.yml` contains Jekyll site configuration; `_site/` is the generated output.

## Build, Test, and Development Commands
- `bundle install` installs Ruby dependencies (use Ruby 3.3.4).
- `bundle exec jekyll serve` runs the local server at `http://localhost:4000`.
- `bundle exec jekyll build` generates the static site into `_site/`.

## Coding Style & Naming Conventions
- Write content in Markdown with YAML front matter.
- Required front matter for posts:
  ```yaml
  ---
  layout: post
  title: "Post Title"
  author: "Đorđe Relić"
  tags: [tag1, tag2] # optional
  ---
  ```
- Use kebab-case for filenames and keep titles in sentence case.
- Keep HTML/CSS changes minimal and consistent with the existing Tale theme overrides.

## Testing Guidelines
- No automated test suite is configured.
- Validate changes by running `bundle exec jekyll build` and reviewing pages locally with `bundle exec jekyll serve`.
- For visual changes (CSS/layouts), spot-check key pages: home, archive, tags, and a post page.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and descriptive (e.g., “Add favicon.ico…”, “Fix reference links…”).
- PRs should include a brief summary, the scope of changes, and links to related issues if any.
- Include screenshots or before/after notes when UI, layout, or typography changes.
- Avoid committing `_site/` output; GitHub Pages builds from `master` automatically.

## Deployment Notes
- Deployments are handled by GitHub Pages on pushes to `master`.
- Keep dependencies aligned with the `github-pages` gem to match the production environment.
