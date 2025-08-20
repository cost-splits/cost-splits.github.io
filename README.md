# Cost Split Calculator

Cost Split Calculator is a minimal front-end tool for dividing expenses among
groups. Try the live demo at
[cost-splits.github.io](https://cost-splits.github.io).

![Cost Split Calculator screenshot](assets/icon-banner.png)

## Features

- Responsive design that works on mobile and desktop
- Light and dark themes with a sun/moon toggle that remembers your choice
- Itemized transactions with proportional tax and tip
- Shareable URLs encoding the current calculator state
- Optional session pool name to label each set of transactions
- Save and load named pools using browser local storage with a table of saved
  pools for quick loading or deletion, highlighting the active pool and offering
  a quick **New Pool** reset
- Compact people list layout with clearly marked delete actions

## Getting Started

Clone the repository and install development dependencies.

```bash
git clone https://github.com/cost-splits/cost-splits.github.io.git
cd cost-splits.github.io
npm install
```

Serve `index.html` with any static server or open the file directly in a
browser.

## Usage

Before adding participants, optionally enter a name for your pool of
transactions using the field beneath the page title. Use the **New Pool** button
to start over or the **Save Pool** button to store the pool locally. The table
below highlights the current pool and lets you reload or delete saved pools.

1. Add participants and transactions.
2. Use the ▶/▼ controls to itemize a transaction when needed.
3. Copy the link in the **Share** section to send your split to others.

## Testing

| Command          | Description                |
| ---------------- | -------------------------- |
| `npm run lint`   | Lint the codebase          |
| `npm run format` | Format files with Prettier |
| `npm test`       | Run unit tests             |

## License

This project is licensed under the [Apache License 2.0](LICENSE).
