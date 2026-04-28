import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import YearEndAccrual from "./YearEndAccrual";
import CategoriesPage from "./pages/CategoriesPage";
import ProfitCentersPage from "./pages/DraftCentersPage";
import GLAccountsPage from "./pages/GLAccountsPage";
import SuppliersPage from "./pages/SuppliersPage";
import AllAccrualsPage from "./pages/AllAccrualsPage";
import AccrualSetupPage from "./pages/AccrualSetupPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ControlNumberSetupPage from "./pages/ControlNumberSetupPage";
import { AppViewContext } from "./lib/appView";
import { ToastProvider, useToast } from "./lib/toast";
import { ensureUserProfile, getCurrentAppUser, getSession, onAuthStateChange, signInWithGoogle, signOut } from "./lib/auth";
import { fetchCollection } from "./lib/adminCrud";
import UsersPage from "./pages/UsersPage";

function Icon({ name }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const icons = {
    accruals: (
      <svg {...commonProps}>
        <path d="M7 4h8l4 4v12H7z" />
        <path d="M15 4v4h4" />
        <path d="M10 12h6" />
        <path d="M10 16h6" />
      </svg>
    ),
    plus: (
      <svg {...commonProps}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),
    suppliers: (
      <svg {...commonProps}>
        <path d="M4 19a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4" />
        <circle cx="12" cy="8" r="4" />
      </svg>
    ),
    glaccounts: (
      <svg {...commonProps}>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h10" />
        <path d="M17 15v6" />
      </svg>
    ),
    profitcenters: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4v16" />
        <path d="M4 12h16" />
      </svg>
    ),
    companies: (
      <svg {...commonProps}>
        <path d="M4 20h16" />
        <path d="M6 20V7l6-3 6 3v13" />
        <path d="M9 10h.01" />
        <path d="M15 10h.01" />
        <path d="M9 14h.01" />
        <path d="M15 14h.01" />
      </svg>
    ),
    expense: (
      <svg {...commonProps}>
        <path d="M6 4h12" />
        <path d="M7 8h10" />
        <path d="M8 12h8" />
        <path d="M9 16h6" />
        <path d="M10 20h4" />
      </svg>
    ),
    transaction: (
      <svg {...commonProps}>
        <path d="M7 7h11" />
        <path d="M14 4l4 3-4 3" />
        <path d="M17 17H6" />
        <path d="M10 14l-4 3 4 3" />
      </svg>
    ),
    tax: (
      <svg {...commonProps}>
        <path d="M7 4h8l4 4v12H7z" />
        <path d="M15 4v4h4" />
        <path d="M10 13h4" />
        <path d="M10 17h4" />
      </svg>
    ),
    users: (
      <svg {...commonProps}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    announcement: (
      <svg {...commonProps}>
        <path d="M4 15V9a2 2 0 0 1 2-2h3l5-3v16l-5-3H6a2 2 0 0 1-2-2z" />
        <path d="M16 8a5 5 0 0 1 0 8" />
      </svg>
    ),
    controlnumber: (
      <svg {...commonProps}>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 9h8" />
        <path d="M8 13h3" />
        <path d="M15 12v4" />
        <path d="M13 14h4" />
      </svg>
    ),
    collapse: (
      <svg {...commonProps}>
        <path d="M15 6l-6 6 6 6" />
      </svg>
    ),
    expand: (
      <svg {...commonProps}>
        <path d="M9 6l6 6-6 6" />
      </svg>
    ),
    logout: (
      <svg {...commonProps}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
    ),
    login: (
      <svg {...commonProps}>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
      </svg>
    ),
  };

  return icons[name] || null;
}

function BrandLogo() {
  return (
    <img
      className="brandLogoSvg"
      src={`${process.env.PUBLIC_URL || ""}/favicon.svg`}
      alt="Accrual Mgr logo"
    />
  );
}

