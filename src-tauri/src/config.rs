use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/// clamp()'s upper bound for key_shadow_distance / pressed_key_shadow_distance.
pub const MAX_SHADOW_DISTANCE: f64 = 20.0;
/// clamp()'s upper bound for key_shadow_diffusion / pressed_key_shadow_diffusion.
pub const MAX_SHADOW_DIFFUSION: f64 = 30.0;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct WindowRect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

/// A window's size on one physical monitor. Kept separate from position
/// because size depends only on which screen the window renders on, while
/// position depends on the full set of screens connected at once (see
/// [`ArrangementSlot`]).
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct MonitorSize {
    pub w: f64,
    pub h: f64,
}

/// Where the overlay sat the last time this exact set of monitors was
/// connected together (a "display arrangement", e.g. "laptop alone" vs
/// "laptop + DELL U2720Q") — which monitor of that arrangement it was on,
/// and its position on that monitor.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct ArrangementSlot {
    pub monitor: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(default)]
pub struct Config {
    pub oryx_url: String,
    pub oryx_revision: String,
    pub opacity: f64,
    pub char_opacity: f64,
    pub pressed_char_opacity: f64,
    pub border_opacity: f64,
    pub border_width: f64,
    pub grab_combo: Vec<String>,
    pub overlay_pinned: bool,
    pub toggle_macro: Vec<u8>,
    pub hide_side: String,
    pub hide_reveal: f64,
    pub hide_animation_ms: f64,
    pub use_oryx_colors: bool,
    pub start_hidden: bool,
    pub show_layer_action_icons: bool,
    pub layer_indicator: String,
    pub show_shift_icons: bool,
    pub shift_icon_scale: f64,
    pub show_alternate_action_icons: bool,
    pub alternate_action_icon_scale: f64,
    pub show_heatmap: bool,
    pub show_heatmap_counts: bool,
    pub heatmap_color: String,
    pub heatmap_peak: f64,
    pub key_fill_color: String,
    pub key_fill_opacity: f64,
    pub padding: f64,
    pub bg_color: String,
    pub text_color: String,
    pub legend_color: String,
    pub shift_color: String,
    pub alternate_color: String,
    pub border_color: String,
    pub pressed_key_color: String,
    pub pressed_key_fill_opacity: f64,
    pub pressed_key_border_color: String,
    pub pressed_key_border_opacity: f64,
    pub pressed_key_border_width: f64,
    pub key_border_radius: f64,
    /// Retained for importing older preference exports. New preferences use
    /// the independent layer and offline pill radii below.
    pub pill_border_radius: f64,
    pub layer_pill_border_radius: f64,
    pub offline_pill_border_radius: f64,
    pub layer_pill_text_color: String,
    pub layer_pill_text_opacity: f64,
    pub layer_pill_fill_color: String,
    pub layer_pill_fill_opacity: f64,
    pub layer_pill_border_color: String,
    pub layer_pill_border_opacity: f64,
    pub layer_pill_border_width: f64,
    pub offline_pill_text_color: String,
    pub offline_pill_text_opacity: f64,
    pub offline_pill_fill_color: String,
    pub offline_pill_fill_opacity: f64,
    pub offline_pill_border_color: String,
    pub offline_pill_border_opacity: f64,
    pub offline_pill_border_width: f64,
    pub show_key_shadows: bool,
    pub show_pressed_key_shadow: bool,
    pub key_shadow_color: String,
    pub pressed_key_shadow_color: String,
    pub key_shadow_opacity: f64,
    pub pressed_key_shadow_opacity: f64,
    pub key_shadow_position: String,
    pub pressed_key_shadow_position: String,
    pub key_shadow_distance: f64,
    pub pressed_key_shadow_distance: f64,
    pub key_shadow_diffusion: f64,
    pub pressed_key_shadow_diffusion: f64,
    pub alternate_char_opacity: f64,
    pub key_spacing: f64,
    pub keyboard_halves_distance: f64,
    pub keyboard_halves_rotation: f64,
    pub layer_pill_horizontal: f64,
    pub layer_pill_vertical: f64,
    pub offline_pill_horizontal: f64,
    pub offline_pill_vertical: f64,
    pub base_outline_enabled: bool,
    pub base_outline_color: String,
    pub base_outline_opacity: f64,
    pub base_outline_width: f64,
    pub grab_outline_enabled: bool,
    pub grab_outline_color: String,
    pub grab_outline_opacity: f64,
    pub grab_outline_width: f64,
    pub key_font_family: String,
    pub key_font_size: f64,
    pub key_font_bold: bool,
    pub key_font_italic: bool,
    pub legend_font_family: String,
    pub legend_font_size: f64,
    pub legend_font_bold: bool,
    pub legend_font_italic: bool,
    pub layer_name_font_family: String,
    pub layer_name_font_size: f64,
    pub layer_name_font_bold: bool,
    pub layer_name_font_italic: bool,
    pub offline_font_family: String,
    pub offline_font_size: f64,
    pub offline_font_bold: bool,
    pub offline_font_italic: bool,
    pub font_ligatures: bool,
    pub monitor_sizes: HashMap<String, MonitorSize>,
    pub arrangement_positions: HashMap<String, ArrangementSlot>,
    pub settings_window_width: f64,
    pub settings_window_height: f64,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            // Populated from the keyboard's Oryx HID identity; there is no
            // user-entered layout URL anymore.
            oryx_url: String::new(),
            oryx_revision: "latest".into(),
            opacity: 0.0,
            char_opacity: 1.0,
            pressed_char_opacity: 1.0,
            border_opacity: 0.35,
            border_width: 1.0,
            grab_combo: vec!["cmd".into(), "alt".into()],
            overlay_pinned: false,
            toggle_macro: vec![18, 18, 18],
            hide_side: "bottom".into(),
            hide_reveal: 0.2,
            hide_animation_ms: 220.0,
            use_oryx_colors: true,
            start_hidden: false,
            show_layer_action_icons: true,
            layer_indicator: "icon".into(),
            show_shift_icons: false,
            shift_icon_scale: 1.1,
            show_alternate_action_icons: false,
            alternate_action_icon_scale: 0.6,
            show_heatmap: false,
            show_heatmap_counts: false,
            heatmap_color: "#ff0030".into(),
            heatmap_peak: 200.0,
            key_fill_color: "#000000".into(),
            key_fill_opacity: 0.2,
            padding: 0.0,
            bg_color: "#ffffff".into(),
            text_color: "#ffffff".into(),
            legend_color: "#ffffff".into(),
            shift_color: "#ffffff".into(),
            alternate_color: "#f8fadb".into(),
            border_color: "#ffffff".into(),
            pressed_key_color: "#000000".into(),
            pressed_key_fill_opacity: 0.45,
            pressed_key_border_color: "#7ad7ff".into(),
            pressed_key_border_opacity: 0.5,
            pressed_key_border_width: 3.5,
            key_border_radius: 15.0,
            pill_border_radius: 368.0,
            layer_pill_border_radius: 368.0,
            offline_pill_border_radius: 0.0,
            layer_pill_text_color: "#ffffff".into(),
            layer_pill_text_opacity: 1.0,
            layer_pill_fill_color: "#ffffff".into(),
            layer_pill_fill_opacity: 0.0,
            layer_pill_border_color: "#ffffff".into(),
            layer_pill_border_opacity: 0.35,
            layer_pill_border_width: 1.0,
            offline_pill_text_color: "#ffffff".into(),
            offline_pill_text_opacity: 1.0,
            offline_pill_fill_color: "#d92c2c".into(),
            offline_pill_fill_opacity: 1.0,
            offline_pill_border_color: "#ffffff".into(),
            offline_pill_border_opacity: 0.65,
            offline_pill_border_width: 1.0,
            show_key_shadows: true,
            show_pressed_key_shadow: true,
            key_shadow_color: "#c4bc00".into(),
            pressed_key_shadow_color: "#ffffff".into(),
            key_shadow_opacity: 0.45,
            pressed_key_shadow_opacity: 0.6,
            key_shadow_position: "glow".into(),
            pressed_key_shadow_position: "glow".into(),
            key_shadow_distance: 0.0,
            pressed_key_shadow_distance: 9.0,
            key_shadow_diffusion: 5.0,
            pressed_key_shadow_diffusion: 30.0,
            alternate_char_opacity: 1.0,
            key_spacing: 0.1,
            keyboard_halves_distance: 3.25,
            keyboard_halves_rotation: -15.0,
            layer_pill_horizontal: 50.0,
            layer_pill_vertical: 33.0,
            offline_pill_horizontal: 50.0,
            offline_pill_vertical: 50.0,
            settings_window_width: 948.0,
            settings_window_height: 760.0,
            base_outline_enabled: false,
            base_outline_color: "#ff40ff".into(),
            base_outline_opacity: 0.55,
            base_outline_width: 2.0,
            grab_outline_enabled: true,
            grab_outline_color: "#ffdc78".into(),
            grab_outline_opacity: 1.0,
            grab_outline_width: 1.5,
            key_font_family: "".into(),
            key_font_size: 1.3,
            key_font_bold: false,
            key_font_italic: false,
            legend_font_family: "".into(),
            legend_font_size: 1.6,
            legend_font_bold: false,
            legend_font_italic: false,
            layer_name_font_family: "".into(),
            layer_name_font_size: 11.0,
            layer_name_font_bold: false,
            layer_name_font_italic: false,
            offline_font_family: "".into(),
            offline_font_size: 11.0,
            offline_font_bold: true,
            offline_font_italic: false,
            font_ligatures: true,
            monitor_sizes: HashMap::new(),
            arrangement_positions: HashMap::new(),
        }
    }
}

