# KeyAura icons

`keyaura-tray-icon.svg` is the monochrome menu-bar source. Keep
`icon_as_template(true)` for native contrast.

`icon.png` is the colorful bundled application icon, generated from
`ui/icons/logo.png`.

Regenerate from the repository root:

```sh
icon_build_dir=$(mktemp -d /private/tmp/keyaura-icons.XXXXXX)
cargo tauri icon src-tauri/icons/keyaura-tray-icon.svg --output "$icon_build_dir/tray" --png 64
cp "$icon_build_dir/tray/64x64.png" src-tauri/icons/tray.png
sips -z 512 512 ui/icons/logo.png --out src-tauri/icons/icon.png
```
