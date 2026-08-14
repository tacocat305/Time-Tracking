import { invoke, isTauri } from "@tauri-apps/api/core";

import type { BackupSnapshotRecord, TrackerState } from "./types";
import {
  BROWSER_STORAGE_KEY,
  createDefaultTrackerState,
  normalizeTrackerState,
} from "./utils";

type PersistenceMode = "browser-local" | "tauri";

type LoadedTrackerState = {
  error: string | null;
  mode: PersistenceMode;
  state: TrackerState;
};

type RestoredTrackerState = {
  backups: BackupSnapshotRecord[];
  state: TrackerState;
};

type BackupExportResponse = {
  path: string;
};

export function loadInitialTrackerState() {
  if (isTauri()) {
    return createDefaultTrackerState();
  }

  return loadTrackerStateFromBrowser();
}

export function shouldHydrateTrackerState() {
  return isTauri();
}

export async function hydrateTrackerState(): Promise<LoadedTrackerState> {
  if (!isTauri()) {
    return {
      mode: "browser-local",
      error: null,
      state: loadTrackerStateFromBrowser(),
    };
  }

  try {
    const loadedState = normalizeTrackerState(
      await invoke<TrackerState>("load_tracker_state")
    );

    return {
      error: null,
      mode: "tauri",
      state: loadedState,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : `Unable to open desktop data: ${String(error)}`,
      mode: "tauri",
      state: createDefaultTrackerState(),
    };
  }
}

export async function persistTrackerState(
  state: TrackerState,
  mode: PersistenceMode
): Promise<{ error: string | null; mode: PersistenceMode }> {
  if (mode === "tauri" && isTauri()) {
    try {
      await invoke("save_tracker_state", { state });
      return { error: null, mode: "tauri" };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : `Desktop storage failed: ${String(error)}`,
        mode: "tauri",
      };
    }
  }

  try {
    saveTrackerStateToBrowser(state);
    return { error: null, mode: "browser-local" };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Browser storage failed.",
      mode: "browser-local",
    };
  }
}

export async function listTrackerBackups() {
  if (!isTauri()) {
    return [] satisfies BackupSnapshotRecord[];
  }

  try {
    return await invoke<BackupSnapshotRecord[]>("list_tracker_backups");
  } catch {
    return [] satisfies BackupSnapshotRecord[];
  }
}

export async function createTrackerBackup(state: TrackerState) {
  if (!isTauri()) {
    return null;
  }

  try {
    return await invoke<BackupSnapshotRecord>("create_tracker_backup", {
      state,
    });
  } catch {
    return null;
  }
}

export async function chooseBackupExportDirectory() {
  if (!isTauri()) {
    return null;
  }
  return await invoke<string | null>("choose_backup_export_directory");
}

export async function exportTrackerBackup(
  state: TrackerState,
  directory: string
) {
  if (!isTauri()) {
    return null;
  }
  try {
    return await invoke<BackupExportResponse>("export_tracker_backup", {
      directory,
      state,
    });
  } catch {
    return null;
  }
}

export async function restoreTrackerBackup(
  backupId: string
): Promise<RestoredTrackerState | null> {
  if (!isTauri()) {
    return null;
  }

  try {
    const restored = await invoke<RestoredTrackerState>(
      "restore_tracker_backup",
      {
        backupId,
      }
    );

    return {
      backups: restored.backups,
      state: normalizeTrackerState(restored.state),
    };
  } catch {
    return null;
  }
}

function loadTrackerStateFromBrowser(): TrackerState {
  if (typeof window === "undefined") {
    return createDefaultTrackerState();
  }

  const stored = window.localStorage.getItem(BROWSER_STORAGE_KEY);

  if (!stored) {
    return createDefaultTrackerState();
  }

  try {
    return normalizeTrackerState(JSON.parse(stored) as Partial<TrackerState>);
  } catch {
    return createDefaultTrackerState();
  }
}

function saveTrackerStateToBrowser(state: TrackerState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(state));
}