impl Config {
    /// Preferences sent by Settings must not overwrite fields owned by HID,
    /// the tray, or native window movement while Settings was open.
    pub fn apply_preferences(&mut self, mut incoming: Self) {
        incoming.monitor_sizes = std::mem::take(&mut self.monitor_sizes);
        incoming.arrangement_positions = std::mem::take(&mut self.arrangement_positions);
        incoming.settings_window_width = self.settings_window_width;
        incoming.settings_window_height = self.settings_window_height;
        incoming.oryx_url = std::mem::take(&mut self.oryx_url);
        incoming.oryx_revision = std::mem::take(&mut self.oryx_revision);
        incoming.overlay_pinned = self.overlay_pinned;
        incoming.clamp();
        *self = incoming;
    }

    /// Clamp every user-editable numeric field to the range the Settings UI's
    /// sliders allow, so a value written by something other than the slider
    /// (a hand-edited config file, a future API) can't push the renderer an
    /// out-of-range opacity/width/padding.
    pub fn clamp(&mut self) {
        if !matches!(self.hide_side.as_str(), "left" | "right" | "top" | "bottom") {
            self.hide_side = "right".into();
        }
        if !matches!(self.layer_indicator.as_str(), "none" | "textual" | "icon") {
            self.layer_indicator = "icon".into();
        }
        for position in [
            &mut self.key_shadow_position,
            &mut self.pressed_key_shadow_position,
        ] {
            if !matches!(
                position.as_str(),
                "glow" | "top-right" | "top-left" | "bottom-right" | "bottom-left"
            ) {
                *position = "glow".into();
            }
        }
        self.toggle_macro.retain(|key| *key < 52);
        self.toggle_macro.truncate(64);
        self.grab_combo
            .retain(|key| matches!(key.as_str(), "cmd" | "alt" | "ctrl" | "shift"));
        self.monitor_sizes
            .retain(|_, s| s.w.is_finite() && s.h.is_finite() && s.w > 0.0 && s.h > 0.0);
        self.arrangement_positions
            .retain(|_, slot| slot.x.is_finite() && slot.y.is_finite() && !slot.monitor.is_empty());
        // Imported colors must be usable both by CSS and the color inputs.
        let defaults = Config::default();
        macro_rules! color {
            ($($field:ident),+ $(,)?) => { $(
                if self.$field.len() != 7 || !self.$field.starts_with('#') || !self.$field[1..].bytes().all(|b| b.is_ascii_hexdigit()) {
                    self.$field = defaults.$field;
                }
            )+ };
        }
        color!(
            bg_color,
            text_color,
            legend_color,
            shift_color,
            alternate_color,
            border_color,
            key_fill_color,
            pressed_key_color,
            pressed_key_border_color,
            key_shadow_color,
            pressed_key_shadow_color,
            base_outline_color,
            grab_outline_color,
            heatmap_color,
            layer_pill_text_color,
            layer_pill_fill_color,
            layer_pill_border_color,
            offline_pill_text_color,
            offline_pill_fill_color,
            offline_pill_border_color
        );
        self.opacity = self.opacity.clamp(0.0, 1.0);
        self.char_opacity = self.char_opacity.clamp(0.2, 1.0);
        self.pressed_char_opacity = self.pressed_char_opacity.clamp(0.2, 1.0);
        self.border_opacity = self.border_opacity.clamp(0.0, 1.0);
        self.border_width = self.border_width.clamp(0.0, 5.0);
        self.key_fill_opacity = self.key_fill_opacity.clamp(0.0, 1.0);
        self.padding = self.padding.clamp(0.0, 60.0);
        self.shift_icon_scale = self.shift_icon_scale.clamp(0.5, 2.5);
        self.alternate_action_icon_scale = self.alternate_action_icon_scale.clamp(0.5, 2.5);
        self.heatmap_peak = self.heatmap_peak.clamp(1.0, 1000.0);
        self.base_outline_opacity = self.base_outline_opacity.clamp(0.0, 1.0);
        self.base_outline_width = self.base_outline_width.clamp(0.0, 5.0);
        self.grab_outline_opacity = self.grab_outline_opacity.clamp(0.0, 1.0);
        self.grab_outline_width = self.grab_outline_width.clamp(0.0, 5.0);
        self.pressed_key_fill_opacity = self.pressed_key_fill_opacity.clamp(0.0, 1.0);
        self.pressed_key_border_opacity = self.pressed_key_border_opacity.clamp(0.0, 1.0);
        self.pressed_key_border_width = self.pressed_key_border_width.clamp(0.0, 5.0);
        self.key_border_radius = self.key_border_radius.clamp(0.0, 30.0);
        self.pill_border_radius = self.pill_border_radius.clamp(0.0, 999.0);
        self.layer_pill_border_radius = self.layer_pill_border_radius.clamp(0.0, 999.0);
        self.offline_pill_border_radius = self.offline_pill_border_radius.clamp(0.0, 999.0);
        self.layer_pill_text_opacity = self.layer_pill_text_opacity.clamp(0.0, 1.0);
        self.layer_pill_fill_opacity = self.layer_pill_fill_opacity.clamp(0.0, 1.0);
        self.layer_pill_border_opacity = self.layer_pill_border_opacity.clamp(0.0, 1.0);
        self.layer_pill_border_width = self.layer_pill_border_width.clamp(0.0, 5.0);
        self.offline_pill_text_opacity = self.offline_pill_text_opacity.clamp(0.0, 1.0);
        self.offline_pill_fill_opacity = self.offline_pill_fill_opacity.clamp(0.0, 1.0);
        self.offline_pill_border_opacity = self.offline_pill_border_opacity.clamp(0.0, 1.0);
        self.offline_pill_border_width = self.offline_pill_border_width.clamp(0.0, 5.0);
        self.key_shadow_opacity = self.key_shadow_opacity.clamp(0.0, 1.0);
        self.pressed_key_shadow_opacity = self.pressed_key_shadow_opacity.clamp(0.0, 1.0);
        self.key_shadow_distance = self.key_shadow_distance.clamp(0.0, MAX_SHADOW_DISTANCE);
        self.pressed_key_shadow_distance = self
            .pressed_key_shadow_distance
            .clamp(0.0, MAX_SHADOW_DISTANCE);
        self.key_shadow_diffusion = self.key_shadow_diffusion.clamp(0.0, MAX_SHADOW_DIFFUSION);
        self.pressed_key_shadow_diffusion = self
            .pressed_key_shadow_diffusion
            .clamp(0.0, MAX_SHADOW_DIFFUSION);
        self.alternate_char_opacity = self.alternate_char_opacity.clamp(0.2, 1.0);
        self.key_spacing = self.key_spacing.clamp(0.0, 0.25);
        self.keyboard_halves_distance = self.keyboard_halves_distance.clamp(0.25, 20.0);
        self.keyboard_halves_rotation = self.keyboard_halves_rotation.clamp(-15.0, 15.0);
        self.layer_pill_horizontal = self.layer_pill_horizontal.clamp(0.0, 100.0);
        self.layer_pill_vertical = self.layer_pill_vertical.clamp(0.0, 100.0);
        self.offline_pill_horizontal = self.offline_pill_horizontal.clamp(0.0, 100.0);
        self.offline_pill_vertical = self.offline_pill_vertical.clamp(0.0, 100.0);
        self.hide_reveal = self.hide_reveal.clamp(0.0, 1.0);
        self.hide_animation_ms = self.hide_animation_ms.clamp(0.0, 1000.0);
        self.key_font_size = self.key_font_size.clamp(0.5, 2.0);
        self.legend_font_size = self.legend_font_size.clamp(0.5, 2.0);
        self.layer_name_font_size = self.layer_name_font_size.clamp(8.0, 24.0);
        self.offline_font_size = self.offline_font_size.clamp(8.0, 24.0);
        self.settings_window_width = self.settings_window_width.clamp(680.0, 1600.0);
        self.settings_window_height = self.settings_window_height.clamp(560.0, 1200.0);
    }
}

