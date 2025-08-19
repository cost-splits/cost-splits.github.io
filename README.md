# Cost Split Calculator

Cost Split Calculator is a minimal front-end tool for dividing expenses among
groups. Try the live demo at
[cost-splits.github.io](https://cost-splits.github.io).

![Cost Split Calculator screenshot](assets/icon-banner.png)

## Features

- Responsive design that works on mobile and desktop
- Itemized transactions with proportional tax and tip
- Shareable URLs encoding the current calculator state

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

1. Add participants and transactions.
2. Use the ▶/▼ controls to itemize a transaction when needed.
3. Copy the link in the **Share** section to send your split to others.

## Testing

| Command          | Description                |
| ---------------- | -------------------------- |
| `npm run lint`   | Lint the codebase          |
| `npm run format` | Format files with Prettier |
| `npm test`       | Run unit tests             |

## Contributing

Contributions are welcome! Please see [AGENTS.md](AGENTS.md) for detailed
guidelines.

## License

This project is licensed under the [ISC License](LICENSE).
