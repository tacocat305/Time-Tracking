use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_opener::OpenerExt;

use crate::storage::ExpenseRecord;

const MAX_RECEIPT_BYTES: u64 = 25 * 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseFileResponse {
    pub path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportExpensesCsvPayload {
    pub expenses: Vec<ExpenseRecord>,
    pub tax_year: Option<u32>,
}

#[tauri::command]
pub fn attach_expense_receipt<R: Runtime>(
    app: AppHandle<R>,
    expense_id: String,
) -> Result<Option<ExpenseFileResponse>, String> {
    let Some(source_path) = crate::native_dialog::choose_file("Choose a receipt")? else {
        return Ok(None);
    };
    validate_receipt_source(&source_path)?;
    let receipt_dir = ensure_receipt_dir(&app)?;
    let extension = source_path
        .extension()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "receipt must have a file extension".to_string())?
        .to_ascii_lowercase();
    let safe_id = sanitize_identifier(&expense_id)?;
    let destination = receipt_dir.join(format!("{safe_id}-receipt.{extension}"));
    fs::copy(&source_path, &destination)
        .map_err(|error| format!("failed to copy receipt into app storage: {error}"))?;
    Ok(Some(ExpenseFileResponse {
        path: destination.to_string_lossy().to_string(),
    }))
}

#[tauri::command]
pub fn open_expense_receipt<R: Runtime>(app: AppHandle<R>, path: String) -> Result<(), String> {
    let receipt_path = validate_receipt_path(&app, &path)?;
    app.opener()
        .open_path(receipt_path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|error| format!("failed to open receipt: {error}"))
}

#[tauri::command]
pub fn remove_expense_receipt<R: Runtime>(app: AppHandle<R>, path: String) -> Result<(), String> {
    let receipt_path = validate_receipt_path(&app, &path)?;
    fs::remove_file(receipt_path).map_err(|error| format!("failed to remove receipt: {error}"))
}

#[tauri::command]
pub fn export_expenses_csv<R: Runtime>(
    app: AppHandle<R>,
    payload: ExportExpensesCsvPayload,
) -> Result<ExpenseFileResponse, String> {
    let report_dir = resolve_report_dir(&app)?;
    fs::create_dir_all(&report_dir)
        .map_err(|error| format!("failed to create expense report directory: {error}"))?;
    let suffix = payload
        .tax_year
        .map(|year| format!("tax-{year}"))
        .unwrap_or_else(|| "all".to_string());
    let output_path = report_dir.join(format!("expenses-{suffix}.csv"));
    let csv = build_expenses_csv(&payload.expenses, payload.tax_year);
    fs::write(&output_path, csv)
        .map_err(|error| format!("failed to write expense CSV: {error}"))?;
    Ok(ExpenseFileResponse {
        path: output_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn open_expense_export<R: Runtime>(app: AppHandle<R>, path: String) -> Result<(), String> {
    let report_path = validate_report_path(&app, &path)?;
    app.opener()
        .open_path(report_path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|error| format!("failed to open expense export: {error}"))
}

fn ensure_receipt_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve receipt storage: {error}"))?
        .join("receipts");
    fs::create_dir_all(&directory)
        .map_err(|error| format!("failed to create receipt storage: {error}"))?;
    Ok(directory)
}

fn resolve_report_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path()
        .document_dir()
        .or_else(|_| app.path().app_data_dir())
        .map(|directory| directory.join("Legal Time Tracker").join("Reports"))
        .map_err(|error| format!("failed to resolve expense report directory: {error}"))
}

fn validate_receipt_source(path: &Path) -> Result<(), String> {
    if !path.is_file() {
        return Err("selected receipt is not a file".to_string());
    }
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !matches!(extension.as_str(), "pdf" | "png" | "jpg" | "jpeg" | "heic") {
        return Err("receipt must be a PDF, PNG, JPG, JPEG, or HEIC file".to_string());
    }
    let size = fs::metadata(path)
        .map_err(|error| format!("failed to read receipt metadata: {error}"))?
        .len();
    if size > MAX_RECEIPT_BYTES {
        return Err("receipt must be 25 MB or smaller".to_string());
    }
    Ok(())
}

fn validate_receipt_path<R: Runtime>(app: &AppHandle<R>, path: &str) -> Result<PathBuf, String> {
    let receipt_dir = ensure_receipt_dir(app)?;
    validate_path_within(&receipt_dir, path, "receipt")
}

fn validate_report_path<R: Runtime>(app: &AppHandle<R>, path: &str) -> Result<PathBuf, String> {
    let report_dir = resolve_report_dir(app)?;
    validate_path_within(&report_dir, path, "expense export")
}

fn validate_path_within(directory: &Path, path: &str, label: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(path.trim());
    if !candidate.is_absolute() {
        return Err(format!("{label} path must be absolute"));
    }
    let canonical = candidate
        .canonicalize()
        .map_err(|error| format!("failed to read {label}: {error}"))?;
    let canonical_directory = directory
        .canonicalize()
        .map_err(|error| format!("failed to read {label} directory: {error}"))?;
    if !canonical.starts_with(canonical_directory) {
        return Err(format!("{label} is outside app-managed storage"));
    }
    Ok(canonical)
}

fn sanitize_identifier(value: &str) -> Result<String, String> {
    if value.is_empty()
        || !value.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        })
    {
        return Err("invalid expense identifier".to_string());
    }
    Ok(value.to_string())
}

