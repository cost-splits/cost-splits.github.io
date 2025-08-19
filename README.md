# Cost Split Calculator

A minimal front-end application for splitting costs between people. The state of
the calculator can now be shared via URL parameters.

## Responsive Design

The interface uses relative units and viewport-based font sizing so it remains
readable on devices from mobile phones to large desktop monitors. Tables and
form controls adapt at narrow widths to keep the layout touch-friendly.

## Itemized Transactions

Transactions may include optional item rows to handle receipts where each item
is split differently. Enter the total cost as usual, then itemize the
transaction to add items with their own split weights. The calculator scales
each item's cost so that the sum matches the transaction's total, distributing
any tax or tip proportionally before applying the item-level splits. Item rows
can be expanded or collapsed with the ▶/▼ controls, and the split table
separates name and cost columns for easier editing.

## Sharing

The current state is reflected in a read-only field in the Share section. Copy
this link to share with others. The `state` parameter contains a
[LZ-String](https://pieroxy.net/blog/pages/lz-string/index.html) compressed JSON
representation of the calculator's state. When visiting a link containing this
parameter, the page will automatically decompress and load that state.
