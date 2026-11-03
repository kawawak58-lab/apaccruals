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
import AccrualCutoffNotice from "./components/AccrualCutoffNotice";
import ControlNumberSetupPage from "./pages/ControlNumberSetupPage";
import { AppViewContext } from "./lib/appView";
import { ToastProvider, useToast } from "./lib/toast";
import { ensureUserProfile, getCurrentAppUser, getSession, onAuthStateChange, signInWithGoogle, signOut } from "./lib/auth";
import { fetchCollection } from "./lib/adminCrud";
import { supabase } from "./lib/supabase";
import UsersPage from "./pages/UsersPage";
import MessageCenterModal from "./components/MessageCenterModal";
import {
  fetchMessagingContacts,
  fetchThreadsForUser,
  markMessagesAsDelivered,
  markThreadAsRead,
  sendDirectMessage,
  subscribeToUserMessages,
  subscribeToWorkspacePresence,
} from "./lib/messaging";

function Icon({ name }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: {
      overflow: "visible",
      width: "100%",
      height: "100%",
    },
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
    messages: (
      <svg {...commonProps}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
    ),
  };

  return icons[name] || null;
}

function BrandLogo() {
  return (
    <img
      className="brandLogoSvg"
      src={`${process.env.PUBLIC_URL || ""}/bounty.jpg`}
      alt="Bounty logo"
    />
  );
}

