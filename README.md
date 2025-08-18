# Cost Split Calculator

A minimal front-end application for splitting costs between people. The state of
the calculator can now be shared via URL parameters.

## Sharing

The current state is reflected in a read-only field in the Share section. Copy
this link to share with others. The `state` parameter contains a
[LZ-String](https://pieroxy.net/blog/pages/lz-string/index.html) compressed JSON
representation of the calculator's state. When visiting a link containing this
parameter, the page will automatically decompress and load that state.