fn build_expenses_csv(expenses: &[ExpenseRecord], tax_year: Option<u32>) -> String {
    let mut rows = vec![
        "Date,Lane,Client,Matter,Summary,Payee,Category,Tax Category,Tax Deductible,Amount,Status,Receipt,Notes".to_string(),
    ];
    for expense in expenses.iter().filter(|expense| {
        tax_year
            .map(|year| expense.expense_date.starts_with(&format!("{year:04}-")))
            .unwrap_or(true)
    }) {
        rows.push(
            [
                expense.expense_date.clone(),
                expense.kind.clone(),
                expense.client_name.clone(),
                expense.matter_name.clone(),
                expense.summary.clone(),
                expense.payee.clone(),
                expense.category.clone(),
                expense.tax_category.clone(),
                if expense.tax_deductible { "Yes" } else { "No" }.to_string(),
                format!("{:.2}", expense.amount),
                expense.status.clone(),
                expense.receipt_path.clone().unwrap_or_default(),
                expense.notes.clone(),
            ]
            .iter()
            .map(|value| csv_cell(value))
            .collect::<Vec<_>>()
            .join(","),
        );
    }
    rows.join("\r\n") + "\r\n"
}

fn csv_cell(value: &str) -> String {
    if value.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn csv_export_filters_tax_year_and_escapes_legal_narratives() {
        let expenses = vec![ExpenseRecord {
            amount: 42.5,
            category: "Filing".to_string(),
            client_id: Some("client-1".to_string()),
            client_name: "Example, Inc.".to_string(),
            created_at: "2026-07-01T00:00:00Z".to_string(),
            expense_date: "2026-06-15".to_string(),
            id: "expense-1".to_string(),
            kind: "client".to_string(),
            matter_id: None,
            matter_name: "General".to_string(),
            notes: "Court filing, certified copy".to_string(),
            payee: "County Clerk".to_string(),
            receipt_path: Some("/receipts/expense-1.pdf".to_string()),
            status: "pending".to_string(),
            summary: "Certified copy".to_string(),
            tax_category: "Legal and professional".to_string(),
            tax_deductible: true,
        }];
        let csv = build_expenses_csv(&expenses, Some(2026));
        assert!(csv.contains("\"Example, Inc.\""));
        assert!(csv.contains("Legal and professional,Yes,42.50"));
        assert!(csv.contains("\"Court filing, certified copy\""));
        assert_eq!(build_expenses_csv(&expenses, Some(2025)).lines().count(), 1);
    }

    #[test]
    fn receipt_validation_rejects_unsupported_files() {
        let path = std::env::temp_dir().join("receipt.exe");
        fs::write(&path, b"not a receipt").expect("write receipt fixture");
        assert!(validate_receipt_source(&path).is_err());
        fs::remove_file(path).expect("remove receipt fixture");
    }
}
