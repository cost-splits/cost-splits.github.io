# Cost Split Calculator

Cost Split Calculator is a minimal front-end tool for dividing expenses among
groups. Try the live demo at
[cost-splits.github.io](https://cost-splits.github.io).

![Cost Split Calculator screenshot](assets/icon-banner.png)

## Features

- Responsive layout for phones and desktops
- Clear sky-blue section bubbles with subtle contrast for easy scanning
- Slightly darker gray page background with sky-blue bubbles, complementary
  orange buttons, and subtle shadows for a consistent look
- Table rows tinted to match section bubbles for a cohesive appearance
- Tables outlined with subtle borders and rounded corners for a softer look
- Itemized and non-itemized transactions with proportional tax and tip
- Shareable URLs and optional named session pools stored locally
- Drag handles to reorder saved pools
- Warns before discarding unsaved changes when switching pools
- Compact participant list with clear totals
- External footer links open in new tabs with security safeguards
- Click a name in the summary to expand an "[Name] summary" beneath the table
  and a divider. The view highlights their transactions, split cells, and
  non-zero contributions in split details, with a settlement plan. If they
  haven't paid or split any costs, a note appears instead of an empty section.

## Usage

1. In the **People** section, add the names of all participants.
2. In the **Transactions** section, add transactions with a name, payee, and
   cost.
3. In the **Cost Splits** section, choose how each expense is divided:
   - **Even** – split equally among participants.
     [Example](https://cost-splits.github.io/?state=N4IgDg9hA2IFwgKIA8CGBbM0CmcAEAIgJYB2J2ATiADTjYRbbwDaIAgtEQMZO0BCEAEY0QAYVQUYIALq0ALhVQkAzqi5yiEFS1AkMTBMTKURXCMrnwA7AA4AdABYAzLTCoAnibgAGWsqxEcsosAIzUYSHSAL7RQA)
   - **Fractional** – specify each person's portion as a decimal.
     [Example](https://cost-splits.github.io/?state=N4IgDg9hA2IFwgKIA8CGBbM0CmcAEAYgE6oDGALgJYQB2qsANONhFtvANogCCNdITAEKoiRAJ4CQAYWgjUIALpNyJGgGcyVWms6g66dgkQ4KRSqUrkJTUhDXl4ARgBMAZgB0ANgDsTMKjFsIicmNSxLHTgOAAZ3AFYGWNdE92cFAF8MoA)
   - **Shares** – assign share counts to weight the split.
     [Example](https://cost-splits.github.io/?state=N4IgDg9hA2IFwgKIA8CGBbM0CmcAEAgmKgE4Au62AdmSADTjYRbbwDaIBOy9IAQqgCWOAJ68AwgAsSggM4gAugzIlUVWagDGZQRHXtQVDKwQAlarQaaIs2nABMAFgDMAVgB0rhsRHYS8AEYGWSxBMnk4NiD7OmcFAF8EoA)
   - **Itemized** – expand a transaction to assign specific items.
     [Example](https://cost-splits.github.io/?state=N4IgDg9hA2IFwgKIA8CGBbM0CmcAEAMgK4B2AxgBYgA042EW28A2iACKomo1LQCWPAGJ8IXEAF1aAFwBOnAM6oyUkSXktQXdEwTFyVWmQjyp8ACwB2AHQXaYVAE9sM+AAZa8rHynq4zAIzUgf6SIN7Y6L7MoOHo8CAAQkQyAObOPEYm8P4AzFY5tiCe-D4sge6u4gC+1DFSEfEAyqjQqAAmGcamcP7+VgBMABweXqV+7uXVtWH1cQgACqgm3IZd2WZWAKz9IyVRFUHVR1VAA)
4. In the **View Summary** section, review totals. Click a person's name to see
   their "[Name] summary" below the table, separated by a horizontal rule. The
   Transactions section highlights only rows they paid for, Cost Splits and
   split details emphasize their non-zero contributions, and each table ends
   with a total row for quick reference. Any section with no data will show a
   friendly note instead. Use **Close** to hide the personal view and remove
   highlights.
5. Use the **State** section to download or load a JSON file and the **Share**
   section to copy a link to the current state.

## Examples

- [Equal dinner split](https://cost-splits.github.io/?state=N4IgDg9hA2IFwgKIA8CGBbM0CmcAEAIgJYB2J2ATiADTjYRbbwDaIAgtEQMZO0BCEAEY0QAYVQUYIALq0ALhVQkAzqi5yiEFS1AkMTBMTKURXCMrnwA7AA4AdABYAzLTCoAnibgAGWsqxEcsosAIzUYSHSAL7RQA)
- [Utility bill with fractional split](https://cost-splits.github.io/?state=N4IgDg9hA2IFwgKIA8CGBbM0CmcAEAYgE6oDGALgJYQB2qsANONhFtvANogCCNdITAEKoiRAJ4CQAYWgjUIALpNyJGgGcyVWms6g66dgkQ4KRSqUrkJTUhDXl4ARgBMAZgB0ANgDsTMKjFsIicmNSxLHTgOAAZ3AFYGWNdE92cFAF8MoA)
- [Apartment costs with uneven shares](https://cost-splits.github.io/?state=N4IgDg9hA2IFwgKIA8CGBbM0CmcAEAgmKgE4Au62AdmSADTjYRbbwDaIBOy9IAQqgCWOAJ68AwgAsSggM4gAugzIlUVWagDGZQRHXtQVDKwQAlarQaaIs2nABMAFgDMAVgB0rhsRHYS8AEYGWSxBMnk4NiD7OmcFAF8EoA)
- [Itemized lunch with proportional tax and tip](https://cost-splits.github.io/?state=N4IgDg9hA2IFwgKIA8CGBbM0CmcAEAMgK4B2AxgBYgA042EW28A2iACKomo1LQCWPAGJ8IXEAF1aAFwBOnAM6oyUkSXktQXdEwTFyVWmQjyp8ACwB2AHQXaYVAE9sM+AAZa8rHynq4zAIzUgf6SIN7Y6L7MoOHo8CAAQkQyAObOPEYm8P4AzFY5tiCe-D4sge6u4gC+1DFSEfEAyqjQqAAmGcamcP7+VgBMABweXqV+7uXVtWH1cQgACqgm3IZd2WZWAKz9IyVRFUHVR1VAA)
- [Group trip with multiple expenses](https://cost-splits.github.io/?state=N4IgDg9hA2IFwgKIA8CGBbM0CmcAEAKgE4CWYIANONhFtvANogCCOylIAQtKiURwGFUAZ2wBPDgBFsANxIA7DomjQSEAC4gAulXVFU84agDG6tYcah5GegiEAjDsYjDNcAKwAOAHQBOd1RgqGLY-HAAzFTCWCTqwowAjBRJKclaAL4UVjbwIAASGtiwVM6u8ABsAEzh3gAsSeDBofAADFExcYkUlcm9CRlZINbotiCSCvLNJS5ulQk1np6BTWE9INGqnXAMqbs6ILHY6PHboIfouQBiUAAmTjPwCZ7u3gHrHSc7fX0DZ+pHuUkpHkAGt4tMynBKj5wkt3ptPm1UkiMr8hjkEAQSMYQdhOhC3PMXuUAOzLEJhWrtBFdJJItLpDJAA)

## Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/cost-splits/cost-splits.github.io.git
cd cost-splits.github.io
npm install
```

Open `index.html` directly in your browser or serve the folder with any static
web server to iterate on changes. The project uses plain HTML, CSS, and
JavaScript, so no build step is required. Node is only needed for linting,
formatting, and testing.

| Command          | Description                |
| ---------------- | -------------------------- |
| `npm run lint`   | Lint the codebase          |
| `npm run format` | Format files with Prettier |
| `npm test`       | Run unit tests             |

## License

This project is licensed under the [Apache License 2.0](LICENSE).
