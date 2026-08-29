use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
};

use argon2::{Algorithm, Argon2, Params, Version};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use rand_core::{OsRng, RngCore};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, Runtime};
use zeroize::Zeroizing;

const SECURITY_CONFIG_FILE_NAME: &str = "storage_security.json";
const SECURITY_CONFIG_VERSION: u8 = 1;
const SECURE_DOCUMENT_VERSION: u8 = 1;
const MINIMUM_PASSPHRASE_LENGTH: usize = 10;
const KEY_LENGTH: usize = 32;
const SALT_LENGTH: usize = 16;
const NONCE_LENGTH: usize = 24;
const ARGON2_MEMORY_KIB: u32 = 64 * 1024;
const ARGON2_ITERATIONS: u32 = 3;
const ARGON2_PARALLELISM: u32 = 1;
const ASSOCIATED_DATA: &[u8] = b"com.krewsonlaw.legaltimetracker:storage:v1";
const VERIFIER_CONTEXT: &[u8] = b"com.krewsonlaw.legaltimetracker:verifier:v1";

static ACTIVE_KEY: OnceLock<Mutex<Option<Zeroizing<[u8; KEY_LENGTH]>>>> = OnceLock::new();

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageSecurityStatus {
    pub configured: bool,
    pub locked: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SecurityConfig {
    argon2_iterations: u32,
    argon2_memory_kib: u32,
    argon2_parallelism: u32,
    salt: String,
    verifier: String,
    version: u8,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SecureDocument {
    ciphertext: String,
    #[serde(default)]
    created_at: Option<u64>,
    #[serde(default)]
    kind: Option<String>,
    nonce: String,
    version: u8,
}

#[derive(Debug, Clone)]
pub struct ProtectedDocumentMetadata {
    pub created_at: Option<u64>,
    pub kind: Option<String>,
}

#[tauri::command]
pub fn get_storage_security_status<R: Runtime>(
    app: AppHandle<R>,
) -> Result<StorageSecurityStatus, String> {
    let storage_dir = resolve_storage_dir(&app)?;
    let configured = security_config_path(&storage_dir).exists();
    Ok(StorageSecurityStatus {
        configured,
        locked: configured && active_key().is_none(),
    })
}

#[tauri::command]
pub fn unlock_storage<R: Runtime>(app: AppHandle<R>, passphrase: String) -> Result<(), String> {
    let storage_dir = resolve_storage_dir(&app)?;
    let config = load_security_config(&storage_dir)?;
    let key = derive_key(&passphrase, &config)?;

    if verifier_for_key(&key) != config.verifier {
        return Err("The passphrase is incorrect.".to_string());
    }

    set_active_key(key);
    Ok(())
}

#[tauri::command]
pub fn lock_storage() -> Result<(), String> {
    let mut key = key_store()
        .lock()
        .map_err(|_| "failed to lock the encryption key store".to_string())?;
    *key = None;
    Ok(())
}

pub fn configure_security(storage_dir: &Path, passphrase: &str) -> Result<(), String> {
    validate_passphrase(passphrase)?;
    let config_path = security_config_path(storage_dir);
    if config_path.exists() {
        return Err("Local protection is already configured.".to_string());
    }

    let mut salt = [0_u8; SALT_LENGTH];
    OsRng.fill_bytes(&mut salt);
    let config = SecurityConfig {
        argon2_iterations: ARGON2_ITERATIONS,
        argon2_memory_kib: ARGON2_MEMORY_KIB,
        argon2_parallelism: ARGON2_PARALLELISM,
        salt: BASE64.encode(salt),
        verifier: String::new(),
        version: SECURITY_CONFIG_VERSION,
    };
    let key = derive_key(passphrase, &config)?;
    let config = SecurityConfig {
        verifier: verifier_for_key(&key),
        ..config
    };

    write_json_atomically(&config_path, &config)?;
    set_active_key(key);
    Ok(())
}

pub fn remove_security_config(storage_dir: &Path) {
    let _ = fs::remove_file(security_config_path(storage_dir));
    if let Ok(mut key) = key_store().lock() {
        *key = None;
    }
}

pub fn is_security_configured(storage_dir: &Path) -> bool {
    security_config_path(storage_dir).exists()
}

pub fn encode_protected_json<T: Serialize>(
    storage_dir: &Path,
    value: &T,
    metadata: ProtectedDocumentMetadata,
) -> Result<Vec<u8>, String> {
    let plaintext = serde_json::to_vec_pretty(value)
        .map_err(|error| format!("failed to serialize protected data: {error}"))?;

    if !is_security_configured(storage_dir) {
        return Ok(plaintext);
    }

    encode_encrypted_bytes(&plaintext, metadata)
}

pub fn encode_encrypted_json<T: Serialize>(
    value: &T,
    metadata: ProtectedDocumentMetadata,
) -> Result<Vec<u8>, String> {
    let plaintext = serde_json::to_vec_pretty(value)
        .map_err(|error| format!("failed to serialize protected data: {error}"))?;
    encode_encrypted_bytes(&plaintext, metadata)
}

pub fn decode_protected_json<T: DeserializeOwned>(
    contents: &[u8],
) -> Result<(T, ProtectedDocumentMetadata), String> {
    if let Ok(document) = serde_json::from_slice::<SecureDocument>(contents) {
        if document.version == SECURE_DOCUMENT_VERSION {
            let key = require_active_key()?;
            let plaintext = decrypt_document(&key, &document)?;
            let value = serde_json::from_slice::<T>(&plaintext)
                .map_err(|error| format!("failed to parse decrypted data: {error}"))?;
            return Ok((
                value,
                ProtectedDocumentMetadata {
                    created_at: document.created_at,
                    kind: document.kind,
                },
            ));
        }
    }

    let value = serde_json::from_slice::<T>(contents)
        .map_err(|error| format!("failed to parse stored data: {error}"))?;
    Ok((
        value,
        ProtectedDocumentMetadata {
            created_at: None,
            kind: None,
        },
    ))
}

pub fn inspect_protected_metadata(contents: &[u8]) -> Option<ProtectedDocumentMetadata> {
    let document = serde_json::from_slice::<SecureDocument>(contents).ok()?;
    (document.version == SECURE_DOCUMENT_VERSION).then_some(ProtectedDocumentMetadata {
        created_at: document.created_at,
        kind: document.kind,
    })
}

fn encrypt_document(
    key: &[u8; KEY_LENGTH],
    plaintext: &[u8],
    metadata: ProtectedDocumentMetadata,
) -> Result<Vec<u8>, String> {
    let cipher = XChaCha20Poly1305::new_from_slice(key)
        .map_err(|_| "failed to initialize storage encryption".to_string())?;
    let mut nonce = [0_u8; NONCE_LENGTH];
    OsRng.fill_bytes(&mut nonce);
    let ciphertext = cipher
        .encrypt(
            XNonce::from_slice(&nonce),
            chacha20poly1305::aead::Payload {
                msg: plaintext,
                aad: ASSOCIATED_DATA,
            },
        )
        .map_err(|_| "failed to encrypt stored data".to_string())?;
    let document = SecureDocument {
        ciphertext: BASE64.encode(ciphertext),
        created_at: metadata.created_at,
        kind: metadata.kind,
        nonce: BASE64.encode(nonce),
        version: SECURE_DOCUMENT_VERSION,
    };
    serde_json::to_vec_pretty(&document)
        .map_err(|error| format!("failed to serialize encrypted data: {error}"))
}

fn encode_encrypted_bytes(
    plaintext: &[u8],
    metadata: ProtectedDocumentMetadata,
) -> Result<Vec<u8>, String> {
    let key = require_active_key()?;
    encrypt_document(&key, plaintext, metadata)
}

fn decrypt_document(
    key: &[u8; KEY_LENGTH],
    document: &SecureDocument,
) -> Result<Zeroizing<Vec<u8>>, String> {
    let nonce = BASE64
        .decode(&document.nonce)
        .map_err(|_| "encrypted data contains an invalid nonce".to_string())?;
    if nonce.len() != NONCE_LENGTH {
        return Err("encrypted data contains an invalid nonce".to_string());
    }
    let ciphertext = BASE64
        .decode(&document.ciphertext)
        .map_err(|_| "encrypted data contains invalid ciphertext".to_string())?;
    let cipher = XChaCha20Poly1305::new_from_slice(key)
        .map_err(|_| "failed to initialize storage decryption".to_string())?;
    let plaintext = cipher
        .decrypt(
            XNonce::from_slice(&nonce),
            chacha20poly1305::aead::Payload {
                msg: &ciphertext,
                aad: ASSOCIATED_DATA,
            },
        )
        .map_err(|_| {
            "Unable to decrypt local data. The passphrase or file is invalid.".to_string()
        })?;
    Ok(Zeroizing::new(plaintext))
}

fn derive_key(
    passphrase: &str,
    config: &SecurityConfig,
) -> Result<Zeroizing<[u8; KEY_LENGTH]>, String> {
    let salt = BASE64
        .decode(&config.salt)
        .map_err(|_| "local protection configuration contains an invalid salt".to_string())?;
    let params = Params::new(
        config.argon2_memory_kib,
        config.argon2_iterations,
        config.argon2_parallelism,
        Some(KEY_LENGTH),
    )
    .map_err(|error| format!("failed to configure passphrase protection: {error}"))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = Zeroizing::new([0_u8; KEY_LENGTH]);
    argon2
        .hash_password_into(passphrase.as_bytes(), &salt, key.as_mut())
        .map_err(|error| format!("failed to derive the storage key: {error}"))?;
    Ok(key)
}

fn verifier_for_key(key: &[u8; KEY_LENGTH]) -> String {
    let mut digest = Sha256::new();
    digest.update(VERIFIER_CONTEXT);
    digest.update(key);
    BASE64.encode(digest.finalize())
}

fn validate_passphrase(passphrase: &str) -> Result<(), String> {
    if passphrase.chars().count() < MINIMUM_PASSPHRASE_LENGTH {
        return Err(format!(
            "Use a passphrase with at least {MINIMUM_PASSPHRASE_LENGTH} characters."
        ));
    }
    Ok(())
}

fn load_security_config(storage_dir: &Path) -> Result<SecurityConfig, String> {
    let path = security_config_path(storage_dir);
    let contents = fs::read(&path)
        .map_err(|error| format!("failed to read local protection settings: {error}"))?;
    let config = serde_json::from_slice::<SecurityConfig>(&contents)
        .map_err(|error| format!("failed to parse local protection settings: {error}"))?;
    if config.version != SECURITY_CONFIG_VERSION {
        return Err(
            "This local protection format is not supported by this app version.".to_string(),
        );
    }
    Ok(config)
}

fn set_active_key(key: Zeroizing<[u8; KEY_LENGTH]>) {
    if let Ok(mut active_key) = key_store().lock() {
        *active_key = Some(key);
    }
}

fn active_key() -> Option<[u8; KEY_LENGTH]> {
    key_store()
        .lock()
        .ok()
        .and_then(|key| key.as_ref().map(|key| **key))
}

fn require_active_key() -> Result<Zeroizing<[u8; KEY_LENGTH]>, String> {
    active_key()
        .map(Zeroizing::new)
        .ok_or_else(|| "The workspace is locked.".to_string())
}

fn key_store() -> &'static Mutex<Option<Zeroizing<[u8; KEY_LENGTH]>>> {
    ACTIVE_KEY.get_or_init(|| Mutex::new(None))
}

fn security_config_path(storage_dir: &Path) -> PathBuf {
    storage_dir.join(SECURITY_CONFIG_FILE_NAME)
}

fn resolve_storage_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let storage_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data directory: {error}"))?;
    fs::create_dir_all(&storage_dir)
        .map_err(|error| format!("failed to create app data directory: {error}"))?;
    Ok(storage_dir)
}

