# Windows release process

## Tester installer without code signing

The **Windows tester installer** workflow runs automatically on pushes to
`main` and can also be started manually. It runs the full frontend and Rust
checks on a native Windows runner, builds NSIS and MSI installers, launches the
compiled application for five seconds, and uploads the installers as the
`legal-time-tracker-windows-testers` artifact.

This build is appropriate for private testing. Windows will identify it as an
unknown publisher until a code-signing certificate is added. A tester may need
to choose **More info** and **Run anyway** in Microsoft Defender SmartScreen.

Download the `.exe` from the workflow artifact for the simplest installation.
The `.msi` is also included for managed or administrative installation.

## Signed distribution

The Windows release gate runs in `.github/workflows/windows-release.yml` on a native `windows-latest` runner. It runs frontend and Rust checks, imports the signing certificate, builds NSIS and MSI installers, verifies every Authenticode signature, starts the compiled application for five seconds, and uploads the verified installers.

## Required secrets

- `WINDOWS_CERTIFICATE`: Base64-encoded contents of the code-signing `.pfx` certificate.
- `WINDOWS_CERTIFICATE_PASSWORD`: Password used to protect that `.pfx` file.

## Producing an installer

1. Create or connect the project to a private GitHub repository.
2. Add both required repository secrets.
3. Run the **Windows signed release** workflow manually, or push a version tag such as `v0.1.0`.
4. Download the `legal-time-tracker-windows-signed` artifact only after the `Verify signatures and launch the built app` step passes.

An installer produced without the verification step is not considered a tested release artifact.
