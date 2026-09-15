use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::UpdaterExt;

/// Waits a few seconds after launch — so it doesn't compete with the
/// keyboard/layout connection work in setup() — then silently checks for an
/// update. Nothing is shown if there's nothing new or the check itself
/// fails (e.g. offline): a background check failing isn't worth
/// interrupting the user about on every launch. The tray's on-demand
/// "Check for Updates" (spawn_manual_check) reports those cases instead,
/// since that's an explicit action that deserves a response either way.
pub fn spawn_startup_check(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        run(app, false).await;
    });
}

/// Same flow as the startup check, but always reports the outcome —
/// including "you're up to date" and check failures.
pub fn spawn_manual_check(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        run(app, true).await;
    });
}

async fn run(app: AppHandle, verbose: bool) {
    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(error) => {
            eprintln!("KeyAura: updater unavailable: {error}");
            return;
        }
    };
    let update = match updater.check().await {
        Ok(Some(update)) => update,
        Ok(None) => {
            if verbose {
                show_message(
                    &app,
                    "You're up to date",
                    &format!(
                        "KeyAura {} is the latest version.",
                        env!("CARGO_PKG_VERSION")
                    ),
                    MessageDialogKind::Info,
                );
            }
            return;
        }
        Err(error) => {
            eprintln!("KeyAura: update check failed: {error}");
            if verbose {
                show_message(
                    &app,
                    "Could not check for updates",
                    &error.to_string(),
                    MessageDialogKind::Error,
                );
            }
            return;
        }
    };

    let should_download = confirm(
        &app,
        "Update available",
        &format!(
            "KeyAura {} is available — you have {}.\n\nDownload it now?",
            update.version, update.current_version
        ),
        "Download",
        "Later",
    )
    .await;
    if !should_download {
        return;
    }

    let bytes = match update.download(|_chunk_len, _content_len| {}, || {}).await {
        Ok(bytes) => bytes,
        Err(error) => {
            show_message(
                &app,
                "Update failed",
                &format!("Could not download the update: {error}"),
                MessageDialogKind::Error,
            );
            return;
        }
    };

    let should_restart = confirm(
        &app,
        "Update downloaded",
        &format!(
            "KeyAura {} is ready to install. Restart now to finish updating?",
            update.version
        ),
        "Restart",
        "Later",
    )
    .await;
    if !should_restart {
        return;
    }

    // install() does blocking disk I/O (extracting the archive, backing up
    // and replacing the current .app) — spawn_blocking keeps it off the
    // shared tokio runtime that hid::spawn/grab::spawn use for
    // latency-sensitive keyboard polling.
    let install_result = {
        let update = update.clone();
        tokio::task::spawn_blocking(move || update.install(bytes)).await
    };
    match install_result {
        Ok(Ok(())) => {}
        Ok(Err(error)) => {
            show_message(
                &app,
                "Update failed",
                &format!("Could not install the update: {error}"),
                MessageDialogKind::Error,
            );
            return;
        }
        Err(join_error) => {
            show_message(
                &app,
                "Update failed",
                &format!("Could not install the update: {join_error}"),
                MessageDialogKind::Error,
            );
            return;
        }
    }
    app.restart();
}

fn show_message(app: &AppHandle, title: &str, message: &str, kind: MessageDialogKind) {
    app.dialog()
        .message(message)
        .title(title)
        .kind(kind)
        .buttons(MessageDialogButtons::Ok)
        .show(|_| {});
}

/// Shows a native two-button confirmation dialog and returns whether the
/// affirmative button was pressed. The dialog plugin's own docs require
/// `blocking_show` to run off the main thread; `spawn_blocking` also keeps
/// it from stalling the async runtime's other tasks while it waits.
async fn confirm(app: &AppHandle, title: &str, message: &str, yes: &str, no: &str) -> bool {
    let app = app.clone();
    let title = title.to_string();
    let message = message.to_string();
    let yes = yes.to_string();
    let no = no.to_string();
    tokio::task::spawn_blocking(move || {
        app.dialog()
            .message(message)
            .title(title)
            .buttons(MessageDialogButtons::OkCancelCustom(yes, no))
            .blocking_show()
    })
    .await
    .unwrap_or(false)
}
