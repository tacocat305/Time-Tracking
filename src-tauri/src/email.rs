use std::process::Command;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendInvoiceEmailPayload {
    pub body: String,
    pub pdf_path: String,
    pub recipient: String,
    pub subject: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendInvoiceEmailResponse {
    pub message: String,
    pub status: String,
    pub transport: String,
}

#[tauri::command]
pub fn send_invoice_email<R: Runtime>(
    app: AppHandle<R>,
    payload: SendInvoiceEmailPayload,
) -> Result<SendInvoiceEmailResponse, String> {
    validate_email_address(&payload.recipient)?;
    if payload.subject.trim().is_empty() {
        return Err("invoice email subject cannot be empty".to_string());
    }
    let pdf_path = crate::statements::validate_exported_statement_path(&app, &payload.pdf_path)?;

    #[cfg(target_os = "macos")]
    {
        let output = Command::new("/usr/bin/osascript")
            .args([
                "-e",
                MACOS_MAIL_SCRIPT,
                "--",
                payload.recipient.trim(),
                payload.subject.trim(),
                &payload.body,
                &pdf_path.to_string_lossy(),
            ])
            .output()
            .map_err(|error| format!("failed to contact Apple Mail: {error}"))?;
        mail_command_response(output, "Apple Mail")
    }

    #[cfg(target_os = "windows")]
    {
        let output = Command::new("powershell.exe")
            .args(["-NoProfile", "-Command", WINDOWS_OUTLOOK_SCRIPT])
            .env("LTT_RECIPIENT", payload.recipient.trim())
            .env("LTT_SUBJECT", payload.subject.trim())
            .env("LTT_BODY", &payload.body)
            .env("LTT_ATTACHMENT", &pdf_path)
            .output()
            .map_err(|error| format!("failed to contact Microsoft Outlook: {error}"))?;
        mail_command_response(output, "Microsoft Outlook")
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = pdf_path;
        Err("direct invoice email is supported on macOS and Windows".to_string())
    }
}

fn validate_email_address(address: &str) -> Result<(), String> {
    let trimmed = address.trim();
    let mut parts = trimmed.split('@');
    let local = parts.next().unwrap_or_default();
    let domain = parts.next().unwrap_or_default();
    if local.is_empty()
        || domain.is_empty()
        || parts.next().is_some()
        || !domain.contains('.')
        || trimmed.chars().any(char::is_whitespace)
    {
        return Err("invoice recipient email address is invalid".to_string());
    }
    Ok(())
}

fn mail_command_response(
    output: std::process::Output,
    transport: &str,
) -> Result<SendInvoiceEmailResponse, String> {
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            format!("{transport} did not accept the invoice message")
        } else {
            format!("{transport} did not accept the invoice message: {stderr}")
        });
    }
    Ok(SendInvoiceEmailResponse {
        message: format!("{transport} accepted the message for sending."),
        status: "accepted".to_string(),
        transport: transport.to_string(),
    })
}

#[cfg(target_os = "macos")]
const MACOS_MAIL_SCRIPT: &str = r#"
on run argv
  set recipientAddress to item 1 of argv
  set subjectText to item 2 of argv
  set bodyText to item 3 of argv
  set attachmentPath to item 4 of argv
  tell application "Mail"
    set outgoingMessage to make new outgoing message with properties {subject:subjectText, content:bodyText & return & return, visible:false}
    tell outgoingMessage
      make new to recipient at end of to recipients with properties {address:recipientAddress}
      make new attachment with properties {file name:(POSIX file attachmentPath)} at after the last paragraph
      send
    end tell
  end tell
  return "accepted"
end run
"#;

#[cfg(target_os = "windows")]
const WINDOWS_OUTLOOK_SCRIPT: &str = r#"
$outlook = New-Object -ComObject Outlook.Application
$message = $outlook.CreateItem(0)
$message.To = $env:LTT_RECIPIENT
$message.Subject = $env:LTT_SUBJECT
$message.Body = $env:LTT_BODY
$message.Attachments.Add($env:LTT_ATTACHMENT) | Out-Null
$message.Send()
Write-Output "accepted"
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_recipient_addresses_before_opening_mail() {
        assert!(validate_email_address("billing@example.com").is_ok());
        assert!(validate_email_address("missing-domain@").is_err());
        assert!(validate_email_address("two@@example.com").is_err());
        assert!(validate_email_address("space @example.com").is_err());
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_message_script_sends_and_attaches_the_pdf() {
        assert!(MACOS_MAIL_SCRIPT.contains("make new attachment"));
        assert!(MACOS_MAIL_SCRIPT.contains("send"));
        assert!(MACOS_MAIL_SCRIPT.contains("visible:false"));
    }
}
