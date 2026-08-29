use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

#[cfg(any(target_os = "macos", target_os = "windows"))]
use std::process::Command;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

use crate::security::{
    configure_security, decode_protected_json, encode_encrypted_json, encode_protected_json,
    inspect_protected_metadata, is_security_configured, remove_security_config,
    ProtectedDocumentMetadata,
};

#[cfg(target_os = "macos")]
const SQLITE_BINARY_PATH: &str = "/usr/bin/sqlite3";
#[cfg(target_os = "macos")]
const LEGACY_SQLITE_DATABASE_NAME: &str = "tracker_state.sqlite3";
const STATE_FILE_NAME: &str = "tracker_state.json";
const BACKUP_DIRECTORY_NAME: &str = "backups";
const BACKGROUND_BACKUP_SOURCE_NAME: &str = "background_backup_source.json";
const BACKGROUND_BACKUP_SCRIPT_NAME: &str = "run_background_backup.sh";
const CLOUD_CURRENT_BACKUP_NAME: &str = "legal-time-tracker-current.backup.json";
const DEFAULT_STANDARD_HOURLY_RATE: u32 = 350;
const AUTO_BACKUP_INTERVAL_MS: u64 = 6 * 60 * 60 * 1000;
const MAX_AUTOMATIC_BACKUPS: usize = 28;
const MAX_MANUAL_BACKUPS: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TrackerState {
    #[serde(default)]
    pub active_timer: Option<ActiveTimer>,
    #[serde(default = "default_app_preferences")]
    pub app_preferences: AppPreferences,
    #[serde(default)]
    pub clients: Vec<ClientRecord>,
    #[serde(default)]
    pub entries: Vec<TimeEntry>,
    #[serde(default)]
    pub expenses: Vec<ExpenseRecord>,
    #[serde(default)]
    pub invoices: Vec<InvoiceRecord>,
    #[serde(default)]
    pub matters: Vec<MatterRecord>,
    #[serde(default = "default_standard_hourly_rate")]
    pub standard_hourly_rate: u32,
    #[serde(default = "default_statement_profile")]
    pub statement_profile: StatementProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPreferences {
    #[serde(default)]
    pub backup_export_directory: Option<String>,
    pub color_mode: String,
    pub theme_name: String,
}

impl Default for AppPreferences {
    fn default() -> Self {
        default_app_preferences()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveTimer {
    #[serde(default)]
    pub client_id: Option<String>,
    pub client_name: String,
    pub id: String,
    #[serde(default)]
    pub matter_id: Option<String>,
    pub matter_name: String,
    pub narrative: String,
    pub started_at: String,
    pub task_category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientRecord {
    pub address: String,
    pub billing_instructions: String,
    pub contact_email: String,
    pub contact_name: String,
    pub contact_phone: String,
    pub id: String,
    pub name: String,
    pub notes: String,
    pub rate_override: Option<u32>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatterRecord {
    pub client_id: String,
    pub default_task_category: String,
    pub description: String,
    pub id: String,
    pub name: String,
    pub notes: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceRecord {
    #[serde(default)]
    pub billing_instructions: String,
    #[serde(default)]
    pub client_address: String,
    #[serde(default)]
    pub client_id: Option<String>,
    pub client_name: String,
    #[serde(default)]
    pub contact_email: String,
    #[serde(default)]
    pub contact_name: String,
    #[serde(default)]
    pub deliveries: Vec<InvoiceDeliveryRecord>,
    #[serde(default)]
    pub excluded_expense_ids: Vec<String>,
    pub id: String,
    pub issued_on: String,
    #[serde(default)]
    pub line_items: Vec<InvoiceLineItem>,
    #[serde(default)]
    pub matter_summaries: Vec<InvoiceMatterSummary>,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub paid_on: Option<String>,
    #[serde(default)]
    pub payments: Vec<PaymentRecord>,
    pub period_key: String,
    pub period_label: String,
    #[serde(default)]
    pub reviewed_count: u32,
    #[serde(default)]
    pub statement_exported_at: Option<String>,
    #[serde(default)]
    pub statement_pdf_path: Option<String>,
    #[serde(default)]
    pub statement_number: String,
    #[serde(default = "default_invoice_status")]
    pub status: String,
    #[serde(default)]
    pub total_amount: f64,
    #[serde(default)]
    pub total_billed_minutes: u32,
    #[serde(default)]
    pub unreviewed_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceDeliveryRecord {
    pub id: String,
    #[serde(default)]
    pub message: String,
    pub recipient: String,
    pub sent_at: String,
    pub status: String,
    pub subject: String,
    pub transport: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentRecord {
    pub amount: f64,
    pub created_at: String,
    pub id: String,
    pub method: String,
    #[serde(default)]
    pub notes: String,
    pub payment_date: String,
    #[serde(default)]
    pub reference: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceLineItem {
    #[serde(default)]
    pub amount: f64,
    #[serde(default)]
    pub billed_minutes: u32,
    #[serde(default)]
    pub category: String,
    pub entry_id: String,
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub matter_id: Option<String>,
    #[serde(default)]
    pub matter_name: String,
    #[serde(default)]
    pub narrative: String,
    #[serde(default)]
    pub payee: String,
    #[serde(default)]
    pub task_category: String,
    pub work_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceMatterSummary {
    #[serde(default)]
    pub amount: f64,
    #[serde(default)]
    pub entry_count: u32,
    #[serde(default)]
    pub matter_id: Option<String>,
    #[serde(default)]
    pub matter_name: String,
    #[serde(default)]
    pub total_billed_minutes: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseRecord {
    pub amount: f64,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub client_id: Option<String>,
    #[serde(default)]
    pub client_name: String,
    pub created_at: String,
    pub expense_date: String,
    pub id: String,
    pub kind: String,
    #[serde(default)]
    pub matter_id: Option<String>,
    #[serde(default)]
    pub matter_name: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub payee: String,
    #[serde(default)]
    pub receipt_path: Option<String>,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub tax_category: String,
    #[serde(default)]
    pub tax_deductible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatementProfile {
    pub firm_name: String,
    pub footer_note: String,
    pub sender_address: String,
    pub sender_email: String,
    pub sender_name: String,
    pub sender_phone: String,
    pub sender_title: String,
}

impl Default for StatementProfile {
    fn default() -> Self {
        default_statement_profile()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeEntry {
    pub actual_minutes: u32,
    pub billed_minutes: u32,
    #[serde(default)]
    pub client_id: Option<String>,
    pub client_name: String,
    pub created_at: String,
    pub id: String,
    pub long_session: bool,
    #[serde(default)]
    pub matter_id: Option<String>,
    pub matter_name: String,
    pub narrative: String,
    pub reviewed_at: Option<String>,
    pub source: String,
    pub started_at: Option<String>,
    pub task_category: String,
    pub work_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSnapshotRecord {
    pub created_at: u64,
    pub id: String,
    pub kind: String,
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreTrackerBackupResponse {
    pub backups: Vec<BackupSnapshotRecord>,
    pub state: TrackerState,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupExportResponse {
    pub path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupVerificationResponse {
    pub client_count: usize,
    pub created_at: u64,
    pub entry_count: usize,
    pub expense_count: usize,
    pub invoice_count: usize,
    pub message: String,
    pub valid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupEnvelope {
    created_at: u64,
    kind: String,
    state: TrackerState,
}

impl TrackerState {
    fn empty() -> Self {
        Self {
            active_timer: None,
            app_preferences: default_app_preferences(),
            clients: Vec::new(),
            entries: Vec::new(),
            expenses: Vec::new(),
            invoices: Vec::new(),
            matters: Vec::new(),
            standard_hourly_rate: DEFAULT_STANDARD_HOURLY_RATE,
            statement_profile: default_statement_profile(),
        }
    }
}

fn default_standard_hourly_rate() -> u32 {
    DEFAULT_STANDARD_HOURLY_RATE
}

fn default_app_preferences() -> AppPreferences {
    AppPreferences {
        backup_export_directory: None,
        color_mode: "light".to_string(),
        theme_name: "summer".to_string(),
    }
}

fn default_invoice_status() -> String {
    "draft".to_string()
}

fn default_statement_profile() -> StatementProfile {
    StatementProfile {
        firm_name: "Krewson Law LLC".to_string(),
        footer_note: "Thank you for the opportunity to support this matter.".to_string(),
        sender_address: String::new(),
        sender_email: String::new(),
        sender_name: String::new(),
        sender_phone: String::new(),
        sender_title: "Employment Law & HR Consulting".to_string(),
    }
}

#[tauri::command]
pub fn load_tracker_state<R: Runtime>(app: AppHandle<R>) -> Result<TrackerState, String> {
    let storage_dir = ensure_storage_dir(&app)?;
    let state = load_state(&storage_dir)?;
    let _ = create_automatic_backup_if_needed(&storage_dir, &state);
    let _ = write_background_backup_source(&storage_dir, &state);
    let _ = install_background_backup_schedule(&storage_dir);
    let _ = sync_backup_to_selected_folder(&storage_dir, &state);
    Ok(state)
}

#[tauri::command]
pub fn save_tracker_state<R: Runtime>(
    app: AppHandle<R>,
    state: TrackerState,
) -> Result<(), String> {
    let storage_dir = ensure_storage_dir(&app)?;

    save_state(&storage_dir, &state)?;

    let _ = create_automatic_backup_if_needed(&storage_dir, &state);
    let _ = write_background_backup_source(&storage_dir, &state);
    let _ = sync_backup_to_selected_folder(&storage_dir, &state);

    Ok(())
}

#[tauri::command]
pub fn configure_tracker_security<R: Runtime>(
    app: AppHandle<R>,
    state: TrackerState,
    passphrase: String,
) -> Result<(), String> {
    let storage_dir = ensure_storage_dir(&app)?;
    configure_security(&storage_dir, &passphrase)?;

    if let Err(error) = save_state(&storage_dir, &state) {
        remove_security_config(&storage_dir);
        return Err(error);
    }

    // The live state is already protected at this point. Supplemental backup
    // maintenance must not leave the UI thinking protection was never enabled.
    let _ = migrate_backup_directory_to_encryption(&storage_dir);
    let _ = write_background_backup_source(&storage_dir, &state);
    let _ = migrate_selected_export_directory_to_encryption(&storage_dir, &state);
    let _ = sync_backup_to_selected_folder(&storage_dir, &state);
    let _ = create_backup_snapshot(&storage_dir, &state, "manual");
    Ok(())
}

#[tauri::command]
pub fn choose_backup_export_directory() -> Result<Option<String>, String> {
    crate::native_dialog::choose_directory("Choose a synced backup folder")
        .map(|selection| selection.map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn export_tracker_backup<R: Runtime>(
    app: AppHandle<R>,
    state: TrackerState,
    directory: String,
) -> Result<BackupExportResponse, String> {
    let storage_dir = ensure_storage_dir(&app)?;
    let directory = validate_export_directory(&directory)?;
    let path = write_external_backup(&storage_dir, &directory, &state, true)?;
    Ok(BackupExportResponse {
        path: path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn list_tracker_backups<R: Runtime>(
    app: AppHandle<R>,
) -> Result<Vec<BackupSnapshotRecord>, String> {
    let storage_dir = ensure_storage_dir(&app)?;
    list_backup_snapshots(&storage_dir)
}

#[tauri::command]
pub fn create_tracker_backup<R: Runtime>(
    app: AppHandle<R>,
    state: TrackerState,
) -> Result<BackupSnapshotRecord, String> {
    let storage_dir = ensure_storage_dir(&app)?;
    create_backup_snapshot(&storage_dir, &state, "manual")
}

#[tauri::command]
pub fn restore_tracker_backup<R: Runtime>(
    app: AppHandle<R>,
    backup_id: String,
) -> Result<RestoreTrackerBackupResponse, String> {
    let storage_dir = ensure_storage_dir(&app)?;
    let current_state = load_state(&storage_dir).ok();
    let restored_state = load_backup_snapshot(&storage_dir, &backup_id)?;

    if let Some(current_state) = current_state {
        create_backup_snapshot(&storage_dir, &current_state, "manual")?;
    }

    save_state(&storage_dir, &restored_state)?;

    Ok(RestoreTrackerBackupResponse {
        backups: list_backup_snapshots(&storage_dir)?,
        state: restored_state,
    })
}

#[tauri::command]
pub fn verify_tracker_backup<R: Runtime>(
    app: AppHandle<R>,
    backup_id: String,
) -> Result<BackupVerificationResponse, String> {
    let storage_dir = ensure_storage_dir(&app)?;
    let (state, created_at) = load_backup_snapshot_with_timestamp(&storage_dir, &backup_id)?;

    Ok(BackupVerificationResponse {
        client_count: state.clients.len(),
        created_at,
        entry_count: state.entries.len(),
        expense_count: state.expenses.len(),
        invoice_count: state.invoices.len(),
        message: "Backup decrypted and validated without changing live data.".to_string(),
        valid: true,
    })
}

fn ensure_storage_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let storage_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data directory: {error}"))?;

    fs::create_dir_all(&storage_dir)
        .map_err(|error| format!("failed to create app data directory: {error}"))?;

    Ok(storage_dir)
}

#[cfg(target_os = "macos")]
fn run_sqlite_query(database_path: &Path, sql: &str) -> Result<String, String> {
    let output = Command::new(SQLITE_BINARY_PATH)
        .arg("-batch")
        .arg("-noheader")
        .arg(database_path)
        .arg(sql)
        .output()
        .map_err(|error| format!("failed to execute sqlite3: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "sqlite3 returned a non-zero exit status".to_string()
        } else {
            stderr
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn load_state(storage_dir: &Path) -> Result<TrackerState, String> {
    let state_path = storage_dir.join(STATE_FILE_NAME);

    if state_path.exists() {
        let contents = fs::read(&state_path)
            .map_err(|error| format!("failed to read tracker state: {error}"))?;
        return decode_protected_json::<TrackerState>(&contents).map(|(state, _)| state);
    }

    if let Some(legacy_state) = load_legacy_sqlite_state(storage_dir)? {
        save_state(storage_dir, &legacy_state)?;
        return Ok(legacy_state);
    }

    Ok(TrackerState::empty())
}

fn save_state(storage_dir: &Path, state: &TrackerState) -> Result<(), String> {
    let state_path = storage_dir.join(STATE_FILE_NAME);
    let temporary_path = storage_dir.join("tracker_state.pending.json");
    let contents = encode_protected_json(
        storage_dir,
        state,
        ProtectedDocumentMetadata {
            created_at: None,
            kind: None,
        },
    )?;

    fs::write(&temporary_path, contents)
        .map_err(|error| format!("failed to write pending tracker state: {error}"))?;

    #[cfg(target_os = "windows")]
    if state_path.exists() {
        fs::remove_file(&state_path)
            .map_err(|error| format!("failed to replace tracker state: {error}"))?;
    }

    fs::rename(&temporary_path, &state_path)
        .map_err(|error| format!("failed to commit tracker state: {error}"))
}

fn write_background_backup_source(storage_dir: &Path, state: &TrackerState) -> Result<(), String> {
    let envelope = build_backup_envelope(state, "automatic")?;
    let source_path = storage_dir.join(BACKGROUND_BACKUP_SOURCE_NAME);
    let temporary_path = storage_dir.join("background_backup_source.pending.json");
    let contents = encode_backup_envelope(storage_dir, &envelope)?;
    fs::write(&temporary_path, contents)
        .map_err(|error| format!("failed to write background backup source: {error}"))?;
    replace_file(&temporary_path, &source_path)
}

fn sync_backup_to_selected_folder(storage_dir: &Path, state: &TrackerState) -> Result<(), String> {
    let Some(directory) = state
        .app_preferences
        .backup_export_directory
        .as_deref()
        .filter(|path| !path.trim().is_empty())
    else {
        return Ok(());
    };
    let directory = validate_export_directory(directory)?;
    write_external_backup(storage_dir, &directory, state, false).map(|_| ())
}

fn validate_export_directory(directory: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(directory.trim());
    if !path.is_absolute() {
        return Err("backup export directory must be an absolute path".to_string());
    }
    if !path.is_dir() {
        return Err("backup export directory is not currently available".to_string());
    }
    Ok(path)
}

fn write_external_backup(
    storage_dir: &Path,
    directory: &Path,
    state: &TrackerState,
    timestamped: bool,
) -> Result<PathBuf, String> {
    let envelope = build_backup_envelope(state, "manual")?;
    let filename = if timestamped {
        format!("legal-time-tracker-{}.backup.json", envelope.created_at)
    } else {
        CLOUD_CURRENT_BACKUP_NAME.to_string()
    };
    let output_path = directory.join(filename);
    let temporary_path = directory.join(format!("{CLOUD_CURRENT_BACKUP_NAME}.pending"));
    let contents = encode_backup_envelope(storage_dir, &envelope)?;
    fs::write(&temporary_path, contents)
        .map_err(|error| format!("failed to write exported backup: {error}"))?;
    replace_file(&temporary_path, &output_path)?;
    Ok(output_path)
}

fn replace_file(temporary_path: &Path, output_path: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    if output_path.exists() {
        fs::remove_file(output_path)
            .map_err(|error| format!("failed to replace existing file: {error}"))?;
    }
    fs::rename(temporary_path, output_path)
        .map_err(|error| format!("failed to commit file: {error}"))
}

fn build_backup_envelope(state: &TrackerState, kind: &str) -> Result<BackupEnvelope, String> {
    Ok(BackupEnvelope {
        created_at: current_unix_timestamp_millis()?,
        kind: kind.to_string(),
        state: state.clone(),
    })
}

fn encode_backup_envelope(
    storage_dir: &Path,
    envelope: &BackupEnvelope,
) -> Result<Vec<u8>, String> {
    let metadata = ProtectedDocumentMetadata {
        created_at: Some(envelope.created_at),
        kind: Some(envelope.kind.clone()),
    };
    if is_security_configured(storage_dir) {
        encode_encrypted_json(envelope, metadata)
    } else {
        serde_json::to_vec_pretty(envelope)
            .map_err(|error| format!("failed to serialize tracker backup: {error}"))
    }
}

fn migrate_backup_directory_to_encryption(storage_dir: &Path) -> Result<(), String> {
    let backup_dir = ensure_backup_dir(storage_dir)?;
    for entry in fs::read_dir(&backup_dir)
        .map_err(|error| format!("failed to read backup directory: {error}"))?
    {
        let path = entry
            .map_err(|error| format!("failed to read backup entry: {error}"))?
            .path();
        if path.extension().and_then(|extension| extension.to_str()) != Some("json") {
            continue;
        }
        migrate_backup_file_to_encryption(storage_dir, &path)?;
    }
    Ok(())
}

fn migrate_selected_export_directory_to_encryption(
    storage_dir: &Path,
    state: &TrackerState,
) -> Result<(), String> {
    let Some(directory) = state
        .app_preferences
        .backup_export_directory
        .as_deref()
        .filter(|path| !path.trim().is_empty())
    else {
        return Ok(());
    };
    let directory = validate_export_directory(directory)?;
    for entry in fs::read_dir(&directory)
        .map_err(|error| format!("failed to read selected backup directory: {error}"))?
    {
        let path = entry
            .map_err(|error| format!("failed to read selected backup entry: {error}"))?
            .path();
        let filename = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("");
        if filename == CLOUD_CURRENT_BACKUP_NAME
            || (filename.starts_with("legal-time-tracker-") && filename.ends_with(".backup.json"))
        {
            migrate_backup_file_to_encryption(storage_dir, &path)?;
        }
    }
    Ok(())
}

fn migrate_backup_file_to_encryption(storage_dir: &Path, path: &Path) -> Result<(), String> {
    let contents = fs::read(path)
        .map_err(|error| format!("failed to read backup during encryption migration: {error}"))?;
    if inspect_protected_metadata(&contents).is_some() {
        return Ok(());
    }
    let envelope = serde_json::from_slice::<BackupEnvelope>(&contents)
        .map_err(|error| format!("failed to parse backup during encryption migration: {error}"))?;
    let encrypted = encode_backup_envelope(storage_dir, &envelope)?;
    let pending = path.with_extension("pending");
    fs::write(&pending, encrypted)
        .map_err(|error| format!("failed to write encrypted backup migration: {error}"))?;
    replace_file(&pending, path)
}

#[cfg(target_os = "macos")]
fn install_background_backup_schedule(storage_dir: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;

    let backup_dir = ensure_backup_dir(storage_dir)?;
    let source_path = storage_dir.join(BACKGROUND_BACKUP_SOURCE_NAME);
    let script_path = storage_dir.join(BACKGROUND_BACKUP_SCRIPT_NAME);
    let script = build_macos_backup_script(&source_path, &backup_dir);
    fs::write(&script_path, script)
        .map_err(|error| format!("failed to write background backup script: {error}"))?;
    fs::set_permissions(&script_path, fs::Permissions::from_mode(0o700))
        .map_err(|error| format!("failed to secure background backup script: {error}"))?;

    let home = std::env::var_os("HOME")
        .map(PathBuf::from)
        .ok_or_else(|| "failed to resolve the user home directory".to_string())?;
    let launch_agents = home.join("Library").join("LaunchAgents");
    fs::create_dir_all(&launch_agents)
        .map_err(|error| format!("failed to create LaunchAgents directory: {error}"))?;
    let plist_path = launch_agents.join("com.krewsonlaw.legaltimetracker.backup.plist");
    let plist = build_macos_launch_agent(&script_path);
    fs::write(&plist_path, plist)
        .map_err(|error| format!("failed to write background backup schedule: {error}"))?;

    let uid_output = Command::new("/usr/bin/id")
        .arg("-u")
        .output()
        .map_err(|error| format!("failed to resolve user id: {error}"))?;
    let uid = String::from_utf8_lossy(&uid_output.stdout)
        .trim()
        .to_string();
    if uid.is_empty() {
        return Err("failed to resolve user id for background backup schedule".to_string());
    }
    let _ = Command::new("/bin/launchctl")
        .args([
            "bootstrap",
            &format!("gui/{uid}"),
            &plist_path.to_string_lossy(),
        ])
        .output();
    Ok(())
}

#[cfg(target_os = "macos")]
fn build_macos_backup_script(source_path: &Path, backup_dir: &Path) -> String {
    format!(
        "#!/bin/sh\nset -eu\nSOURCE={}\nDEST={}\n[ -f \"$SOURCE\" ] || exit 0\nmkdir -p \"$DEST\"\n/bin/cp \"$SOURCE\" \"$DEST/automatic-background-$(/bin/date +%s)000.json\"\n",
        shell_quote(source_path),
        shell_quote(backup_dir),
    )
}

#[cfg(target_os = "macos")]
fn build_macos_launch_agent(script_path: &Path) -> String {
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n<plist version=\"1.0\"><dict><key>Label</key><string>com.krewsonlaw.legaltimetracker.backup</string><key>ProgramArguments</key><array><string>{}</string></array><key>RunAtLoad</key><true/><key>StartInterval</key><integer>21600</integer></dict></plist>\n",
        xml_escape(&script_path.to_string_lossy())
    )
}

#[cfg(target_os = "macos")]
fn shell_quote(path: &Path) -> String {
    format!("'{}'", path.to_string_lossy().replace('\'', "'\\''"))
}

#[cfg(target_os = "macos")]
fn xml_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(target_os = "windows")]
fn install_background_backup_schedule(storage_dir: &Path) -> Result<(), String> {
    let backup_dir = ensure_backup_dir(storage_dir)?;
    let source_path = storage_dir.join(BACKGROUND_BACKUP_SOURCE_NAME);
    let script_path = storage_dir.join("run_background_backup.ps1");
    let script = format!(
        "$source = '{}'\n$destination = '{}'\nif (Test-Path -LiteralPath $source) {{ New-Item -ItemType Directory -Force -Path $destination | Out-Null; $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); Copy-Item -LiteralPath $source -Destination (Join-Path $destination \"automatic-background-$stamp.json\") -Force }}\n",
        source_path.to_string_lossy().replace('\'', "''"),
        backup_dir.to_string_lossy().replace('\'', "''"),
    );
    fs::write(&script_path, script)
        .map_err(|error| format!("failed to write Windows backup script: {error}"))?;
    let task_command = format!(
        "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"{}\"",
        script_path.display()
    );
    let output = Command::new("schtasks.exe")
        .args([
            "/Create",
            "/F",
            "/SC",
            "HOURLY",
            "/MO",
            "6",
            "/TN",
            "Krewson Law Legal Time Tracker Backup",
            "/TR",
            &task_command,
        ])
        .output()
        .map_err(|error| format!("failed to register Windows backup schedule: {error}"))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(format!(
            "Windows rejected the backup schedule: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ))
    }
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn install_background_backup_schedule(_storage_dir: &Path) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "macos")]
fn load_legacy_sqlite_state(storage_dir: &Path) -> Result<Option<TrackerState>, String> {
    let database_path = storage_dir.join(LEGACY_SQLITE_DATABASE_NAME);
    if !database_path.exists() {
        return Ok(None);
    }

    let payload = run_sqlite_query(
        &database_path,
        "SELECT payload_json FROM tracker_state WHERE id = 1 LIMIT 1;",
    )?;

    if payload.is_empty() {
        return Ok(None);
    }

    serde_json::from_str::<TrackerState>(&payload)
        .map(Some)
        .map_err(|error| format!("failed to migrate legacy tracker data: {error}"))
}

#[cfg(not(target_os = "macos"))]
fn load_legacy_sqlite_state(_storage_dir: &Path) -> Result<Option<TrackerState>, String> {
    Ok(None)
}

fn create_automatic_backup_if_needed(
    storage_dir: &Path,
    state: &TrackerState,
) -> Result<(), String> {
    let latest_automatic_backup = list_backup_snapshots(storage_dir)?
        .into_iter()
        .filter(|snapshot| snapshot.kind == "automatic")
        .max_by_key(|snapshot| snapshot.created_at);

    let now_ms = current_unix_timestamp_millis()?;

    if latest_automatic_backup
        .map(|snapshot| now_ms.saturating_sub(snapshot.created_at) < AUTO_BACKUP_INTERVAL_MS)
        .unwrap_or(false)
    {
        return Ok(());
    }

    create_backup_snapshot(storage_dir, state, "automatic").map(|_| ())
}

fn create_backup_snapshot(
    storage_dir: &Path,
    state: &TrackerState,
    kind: &str,
) -> Result<BackupSnapshotRecord, String> {
    let backup_dir = ensure_backup_dir(storage_dir)?;
    let created_at = current_unix_timestamp_millis()?;
    let backup_id = format!("{}-{}.json", kind, created_at);
    let backup_path = backup_dir.join(&backup_id);
    let envelope = BackupEnvelope {
        created_at,
        kind: kind.to_string(),
        state: state.clone(),
    };
    let contents = encode_backup_envelope(storage_dir, &envelope)?;

    fs::write(&backup_path, contents)
        .map_err(|error| format!("failed to write tracker backup: {error}"))?;

    prune_old_backups(&backup_dir)?;

    let file_size = fs::metadata(&backup_path)
        .map_err(|error| format!("failed to read tracker backup metadata: {error}"))?
        .len();

    Ok(BackupSnapshotRecord {
        created_at,
        id: backup_id,
        kind: kind.to_string(),
        path: backup_path.to_string_lossy().to_string(),
        size_bytes: file_size,
    })
}

fn load_backup_snapshot(storage_dir: &Path, backup_id: &str) -> Result<TrackerState, String> {
    load_backup_snapshot_with_timestamp(storage_dir, backup_id).map(|(state, _)| state)
}

fn load_backup_snapshot_with_timestamp(
    storage_dir: &Path,
    backup_id: &str,
) -> Result<(TrackerState, u64), String> {
    let backup_dir = ensure_backup_dir(storage_dir)?;
    let backup_filename = sanitize_backup_id(backup_id)?;
    let backup_path = backup_dir.join(backup_filename);
    let contents = fs::read(&backup_path)
        .map_err(|error| format!("failed to read tracker backup: {error}"))?;
    let (envelope, metadata) = decode_protected_json::<BackupEnvelope>(&contents)?;
    let created_at = metadata.created_at.unwrap_or(envelope.created_at);

    Ok((envelope.state, created_at))
}

fn list_backup_snapshots(storage_dir: &Path) -> Result<Vec<BackupSnapshotRecord>, String> {
    let backup_dir = ensure_backup_dir(storage_dir)?;
    let mut backups = Vec::new();

    for entry in fs::read_dir(&backup_dir)
        .map_err(|error| format!("failed to read backup directory: {error}"))?
    {
        let entry = entry.map_err(|error| format!("failed to read backup entry: {error}"))?;
        let path = entry.path();

        if path.extension().and_then(|extension| extension.to_str()) != Some("json") {
            continue;
        }

        let contents = match fs::read(&path) {
            Ok(contents) => contents,
            Err(_) => continue,
        };
        let (created_at, kind) = if let Some(metadata) = inspect_protected_metadata(&contents) {
            let (Some(created_at), Some(kind)) = (metadata.created_at, metadata.kind) else {
                continue;
            };
            (created_at, kind)
        } else {
            let envelope = match serde_json::from_slice::<BackupEnvelope>(&contents) {
                Ok(envelope) => envelope,
                Err(_) => continue,
            };
            (envelope.created_at, envelope.kind)
        };
        let metadata = match fs::metadata(&path) {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };

        backups.push(BackupSnapshotRecord {
            created_at,
            id: entry.file_name().to_string_lossy().to_string(),
            kind,
            path: path.to_string_lossy().to_string(),
            size_bytes: metadata.len(),
        });
    }

    backups.sort_by_key(|snapshot| std::cmp::Reverse(snapshot.created_at));

    Ok(backups)
}

fn ensure_backup_dir(storage_dir: &Path) -> Result<PathBuf, String> {
    let backup_dir = storage_dir.join(BACKUP_DIRECTORY_NAME);
    fs::create_dir_all(&backup_dir)
        .map_err(|error| format!("failed to create backup directory: {error}"))?;
    Ok(backup_dir)
}

fn prune_old_backups(backup_dir: &Path) -> Result<(), String> {
    let mut automatic = Vec::new();
    let mut manual = Vec::new();

    for entry in fs::read_dir(backup_dir)
        .map_err(|error| format!("failed to read backup directory: {error}"))?
    {
        let entry = entry.map_err(|error| format!("failed to read backup entry: {error}"))?;
        let path = entry.path();

        if path.extension().and_then(|extension| extension.to_str()) != Some("json") {
            continue;
        }

        let contents = match fs::read(&path) {
            Ok(contents) => contents,
            Err(_) => continue,
        };
        let (created_at, kind) = if let Some(metadata) = inspect_protected_metadata(&contents) {
            let (Some(created_at), Some(kind)) = (metadata.created_at, metadata.kind) else {
                continue;
            };
            (created_at, kind)
        } else {
            let envelope = match serde_json::from_slice::<BackupEnvelope>(&contents) {
                Ok(envelope) => envelope,
                Err(_) => continue,
            };
            (envelope.created_at, envelope.kind)
        };

        if kind == "automatic" {
            automatic.push((created_at, path));
        } else if kind == "manual" {
            manual.push((created_at, path));
        }
    }

    automatic.sort_by_key(|snapshot| std::cmp::Reverse(snapshot.0));
    manual.sort_by_key(|snapshot| std::cmp::Reverse(snapshot.0));

    for (_, path) in automatic.into_iter().skip(MAX_AUTOMATIC_BACKUPS) {
        let _ = fs::remove_file(path);
    }

    for (_, path) in manual.into_iter().skip(MAX_MANUAL_BACKUPS) {
        let _ = fs::remove_file(path);
    }

    Ok(())
}

fn sanitize_backup_id(backup_id: &str) -> Result<String, String> {
    if backup_id.is_empty()
        || backup_id.contains('/')
        || backup_id.contains('\\')
        || backup_id.contains("..")
    {
        return Err("invalid backup identifier".to_string());
    }

    Ok(backup_id.to_string())
}

fn current_unix_timestamp_millis() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .map_err(|error| format!("failed to read current system time: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn state_and_backups_round_trip_without_platform_sqlite() {
        let test_dir = std::env::temp_dir().join(format!(
            "legal-time-tracker-storage-test-{}",
            current_unix_timestamp_millis().expect("test timestamp")
        ));
        fs::create_dir_all(&test_dir).expect("create test directory");

        let mut state = TrackerState::empty();
        state.standard_hourly_rate = 425;
        state.app_preferences.color_mode = "dark".to_string();

        save_state(&test_dir, &state).expect("save state");
        let loaded = load_state(&test_dir).expect("load state");
        assert_eq!(loaded.standard_hourly_rate, 425);
        assert_eq!(loaded.app_preferences.color_mode, "dark");

        let snapshot = create_backup_snapshot(&test_dir, &loaded, "manual").expect("create backup");
        let restored = load_backup_snapshot(&test_dir, &snapshot.id).expect("load backup");
        assert_eq!(restored.standard_hourly_rate, 425);
        assert_eq!(
            list_backup_snapshots(&test_dir)
                .expect("list backups")
                .len(),
            1
        );

        fs::remove_dir_all(&test_dir).expect("remove test directory");
    }

    #[test]
    fn background_source_and_external_exports_are_restorable() {
        let test_dir = std::env::temp_dir().join(format!(
            "legal-time-tracker-backup-lifecycle-test-{}",
            current_unix_timestamp_millis().expect("test timestamp")
        ));
        let export_dir = test_dir.join("cloud-sync");
        fs::create_dir_all(&export_dir).expect("create export directory");

        let mut state = TrackerState::empty();
        state.standard_hourly_rate = 475;
        write_background_backup_source(&test_dir, &state).expect("write background source");
        let source = fs::read_to_string(test_dir.join(BACKGROUND_BACKUP_SOURCE_NAME))
            .expect("read background source");
        let background: BackupEnvelope =
            serde_json::from_str(&source).expect("parse background source");
        assert_eq!(background.kind, "automatic");
        assert_eq!(background.state.standard_hourly_rate, 475);

        let current = write_external_backup(&test_dir, &export_dir, &state, false)
            .expect("write current external backup");
        let timestamped = write_external_backup(&test_dir, &export_dir, &state, true)
            .expect("write timestamped external backup");
        assert_eq!(
            current.file_name().and_then(|name| name.to_str()),
            Some(CLOUD_CURRENT_BACKUP_NAME)
        );
        assert_ne!(current, timestamped);
        for path in [current, timestamped] {
            let contents = fs::read_to_string(path).expect("read external backup");
            let envelope: BackupEnvelope =
                serde_json::from_str(&contents).expect("parse external backup");
            assert_eq!(envelope.state.standard_hourly_rate, 475);
        }

        fs::remove_dir_all(&test_dir).expect("remove test directory");
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_background_schedule_runs_every_six_hours() {
        let script = build_macos_backup_script(
            Path::new("/tmp/source file.json"),
            Path::new("/tmp/backup folder"),
        );
        let plist = build_macos_launch_agent(Path::new("/tmp/run backup.sh"));
        assert!(script.contains("automatic-background-"));
        assert!(script.contains("'/tmp/source file.json'"));
        assert!(plist.contains("<integer>21600</integer>"));
        assert!(plist.contains("com.krewsonlaw.legaltimetracker.backup"));
    }
}