pub fn load(path: &Path) -> Config {
    let text = std::fs::read_to_string(path).ok();
    let mut cfg: Config = text
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();
    // Split the former shared pill radius without changing existing users'
    // appearance when their preference file is first read.
    if let Some(value) = text
        .as_deref()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
    {
        let legacy = value.get("pill_border_radius").and_then(|v| v.as_f64());
        if value.get("layer_pill_border_radius").is_none() {
            cfg.layer_pill_border_radius = legacy.unwrap_or(cfg.layer_pill_border_radius);
        }
        if value.get("offline_pill_border_radius").is_none() {
            cfg.offline_pill_border_radius = legacy.unwrap_or(cfg.offline_pill_border_radius);
        }
        // Pre-per-arrangement configs stored one rect per monitor with no
        // notion of "which other screens were connected at the time". Treat
        // each as if it were saved while that monitor was the only one
        // connected — the closest honest reading of data that predates
        // arrangement tracking — rather than losing everyone's saved spot.
        if cfg.monitor_sizes.is_empty() && cfg.arrangement_positions.is_empty() {
            if let Some(old_rects) = value.get("window_by_monitor").and_then(|v| v.as_object()) {
                for (key, rect_value) in old_rects {
                    if let Ok(rect) = serde_json::from_value::<WindowRect>(rect_value.clone()) {
                        cfg.monitor_sizes.insert(
                            key.clone(),
                            MonitorSize {
                                w: rect.w,
                                h: rect.h,
                            },
                        );
                        cfg.arrangement_positions.insert(
                            key.clone(),
                            ArrangementSlot {
                                monitor: key.clone(),
                                x: rect.x,
                                y: rect.y,
                            },
                        );
                    }
                }
            }
        }
    }
    // Clamp on every read, not just set_config's write path, so a hand-edited
    // or otherwise out-of-range value on disk self-heals for every caller
    // (get_config, the window-restore read in main.rs, grab.rs's poll, etc.)
    // instead of only after the user next changes a setting via the UI.
    cfg.clamp();
    cfg
}

