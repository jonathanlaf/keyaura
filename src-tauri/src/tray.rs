#[cfg(debug_assertions)]
use tauri::menu::Submenu;
use tauri::menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Listener, Manager};

pub fn build(app: &AppHandle) -> tauri::Result<()> {
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "Hide keyboard", true, None::<&str>)?;
    #[cfg(debug_assertions)]
    let force_connection = MenuItem::with_id(
        app,
        "force-connection",
        "Force connected state",
        true,
        None::<&str>,
    )?;
    let pin = MenuItem::with_id(app, "pin", "Unpin keyboard", true, None::<&str>)?;
    if let Ok(path) = crate::app::config_path(app) {
        let cfg = crate::config::load(&path);
        let _ = pin.set_text(if cfg.overlay_pinned {
            "Pin keyboard"
        } else {
            "Unpin keyboard"
        });
    }
    let about = MenuItem::with_id(app, "about", "About", true, None::<&str>)?;
    let legend = MenuItem::with_id(
        app,
        "legend",
        "Show icons && layers legend",
        true,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let end_separator = PredefinedMenuItem::separator(app)?;
    #[cfg(debug_assertions)]
    let dev_separator = PredefinedMenuItem::separator(app)?;
    #[cfg(debug_assertions)]
    let devtools = MenuItem::with_id(app, "devtools", "Open DevTools", true, None::<&str>)?;
    #[cfg(debug_assertions)]
    let refresh = MenuItem::with_id(app, "refresh", "Refresh", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    #[cfg(debug_assertions)]
    let developer = Submenu::with_items(
        app,
        "Developer",
        true,
        &[&devtools, &force_connection, &refresh],
    )?;
    let mut items: Vec<&dyn IsMenuItem<tauri::Wry>> =
        vec![&settings, &separator, &pin, &toggle, &legend];
    #[cfg(debug_assertions)]
    items.push(&dev_separator);
    #[cfg(debug_assertions)]
    items.push(&developer);
    items.push(&about);
    items.push(&end_separator);
    items.push(&quit);
    let menu = Menu::with_items(app, &items)?;
    let pin_handle = pin.clone();
    let toggle_handle = toggle.clone();
    app.listen("config-changed", move |event| {
        if let Ok(cfg) = serde_json::from_str::<crate::config::Config>(event.payload()) {
            let _ = pin.set_text(if cfg.overlay_pinned {
                "Pin keyboard"
            } else {
                "Unpin keyboard"
            });
        }
    });
    let toggle_listener = toggle_handle.clone();
    app.listen("overlay-visibility", move |event| {
        if let Ok(payload) = serde_json::from_str::<serde_json::Value>(event.payload()) {
            let hidden = payload
                .get("hidden")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let _ = toggle_listener.set_text(if hidden {
                "Show keyboard"
            } else {
                "Hide keyboard"
            });
        }
    });

    // Rasterized from icons/keyaura-tray-icon.svg. Keep the transparent monochrome image
    // as a template so macOS supplies contrasting light/dark menu-bar colors.
    let tray_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray.png"))?;
    TrayIconBuilder::with_id("main")
        .icon(tray_icon)
        .icon_as_template(true)
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "refresh" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(error) = crate::layout::refresh_layout(app.clone()).await {
                        eprintln!("KeyAura: {error}");
                        let _ = tauri::Emitter::emit(&app, "layout-error", error);
                    }
                });
            }
            "toggle" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(error) = crate::app::toggle_overlay_visibility(app.clone()).await {
                        eprintln!("KeyAura: overlay toggle failed: {error}");
                        let _ = tauri::Emitter::emit(&app, "overlay-toggle-error", error);
                    }
                });
            }
            #[cfg(debug_assertions)]
            "force-connection" => {
                let state = app.state::<crate::state::HudState>();
                let actual = state
                    .keyboard_online
                    .load(std::sync::atomic::Ordering::SeqCst);
                let current = state
                    .connection_override
                    .load(std::sync::atomic::Ordering::SeqCst);
                let effective = match current {
                    0 => false,
                    1 => true,
                    _ => actual,
                };
                let forced_online = !effective;
                state.connection_override.store(
                    if forced_online { 1 } else { 0 },
                    std::sync::atomic::Ordering::SeqCst,
                );
                let _ = force_connection.set_text(if forced_online {
                    "Force disconnected state"
                } else {
                    "Force connected state"
                });
                let event = if forced_online {
                    "keyboard-online"
                } else {
                    "keyboard-offline"
                };
                let _ = tauri::Emitter::emit(app, event, serde_json::json!({ "forced": true }));
                if forced_online {
                    let app = app.clone();
                    tauri::async_runtime::spawn(async move {
                        match crate::layout::load_layout(app.clone()).await {
                            Ok(layout) => {
                                let _ = tauri::Emitter::emit(&app, "layout-refreshed", layout);
                            }
                            Err(error) => {
                                let _ = tauri::Emitter::emit(&app, "layout-error", error);
                            }
                        }
                    });
                }
            }
            "pin" => {
                // The shared interactive-mode flag drives the menu's action
                // label. Its legacy name is `pinned`; true means unpinned
                // with grab controls visible in the current UI.
                let state = app.state::<crate::state::HudState>();
                let pinned = !state.pinned.load(std::sync::atomic::Ordering::SeqCst);
                let _ = pin_handle.set_text(if pinned {
                    "Pin keyboard"
                } else {
                    "Unpin keyboard"
                });
                // Only update the shared flag here. Applying the window flag
                // and emitting grab-mode is left entirely to grab::spawn's
                // poll loop, which recomputes `grabbed || pinned` every tick
                // against its own last-applied cache — if tray.rs also wrote
                // set_ignore_cursor_events/grab-mode directly, the two could
                // desync (e.g. unchecking pin while the combo is still held
                // would wrongly force the window non-interactive here, and
                // the loop's cache would then suppress the correction).
                match crate::app::update_config(app, move |cfg| cfg.overlay_pinned = pinned) {
                    Ok(cfg) => {
                        let _ = tauri::Emitter::emit(app, "config-changed", cfg);
                    }
                    Err(error) => {
                        let _ = pin_handle.set_text(if pinned {
                            "Unpin keyboard"
                        } else {
                            "Pin keyboard"
                        });
                        eprintln!("KeyAura: could not save pin mode: {error}");
                    }
                }
            }
            "legend" => {
                if let Some(w) = app.get_webview_window("legend") {
                    let _ = w.unminimize();
                    let _ = w.show();
                    let _ = w.set_focus();
                } else if let Err(e) = tauri::WebviewWindowBuilder::new(
                    app,
                    "legend",
                    tauri::WebviewUrl::App("legend.html".into()),
                )
                .title("KeyAura — Icons & Layers legend")
                .inner_size(620.0, 640.0)
                .min_inner_size(420.0, 320.0)
                .always_on_top(true)
                .build()
                {
                    eprintln!("KeyAura: failed to open icon legend: {e}");
                }
            }
            "about" => {
                if let Some(w) = app.get_webview_window("about") {
                    let _ = w.unminimize();
                    let _ = w.show();
                    let _ = w.set_focus();
                } else if let Err(e) = tauri::WebviewWindowBuilder::new(
                    app,
                    "about",
                    tauri::WebviewUrl::App("about.html".into()),
                )
                .title("About KeyAura")
                .inner_size(460.0, 620.0)
                .min_inner_size(420.0, 520.0)
                .always_on_top(true)
                .build()
                {
                    eprintln!("KeyAura: failed to open About window: {e}");
                }
            }
            "settings" => {
                if let Some(w) = app.get_webview_window("settings") {
                    let _ = w.unminimize();
                    let _ = w.reload();
                    let _ = w.set_always_on_top(true);
                    let _ = w.show();
                    let _ = w.set_focus();
                } else {
                    let (width, height) = crate::app::config_path(app)
                        .ok()
                        .map(|path| {
                            let cfg = crate::config::load(&path);
                            (cfg.settings_window_width, cfg.settings_window_height)
                        })
                        .unwrap_or((860.0, 760.0));
                    if let Err(e) = tauri::WebviewWindowBuilder::new(
                        app,
                        "settings",
                        tauri::WebviewUrl::App("settings.html".into()),
                    )
                    .title("KeyAura Settings — General")
                    .inner_size(width, height)
                    .min_inner_size(680.0, 560.0)
                    .always_on_top(true)
                    .build()
                    {
                        eprintln!("KeyAura: failed to open Settings window: {e}");
                    }
                }
            }
            #[cfg(debug_assertions)]
            "devtools" => {
                let state = app.state::<crate::state::HudState>();
                state
                    .pinned
                    .store(true, std::sync::atomic::Ordering::SeqCst);
                let _ = pin_handle.set_text("Pin keyboard");
                let _ = crate::app::update_config(app, |cfg| cfg.overlay_pinned = true);
                if let Some(window) = app.get_webview_window("overlay") {
                    let _ = window.set_ignore_cursor_events(false);
                }
                // Open both — the bug being chased is often a mismatch
                // between what Settings sends and what the overlay applies,
                // so one console alone tells half the story.
                if let Some(w) = app.get_webview_window("settings") {
                    w.open_devtools();
                }
                if let Some(w) = app.get_webview_window("overlay") {
                    w.open_devtools();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}
