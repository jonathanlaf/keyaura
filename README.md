# KeyAura

[![CI](https://github.com/jonathanlaf/keyaura/actions/workflows/ci.yml/badge.svg)](https://github.com/jonathanlaf/keyaura/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/jonathanlaf/keyaura?include_prereleases)](https://github.com/jonathanlaf/keyaura/releases/latest)

A highly configurable macOS overlay for learning programmable keyboards through their QMK firmware events. KeyAura keeps the active layer, physical key presses, layer triggers, alternate characters, and Shift hints visible while you work.

KeyAura is designed around keyboard adapters, so support can grow beyond a single manufacturer or model. Today it ships with one adapter: the ZSA Voyager through its Oryx Raw HID interface. Additional QMK keyboard adapters are planned; a standard QMK firmware alone does not guarantee one universal host-side event protocol.

This project is fully vibe coded as an experiment in building a useful native utility with [Claude](https://www.anthropic.com/claude) and [OpenAI Codex](https://openai.com/codex/).

## Icon attribution

The layer-target glyph is adapted from Streamline's [Layers 1 icon](https://github.com/webalys-hq/streamline-vectors/blob/main/plump/remix/interface-essential/layers-1.svg) by Webalys. It is bundled locally under the Streamline vector license. The remaining UI glyphs are original project artwork.

## How it works

KeyAura reads physical key-down/up events and layer changes from a supported keyboard’s QMK transport. The current Voyager adapter also reads the flashed layout identity from its Raw HID interface. **Its labels and layer definitions come from Oryx’s online service**, not from reading the firmware binary. KeyAura requests the flashed revision, not unflashed web-editor edits.

After a successful fetch, layout metadata is cached locally. A matching cached revision remains usable when the layout service is unavailable. A different firmware/layout revision needs its own successful fetch; KeyAura will not substitute unrelated cached metadata.

The `OFFLINE` pill means the keyboard’s event connection is unavailable. A layout-service outage does not stop live key/layer events when a matching cache exists.

## Getting started

Download the app from [Releases](https://github.com/jonathanlaf/keyaura/releases), open the DMG, and move KeyAura to Applications. Rust and Node are not needed to run a downloaded app.

Connect a keyboard supported by a KeyAura adapter. The current Voyager adapter requires compatible Oryx firmware; close Keymapp and browser Oryx live-training sessions so they do not compete for the HID interface. An internet connection is needed for this adapter’s first layout-metadata fetch.

This is a macOS-only app. The first compatible keyboard interface is used; there is no device picker yet. Adapter-specific limitations are documented with each supported keyboard.

## Usage

- **Menu bar:** Open Settings, unpin/pin the keyboard, hide/show it, open the icons and layers legend or About, or quit. The Developer submenu exists only in debug builds and offers DevTools, a forced connection display state, and Refresh.
- **Move and resize:** Hold the grab shortcut (⌘⌥ by default) or choose **Unpin keyboard**. Drag the board or its corner handles. **Pin keyboard** restores click-through behavior. The app constrains proportions and saves position and size per monitor.
- **Appearance:** Configure fills, borders, opacity, shadows, pressed-key feedback, icon visibility and sizes, heatmap coloring/counts, and key spacing. Fonts have their own tab; enter an installed font family or leave it blank for the system font. The global ligature checkbox controls font shaping; italic letterforms depend on the selected font.
- **Position:** Center horizontally or vertically, align to the top or bottom, change the gap and rotation of the halves, and position the layer/offline pills. Reset layout restores default position, size, spacing, and rotation. Choose the hidden edge, visible amount, and animation duration here too.
- **Toggle shortcut:** Record physical presses, then Stop. Repeated taps work, as do different keys pressed in order. Matching uses a maximum one-second gap between presses. It is an ordered sequence, not a system-wide chord/hold recognizer, and only receives events from the connected supported keyboard. Record then Stop without pressing a key to clear it.
- **Hide/show:** The same sequence hides and restores the overlay. The real key layers are translated and clipped at the selected monitor edge to avoid showing the hidden portion on a neighboring display. Zero visible amount hides it completely; nonzero amounts retain at least approximately one key-width of visibility. Alignment, position reset, and geometry changes restore a hidden overlay before repositioning it.
- **Legend:** A separate window lists icon meanings and named layers, with action icons, keycap symbols, and instructions for each configured tap, hold, double-tap, and tap-and-hold route. These are configured actions, not a live interpretation of firmware gesture timing.
- **About:** Shows the app version, credits, transparent logo, QMK link, source code, and links for the current keyboard adapter when available.

Character translation currently includes macOS Canadian-CSA mappings plus standard keycode labels. It does not detect or reproduce every operating-system input source.

## Heatmap and privacy

Counts accumulate while KeyAura is running, even when heatmap coloring is disabled. Enable **Show key heatmap** in Appearance to tint frequently pressed keys; the saturation setting controls how many presses reach full intensity. **Show heatmap counts on keys** replaces the labels with numbers independently of the coloring toggle.

Counts are per physical key, shared across all layers and connected keyboards; they are not separate totals for each firmware action. A double tap contributes two presses; a held key contributes one. Operating-system key repeat does not add presses. Reset heatmap history separately in Appearance.

Heatmap totals are stored locally in the overlay's WebKit storage and survive normal restarts. Saves are throttled to 250 ms and flushed on page exit; a crash or forced quit can lose the latest unsaved interval. No typed text or timestamped key history is stored. Key events and counts are not sent to a layout service; the current adapter sends only the layout identity needed to retrieve labels.

## Settings and backups

Settings uses a searchable sidebar: selecting an option opens its section and highlights the corresponding row. General opens first with the keyboard/layout overview, app version and available-update notice. Its Connect/Disconnect button releases or reconnects the HID interface so other keyboard apps can use it.

General also contains Startup options (Start at login and Start hidden), JSON import/export, and Reset with confirmation. Export writes into your macOS Downloads directory and displays the **actual saved path**. Repeated exports get numbered filenames and never overwrite earlier exports. Import reports success after the Settings page refreshes.

Import replaces the app's preferences, including saved monitor positions (restored on the next launch); out-of-range numbers and invalid colors are sanitized. Missing fields in older backups receive defaults. Reset restores default app preferences and recenters the overlay.

The JSON backup covers `config.json`, not the layout cache or heatmap history. Start at login is managed separately by macOS through the autostart plugin; it is not included in that file and is not changed by Reset.

The app's settings and layout cache are normally stored in:

```text
~/Library/Application Support/io.jonathanlaf.layerhud/config.json
~/Library/Application Support/io.jonathanlaf.layerhud/layout.json
```

Settings/cache from the old `io.jonathanlaf.voyagerhud` identifier are migrated when no new copy exists. Old caches without revision metadata may need one online refresh to establish that they match the flashed revision.

## Troubleshooting

- **No layout:** Connect a supported keyboard and close competing HID apps. Reconnect through General’s Connect/Disconnect button to retry retrieval; debug builds also have Developer → Refresh. If the current adapter has never fetched metadata for this revision, its layout service must be reachable first.
- **OFFLINE:** Check the USB connection and firmware, then close competing applications using the keyboard’s event interface. Detection retries automatically.
- **Wrong-looking characters:** Check your OS input source. The translator's Canadian-CSA mappings are not a universal mapping for all language layouts.
- **Hidden overlay:** Trigger the recorded sequence again, or use a positioning control in Settings to bring it back.
- **Corrupt settings:** Use General → Reset. Invalid/missing JSON falls back to defaults; keep a JSON export if you want to restore your custom preferences.

## Development

Install Rust/Cargo, Xcode Command Line Tools, and the Tauri CLI. Node 22 or later is used only for tests; the frontend is plain HTML/CSS/JavaScript with no npm dependencies or bundler. QMK firmware tooling is not a build dependency.

```sh
xcode-select --install
cargo install tauri-cli --locked
cargo tauri dev
```

From the repository root, run the checks and build:

```sh
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --locked --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --locked --manifest-path src-tauri/Cargo.toml
node --test ui/test/*.test.mjs
cargo tauri build
```

Bundles are written beneath `src-tauri/target/release/bundle/macos/` and `src-tauri/target/release/bundle/dmg/`. The source audit and remaining verification work are recorded in [the v0.0.3 audit](docs/audit-v0.0.3.md). Documents under `docs/superpowers/` are historical plans, not descriptions of the current architecture.

## Releases and provenance

Prepare a `release/vX.Y.Z` branch with matching versions in `Cargo.toml`, `Cargo.lock`, and `tauri.conf.json`. Open its PR into `main` and wait for CI to pass. Merging that release PR creates the matching tag on the merge commit, then calls the release workflow directly. Ordinary feature PRs do not create releases.

The direct workflow call is necessary because tags pushed by GitHub's built-in token do not trigger another workflow. Manually pushed matching version tags still run the same release workflow. Retrying the release-branch workflow reuses an existing tag only if it points to the same merge commit; a conflicting tag is rejected without being moved.

The release workflow checks tag ancestry and version consistency, builds the app, and creates a **draft release whose notes are assembled from the titles and descriptions of PRs merged into that release branch**. Write useful feature-PR descriptions: they become the release notes. A tag that is not reachable from `main` is rejected and deleted by the workflow. Drafts require manual review/publication; the version badge shows the latest published release.

Verify a downloaded DMG's GitHub build provenance with:

```sh
gh attestation verify <downloaded-file>.dmg --owner jonathanlaf
```

This verifies the build's repository/workflow provenance, not that the application is bug-free. GitHub attestation is separate from Apple Developer ID signing and notarization, which the current workflow does not configure; macOS may show a security warning.
