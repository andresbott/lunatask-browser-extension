# Privacy Policy

This unofficial Lunatask extension lets you save the current webpage to
your Lunatask account as a task or note.

## Data the extension handles

When you click a save button in the extension popup, the extension may
access:

- The active page URL and title
- Extracted page content (when using a content-based save mode)
- The Lunatask access token and IDs you provide (optional
  Area/Goal/Notebook IDs) before using the extension

## Where data is stored

- Your configured credentials and IDs are stored locally in your
  browser.
- Saved tasks/notes and any extracted page content are sent to Lunatask
  and stored in your Lunatask account according to Lunatask's policies.

## Where data is sent

When you save, the extension sends data to the Lunatask API:

- `https://api.lunatask.app/v1/tasks` for tasks
- `https://api.lunatask.app/v1/notes` for notes

The extension does not intentionally send your data to any other third
parties.

## When data is accessed

The extension only attempts to read page information/content when you
explicitly click a save action in the extension popup.

## Contact

If you have questions or want to report an issue, please use the
project's issue tracker on GitHub:

- https://github.com/andresbott/lunatask-browser-extension