const navigation = [
  {
    section: "Main",
    items: [
      { label: "All Accruals", view: "/accruals", icon: "accruals", roles: ["sysadmin", "accrual_user"] },
      { label: "New Accrual", view: "/new-accrual", icon: "plus", roles: ["sysadmin", "accrual_user"] },
    ],
  },
  {
    section: "Field Management",
    items: [
      { label: "Suppliers", view: "/suppliers", icon: "suppliers", roles: ["sysadmin"] },
      { label: "GL Accounts", view: "/gl-accounts", icon: "glaccounts", roles: ["sysadmin"] },
      { label: "Profit Centers", view: "/draft-centers", icon: "profitcenters", roles: ["sysadmin"] },
      { label: "Companies", view: "/companies", icon: "companies", roles: ["sysadmin"] },
      { label: "Expense Classifications", view: "/expense-classifications", icon: "expense", roles: ["sysadmin"] },
      { label: "Transaction Types", view: "/transaction-types", icon: "transaction", roles: ["sysadmin"] },
      { label: "Tax Codes", view: "/tax-codes", icon: "tax", roles: ["sysadmin"] },
    ],
  },
  {
    section: "Administration",
    items: [
      { label: "Users", view: "/admin-users", icon: "users", roles: ["sysadmin"] },
      { label: "Accrual Setup", view: "/accrual-setup", icon: "companies", roles: ["sysadmin"] },
      { label: "Announcement", view: "/announcements", icon: "announcement", roles: ["sysadmin"] },
      {
        label: "Control Number Setup",
        view: "/control-number-setup",
        icon: "controlnumber",
        allowControlNumberEditors: true,
      },
    ],
  },
];

const titles = {
  "/accruals": "Accrual Records",
  "/new-accrual": "Year-End Accrual Management",
  "/suppliers": "Supplier Management",
  "/gl-accounts": "GL Account Management",
  "/draft-centers": "Profit Center Management",
  "/companies": "Company Management",
  "/expense-classifications": "Expense Classification Management",
  "/transaction-types": "Transaction Type Management",
  "/tax-codes": "Tax Code Management",
  "/admin-users": "User Administration",
  "/accrual-setup": "Accrual Setup",
  "/announcements": "Announcements",
  "/control-number-setup": "Control Number Setup",
};

function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) {
    return "AM";
  }

  return words.map((word) => word[0]?.toUpperCase() || "").join("");
}

function splitAnnouncementDetail(detail) {
  return String(detail || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeAnnouncementHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatLegacyAnnouncementLine(line) {
  return escapeAnnouncementHtml(line)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
}

function formatAnnouncementHtml(detail) {
  const source = String(detail || "").trim();
  if (!source) {
    return "";
  }

  if (/<[a-z][\s\S]*>/i.test(source)) {
    return source;
  }

  return source
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("### ")) {
        return `<h3>${formatLegacyAnnouncementLine(line.slice(4))}</h3>`;
      }
      if (line.startsWith("## ")) {
        return `<h2>${formatLegacyAnnouncementLine(line.slice(3))}</h2>`;
      }
      if (/^\d+\.\s/.test(line)) {
        return `<p class="announcementPreviewText bullet">${formatLegacyAnnouncementLine(line)}</p>`;
      }
      if (line.startsWith("- ")) {
        return `<p class="announcementPreviewText bullet">${formatLegacyAnnouncementLine(line)}</p>`;
      }
      return `<p>${formatLegacyAnnouncementLine(line)}</p>`;
    })
    .join("");
}

function formatAnnouncementDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function AnnouncementPreviewModal({ announcement, open, onClose }) {
  if (!open || !announcement) {
    return null;
  }

  return (
    <div className="announcementPreviewOverlay" role="presentation" onClick={onClose}>
      <div
        className="announcementPreviewCard"
        role="dialog"
        aria-modal="true"
        aria-label={announcement.title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="announcementPreviewHeader">
          <div className="announcementPreviewTitleWrap">
            <div className="announcementPreviewEyebrow">Announcement</div>
            <h2>{announcement.title}</h2>
          </div>
          <button type="button" className="announcementPreviewClose" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="announcementPreviewBody">
          <div className="announcementPreviewHero">
            <div className="announcementPreviewHeroBadge">{announcement.announcement_type}</div>
            <div className="announcementPreviewHeroDate">{formatAnnouncementDate(announcement.published_at)}</div>
          </div>

          {announcement.image_url ? (
            <div className="announcementPreviewImageWrap">
              <img src={announcement.image_url} alt={announcement.title} className="announcementPreviewImage" />
            </div>
          ) : null}

          <div
            className="announcementPreviewContent"
            dangerouslySetInnerHTML={{ __html: formatAnnouncementHtml(announcement.detail) }}
          />

          <div className="announcementPreviewMeta">
            <span>Internal update</span>
            <span>{announcement.expires_at ? `Expires ${formatAnnouncementDate(announcement.expires_at)}` : "No expiry"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const ALLOWED_EMAIL_DOMAIN = "bounty.com.ph";

function isAllowedBountyEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const domain = normalized.split("@")[1] || "";
  return domain === ALLOWED_EMAIL_DOMAIN || domain.endsWith(`.${ALLOWED_EMAIL_DOMAIN}`);
}

function LogoutConfirmDialog({ open, onCancel, onConfirm }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modalOverlay maintenanceOverlay">
      <div className="modalContent maintenanceDialog confirmDialog logoutConfirmDialog">
        <div className="dialogHeader logoutConfirmHeader">
          <div className="logoutConfirmHeaderCopy">
            <div className="logoutConfirmBadge">Session Management</div>
            <h2 className="modalTitle">Confirm Logout</h2>
            <p className="confirmDialogText">
              Are you sure you want to end your current session and log out of the workspace?
            </p>
          </div>
          <button type="button" className="dialogClose" onClick={onCancel} aria-label="Close confirmation">
            x
          </button>
        </div>
        <div className="logoutConfirmBody">
          <div className="logoutConfirmCallout">
            You can sign back in at any time using your approved Bounty email account.
          </div>
        </div>
        <div className="dialogActions logoutConfirmActions">
          <button type="button" className="removeBtn mutedBtn logoutConfirmSecondaryBtn" onClick={onCancel}>
            Stay Signed In
          </button>
          <button type="button" className="submitBtn logoutConfirmPrimaryBtn" onClick={onConfirm}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  activeView,
  setActiveView,
  collapsed,
  mobileOpen,
  isMobile,
  onCloseMobile,
  onToggleCollapse,
  visibleNavigation,
  currentUser,
  onLogout,
}) {
  return (
    <aside
      className={`appSidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobileOpen" : ""}${isMobile ? " mobile" : ""}`}
    >
      <div className="sidebarTop">
        <div className="brandBlock">
          <div className="brandMark">
            <BrandLogo />
          </div>
          <div className="brandText">
            <div className="brandTitle">Accrual Mgr</div>
            <div className="brandSubtitle">Finance workspace</div>
          </div>
        </div>
        <button
          type="button"
          className="sidebarCollapseBtn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name={collapsed ? "expand" : "collapse"} />
        </button>
      </div>

      <div className="sidebarNav">
        {visibleNavigation.map((group, groupIndex) => (
          <div key={group.section} className={`navGroup${groupIndex > 0 ? " withDivider" : ""}`}>
            <div className="navHeading">{group.section}</div>
            {group.items.map((item) => (
              <button
                key={item.view}
                type="button"
                aria-label={item.label}
                onClick={() => {
                  setActiveView(item.view);
                  if (mobileOpen) {
                    onCloseMobile();
                  }
                }}
                className={`navItem${activeView === item.view ? " active" : ""}`}
              >
                <span className="navIcon">
                  <Icon name={item.icon} />
                </span>
                <span className="navText">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebarProfile">
        <div className="profileAvatar">{getInitials(currentUser?.display_name)}</div>
        <div className="profileCopy">
          <div className="profileName">{currentUser?.display_name || "User"}</div>
          <div className="profileRole">
            {currentUser?.usergroup === "sysadmin" ? "System Administrator" : "Accrual User"}
          </div>
        </div>
        <button type="button" className="profileLogoutBtn" aria-label="Logout" onClick={onLogout}>
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}

function TopBar({ activeView, sidebarExpanded, onToggleSidebar }) {
  const pageTitle = titles[activeView] || "Accrual Management";

  return (
    <header className="appTopbar">
      <button
        type="button"
        className="topbarToggleButton"
        onClick={onToggleSidebar}
        aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        <Icon name={sidebarExpanded ? "collapse" : "expand"} />
      </button>
      <div className="topbarTitleRow">
        <span className="topbarBreadcrumb">
          <span className="crumbRoot">Home</span>
          <span className="crumbSep">/</span>
          <span className="crumbCurrent">{pageTitle.replace(" Management", "")}</span>
        </span>
      </div>
    </header>
  );
}

function LoginScreen({ onLogin, signingIn, announcement, onExpandAnnouncement }) {
  const previewLines = announcement ? splitAnnouncementDetail(announcement.detail).slice(0, 2) : [];

  return (
    <div className="authScreen">
      <div className="authCard">
        <div className="authBrandRow">
          <div className="brandMark">
            <BrandLogo />
          </div>
          <div>
            <div className="authTitle">Accrual Mgr</div>
            <div className="authSubtitle">Sign in with your Google account to access the workspace.</div>
          </div>
        </div>

        <button type="button" className="submitBtn authGoogleButton" onClick={onLogin} disabled={signingIn}>
          <span className="authButtonIcon" aria-hidden="true">
            <Icon name="login" />
          </span>
          <span>{signingIn ? "Connecting..." : "Continue With Google"}</span>
        </button>

        {announcement ? (
          <div className="loginAnnouncementCard">
            <div className="loginAnnouncementHeader">
              <div className="loginAnnouncementHeaderLeft">
                <div className="loginAnnouncementLabel">Announcements</div>
                <div className="loginAnnouncementBadge">Latest</div>
              </div>
              <div className="loginAnnouncementDate">{formatAnnouncementDate(announcement.published_at)}</div>
            </div>

            <div className="loginAnnouncementInner">
              <div className="loginAnnouncementType">{announcement.announcement_type}</div>
              <h3 className="loginAnnouncementTitle">{announcement.title}</h3>

              {announcement.image_url ? (
                <div className="loginAnnouncementThumb">
                  <img src={announcement.image_url} alt={announcement.title} />
                </div>
              ) : null}

              <div className="loginAnnouncementPreview">
                {previewLines.map((line, index) => (
                  <p key={`${announcement.id}-${index}`}>{line}</p>
                ))}
              </div>

              <div className="loginAnnouncementActions">
                <button type="button" className="loginAnnouncementExpand" onClick={onExpandAnnouncement}>
                  Read full announcement
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OnboardingScreen({ email, value, onChange, onSubmit, saving }) {
  return (
    <div className="authScreen">
      <div className="authCard">
        <div className="authTitle">Complete Your Profile</div>
        <div className="authSubtitle">
          We found your Google account <strong>{email}</strong>. Enter the name you want to use inside the accrual app.
        </div>

        <label className="headerFieldGroup authFieldGroup">
          <span className="headerFieldLabel">Display Name</span>
          <input
            className="input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter your preferred name"
            aria-label="Display name"
          />
        </label>

        <button type="button" className="submitBtn authGoogleButton" onClick={onSubmit} disabled={saving || !value.trim()}>
          {saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

function renderActiveView(activeView, currentUser, options = {}) {
  const { onNewAccrualFullscreenChange } = options;
  switch (activeView) {
    case "/accruals":
      return <AllAccrualsPage currentUser={currentUser} />;
    case "/suppliers":
      return <SuppliersPage />;
    case "/gl-accounts":
      return <GLAccountsPage />;
    case "/draft-centers":
      return <ProfitCentersPage />;
    case "/companies":
      return <CategoriesPage categoryKey="companies" />;
    case "/expense-classifications":
      return <CategoriesPage categoryKey="expense_classes" />;
    case "/transaction-types":
      return <CategoriesPage categoryKey="transaction_types" />;
    case "/tax-codes":
      return <CategoriesPage categoryKey="tax_codes" />;
    case "/admin-users":
      return <UsersPage currentUser={currentUser} />;
    case "/accrual-setup":
      return <AccrualSetupPage />;
    case "/announcements":
      return <AnnouncementsPage />;
    case "/control-number-setup":
      return <ControlNumberSetupPage currentUser={currentUser} />;
    case "/new-accrual":
    default:
      return (
        <YearEndAccrual
          currentUser={currentUser}
          onFullscreenChange={onNewAccrualFullscreenChange}
        />
      );
  }
}

function getSuggestedNameFromSession(session) {
  return (
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email?.split("@")[0] ||
    ""
  );
}

function AppShell() {
  const { showToast } = useToast();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [collapsed, setCollapsed] = useState(() => {
    const stored = window.localStorage.getItem("accrual-sidebar-collapsed");
    return stored === "true";
  });
  const [activeView, setActiveView] = useState(() => {
    const stored = window.localStorage.getItem("accrual-active-view");
    return stored || "/new-accrual";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pendingName, setPendingName] = useState("");
  const [newAccrualFullscreen, setNewAccrualFullscreen] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const currentUserRef = React.useRef(null);
  const sessionUserIdRef = React.useRef(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    sessionUserIdRef.current = session?.user?.id || null;
  }, [session]);

  const loadCurrentUser = useCallback(async () => {
    setProfileLoading(true);
    setProfileResolved(false);

    try {
      const profile = await getCurrentAppUser();
      if (profile && !profile.auth_user_id) {
        const linkedProfile = await ensureUserProfile(profile.display_name);
        setCurrentUser(linkedProfile || null);
        return linkedProfile || null;
      }

      setCurrentUser(profile || null);
      return profile || null;
    } catch (error) {
      showToast(error.message || "Unable to load your user profile.", "error");
      return currentUserRef.current || null;
    } finally {
      setProfileLoading(false);
      setProfileResolved(true);
    }
  }, [showToast]);

  useEffect(() => {
    window.localStorage.setItem("accrual-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    window.localStorage.setItem("accrual-active-view", activeView);
  }, [activeView]);

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 768;
      setIsMobile(nextIsMobile);

      if (!nextIsMobile) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadActiveAnnouncement() {
      try {
        const rows = await fetchCollection({
          table: "announcements",
          orderBy: "published_at",
          ascending: false,
          filters: { is_active: true },
        });

        if (cancelled) {
          return;
        }

        const now = new Date();
        const nextAnnouncement = rows.find((row) => {
          if (!row.is_active) {
            return false;
          }

          if (!row.expires_at) {
            return true;
          }

          const expiresAt = new Date(`${row.expires_at}T23:59:59`);
          return !Number.isNaN(expiresAt.getTime()) && expiresAt >= now;
        });

        if (!nextAnnouncement) {
          setActiveAnnouncement(null);
          setAnnouncementOpen(false);
          return;
        }

        setActiveAnnouncement(nextAnnouncement);
      } catch (error) {
        if (!cancelled) {
          setActiveAnnouncement(null);
          setAnnouncementOpen(false);
        }
      }
    }

    loadActiveAnnouncement();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      try {
        const nextSession = await getSession();
        if (!mounted) {
          return;
        }

        if (nextSession?.user && !isAllowedBountyEmail(nextSession.user.email)) {
          const confirmLogin = window.confirm(
            `You are signing in with "${nextSession.user.email}", which is not a Bounty email account.\n\nThis workspace is intended for Bounty employees. Do you want to continue?`
          );
          
          if (!confirmLogin) {
            await signOut();
            if (!mounted) {
              return;
            }
            setSession(null);
            setCurrentUser(null);
            setProfileResolved(true);
            setAuthLoading(false);
            return;
          }
        }

        setSession(nextSession);
        setAuthLoading(false);

        if (nextSession?.user) {
          const suggestedName = getSuggestedNameFromSession(nextSession);
          setPendingName(suggestedName);
          void loadCurrentUser();
          return;
        }

        setCurrentUser(null);
        setProfileResolved(true);
      } catch (error) {
        if (mounted) {
          showToast(error.message || "Unable to restore your session.", "error");
          setCurrentUser(null);
          setProfileResolved(true);
          setAuthLoading(false);
        }
      }
    }

    bootstrapAuth();

    const { data } = onAuthStateChange(async (event, nextSession) => {
      const nextUserId = nextSession?.user?.id || null;
      const previousUserId = sessionUserIdRef.current;
      const isSameAuthenticatedUser =
        Boolean(nextUserId) &&
        Boolean(previousUserId) &&
        nextUserId === previousUserId;

      setSession(nextSession);
      setAuthLoading(false);

      if (!nextSession?.user) {
        setCurrentUser(null);
        setPendingName("");
        setProfileResolved(true);
        setProfileLoading(false);
        sessionUserIdRef.current = null;
        setLogoutConfirmOpen(false);
        return;
      }

      if (!isAllowedBountyEmail(nextSession.user.email)) {
        const confirmLogin = window.confirm(
          `You are signing in with "${nextSession.user.email}", which is not a Bounty email account.\n\nThis workspace is intended for Bounty employees. Do you want to continue?`
        );
        
        if (!confirmLogin) {
          await signOut();
          setSession(null);
          setCurrentUser(null);
          setPendingName("");
          setProfileResolved(true);
          setProfileLoading(false);
          sessionUserIdRef.current = null;
          return;
        }
      }

      const suggestedName = getSuggestedNameFromSession(nextSession);

      setPendingName(suggestedName);

      if (isSameAuthenticatedUser && currentUserRef.current) {
        setProfileResolved(true);
        setProfileLoading(false);
        sessionUserIdRef.current = nextUserId;

        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          void loadCurrentUser();
        }
        return;
      }

      sessionUserIdRef.current = nextUserId;
      void loadCurrentUser();
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [loadCurrentUser, showToast]);

  useEffect(() => {
    if (!session?.user || !profileLoading) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setProfileLoading(false);
      setProfileResolved(true);
      showToast("Profile check is taking longer than expected. You can continue and try again if needed.", "warning");
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [profileLoading, session, showToast]);

  const visibleNavigation = useMemo(() => {
    const role = currentUser?.usergroup || "accrual_user";
    return navigation
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            !item.roles ||
            item.roles.includes(role) ||
            (item.allowControlNumberEditors && currentUser?.can_update_control_number)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [currentUser]);

  const allowedViews = useMemo(
    () => new Set(visibleNavigation.flatMap((group) => group.items.map((item) => item.view))),
    [visibleNavigation]
  );

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (!allowedViews.has(activeView)) {
      setActiveView("/new-accrual");
    }
  }, [activeView, allowedViews, currentUser]);

  const showFullscreenNewAccrual =
    activeView === "/new-accrual" &&
    currentUser?.usergroup !== "sysadmin" &&
    newAccrualFullscreen;

  const shellClassName = useMemo(
    () =>
      `appShell${collapsed ? " sidebarCollapsed" : ""}${mobileOpen ? " mobileSidebarOpen" : ""}${
        showFullscreenNewAccrual ? " fullScreenAccrual" : ""
      }`,
    [collapsed, mobileOpen, showFullscreenNewAccrual]
  );

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((current) => !current);
      return;
    }

    setCollapsed((current) => !current);
  };

  const handleGoogleLogin = async () => {
    try {
      setSigningIn(true);
      await signInWithGoogle();
    } catch (error) {
      showToast(error.message || "Unable to start Google sign-in.", "error");
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    setLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut();
      setActiveView("/new-accrual");
      setCurrentUser(null);
      setLogoutConfirmOpen(false);
      showToast("You have been logged out.", "success");
    } catch (error) {
      showToast(error.message || "Unable to log out.", "error");
    }
  };

  const handleSaveProfile = async () => {
    if (!pendingName.trim()) {
      showToast("Please enter the name you want to use.", "error");
      return;
    }

    try {
      setSavingProfile(true);
      const profile = await ensureUserProfile(pendingName.trim());
      setCurrentUser(profile);
      showToast("Your user profile is ready.", "success");
    } catch (error) {
      showToast(error.message || "Unable to save your profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const contextValue = useMemo(() => ({ activeView, setActiveView }), [activeView]);

  if (authLoading || (session && !currentUser && !profileResolved && profileLoading)) {
    return (
      <div className="authScreen">
        <div className="authCard authLoadingCard">
          <div className="spinner" />
          <div className="authTitle">Loading Workspace</div>
          <div className="authSubtitle">Checking your session and user access.</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <AnnouncementPreviewModal
          announcement={activeAnnouncement}
          open={announcementOpen}
          onClose={() => setAnnouncementOpen(false)}
        />
        <LoginScreen
          onLogin={handleGoogleLogin}
          signingIn={signingIn}
          announcement={activeAnnouncement}
          onExpandAnnouncement={() => setAnnouncementOpen(true)}
        />
      </>
    );
  }

  if (!currentUser) {
    return (
      <OnboardingScreen
        email={session.user?.email || ""}
        value={pendingName}
        onChange={setPendingName}
        onSubmit={handleSaveProfile}
        saving={savingProfile}
      />
    );
  }

  return (
    <AppViewContext.Provider value={contextValue}>
      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
      <div className={shellClassName}>
        {!showFullscreenNewAccrual ? (
          <Sidebar
            activeView={activeView}
            setActiveView={setActiveView}
            collapsed={collapsed}
            mobileOpen={mobileOpen}
            isMobile={isMobile}
            onCloseMobile={() => setMobileOpen(false)}
            onToggleCollapse={handleToggleSidebar}
            visibleNavigation={visibleNavigation}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        ) : null}
        {!showFullscreenNewAccrual && mobileOpen ? (
          <button type="button" className="mobileSidebarBackdrop" onClick={() => setMobileOpen(false)} aria-label="Close sidebar" />
        ) : null}
        <div className="appMain">
          {!showFullscreenNewAccrual ? (
            <TopBar activeView={activeView} sidebarExpanded={isMobile ? mobileOpen : !collapsed} onToggleSidebar={handleToggleSidebar} />
          ) : null}
          <main className="appContent">
            {renderActiveView(activeView, currentUser, {
              onNewAccrualFullscreenChange: setNewAccrualFullscreen,
            })}
          </main>
        </div>
      </div>
    </AppViewContext.Provider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