const navigation = [
  {
    section: "Accruals",
    items: [
      { label: "All Accruals", view: "/accruals", icon: "accruals", roles: ["sysadmin", "accrual_user"] },
      { label: "New Accrual", view: "/new-accrual", icon: "plus", roles: ["sysadmin", "accrual_user"] },
    ],
  },
  {
    section: "Master Data",
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
      { label: "Accrual Setup", view: "/accrual-setup", icon: "companies", roles: ["sysadmin"], allowSetupEditors: true },
      { label: "Announcement", view: "/announcements", icon: "announcement", roles: ["sysadmin"] },
      {
        label: "Control Number Setup",
        view: "/control-number-setup",
        icon: "controlnumber",
        roles: ["sysadmin"],
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

function getAnnouncementPreview(detail, limit = 2) {
  const lines = splitAnnouncementDetail(detail).filter(
    (line) => !/^(?:dear\s+[^,!]+[,!]?|good\s+(?:day|morning|afternoon|evening)[!,.]?|hello[!,.]?|hi[!,.]?|thank\s+you[!,.]?)$/i.test(line)
  );
  const usefulLines = lines.filter((line) =>
    /\b(?:deadline|cut[ -]?off|due|submit|submission|accept|receipt|invoice|effective|scheduled|by\s+(?:\w+\s+)?\d{1,2}\b|\d{1,2}\s+\w+\s+20\d{2}|\w+\s+\d{1,2},?\s+20\d{2})\b/i.test(line)
  );
  return (usefulLines.length ? usefulLines : lines).slice(0, limit);
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

const ANNOUNCEMENT_REACTIONS = [
  { value: "seen", label: "Seen" },
  { value: "helpful", label: "Helpful" },
  { value: "clarify", label: "Need Clarification" },
];

const ANNOUNCEMENT_REACTIONS_STORAGE_KEY = "accrual-announcement-reactions-v1";

function loadAnnouncementReactions() {
  try {
    const rawValue = window.localStorage.getItem(ANNOUNCEMENT_REACTIONS_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function AnnouncementCenterModal({ open, announcements, reactions, onClose, onOpenAnnouncement, onReact }) {
  if (!open) {
    return null;
  }

  return (
    <div className="announcementCenterOverlay" role="presentation" onClick={onClose}>
      <div
        className="announcementCenterDialog"
        role="dialog"
        aria-modal="true"
        aria-label="All announcements"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="announcementCenterHeader">
          <div>
            <div className="announcementCenterEyebrow">Workspace News</div>
            <h2>All Announcements</h2>
          </div>
          <button type="button" className="announcementCenterClose" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="announcementCenterBody">
          {announcements.length ? (
            <div className="announcementCenterList">
              {announcements.map((announcement) => {
                const selectedReaction = reactions[String(announcement.id)] || "";
                const previewLines = getAnnouncementPreview(announcement.detail);

                return (
                  <article key={announcement.id} className="announcementCenterItem">
                    <div className="announcementCenterItemTop">
                      <div className="announcementCenterTags">
                        <span className="announcementCenterTag">{announcement.announcement_type}</span>
                        <span className="announcementCenterDate">{formatAnnouncementDate(announcement.published_at)}</span>
                      </div>
                    </div>

                    <div className={`announcementCenterContent${announcement.image_url ? " hasImage" : ""}`}>
                      {announcement.image_url ? (
                        <button type="button" className="announcementCenterImage" onClick={() => onOpenAnnouncement(announcement)}>
                          <img src={announcement.image_url} alt={announcement.title} />
                        </button>
                      ) : null}

                      <div className="announcementCenterText">
                        <h3>{announcement.title}</h3>
                        <div className="announcementCenterPreview">
                          {previewLines.map((line, index) => (
                            <p key={`${announcement.id}-center-${index}`}>{line}</p>
                          ))}
                        </div>

                        <div className="announcementCenterActions">
                          <button type="button" className="announcementCenterReadMore" onClick={() => onOpenAnnouncement(announcement)}>
                            Read More
                          </button>
                          <div className="announcementCenterReactions">
                            {ANNOUNCEMENT_REACTIONS.map((reaction) => (
                              <button
                                key={reaction.value}
                                type="button"
                                className={`announcementReactionChip${selectedReaction === reaction.value ? " active" : ""}`}
                                onClick={() => onReact(announcement.id, reaction.value)}
                              >
                                {reaction.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="announcementCenterEmpty">
              <strong>No announcements available.</strong>
              <span>Updates from administrators will appear here.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnnouncementPreviewModal({ announcement, open, onClose }) {
  const [imageExpanded, setImageExpanded] = useState(false);

  useEffect(() => {
    if (!open) {
      setImageExpanded(false);
    }
  }, [open]);

  if (!open || !announcement) {
    return null;
  }

  return (
    <>
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
                <button
                  type="button"
                  className="announcementPreviewImageButton"
                  onClick={() => setImageExpanded(true)}
                >
                  <img src={announcement.image_url} alt={announcement.title} className="announcementPreviewImage" />
                  <span className="announcementPreviewImageExpand">
                    <span className="announcementPreviewImageExpandIcon" aria-hidden="true">
                      <Icon name="expand" />
                    </span>
                    Expand image
                  </span>
                </button>
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

      {imageExpanded ? (
        <div className="announcementImageLightbox" role="presentation" onClick={() => setImageExpanded(false)}>
          <div className="announcementImageLightboxInner" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="announcementImageLightboxClose"
              onClick={() => setImageExpanded(false)}
            >
              Close image
            </button>
            <img src={announcement.image_url} alt={announcement.title} className="announcementImageLightboxImage" />
          </div>
        </div>
      ) : null}
    </>
  );
}

const ALLOWED_EMAIL_DOMAIN = "bounty.com.ph";
const ALLOWED_EMAIL_EXCEPTIONS = new Set(["baldonado0514@gmail.com"]);

function isAllowedBountyEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (ALLOWED_EMAIL_EXCEPTIONS.has(normalized)) {
    return true;
  }
  const domain = normalized.split("@")[1] || "";
  return domain === ALLOWED_EMAIL_DOMAIN || domain.endsWith(`.${ALLOWED_EMAIL_DOMAIN}`);
}

function LogoutConfirmDialog({ open, busy, onCancel, onConfirm }) {
  if (!open) {
    return null;
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9998,
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
        width: "100%",
        maxWidth: "480px",
        overflow: "hidden",
      }} role="dialog" aria-modal="true">
        {/* Header */}
        <div style={{
          backgroundColor: "#f8f9fa",
          borderBottom: "1px solid #e9ecef",
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}>
          <div>
            <div style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#0066cc",
              letterSpacing: "0.5px",
              marginBottom: "8px",
              textTransform: "uppercase",
            }}>
              Session Management
            </div>
            <h2 style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#1a1a1a",
              margin: "0",
            }}>
              Confirm Logout
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: busy ? "not-allowed" : "pointer",
              color: "#666",
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "28px" }}>
          <p style={{
            fontSize: "15px",
            lineHeight: "1.6",
            color: "#333",
            margin: "0 0 20px 0",
          }}>
            Are you sure you want to end your current session and log out of the workspace?
          </p>
          <div style={{
            backgroundColor: "#e8f4fd",
            border: "1px solid #b3d9f2",
            borderRadius: "8px",
            padding: "14px 16px",
            fontSize: "14px",
            color: "#0056b3",
            lineHeight: "1.5",
          }}>
            You can sign back in at any time using your approved Bounty email account.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          backgroundColor: "#f8f9fa",
          borderTop: "1px solid #e9ecef",
          padding: "16px 28px",
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
        }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: "10px 20px",
              backgroundColor: "#ffffff",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.75 : 1,
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              if (busy) {
                return;
              }
              e.target.backgroundColor = "#f0f0f0";
              e.target.borderColor = "#999";
            }}
            onMouseOut={(e) => {
              if (busy) {
                return;
              }
              e.target.backgroundColor = "#ffffff";
              e.target.borderColor = "#ccc";
            }}
          >
            Stay Signed In
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              padding: "10px 20px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.92 : 1,
              transition: "background-color 0.2s",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              minWidth: "108px",
            }}
            onMouseOver={(e) => {
              if (busy) {
                return;
              }
              e.target.style.backgroundColor = "#c82333";
            }}
            onMouseOut={(e) => {
              if (busy) {
                return;
              }
              e.target.style.backgroundColor = "#dc3545";
            }}
          >
            {busy ? <span className="buttonSpinner" aria-hidden="true" /> : null}
            {busy ? "Logging Out..." : "Log Out"}
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
}) {
  return (
    <aside
      className={`appSidebar${collapsed && !isMobile ? " collapsed" : ""}${mobileOpen ? " mobileOpen" : ""}${isMobile ? " mobile" : ""}`}
    >
      <div className="sidebarTop">
        <div className="brandBlock">
          <div className="brandMark">
            <BrandLogo />
          </div>
          <div className="brandText">
            <div className="brandTitle">Bounty Accrual Engine</div>
          </div>
        </div>
        <button
          type="button"
          className="sidebarCollapseBtn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name={collapsed ? "expand" : "collapse"} />
        </button>
      </div>

      <nav className="sidebarNav" aria-label="Workspace navigation">
        {visibleNavigation.map((group, groupIndex) => (
          <div key={group.section} className={`navGroup${groupIndex > 0 ? " withDivider" : ""}`}>
            <div className="navHeading">{group.section}</div>
            {group.items.map((item) => (
              <button
                key={item.view}
                type="button"
                aria-current={activeView === item.view ? "page" : undefined}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
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
      </nav>

      <div className="sidebarProfile" title={currentUser?.email || ""}>
        <div className="profileAvatar">{getInitials(currentUser?.display_name)}</div>
        <div className="profileCopy">
          <div className="profileName">{currentUser?.display_name || "User"}</div>
          <div className="profileRole">
            {currentUser?.email || ""}
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  currentUser,
  activeView,
  sidebarExpanded,
  onToggleSidebar,
  onOpenMessages,
  unreadMessageCount,
  onOpenAnnouncements,
  announcementCount,
  onLogout,
}) {
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
      <div className="topbarActions">
        <button type="button" className="topbarAnnouncementButton topbarIconButton" onClick={onOpenAnnouncements} aria-label={`Open announcements${announcementCount ? ` (${announcementCount})` : ""}`} title="Announcements">
          <span className="topbarAnnouncementIcon" aria-hidden="true"><Icon name="announcement" /></span>
          {announcementCount ? <span className="topbarAnnouncementCount">{announcementCount}</span> : null}
        </button>
        <button type="button" className="topbarIconButton topbarMessageButton" onClick={onOpenMessages} aria-label={`Open messages${unreadMessageCount ? ` (${unreadMessageCount} unread)` : ""}`} title="Messages">
          <span className="topbarAnnouncementIcon" aria-hidden="true"><Icon name="messages" /></span>
          {unreadMessageCount ? <span className="topbarAnnouncementCount">{unreadMessageCount}</span> : null}
        </button>
        <details
          className="topbarAccountMenu"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              event.currentTarget.removeAttribute("open");
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.removeAttribute("open");
              event.currentTarget.querySelector("summary").focus();
            }
          }}
        >
          <summary className="topbarMenuTrigger" aria-label="Account menu">
            <span className="topbarAccountInitials">{getInitials(currentUser?.display_name)}</span>
          </summary>
          <div className="topbarMenuPanel">
            <div className="topbarMenuHeading">{currentUser?.display_name || currentUser?.email || "Account"}</div>
            <button type="button" className="topbarMenuLogout" onClick={(event) => {
              event.currentTarget.closest("details").removeAttribute("open");
              onLogout();
            }}>
              <span className="topbarMenuItemIcon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H5v14h4M14 8l4 4-4 4M9 12h9" /></svg></span><span>Logout</span>
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}

function LoginShellLoader() {
  return (
    <div className="authScreen">
      <div className="authSplitShell authSplitShellLoader" aria-live="polite">
        <section className="authNewsPanel authNewsPanelLoader">
          <div className="authNewsHeader">
            <div className="authNewsEyebrowRow">
              <div className="authNewsIcon">
                <Icon name="announcement" />
              </div>
              <div>
                <div className="authNewsEyebrow">Workspace News</div>
                <div className="authNewsTitle">Announcements</div>
              </div>
            </div>
            <div className="authNewsMetaPill">Loading</div>
          </div>

          <div className="authNewsCard authNewsCardLoader">
            <div className="authNewsAccent" />
            <div className="authNewsCardBody">
              <div className="authNewsCardTop">
                <div className="authNewsTags">
                  <div className="authNewsTag">Preparing</div>
                </div>
              </div>
              <div className="authLoaderLine authLoaderLineTitle" />
              <div className="authLoaderBlock" />
              <div className="authLoaderLine authLoaderLineWide" />
              <div className="authLoaderLine authLoaderLineMedium" />
              <div className="authLoaderLine authLoaderLineShort" />
            </div>
          </div>
        </section>

        <section className="authCard authLoginCard authLoginShellLoader">
          <div className="authBrandRow">
            <div className="brandMark">
              <BrandLogo />
            </div>
            <div>
              <div className="authLoginBrand">Bounty Accrual Engine</div>
            </div>
          </div>

          <div className="authLoginShellLoaderBody">
            <div className="announcementLoader" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <path d="M64 32C28.7 32 0 60.7 0 96v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm48 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zM64 288c-35.3 0-64 28.7-64 64v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V352c0-35.3-28.7-64-64-64H64zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm56 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0z" />
              </svg>
              <span />
            </div>
            <div className="authSubtitle loginAnnouncementLoadingText">Preparing sign in and latest announcement.</div>
          </div>
        </section>
      </div>
    </div>
  );
}

function LoginAnnouncementCard({ announcement, featured = false, onOpen }) {
  const previewLines = getAnnouncementPreview(announcement.detail, announcement.image_url ? 1 : 2);

  return (
    <div className={`authNewsCard${featured ? "" : " compact"}`}>
      <div className="authNewsAccent" />
      <div className={`authNewsCardBody${announcement.image_url ? " hasImage" : ""}`}>
        <div className="authNewsCardTop">
          <div className="authNewsTags">
            <div className="authNewsTag">{announcement.announcement_type}</div>
            <div className="authNewsTag pinned">Pinned</div>
          </div>
          <div className="authNewsDate">{formatAnnouncementDate(announcement.published_at)}</div>
        </div>

        <h2 className="authNewsCardTitle">{announcement.title}</h2>

        <div className={`authNewsContentRow${announcement.image_url ? " hasImage" : ""}`}>
          {announcement.image_url ? (
            <button type="button" className="authNewsImage" onClick={onOpen}>
              <img src={announcement.image_url} alt={announcement.title} />
            </button>
          ) : null}

          <div className="authNewsTextContent">
            <div className="authNewsPreview">
              {previewLines.map((line, index) => (
                <p key={`${announcement.id}-${index}`}>{line}</p>
              ))}
            </div>

            <button type="button" className="authNewsReadMore" onClick={onOpen}>
              Read More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, signingIn, announcements, onExpandAnnouncement }) {
  const featuredAnnouncement = announcements[0] || null;
  const additionalAnnouncements = announcements.slice(1);

  return (
    <div className="authScreen">
      <div className="authSplitShell">
        <section className="authNewsPanel">
          <AccrualCutoffNotice />
          <div className="authNewsHeader">
            <div className="authNewsEyebrowRow">
              <div className="authNewsIcon">
                <Icon name="announcement" />
              </div>
              <div>
                <div className="authNewsEyebrow">Workspace News</div>
                <div className="authNewsTitle">Announcements</div>
              </div>
            </div>
            <div className="authNewsMetaPill">
              {announcements.length > 1 ? `${announcements.length} updates` : featuredAnnouncement ? "Latest update" : "No updates"}
            </div>
          </div>

          {featuredAnnouncement ? (
            <div className="authNewsStack">
              <LoginAnnouncementCard
                announcement={featuredAnnouncement}
                featured
                onOpen={() => onExpandAnnouncement(featuredAnnouncement)}
              />
              {additionalAnnouncements.length ? (
                <div className="authNewsSecondaryList">
                  {additionalAnnouncements.map((announcement) => (
                    <LoginAnnouncementCard
                      key={announcement.id}
                      announcement={announcement}
                      onOpen={() => onExpandAnnouncement(announcement)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="authNewsCard authNewsCardEmpty">
              <div className="authNewsCardBody">
                <div className="authNewsCardTitle">No announcements published.</div>
                <div className="authNewsPreview">
                  <p>System updates and reminders will appear here when your administrators publish them.</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="authCard authLoginCard">
          <div className="authBrandRow">
            <div className="brandMark">
              <BrandLogo />
            </div>
            <div>
              <div className="authLoginBrand">Bounty Accrual Engine</div>
            </div>
          </div>

          <div className="authLoginPanel">
          <div className="authLoginHero">Welcome back.</div>
          <div className="authSubtitle authLoginSubtitle">
            Sign in with your <strong>Bounty</strong> email account to access the workspace.
          </div>

          <button type="button" className="submitBtn authGoogleButton authGoogleButtonWide" onClick={onLogin} disabled={signingIn}>
            <span className="authButtonIcon" aria-hidden="true">
              <Icon name="login" />
            </span>
            <span className="authGoogleButtonLabel">{signingIn ? "Connecting..." : "Continue with Google"}</span>
          </button>

          <div className="authDividerLabel">Secure SSO</div>
          <div className="authSecurityCard">
            <div className="authSecurityIcon">✓</div>
            <div>Only authorized <strong>@bounty</strong> accounts can access this workspace.</div>
          </div>

          {featuredAnnouncement ? (
            <button type="button" className="authMobileAnnouncementTrigger" onClick={() => onExpandAnnouncement(featuredAnnouncement)}>
              <span className="authMobileAnnouncementTriggerIcon" aria-hidden="true">
                <Icon name="announcement" />
              </span>
              <span>{announcements.length > 1 ? `Show Announcements (${announcements.length})` : "Show Announcement"}</span>
            </button>
          ) : null}
          <div className="authTerms">
            By continuing you agree to our <strong>Terms</strong> &amp; <strong>Privacy Policy</strong>
          </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function OnboardingScreen({ email, value, onChange, onSubmit, saving }) {
  return (
    <div className="authScreen authProfileScreen">
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
  const { onNewAccrualFullscreenChange, onEditAccrual, accrualsRefreshKey } = options;
  switch (activeView) {
    case "/accruals":
      return <AllAccrualsPage key={accrualsRefreshKey} currentUser={currentUser} onEditAccrual={onEditAccrual} />;
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
      return <AccrualSetupPage currentUser={currentUser} />;
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
    const stored = window.localStorage.getItem("accrual-sidebar-v2-collapsed");
    return stored === "true";
  });
  const [activeView, setActiveView] = useState(() => {
    const stored = window.localStorage.getItem("accrual-active-view");
    return stored || "/new-accrual";
  });
  const [editingAccrual, setEditingAccrual] = useState(null);
  const [accrualsRefreshKey, setAccrualsRefreshKey] = useState(0);
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
  const [activeAnnouncements, setActiveAnnouncements] = useState([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementCenterOpen, setAnnouncementCenterOpen] = useState(false);
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [announcementReactions, setAnnouncementReactions] = useState(() => loadAnnouncementReactions());
  const [messageCenterOpen, setMessageCenterOpen] = useState(false);
  const [messageContacts, setMessageContacts] = useState([]);
  const [messageContactsLoading, setMessageContactsLoading] = useState(false);
  const [messageThreads, setMessageThreads] = useState([]);
  const [messageThreadsLoading, setMessageThreadsLoading] = useState(false);
  const [selectedMessageThreadId, setSelectedMessageThreadId] = useState("");
  const [messagePresence, setMessagePresence] = useState({});
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [nonBountyModalOpen, setNonBountyModalOpen] = useState(false);
  const currentUserRef = React.useRef(null);
  const sessionUserIdRef = React.useRef(null);
  const messagingRefreshRequestRef = React.useRef(0);
  const readThroughByThreadRef = React.useRef(new Map());

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
    window.localStorage.setItem(ANNOUNCEMENT_REACTIONS_STORAGE_KEY, JSON.stringify(announcementReactions));
  }, [announcementReactions]);

  const refreshMessagingThreads = useCallback(async () => {
    if (!currentUser?.id) {
      setMessageThreads([]);
      return;
    }

    const requestId = messagingRefreshRequestRef.current + 1;
    messagingRefreshRequestRef.current = requestId;

    try {
      setMessageThreadsLoading(true);
      const fetchedThreads = await fetchThreadsForUser(currentUser.id);
      const threads = fetchedThreads.map((thread) => {
        const readThroughAt = readThroughByThreadRef.current.get(thread.id);
        if (!readThroughAt) return thread;
        const messages = thread.messages.map((message) =>
          String(message.recipientId) === String(currentUser.id) &&
          !message.readAt &&
          new Date(message.createdAt).getTime() <= readThroughAt
            ? { ...message, readAt: new Date(readThroughAt).toISOString() }
            : message
        );
        return {
          ...thread,
          messages,
          unreadCount: messages.filter(
            (message) => String(message.recipientId) === String(currentUser.id) && !message.readAt
          ).length,
        };
      });
      if (messagingRefreshRequestRef.current === requestId) {
        setMessageThreads(threads);
      }

      const undeliveredMessageIds = threads
        .flatMap((thread) => thread.messages)
        .filter(
          (message) =>
            String(message.recipientId) === String(currentUser.id) &&
            !message.deliveredAt
        )
        .map((message) => message.id);

      if (undeliveredMessageIds.length > 0) {
        void markMessagesAsDelivered(currentUser.id, undeliveredMessageIds);
        if (messagingRefreshRequestRef.current === requestId) {
          const deliveredTimestamp = new Date().toISOString();
          setMessageThreads(
            threads.map((thread) => ({
              ...thread,
              messages: thread.messages.map((message) =>
                undeliveredMessageIds.includes(message.id)
                  ? { ...message, deliveredAt: deliveredTimestamp }
                  : message
              ),
            }))
          );
        }
      }
    } catch (error) {
      showToast(error.message || "Unable to load messages.", "error");
      if (messagingRefreshRequestRef.current === requestId) {
        setMessageThreads([]);
      }
    } finally {
      if (messagingRefreshRequestRef.current === requestId) {
        setMessageThreadsLoading(false);
      }
    }
  }, [currentUser?.id, showToast]);

  const loadMessagingContacts = useCallback(async () => {
    if (!currentUser?.id) {
      setMessageContacts([]);
      return;
    }

    try {
      setMessageContactsLoading(true);
      const rows = await fetchMessagingContacts(currentUser.id);
      setMessageContacts(rows);
    } catch (error) {
      showToast(error.message || "Unable to load messaging contacts.", "error");
      setMessageContacts([]);
    } finally {
      setMessageContactsLoading(false);
    }
  }, [currentUser?.id, showToast]);

  useEffect(() => {
    window.localStorage.setItem("accrual-sidebar-v2-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    void refreshMessagingThreads();
  }, [refreshMessagingThreads]);

  useEffect(() => {
    if (!currentUser?.id) {
      readThroughByThreadRef.current.clear();
      setSelectedMessageThreadId("");
      setMessagePresence({});
      setMessageContacts([]);
      return;
    }

    if (!messageCenterOpen || messageContacts.length > 0) {
      return;
    }

    void loadMessagingContacts();
  }, [currentUser?.id, loadMessagingContacts, messageCenterOpen, messageContacts.length]);

  useEffect(() => {
    if (!currentUser?.id) {
      return undefined;
    }

    const channel = subscribeToUserMessages(currentUser.id, () => {
      void refreshMessagingThreads();
    });

    if (messageCenterOpen) {
      window.addEventListener("focus", refreshMessagingThreads);
    }
    return () => {
      window.removeEventListener("focus", refreshMessagingThreads);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser?.id, messageCenterOpen, refreshMessagingThreads]);

  useEffect(() => {
    if (!currentUser?.id || !messageCenterOpen) {
      setMessagePresence({});
      return undefined;
    }

    const channel = subscribeToWorkspacePresence(currentUser, (nextPresence) => {
      setMessagePresence(nextPresence || {});
    });

    return () => {
      setMessagePresence({});
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser, messageCenterOpen]);

  useEffect(() => {
    if (!messageThreads.length) {
      setSelectedMessageThreadId("");
      return;
    }

    const hasSelectedThread = messageThreads.some((thread) => thread.id === selectedMessageThreadId);
    if (!hasSelectedThread) {
      setSelectedMessageThreadId(messageThreads[0].id);
    }
  }, [messageThreads, selectedMessageThreadId]);

  const selectedThreadUnreadCount = messageThreads.find(
    (thread) => thread.id === selectedMessageThreadId
  )?.unreadCount || 0;

  useEffect(() => {
    if (!currentUser?.id || !selectedMessageThreadId || selectedThreadUnreadCount === 0) {
      return;
    }

    const readThroughAt = Date.now();
    readThroughByThreadRef.current.set(selectedMessageThreadId, readThroughAt);
    setMessageThreads((currentThreads) => currentThreads.map((thread) => {
      if (thread.id !== selectedMessageThreadId || thread.unreadCount === 0) {
        return thread;
      }

      const nextMessages = thread.messages.map((message) => (
        String(message.recipientId) === String(currentUser.id) && !message.readAt
          ? { ...message, readAt: new Date(readThroughAt).toISOString() }
          : message
      ));

      return {
        ...thread,
        unreadCount: 0,
        messages: nextMessages,
      };
    }));

    void markThreadAsRead(currentUser.id, selectedMessageThreadId).catch((error) => {
      readThroughByThreadRef.current.delete(selectedMessageThreadId);
      showToast(error.message || "Unable to mark messages as read.", "error");
      void refreshMessagingThreads();
    });
  }, [currentUser?.id, selectedMessageThreadId, selectedThreadUnreadCount, showToast, refreshMessagingThreads]);

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
      setAnnouncementLoading(true);
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
        const nextAnnouncements = rows.filter((row) => {
          if (!row.is_active) {
            return false;
          }

          if (!row.expires_at) {
            return true;
          }

          const expiresAt = new Date(`${row.expires_at}T23:59:59`);
          return !Number.isNaN(expiresAt.getTime()) && expiresAt >= now;
        });

        if (nextAnnouncements.length === 0) {
          setActiveAnnouncements([]);
          setActiveAnnouncement(null);
          setAnnouncementOpen(false);
          setAnnouncementLoading(false);
          return;
        }

        setActiveAnnouncements(nextAnnouncements);
        setActiveAnnouncement((currentAnnouncement) => {
          if (!currentAnnouncement) {
            return nextAnnouncements[0];
          }

          return nextAnnouncements.find((announcement) => announcement.id === currentAnnouncement.id) || nextAnnouncements[0];
        });
        setAnnouncementLoading(false);
      } catch (error) {
        if (!cancelled) {
          setActiveAnnouncements([]);
          setActiveAnnouncement(null);
          setAnnouncementOpen(false);
          setAnnouncementLoading(false);
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
          // show an in-app modal instead of a browser confirm so the UX is consistent
          setNonBountyModalOpen(true);
          // keep the session state while modal is shown; modal will force sign-out if user is not allowed
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

      if (!nextSession?.user) {
        setSession(null);
        setCurrentUser(null);
        setPendingName("");
        setProfileResolved(true);
        setProfileLoading(false);
        sessionUserIdRef.current = null;
        setLogoutConfirmOpen(false);
        setAuthLoading(false);
        return;
      }

      // Check if email is allowed BEFORE setting session
      if (!isAllowedBountyEmail(nextSession.user.email)) {
        // Show non-bounty modal and do NOT set session (deny access)
        setNonBountyModalOpen(true);
        setSession(null);  // Ensure session is cleared
        setCurrentUser(null);
        setPendingName("");
        setProfileResolved(true);
        setProfileLoading(false);
        sessionUserIdRef.current = null;
        setAuthLoading(false);
        return;
      }

      // Only set session if email is allowed
      setSession(nextSession);
      setAuthLoading(false);

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

  useEffect(() => {
    if (!session?.user || !currentUser?.id) {
      return undefined;
    }

    const refreshCurrentUser = () => {
      void loadCurrentUser();
    };

    const refreshCurrentUserIfVisible = () => {
      if (document.visibilityState === "visible") {
        refreshCurrentUser();
      }
    };

    const profileChannel = supabase
      .channel(`current-user-profile-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${currentUser.id}`,
        },
        refreshCurrentUser
      )
      .subscribe();

    document.addEventListener("visibilitychange", refreshCurrentUserIfVisible);

    return () => {
      document.removeEventListener("visibilitychange", refreshCurrentUserIfVisible);
      supabase.removeChannel(profileChannel);
    };
  }, [currentUser?.id, loadCurrentUser, session?.user]);

  useEffect(() => {
    if (!session?.user) {
      return undefined;
    }

    const handleUserUpdated = (event) => {
      const detail = event?.detail || {};
      const matchesCurrentUser =
        (detail.id && detail.id === currentUserRef.current?.id) ||
        (detail.auth_user_id && detail.auth_user_id === session.user.id) ||
        (detail.email && detail.email.toLowerCase() === (session.user.email || "").toLowerCase());

      if (matchesCurrentUser) {
        void loadCurrentUser();
      }
    };

    window.addEventListener("app-user-updated", handleUserUpdated);
    return () => window.removeEventListener("app-user-updated", handleUserUpdated);
  }, [loadCurrentUser, session]);

  const visibleNavigation = useMemo(() => {
    const role = currentUser?.usergroup || "accrual_user";
    return navigation
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            !item.roles ||
            item.roles.includes(role) ||
            (item.allowControlNumberEditors && currentUser?.can_update_control_number) ||
            (item.allowSetupEditors && currentUser?.can_update_setup)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [currentUser]);

  const allowedViews = useMemo(
    () => new Set(visibleNavigation.flatMap((group) => group.items.map((item) => item.view))),
    [visibleNavigation]
  );

  useEffect(() => {
    if (activeView !== "/accruals" && editingAccrual) {
      setEditingAccrual(null);
    }
  }, [activeView, editingAccrual]);

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
  const unreadMessageCount = useMemo(
    () => messageThreads.reduce((total, thread) => total + thread.unreadCount, 0),
    [messageThreads]
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

  const handleOpenAnnouncementCenter = () => {
    setAnnouncementCenterOpen(true);
  };

  const handleOpenMessageCenter = () => {
    setMessageCenterOpen(true);
    if (messageThreads.length === 0) {
      void refreshMessagingThreads();
    }
    if (messageContacts.length === 0) {
      void loadMessagingContacts();
    }
  };

  const handleReactToAnnouncement = (announcementId, reaction) => {
    setAnnouncementReactions((current) => ({
      ...current,
      [String(announcementId)]: current[String(announcementId)] === reaction ? "" : reaction,
    }));
  };

  const handleSelectMessageThread = (threadId) => {
    setSelectedMessageThreadId(threadId);
  };

  const handleSendMessage = async (recipientId, body) => {
    const recipient = messageContacts.find((contact) => String(contact.id) === String(recipientId));
    if (!currentUser?.id || !recipient) {
      showToast("Select a valid recipient first.", "error");
      return;
    }

    try {
      const nextMessage = await sendDirectMessage({
        sender: currentUser,
        recipient,
        body,
      });
      setMessageThreads((currentThreads) => {
        const enrichedMessage = {
          ...nextMessage,
          senderName: currentUser.display_name || currentUser.email || "You",
          senderEmail: currentUser.email || "",
          recipientName: recipient.display_name || recipient.email || "User",
          recipientEmail: recipient.email || "",
        };

        const existingThreadIndex = currentThreads.findIndex((thread) => thread.id === enrichedMessage.threadId);

        if (existingThreadIndex === -1) {
          return [{
            id: enrichedMessage.threadId,
            participant: {
              id: recipient.id,
              display_name: recipient.display_name,
              email: recipient.email,
            },
            messages: [enrichedMessage],
            unreadCount: 0,
            lastMessageAt: enrichedMessage.createdAt,
            lastMessagePreview: enrichedMessage.body,
          }, ...currentThreads];
        }

        const nextThreads = currentThreads.slice();
        const existingThread = nextThreads[existingThreadIndex];
        const updatedThread = {
          ...existingThread,
          participant: existingThread.participant || {
            id: recipient.id,
            display_name: recipient.display_name,
            email: recipient.email,
          },
          messages: [...existingThread.messages, enrichedMessage],
          lastMessageAt: enrichedMessage.createdAt,
          lastMessagePreview: enrichedMessage.body,
        };

        nextThreads.splice(existingThreadIndex, 1);
        return [updatedThread, ...nextThreads];
      });
      setSelectedMessageThreadId(nextMessage.threadId);
      showToast("Message sent.", "success");
    } catch (error) {
      showToast(error.message || "Unable to send message.", "error");
    }
  };

  const confirmLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      setActiveView("/new-accrual");
      setCurrentUser(null);
      setLogoutConfirmOpen(false);
      showToast("You have been logged out.", "success");
    } catch (error) {
      showToast(error.message || "Unable to log out.", "error");
    } finally {
      setLoggingOut(false);
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
      <div className="authScreen authLoadingScreen">
        <div className="authSpinnerOnly" aria-label="Loading workspace" role="status">
          <div className="announcementLoader" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <path d="M64 32C28.7 32 0 60.7 0 96v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm48 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zM64 288c-35.3 0-64 28.7-64 64v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V352c0-35.3-28.7-64-64-64H64zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm56 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0z" />
            </svg>
            <span />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    // Show non-Bounty access denied modal if triggered
    if (nonBountyModalOpen) {
      return (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
            width: "100%",
            maxWidth: "480px",
            overflow: "hidden",
          }} role="dialog" aria-modal="true">
            {/* Icon Section */}
            <div style={{
              backgroundColor: "#fef2f2",
              padding: "32px 28px 24px",
              display: "flex",
              justifyContent: "center",
            }}>
              <div style={{
                width: "56px",
                height: "56px",
                backgroundColor: "#fee2e2",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
              }}>
                🔒
              </div>
            </div>

            {/* Content */}
            <div style={{
              padding: "24px 28px",
              textAlign: "center",
            }}>
              <h2 style={{
                fontSize: "22px",
                fontWeight: "700",
                color: "#1a1a1a",
                margin: "0 0 12px 0",
              }}>
                Access Restricted
              </h2>
              <p style={{
                fontSize: "15px",
                lineHeight: "1.6",
                color: "#666",
                margin: "0 0 20px 0",
              }}>
                This workspace is intended for Bounty employees only. Non-Bounty accounts are not permitted.
              </p>
              <div style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "13px",
                color: "#991b1b",
                lineHeight: "1.5",
              }}>
                If you believe this is an error, please contact your system administrator.
              </div>
            </div>

            {/* Footer */}
            <div style={{
              backgroundColor: "#f8f9fa",
              borderTop: "1px solid #e9ecef",
              padding: "16px 28px",
              display: "flex",
              justifyContent: "center",
            }}>
              <button
                type="button"
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#c82333"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#dc3545"}
                onClick={async () => {
                  try {
                    await signOut();
                  } catch (err) {
                    // ignore sign out errors — proceed to clear state
                  }
                  setNonBountyModalOpen(false);
                  setSession(null);
                  setCurrentUser(null);
                  setPendingName("");
                  setProfileResolved(true);
                  setProfileLoading(false);
                  sessionUserIdRef.current = null;
                }}
              >
                Try Another Account
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <AnnouncementPreviewModal
          announcement={activeAnnouncement}
          open={announcementOpen}
          onClose={() => setAnnouncementOpen(false)}
        />
        {announcementLoading ? (
          <LoginShellLoader />
        ) : (
          <LoginScreen
            onLogin={handleGoogleLogin}
            signingIn={signingIn}
            announcements={activeAnnouncements}
            onExpandAnnouncement={(announcement) => {
              setActiveAnnouncement(announcement);
              setAnnouncementOpen(true);
            }}
          />
        )}
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
        busy={loggingOut}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
      <AnnouncementPreviewModal
        announcement={activeAnnouncement}
        open={announcementOpen}
        onClose={() => setAnnouncementOpen(false)}
      />
      <AnnouncementCenterModal
        open={announcementCenterOpen}
        announcements={activeAnnouncements}
        reactions={announcementReactions}
        onClose={() => setAnnouncementCenterOpen(false)}
        onOpenAnnouncement={(announcement) => {
          setAnnouncementCenterOpen(false);
          setActiveAnnouncement(announcement);
          setAnnouncementOpen(true);
        }}
        onReact={handleReactToAnnouncement}
      />
      <MessageCenterModal
        open={messageCenterOpen}
        currentUser={currentUser}
        contacts={messageContacts}
        contactsLoading={messageContactsLoading}
        presenceByUserId={messagePresence}
        threads={messageThreads}
        threadsLoading={messageThreadsLoading}
        selectedThreadId={selectedMessageThreadId}
        onClose={() => setMessageCenterOpen(false)}
        onSelectThread={handleSelectMessageThread}
        onSendMessage={handleSendMessage}
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
          />
        ) : null}
        {!showFullscreenNewAccrual && mobileOpen ? (
          <button type="button" className="mobileSidebarBackdrop" onClick={() => setMobileOpen(false)} aria-label="Close sidebar" />
        ) : null}
        <div className="appMain">
          {!showFullscreenNewAccrual ? (
            <TopBar
              currentUser={currentUser}
              activeView={activeView}
              sidebarExpanded={isMobile ? mobileOpen : !collapsed}
              onToggleSidebar={handleToggleSidebar}
              onOpenMessages={handleOpenMessageCenter}
              unreadMessageCount={unreadMessageCount}
              onOpenAnnouncements={handleOpenAnnouncementCenter}
              announcementCount={activeAnnouncements.length}
              onLogout={handleLogout}
            />
          ) : null}
          <main className="appContent">
            {renderActiveView(activeView, currentUser, {
              onNewAccrualFullscreenChange: setNewAccrualFullscreen,
              accrualsRefreshKey,
              onEditAccrual: (submission) => {
                setEditingAccrual(submission);
              },
            })}
          </main>
        </div>
      </div>
      {activeView === "/accruals" && editingAccrual ? (
        <div className="accrualEditOverlay">
          <section className="accrualEditFloatingDialog" role="dialog" aria-modal="true" aria-label={`Edit accrual ${editingAccrual.control_number}`}>
            <button type="button" className="accrualEditDialogClose" aria-label="Close accrual editor" onClick={() => setEditingAccrual(null)}>×</button>
            <YearEndAccrual
              currentUser={currentUser}
              editingSubmission={editingAccrual}
              onEditCancel={() => setEditingAccrual(null)}
              onEditSaved={() => {
                setEditingAccrual(null);
                setAccrualsRefreshKey((key) => key + 1);
              }}
            />
          </section>
        </div>
      ) : null}
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
