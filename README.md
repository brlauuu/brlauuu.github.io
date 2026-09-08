Personal blog.

## Project cards

Edit `_data/projects.yml` to add, remove, or reorder projects. Each entry creates one sidebar card; there is no separate Projects page.

```yaml
- name: My project
  repository: owner/repository
  logo_url: https://raw.githubusercontent.com/owner/repository/main/public/icon.png
  website_fallback: https://my-project.example
  fallbacks:
    stars: "—"
    forks: "—"
  counter:
    label: downloads
    url: https://my-project.example/api/public-stats
    field: count
    fallback: "—"
```

- `name` and `repository` are required. Other settings are optional.
- GitHub supplies stars, forks, and the website from the repository's **About → Website** field. `website_fallback` is used if that field is empty, invalid, or GitHub cannot be reached. With neither URL, the website icon is muted and disabled. The GitHub icon always links to the repository.
- `logo_url` loads directly from the supplied URL. A raw GitHub URL following `main` picks up future changes after normal browser/CDN caching. Broken images are hidden. Current icons are monochrome and receive contrast/inversion styling for light and dark themes; revisit that styling before using a full-color logo.
- `counter.label` is `downloads` (default) or `users`; this selects the icon and accessible label.
- `counter.url` is your public JSON endpoint. Leave it blank until available. No download/user totals are inferred from GitHub release downloads or fabricated.
- `counter.field` selects a JSON field, defaulting to `count`. Use a dot path such as `stats.active_users` for nested data, or `field: ""` when the entire response is a number.
- Counts must be nonnegative integer JSON numbers, not strings. Large values display compactly; hover or assistive technology exposes the full number.
- `fallbacks.stars`, `fallbacks.forks`, and `counter.fallback` accept a nonnegative integer or `"—"`. Defaults are dashes, indicating unavailable data. Numeric fallbacks are labeled as fallback values in tooltips.

A minimal counter response:

```json
{"count": 1234}
```

A nested response for `field: stats.active_users`:

```json
{"stats": {"active_users": 56}}
```

The endpoint must support browser requests without authentication. For another domain, allow the blog origin through CORS (or use `Access-Control-Allow-Origin: *` for a fully public endpoint). Use HTTPS for production URLs. Do not put private API keys or tokens in this file: settings are delivered to every browser.

Data sources load independently. Network failures, non-success responses, invalid JSON/counts, CORS blocks, and requests taking longer than eight seconds retain the fallback. Website destinations are not health-checked: a valid URL can still lead to a site that is offline. Fallbacks apply to data loading, not a guarantee that external websites are running.

## Local preview and checks

```sh
bundle exec jekyll serve --host 127.0.0.1 --port 4000
bundle exec jekyll build
node --test _tests/project-stats.test.cjs
node --check assets/js/project-stats.js
```

The dependency-free tests use Node's built-in test runner. `_tests/` is excluded from Jekyll output by its underscore prefix.
