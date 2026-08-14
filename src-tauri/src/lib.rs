mod email;
mod expenses;
mod native_dialog;
mod statements;
mod storage;

use statements::{export_invoice_pdf, open_invoice_pdf, reveal_invoice_pdf};
use storage::{
    choose_backup_export_directory, create_tracker_backup, export_tracker_backup,
    list_tracker_backups, load_tracker_state, restore_tracker_backup, save_tracker_state,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            send_invoice_email,
            attach_expense_receipt,
            export_expenses_csv,
            open_expense_export,
            open_expense_receipt,
            remove_expense_receipt,
            create_tracker_backup,
            choose_backup_export_directory,
            export_tracker_backup,
            list_tracker_backups,
            load_tracker_state,
            restore_tracker_backup,
            save_tracker_state,
            export_invoice_pdf,
            open_invoice_pdf,
            reveal_invoice_pdf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
use email::send_invoice_email;
use expenses::{
    attach_expense_receipt, export_expenses_csv, open_expense_export, open_expense_receipt,
    remove_expense_receipt,
};