pub fn save(path: &Path, cfg: &Config) -> std::io::Result<()> {
    save_json(path, cfg)
}

/// Allocate the filename before reporting it: never overwrite an earlier export.
pub fn export_to_dir(dir: &Path, cfg: &Config) -> std::io::Result<std::path::PathBuf> {
    use std::io::Write;
    let contents = serde_json::to_vec_pretty(cfg)?;
    for suffix in 0.. {
        let name = if suffix == 0 {
            "keyaura-settings.json".into()
        } else {
            format!("keyaura-settings ({suffix}).json")
        };
        let path = dir.join(name);
        match std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)
        {
            Ok(mut file) => {
                file.write_all(&contents)?;
                file.sync_all()?;
                return Ok(path);
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error),
        }
    }
    unreachable!()
}

/// Callers serialize writes to each path; rename keeps concurrent readers safe.
pub fn save_json(path: &Path, value: &impl Serialize) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    // Write to a sibling temp file and rename it into place, rather than
    // truncating and rewriting `path` directly. config_lock only serializes
    // this crate's own writers; several call sites still read config.json
    // unlocked (grab.rs's poll loop, tray.rs's refresh handler), and a
    // truncate-then-write leaves a window where such a reader can observe an
    // empty file. A rename is atomic on the filesystems this app targets, so
    // any concurrent reader always sees either the fully-old or fully-new
    // content, never a partial one — no reader-side locking required.
    let mut tmp_path = path.as_os_str().to_owned();
    tmp_path.push(".tmp");
    let tmp_path = std::path::PathBuf::from(tmp_path);
    std::fs::write(&tmp_path, serde_json::to_vec_pretty(value)?)?;
    std::fs::rename(&tmp_path, path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_values() {
        let c = Config::default();
        assert!(c.oryx_url.is_empty());
        assert_eq!(c.opacity, 0.0);
        assert_eq!(c.grab_combo, vec!["cmd".to_string(), "alt".to_string()]);
        assert_eq!(c.toggle_macro, vec![18, 18, 18]);
        assert_eq!(c.hide_side, "bottom");
        assert_eq!(c.hide_reveal, 0.2);
        assert!(c.use_oryx_colors);
        assert!(c.monitor_sizes.is_empty());
        assert!(c.arrangement_positions.is_empty());
        assert_eq!(c.char_opacity, 1.0);
        assert_eq!(c.border_opacity, 0.35);
        assert_eq!(c.border_width, 1.0);
        assert_eq!(c.bg_color, "#ffffff");
        assert_eq!(c.key_fill_opacity, 0.2);
        assert_eq!(c.padding, 0.0);
        assert_eq!(c.text_color, "#ffffff");
        assert_eq!(c.legend_color, "#ffffff");
        assert_eq!(c.border_color, "#ffffff");
        assert!(!c.show_shift_icons);
        assert_eq!(c.shift_icon_scale, 1.1);
        assert!(!c.show_alternate_action_icons);
        assert_eq!(c.alternate_action_icon_scale, 0.6);
    }

    #[test]
    fn old_config_without_new_fields_gets_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        std::fs::write(&path, r#"{"oryx_url":"abc","opacity":0.5}"#).unwrap();
        let c = load(&path);
        assert_eq!(c.oryx_url, "abc");
        assert_eq!(c.opacity, 0.5);
        assert_eq!(c.char_opacity, 1.0);
        assert_eq!(c.border_opacity, 0.35);
        assert_eq!(c.border_width, 1.0);
        assert_eq!(c.bg_color, "#ffffff");
    }

    #[test]
    fn clamp_bounds_every_numeric_field() {
        let mut c = Config {
            opacity: 5.0,
            char_opacity: -1.0,
            border_opacity: -1.0,
            border_width: 999.0,
            key_fill_opacity: 2.0,
            padding: -10.0,
            shift_icon_scale: 3.0,
            alternate_action_icon_scale: 0.1,
            ..Config::default()
        };
        c.clamp();
        assert_eq!(c.opacity, 1.0);
        assert_eq!(c.char_opacity, 0.2);
        assert_eq!(c.border_opacity, 0.0);
        assert_eq!(c.border_width, 5.0);
        assert_eq!(c.key_fill_opacity, 1.0);
        assert_eq!(c.padding, 0.0);
        assert_eq!(c.shift_icon_scale, 2.5);
        assert_eq!(c.alternate_action_icon_scale, 0.5);
    }

    #[test]
    fn load_clamps_out_of_range_values_from_disk() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        std::fs::write(&path, r#"{"opacity":5.0,"padding":-10.0}"#).unwrap();
        let c = load(&path);
        assert_eq!(c.opacity, 1.0);
        assert_eq!(c.padding, 0.0);
    }

    #[test]
    fn legacy_window_by_monitor_migrates_to_a_single_monitor_arrangement() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        std::fs::write(
            &path,
            r#"{"window_by_monitor":{"Built-in Retina Display":{"x":10.0,"y":20.0,"w":800.0,"h":300.0}},"last_monitor":"Built-in Retina Display"}"#,
        )
        .unwrap();
        let cfg = load(&path);
        assert_eq!(
            cfg.monitor_sizes.get("Built-in Retina Display"),
            Some(&MonitorSize { w: 800.0, h: 300.0 })
        );
        assert_eq!(
            cfg.arrangement_positions.get("Built-in Retina Display"),
            Some(&ArrangementSlot {
                monitor: "Built-in Retina Display".into(),
                x: 10.0,
                y: 20.0,
            })
        );
    }

    #[test]
    fn legacy_shared_pill_radius_migrates_to_both_pills() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        std::fs::write(&path, r#"{"pill_border_radius":12.0}"#).unwrap();
        let config = load(&path);
        assert_eq!(config.layer_pill_border_radius, 12.0);
        assert_eq!(config.offline_pill_border_radius, 12.0);
    }

    #[test]
    fn save_load_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        let mut c = Config {
            opacity: 0.5,
            legend_color: "#ffcc00".into(),
            shift_color: "#00ccff".into(),
            alternate_color: "#ff88cc".into(),
            show_layer_action_icons: true,
            show_shift_icons: false,
            show_alternate_action_icons: false,
            ..Config::default()
        };
        c.monitor_sizes
            .insert("test".into(), MonitorSize { w: 800.0, h: 300.0 });
        c.arrangement_positions.insert(
            "test".into(),
            ArrangementSlot {
                monitor: "test".into(),
                x: 10.0,
                y: 20.0,
            },
        );
        save(&path, &c).unwrap();
        assert_eq!(load(&path), c);
    }

    #[test]
    fn load_missing_or_corrupt_returns_default() {
        assert_eq!(
            load(std::path::Path::new("/nonexistent/vhud.json")),
            Config::default()
        );
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        std::fs::write(&path, "{not json").unwrap();
        assert_eq!(load(&path), Config::default());
    }

    #[test]
    fn validates_imported_colors_shortcuts_and_rectangles() {
        let mut cfg = Config {
            text_color: "#gggggg".into(),
            bg_color: "x".into(),
            heatmap_color: "#12Ab9F".into(),
            hide_side: "elsewhere".into(),
            grab_combo: vec!["cmd".into(), "unknown".into()],
            toggle_macro: vec![51; 80],
            ..Config::default()
        };
        cfg.toggle_macro[0] = 255;
        cfg.monitor_sizes
            .insert("bad".into(), MonitorSize { w: -1.0, h: 20.0 });
        cfg.arrangement_positions.insert(
            "nonfinite".into(),
            ArrangementSlot {
                monitor: "bad".into(),
                x: f64::NAN,
                y: 0.0,
            },
        );
        cfg.clamp();
        assert_eq!(cfg.text_color, Config::default().text_color);
        assert_eq!(cfg.bg_color, Config::default().bg_color);
        assert_eq!(cfg.heatmap_color, "#12Ab9F");
        assert_eq!(cfg.hide_side, "right");
        assert_eq!(cfg.grab_combo, ["cmd"]);
        assert_eq!(cfg.toggle_macro, vec![51; 64]);
        assert!(cfg.monitor_sizes.is_empty());
        assert!(cfg.arrangement_positions.is_empty());
    }

    #[test]
    fn stale_settings_do_not_overwrite_runtime_owned_fields() {
        let mut live = Config {
            overlay_pinned: true,
            oryx_url: "abc".into(),
            oryx_revision: "rev2".into(),
            ..Config::default()
        };
        live.monitor_sizes
            .insert("display".into(), MonitorSize { w: 300.0, h: 200.0 });
        live.arrangement_positions.insert(
            "display".into(),
            ArrangementSlot {
                monitor: "display".into(),
                x: 1.0,
                y: 2.0,
            },
        );
        let previous = live.clone();
        live.apply_preferences(Config {
            opacity: 0.2,
            ..Config::default()
        });
        assert_eq!(live.opacity, 0.2);
        assert_eq!(live.oryx_url, previous.oryx_url);
        assert_eq!(live.oryx_revision, previous.oryx_revision);
        assert_eq!(live.monitor_sizes, previous.monitor_sizes);
        assert_eq!(live.arrangement_positions, previous.arrangement_positions);
        assert!(live.overlay_pinned);
    }

    #[test]
    fn exports_allocate_real_unique_filenames_without_overwriting() {
        let dir = tempfile::tempdir().unwrap();
        let first = export_to_dir(dir.path(), &Config::default()).unwrap();
        let changed = Config {
            opacity: 0.2,
            ..Config::default()
        };
        let second = export_to_dir(dir.path(), &changed).unwrap();
        assert_eq!(first.file_name().unwrap(), "keyaura-settings.json");
        assert_eq!(second.file_name().unwrap(), "keyaura-settings (1).json");
        assert_eq!(load(&first), Config::default());
        assert_eq!(load(&second), changed);
        assert!(export_to_dir(&dir.path().join("missing"), &changed).is_err());
    }

    #[test]
    fn legacy_ligatures_fields_are_ignored_without_losing_preferences() {
        let cfg: Config = serde_json::from_str(
            r#"{"key_font_ligatures":false,"last_refresh":"old","key_font_italic":true}"#,
        )
        .unwrap();
        assert!(cfg.font_ligatures);
        assert!(cfg.key_font_italic);
        assert!(serde_json::to_value(cfg)
            .unwrap()
            .get("key_font_ligatures")
            .is_none());
    }

    #[test]
    fn cargo_and_tauri_versions_match() {
        let tauri: serde_json::Value =
            serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        assert_eq!(tauri["version"], env!("CARGO_PKG_VERSION"));
    }
}
