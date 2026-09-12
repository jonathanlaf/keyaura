# KeyAura icons

`keyaura-tray-icon.svg` is the monochrome menu-bar source. Keep
`icon_as_template(true)` for native contrast.

`icon.png` is the colorful bundled application icon, generated from
`ui/icons/logo.png`. `icon.ico` is the same source converted to Windows'
resource-icon format — `tauri-build`'s build script requires it to exist
whenever `bundle.icon` lists it (Windows NSIS/resource-file generation, not
just an NSIS-only requirement), even though the macOS `.dmg`/`.app` bundle
step converts `icon.png` to `.icns` on the fly and needs no checked-in file.

Regenerate from the repository root:

```sh
icon_build_dir=$(mktemp -d /private/tmp/keyaura-icons.XXXXXX)
cargo tauri icon src-tauri/icons/keyaura-tray-icon.svg --output "$icon_build_dir/tray" --png 64
cp "$icon_build_dir/tray/64x64.png" src-tauri/icons/tray.png
sips -z 512 512 ui/icons/logo.png --out src-tauri/icons/icon.png
cargo tauri icon ui/icons/logo.png --output "$icon_build_dir/app"
cp "$icon_build_dir/app/icon.ico" src-tauri/icons/icon.ico
```
