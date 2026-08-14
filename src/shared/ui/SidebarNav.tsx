import type { AppScreen } from "@/app/navigation";
import type { ScreenId } from "@/types/app";

type SidebarNavProps = {
  activeScreen: ScreenId;
  onSelect: (screenId: ScreenId) => void;
  screens: AppScreen[];
};

export function SidebarNav({
  activeScreen,
  onSelect,
  screens,
}: SidebarNavProps) {
  return (
    <nav className="sidebar-nav" aria-label="Primary">
      {screens.map((screen) => (
        <button
          key={screen.id}
          aria-label={screen.label}
          className={`nav-button${screen.id === activeScreen ? " is-active" : ""}`}
          type="button"
          onClick={() => onSelect(screen.id)}
        >
          <NavIcon screenId={screen.id} />
          <span className="nav-label">{screen.label}</span>
          <span className="nav-description">{screen.description}</span>
        </button>
      ))}
    </nav>
  );
}

function NavIcon({ screenId }: { screenId: ScreenId }) {
  const paths: Record<ScreenId, React.ReactNode> = {
    today: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    week: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="1" />
        <path d="M8 3v4M16 3v4M4 9h16" />
      </>
    ),
    month: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="1" />
        <path d="M8 4v16M16 4v16M4 9h16M4 15h16" />
      </>
    ),
    billing: (
      <>
        <path d="M7 3h8l3 3v15H7z" />
        <path d="M15 3v4h4M10 11h5M10 15h5" />
      </>
    ),
    clients: (
      <>
        <circle cx="9" cy="9" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M4 20c.3-4 2-6 5-6s4.7 2 5 6M14 15c3-.6 5 .9 6 4" />
      </>
    ),
    expenses: (
      <>
        <rect x="4" y="6" width="16" height="13" rx="1" />
        <path d="M4 10h16M8 15h3" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="nav-icon" viewBox="0 0 24 24">
      {paths[screenId]}
    </svg>
  );
}
