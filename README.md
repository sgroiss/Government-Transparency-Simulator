# The Redactor — Government Transparency Simulator

Experience government transparency firsthand. Certain names are blacked out
across the entire internet — for your protection.

Hover a redaction to see why you lack clearance. Click to declassify it for
three glorious seconds. The badge counts how many documents were redacted on
the current page; the popup keeps a lifetime tally of words withheld from
the public.

**This is satire.** Nothing is actually classified. Probably.

## Features

- Blacks out configured terms on every page, including dynamically loaded content
- Hover tooltip with an official denial, randomly assigned per redaction
- Click to declassify for 3 seconds (it re-seals itself, as documents do)
- Per-page badge counter and lifetime "words withheld" statistic
- Classified Terms Registry (options page) — file your own amendments
- On/off switch for when you need the truth

## Install (unpacked / "we test in production")

**Chrome / Edge / Brave:**

1. Open `chrome://extensions`
2. Enable *Developer mode* (top right)
3. *Load unpacked* → select this folder

**Firefox:**

1. Open `about:debugging#/runtime/this-firefox`
2. *Load Temporary Add-on…* → select `manifest.json`

## Build for store submission

```
./tools/build.sh
```

Produces two zips in `dist/`:

- `the-redactor-<version>-chrome.zip` → Chrome Web Store, Edge Add-ons
- `the-redactor-<version>-firefox.zip` → AMO (Firefox)

They differ only in the `background` key (`service_worker` vs. `scripts`) —
Chrome's MV3 validator rejects `background.scripts` outright, so one manifest
can't serve both. `manifest.json` (root) is the Chrome/Edge version and is
also what "Load unpacked" uses for local dev; `manifest.firefox.json` is
swapped in as `manifest.json` only inside the Firefox zip.

## Privacy

No data is collected, transmitted, or sold. Your term list syncs through your
own browser account (`storage.sync`); counters stay on your machine. See
[PRIVACY.md](PRIVACY.md). This agency lacks the budget for surveillance.

## Support

If this made you laugh, [buy me a beer](https://buymeacoffee.com/innocentump). 🍺
