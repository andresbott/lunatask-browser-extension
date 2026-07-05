# Privacy Policy

This unofficial Lunatask extension lets you save webpages, links, and
selections to your Lunatask account as tasks or notes.

## Data the extension handles

When you click a save action in the extension popup or right-click menu,
the extension may access:

- The active page URL and title
- A link URL when saving a link from the right-click menu
- Extracted page content when saving a page
- The current page selection when saving a selection
- The Lunatask access token and IDs you provide (optional
  Area/Goal/Notebook IDs) before using the extension

## Where data is stored

- Your configured credentials and IDs are stored locally in your
  browser.
- Saved tasks/notes and any extracted page content or selection are sent
  to Lunatask and stored in your Lunatask account according to
  Lunatask's policies.

## Where data is sent

When you save, the extension sends data to the Lunatask API:

- `https://api.lunatask.app/v1/tasks` for tasks
- `https://api.lunatask.app/v1/notes` for notes

The extension does not intentionally send your data to any other third
parties.

## When data is accessed

The extension only attempts to read page information/content, link URLs,
or selections when you explicitly click a save action in the extension
popup or right-click menu.

## Contact

If you have questions or want to report an issue, please use the
project's issue tracker on GitHub:

- https://github.com/andresbott/lunatask-browser-extension
