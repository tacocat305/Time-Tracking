use std::{path::PathBuf, process::Command};

pub fn choose_directory(prompt: &str) -> Result<Option<PathBuf>, String> {
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "POSIX path of (choose folder with prompt \"{}\")",
            escape_applescript(prompt)
        );
        return run_picker(Command::new("/usr/bin/osascript").args(["-e", &script]));
    }

    #[cfg(target_os = "windows")]
    {
        let script = format!(
            "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = '{}'; if ($dialog.ShowDialog() -eq 'OK') {{ Write-Output $dialog.SelectedPath }}",
            prompt.replace('\'', "''")
        );
        return run_picker(Command::new("powershell.exe").args([
            "-NoProfile",
            "-Command",
            &script,
        ]));
    }

    #[cfg(target_os = "linux")]
    {
        return run_picker(Command::new("zenity").args([
            "--file-selection",
            "--directory",
            "--title",
            prompt,
        ]));
    }

    #[allow(unreachable_code)]
    Err("folder selection is not supported on this operating system".to_string())
}

pub fn choose_file(prompt: &str) -> Result<Option<PathBuf>, String> {
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "POSIX path of (choose file with prompt \"{}\")",
            escape_applescript(prompt)
        );
        return run_picker(Command::new("/usr/bin/osascript").args(["-e", &script]));
    }

    #[cfg(target_os = "windows")]
    {
        let script = format!(
            "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.OpenFileDialog; $dialog.Title = '{}'; if ($dialog.ShowDialog() -eq 'OK') {{ Write-Output $dialog.FileName }}",
            prompt.replace('\'', "''")
        );
        return run_picker(Command::new("powershell.exe").args([
            "-NoProfile",
            "-Command",
            &script,
        ]));
    }

    #[cfg(target_os = "linux")]
    {
        return run_picker(Command::new("zenity").args(["--file-selection", "--title", prompt]));
    }

    #[allow(unreachable_code)]
    Err("file selection is not supported on this operating system".to_string())
}

fn run_picker(command: &mut Command) -> Result<Option<PathBuf>, String> {
    let output = command
        .output()
        .map_err(|error| format!("failed to open the system picker: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("User canceled") || stderr.contains("-128") {
            return Ok(None);
        }
        return Err(if stderr.trim().is_empty() {
            "the system picker closed without a selection".to_string()
        } else {
            format!("the system picker failed: {}", stderr.trim())
        });
    }

    let selected = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if selected.is_empty() {
        Ok(None)
    } else {
        Ok(Some(PathBuf::from(selected)))
    }
}

#[cfg(target_os = "macos")]
fn escape_applescript(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}
