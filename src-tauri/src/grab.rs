use serde_json::json;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

// CGEventFlags modifier masks (CoreGraphics/CGEventTypes.h)
pub const MASK_SHIFT: u64 = 1 << 17;
pub const MASK_CTRL: u64 = 1 << 18;
pub const MASK_ALT: u64 = 1 << 19;
pub const MASK_CMD: u64 = 1 << 20;

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn CGEventSourceFlagsState(state_id: u32) -> u64;
}
#[cfg(target_os = "macos")]
const COMBINED_SESSION_STATE: u32 = 0;

/// Currently-held modifier keys, translated into this module's own
/// MASK_* bits — not any OS's native flag encoding — so the polling loop
/// below and combo_active/combo_mask stay identical across platforms.
#[cfg(target_os = "macos")]
fn current_flags() -> u64 {
    // CGEventFlags' NX_DEVICE*KEYMASK bit positions happen to already
    // match MASK_SHIFT/MASK_CTRL/MASK_ALT/MASK_CMD above, so the raw value
    // can be used as-is instead of translating bit-by-bit.
    unsafe { CGEventSourceFlagsState(COMBINED_SESSION_STATE) }
}

#[cfg(target_os = "windows")]
fn current_flags() -> u64 {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, VK_CONTROL, VK_LWIN, VK_MENU, VK_RMENU, VK_RWIN, VK_SHIFT,
    };
    // High bit of GetAsyncKeyState's result means "currently down" —
    // works globally regardless of which window has focus, matching
    // CGEventSourceFlagsState's session-wide semantics above. The Windows
    // key is the PC keyboard's physical equivalent of Cmd's position, so
    // it's what "cmd" in a saved combo maps to on this platform.
    let down = |vk: i32| unsafe { (GetAsyncKeyState(vk) as u16) & 0x8000 != 0 };
    let mut flags = 0;
    if down(VK_LWIN as i32) || down(VK_RWIN as i32) {
        flags |= MASK_CMD;
    }
    if down(VK_MENU as i32) {
        flags |= MASK_ALT;
    }
    // AltGr — used constantly on most non-US layouts to type accented and
    // special characters — is delivered to Win32 as a synthetic Left-Ctrl +
    // Right-Alt combination, not a distinct key. Without this check,
    // GetAsyncKeyState(VK_CONTROL) reads "down" during completely ordinary
    // typing, and any saved combo containing "ctrl" would fire on every
    // AltGr keystroke. A real Ctrl+Right-Alt chord is a vanishingly rare
    // thing to configure as a grab combo, so treat AltGr's synthetic Ctrl
    // as not held.
    if down(VK_CONTROL as i32) && !down(VK_RMENU as i32) {
        flags |= MASK_CTRL;
    }
    if down(VK_SHIFT as i32) {
        flags |= MASK_SHIFT;
    }
    flags
}

// Global grab-combo detection (current_flags above) has no implementation
// for any OS other than macOS and Windows yet. Fail the build with an
// explanatory message here instead of the confusing "cannot find function
// `current_flags`" spawn() below would otherwise produce on its own.
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
compile_error!(
    "grab.rs's current_flags() has no implementation for this target_os — \
     global grab-combo detection needs porting before adding this platform."
);

pub fn combo_mask(names: &[String]) -> u64 {
    names.iter().fold(0, |m, n| {
        m | match n.as_str() {
            "cmd" => MASK_CMD,
            "alt" => MASK_ALT,
            "ctrl" => MASK_CTRL,
            "shift" => MASK_SHIFT,
            _ => 0,
        }
    })
}

pub fn combo_active(flags: u64, mask: u64) -> bool {
    mask != 0 && flags & mask == mask
}

pub fn spawn(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut last_interactive: Option<bool> = None;
        loop {
            let state = app.state::<crate::state::HudState>();
            // Compute the mask while still holding the guard instead of
            // cloning the Vec out first — combo_mask only needs a &[String],
            // so this avoids a fresh allocation every 100ms tick forever.
            let mask = combo_mask(
                &state
                    .grab_combo
                    .lock()
                    .unwrap_or_else(|poisoned| poisoned.into_inner()),
            );
            let flags = current_flags();
            let grabbed = combo_active(flags, mask);
            let pinned = state.pinned.load(std::sync::atomic::Ordering::SeqCst);
            // The tray "pin" handler and this loop both want a say in whether the
            // overlay accepts mouse events; recomputing from both inputs every
            // tick (rather than only reacting to combo transitions) keeps them
            // from fighting over set_ignore_cursor_events.
            let interactive = (grabbed || pinned)
                && !state
                    .overlay_fully_hidden
                    .load(std::sync::atomic::Ordering::SeqCst);
            if last_interactive != Some(interactive) {
                last_interactive = Some(interactive);
                if let Some(w) = app.get_webview_window("overlay") {
                    let _ = w.set_ignore_cursor_events(!interactive);
                }
                let _ = app.emit("grab-mode", json!({ "on": interactive }));
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masks_map_to_cg_flags() {
        assert_eq!(combo_mask(&["cmd".into()]), MASK_CMD);
        assert_eq!(
            combo_mask(&["cmd".into(), "alt".into()]),
            MASK_CMD | MASK_ALT
        );
        assert_eq!(combo_mask(&["bogus".into()]), 0);
    }

    #[test]
    fn combo_requires_all_and_nonempty() {
        let m = MASK_CMD | MASK_ALT;
        assert!(combo_active(MASK_CMD | MASK_ALT | MASK_SHIFT, m));
        assert!(!combo_active(MASK_CMD, m));
        assert!(!combo_active(MASK_CMD, 0));
    }
}