fn write_json_atomically<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let pending = path.with_extension("pending");
    let contents = serde_json::to_vec_pretty(value)
        .map_err(|error| format!("failed to serialize local protection settings: {error}"))?;
    fs::write(&pending, contents)
        .map_err(|error| format!("failed to write local protection settings: {error}"))?;
    if path.exists() {
        fs::remove_file(path)
            .map_err(|error| format!("failed to replace local protection settings: {error}"))?;
    }
    fs::rename(&pending, path)
        .map_err(|error| format!("failed to commit local protection settings: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug, PartialEq, Serialize, Deserialize)]
    struct SecretRecord {
        narrative: String,
    }

    #[test]
    fn protected_documents_reject_the_wrong_key_and_round_trip() {
        let directory = std::env::temp_dir().join("legal-time-tracker-security-test");
        fs::create_dir_all(&directory).expect("create test directory");
        remove_security_config(&directory);
        configure_security(&directory, "correct horse battery staple").expect("configure security");
        let protected = encode_protected_json(
            &directory,
            &SecretRecord {
                narrative: "Privileged strategy discussion".to_string(),
            },
            ProtectedDocumentMetadata {
                created_at: Some(42),
                kind: Some("manual".to_string()),
            },
        )
        .expect("encrypt document");
        assert!(!String::from_utf8_lossy(&protected).contains("Privileged"));

        let (decoded, metadata) =
            decode_protected_json::<SecretRecord>(&protected).expect("decrypt document");
        assert_eq!(
            decoded,
            SecretRecord {
                narrative: "Privileged strategy discussion".to_string()
            }
        );
        assert_eq!(metadata.created_at, Some(42));

        let wrong_config = load_security_config(&directory).expect("load config");
        let wrong_key =
            derive_key("incorrect passphrase", &wrong_config).expect("derive wrong key");
        set_active_key(wrong_key);
        assert!(decode_protected_json::<SecretRecord>(&protected).is_err());

        remove_security_config(&directory);
        let _ = fs::remove_dir_all(directory);
    }
}
