import { useEffect, useRef, useState } from "react";

import krewsonLawLogo from "@/assets/krewson-law-logo.jpg";
import { BillingScreen } from "@/features/billing/BillingScreen";
import { ClientsScreen } from "@/features/clients/ClientsScreen";
import { MonthScreen } from "@/features/dashboard/MonthScreen";
import { TodayScreen } from "@/features/dashboard/TodayScreen";
import { WeekScreen } from "@/features/dashboard/WeekScreen";
import { ExpensesScreen } from "@/features/expenses/ExpensesScreen";
import { SettingsScreen } from "@/features/settings/SettingsScreen";
import type { TimerDraft } from "@/features/time/types";
import { useTimeTracker } from "@/features/time/useTimeTracker";
import { formatElapsedDuration } from "@/features/time/utils";
import { SidebarNav } from "@/shared/ui/SidebarNav";
import {
  buildThemeStyle,
  themeDefinitions,
  type ThemeName,
} from "@/theme/themes";
import type { AppAppearance, ScreenId } from "@/types/app";

import { appScreens } from "./navigation";

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("today");
  const [timerNow, setTimerNow] = useState(Date.now);
  const mainRef = useRef<HTMLDivElement>(null);
  const tracker = useTimeTracker();
  const themeName = (
    tracker.appPreferences.themeName in themeDefinitions
      ? tracker.appPreferences.themeName
      : "summer"
  ) as ThemeName;
  const appearance: AppAppearance = {
    colorMode: tracker.appPreferences.colorMode,
    themeName,
  };

  const themeStyle = buildThemeStyle(
    appearance.themeName,
    appearance.colorMode
  );

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollLeft = 0;
      mainRef.current.scrollTop = 0;
    }
  }, [activeScreen]);

  useEffect(() => {
    if (!tracker.activeTimer) {
      return;
    }

    const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [tracker.activeTimer]);

  const elapsedSeconds = tracker.activeTimer
    ? Math.max(
        1,
        Math.floor(
          (timerNow - new Date(tracker.activeTimer.startedAt).getTime()) / 1000
        )
      )
    : 0;

  function handleTimerToggle() {
    if (tracker.activeTimer) {
      tracker.stopTimer();
      return;
    }

    tracker.startTimer(createEmptyTimerDraft());
    setActiveScreen("today");
  }

  return (
    <div
      className="app-shell practice-shell"
      data-mode={appearance.colorMode}
      data-theme={appearance.themeName}
      style={themeStyle}
    >
      <aside className="sidebar practice-sidebar">
        <button
          aria-label="Open Today"
          className="sidebar-monogram"
          type="button"
          onClick={() => setActiveScreen("today")}
        >
          KL
        </button>

        <SidebarNav
          activeScreen={activeScreen}
          onSelect={setActiveScreen}
          screens={appScreens}
        />

        <div
          aria-label={formatPersistenceStatus(tracker.persistenceStatus)}
          className="sidebar-save-state"
          title={
            tracker.persistenceError ??
            formatPersistenceStatus(tracker.persistenceStatus)
          }
        >
          <span className="status-dot" aria-hidden="true" />
        </div>
      </aside>

      <main className="app-main practice-main" ref={mainRef}>
        <header className="topbar practice-topbar">
          <img
            alt="Krewson Law LLC, Employment Law and HR Consulting"
            className="topbar-logo"
            src={krewsonLawLogo}
          />
          <button
            aria-label={tracker.activeTimer ? "Stop timer" : "Start timer"}
            className={`topbar-timer${tracker.activeTimer ? " is-running" : ""}`}
            type="button"
            onClick={handleTimerToggle}
          >
            <span className="timer-play-icon" aria-hidden="true">
              {tracker.activeTimer ? "■" : "▷"}
            </span>
            <strong>
              {tracker.activeTimer ? "Stop timer" : "Start timer"}
            </strong>
            <span className="topbar-timer-divider" aria-hidden="true" />
            <span className="topbar-timer-value">
              {tracker.activeTimer
                ? formatElapsedDuration(elapsedSeconds)
                : "00:00:00"}
            </span>
          </button>
        </header>

        {activeScreen === "today" &&
        tracker.persistenceStatus !== "loading" &&
        tracker.clientRecords.length === 0 ? (
          <section className="onboarding-banner practice-onboarding">
            <div>
              <strong>Start with your first client</strong>
              <p>
                Add a client and matter before recording your first time entry.
              </p>
            </div>
            <button
              className="button-primary"
              type="button"
              onClick={() => setActiveScreen("clients")}
            >
              Add a client
            </button>
          </section>
        ) : null}

        {renderScreen(activeScreen, appearance, tracker)}
      </main>
    </div>
  );
}

function renderScreen(
  activeScreen: ScreenId,
  appearance: AppAppearance,
  tracker: ReturnType<typeof useTimeTracker>
) {
  switch (activeScreen) {
    case "today":
      return <TodayScreen tracker={tracker} />;
    case "week":
      return <WeekScreen tracker={tracker} />;
    case "month":
      return <MonthScreen tracker={tracker} />;
    case "billing":
      return <BillingScreen tracker={tracker} />;
    case "clients":
      return <ClientsScreen tracker={tracker} />;
    case "expenses":
      return <ExpensesScreen tracker={tracker} />;
    case "settings":
      return (
        <SettingsScreen
          appearance={appearance}
          onColorModeChange={(colorMode) =>
            tracker.updateAppPreferences({ colorMode })
          }
          onThemeChange={(themeName) =>
            tracker.updateAppPreferences({ themeName })
          }
          tracker={tracker}
        />
      );
  }
}

function createEmptyTimerDraft(): TimerDraft {
  return {
    clientId: null,
    clientName: "",
    matterId: null,
    matterName: "",
    narrative: "",
    taskCategory: "",
  };
}

function formatPersistenceStatus(
  status: ReturnType<typeof useTimeTracker>["persistenceStatus"]
) {
  switch (status) {
    case "loading":
      return "Opening workspace";
    case "saving":
      return "Saving changes";
    case "saved":
      return "All changes saved";
    case "error":
      return "Storage needs attention";
  }
}

export default App;
