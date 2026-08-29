# Legal Time Tracker for Windows

This prerelease is intended for the designated single professional user. It is
built and launch-tested on a clean GitHub-hosted Windows runner, but it is not
yet Authenticode signed. Windows may therefore identify the publisher as
unknown even though the installer was produced directly from this private
repository.

## Choose an installer

- Download the file ending in `_x64-setup.exe` for the simplest installation.
- Use the `.msi` only if an administrator or managed Windows environment
  specifically prefers MSI deployment.
- Download `SHA256SUMS.txt` if you want to verify the installer before opening
  it.

## Verify the download

Open PowerShell in the download folder and run the command matching the file
you downloaded:

```powershell
Get-FileHash .\*.exe -Algorithm SHA256
Get-FileHash .\*.msi -Algorithm SHA256
```

The displayed hash must exactly match the corresponding line in
`SHA256SUMS.txt`. Do not install the file if it does not match.

## Install

1. Double-click the downloaded `.exe`.
2. If Microsoft Defender SmartScreen displays **Windows protected your PC**,
   confirm the checksum first, then select **More info** and **Run anyway**.
3. Complete the installer and launch **Legal Time Tracker** from the Start
   menu.

The SmartScreen message is expected for this private unsigned prerelease. A
future Authenticode-signed release will remove the unknown-publisher warning.

## First-run checklist

1. Open **Settings**, enable Local Protection, and store the passphrase in a
   secure password manager. The passphrase cannot be recovered.
2. Confirm the standard hourly rate and invoice sender details.
3. Add the client, billing address, matter, rate override, and billing
   instructions.
4. Select a backup folder and create a manual backup before entering production
   data.
5. Save a test time entry, create a draft invoice, and open the resulting PDF
   before recording live billable work.

## Updating or removing the app

Install a newer version over the existing version to update it. Local data is
stored separately from the application installation. Use **Settings > Apps >
Installed apps** in Windows to uninstall the program; retain a verified backup
before uninstalling or moving to another computer.
