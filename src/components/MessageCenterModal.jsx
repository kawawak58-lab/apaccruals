import React, { useEffect, useMemo, useRef, useState } from "react";

function formatMessageDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPresenceMeta(userId, presenceByUserId) {
  const entry = presenceByUserId?.[String(userId)];
  return {
    isOnline: Boolean(entry?.isOnline),
    label: entry?.isOnline ? "Online" : "Offline",
  };
}

function getMessageStatus(message) {
  if (message?.readAt) {
    return "Seen";
  }

  if (message?.deliveredAt) {
    return "Delivered";
  }

  return "Sent";
}

function HeaderIcon({ expanded = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {expanded ? (
        <>
          <path d="M9 15H5v4" />
          <path d="M15 9h4V5" />
          <path d="M5 19l5-5" />
          <path d="M19 5l-5 5" />
        </>
      ) : (
        <>
          <path d="M15 3h6v6" />
          <path d="M9 21H3v-6" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
        </>
      )}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12" />
      <path d="M18 6l-12 12" />
    </svg>
  );
}

export default function MessageCenterModal({
  open,
  currentUser,
  contacts,
  contactsLoading,
  presenceByUserId,
  threads,
  threadsLoading,
  selectedThreadId,
  onClose,
  onSelectThread,
  onSendMessage,
}) {
  const [composeMode, setComposeMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [recipientPickerOpen, setRecipientPickerOpen] = useState(false);
  const bottomAnchorRef = useRef(null);
  const previousThreadIdRef = useRef("");
  const previousMessageCountRef = useRef(0);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [selectedThreadId, threads]
  );

  useEffect(() => {
    if (!open) {
      setComposeMode(false);
      setFullscreen(false);
      setRecipientId("");
      setDraft("");
      setSending(false);
      setRecipientPickerOpen(false);
      return;
    }

    if (selectedThread) {
      setComposeMode(false);
    }
  }, [open, selectedThread]);

  useEffect(() => {
    if (!composeMode || recipientId || contacts.length === 0) {
      return;
    }

    setRecipientId(String(contacts[0].id));
  }, [composeMode, contacts, recipientId]);

  useEffect(() => {
    if (!open || composeMode || !selectedThread) {
      previousThreadIdRef.current = selectedThread?.id || "";
      previousMessageCountRef.current = selectedThread?.messages?.length || 0;
      return;
    }

    const threadChanged = previousThreadIdRef.current !== selectedThread.id;
    const nextMessageCount = selectedThread.messages.length;
    const messageCountChanged = previousMessageCountRef.current !== nextMessageCount;
    const latestMessage = selectedThread.messages[nextMessageCount - 1];
    const shouldScroll =
      threadChanged ||
      (messageCountChanged &&
        (String(latestMessage?.senderId) === String(currentUser?.id) || sending));

    previousThreadIdRef.current = selectedThread.id;
    previousMessageCountRef.current = nextMessageCount;

    if (!shouldScroll) {
      return;
    }

    window.requestAnimationFrame(() => {
      bottomAnchorRef.current?.scrollIntoView({ block: "end" });
    });
  }, [composeMode, currentUser?.id, open, selectedThread, sending]);

  if (!open) {
    return null;
  }

  const selectedPresence = getPresenceMeta(selectedThread?.participant?.id, presenceByUserId);
  const selectedRecipient =
    contacts.find((contact) => String(contact.id) === String(recipientId)) || null;

  const handleStartCompose = () => {
    setComposeMode(true);
    setDraft("");
    setRecipientId((currentRecipientId) => currentRecipientId || String(contacts[0]?.id || ""));
    setRecipientPickerOpen(true);
  };

  const handleSubmit = async () => {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft || sending) {
      return;
    }

    const nextRecipientId = composeMode
      ? recipientId
      : selectedThread?.participant?.id;

    if (!nextRecipientId) {
      return;
    }

    try {
      setSending(true);
      await onSendMessage(nextRecipientId, trimmedDraft);
      setDraft("");
      setComposeMode(false);
    } finally {
      setSending(false);
    }
  };

  const handleDraftKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void handleSubmit();
  };

  const handlePickRecipient = (nextRecipientId) => {
    setRecipientId(String(nextRecipientId));
    setRecipientPickerOpen(false);
  };

  return (
    <div className="messageCenterOverlay" role="presentation" onClick={onClose}>
      <div
        className={`messageCenterDialog${fullscreen ? " fullscreen" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Messages"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="messageCenterSidebar">
          <div className="messageCenterSidebarHeader">
            <div>
              <div className="messageCenterEyebrow">Workspace Messaging</div>
              <h2>Messages</h2>
            </div>
            <button type="button" className="messageCenterComposeBtn" onClick={handleStartCompose}>
              New Message
            </button>
          </div>

          <div className="messageThreadList">
            {threads.length ? (
              threads.map((thread) => (
                (() => {
                  const presence = getPresenceMeta(thread.participant?.id, presenceByUserId);

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      className={`messageThreadItem${selectedThreadId === thread.id && !composeMode ? " active" : ""}`}
                      onClick={() => {
                        setComposeMode(false);
                        onSelectThread(thread.id);
                      }}
                    >
                      <div className="messageThreadHeader">
                        <span className="messageThreadIdentity">
                          <span className={`messagePresenceDot${presence.isOnline ? " online" : ""}`} aria-hidden="true" />
                          <span className="messageThreadName">{thread.participant?.display_name || thread.participant?.email || "User"}</span>
                        </span>
                        {thread.unreadCount ? <span className="messageThreadUnread">{thread.unreadCount}</span> : null}
                      </div>
                      <div className="messageThreadStatus">{presence.label}</div>
                      <div className="messageThreadMeta">
                        <span className="messageThreadPreview">{thread.lastMessagePreview}</span>
                        <span className="messageThreadTime">{formatMessageDate(thread.lastMessageAt)}</span>
                      </div>
                    </button>
                  );
                })()
              ))
            ) : threadsLoading ? (
              <div className="messageThreadEmpty">
                <strong>Loading messages...</strong>
                <span>Please wait while your conversations are synced.</span>
              </div>
            ) : (
              <div className="messageThreadEmpty">
                <strong>No messages yet.</strong>
                <span>Start a new conversation with another user.</span>
              </div>
            )}
          </div>
        </div>

        <div className="messageCenterContent">
          <div className="messageCenterTopbar">
            <div>
              <div className="messageCenterTitle">
                {composeMode
                  ? "Compose Message"
                  : selectedThread?.participant?.display_name || selectedThread?.participant?.email || "Messages"}
              </div>
              <div className="messageCenterSubtitle">
                {composeMode
                  ? (
                    <>
                      <span>
                        {selectedRecipient
                          ? `${selectedRecipient.display_name || selectedRecipient.email} • ${selectedRecipient.email || "No email"}`
                          : "Choose a workspace user to start a conversation."}
                      </span>
                      {selectedRecipient ? (
                        <span
                          className={`messagePresenceBadge${
                            getPresenceMeta(selectedRecipient.id, presenceByUserId).isOnline ? " online" : ""
                          }`}
                        >
                          <span
                            className={`messagePresenceDot${
                              getPresenceMeta(selectedRecipient.id, presenceByUserId).isOnline ? " online" : ""
                            }`}
                            aria-hidden="true"
                          />
                          {getPresenceMeta(selectedRecipient.id, presenceByUserId).label}
                        </span>
                      ) : null}
                    </>
                  )
                  : (
                    <>
                      <span>{selectedThread?.participant?.email || currentUser?.email || ""}</span>
                      {selectedThread ? (
                        <span className={`messagePresenceBadge${selectedPresence.isOnline ? " online" : ""}`}>
                          <span className={`messagePresenceDot${selectedPresence.isOnline ? " online" : ""}`} aria-hidden="true" />
                          {selectedPresence.label}
                        </span>
                      ) : null}
                    </>
                  )}
              </div>
            </div>
            <div className="messageCenterHeaderActions">
              <button
                type="button"
                className="messageCenterClose"
                onClick={() => setFullscreen((current) => !current)}
                aria-label={fullscreen ? "Exit fullscreen" : "Open fullscreen"}
              >
                <HeaderIcon expanded={fullscreen} />
              </button>
              <button type="button" className="messageCenterClose" onClick={onClose} aria-label="Close messages">
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className="messageCenterConversation">
            {composeMode ? (
              <div className="messageComposePanel">
                <label className="messageField">
                  <span>Recipient</span>
                  <button
                    type="button"
                    className="messageRecipientPickerBtn"
                    onClick={() => setRecipientPickerOpen(true)}
                    disabled={contactsLoading || contacts.length === 0}
                  >
                    <span className="messageRecipientPickerText">
                      {selectedRecipient
                        ? `${selectedRecipient.display_name || selectedRecipient.email} (${selectedRecipient.email || "No email"})`
                        : contactsLoading
                          ? "Loading users..."
                          : "Select a recipient"}
                    </span>
                    <span className="messageRecipientPickerCaret" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                </label>
              </div>
            ) : selectedThread ? (
              <div className="messageBubbleList">
                {selectedThread.messages.map((message) => {
                  const isCurrentUser = String(message.senderId) === String(currentUser?.id);
                  const messageStatus = isCurrentUser ? getMessageStatus(message) : "";

                  return (
                    <div
                      key={message.id}
                      className={`messageBubbleRow${isCurrentUser ? " mine" : ""}`}
                    >
                      <div className={`messageBubble${isCurrentUser ? " mine" : ""}`}>
                        <div className="messageBubbleAuthor">
                          {isCurrentUser ? "You" : message.senderName || message.senderEmail || "User"}
                        </div>
                        <div className="messageBubbleText">{message.body}</div>
                        <div className="messageBubbleMeta">
                          <div className="messageBubbleTime">{formatMessageDate(message.createdAt)}</div>
                          {isCurrentUser ? <div className="messageBubbleStatus">{messageStatus}</div> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomAnchorRef} />
              </div>
            ) : (
              <div className="messageConversationEmpty">
                <strong>Select a thread to continue.</strong>
                <span>Or start a new message from the left panel.</span>
              </div>
            )}
          </div>

          <div className="messageComposer">
            <textarea
              className="messageTextarea"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleDraftKeyDown}
              placeholder={
                composeMode
                  ? "Write your message..."
                  : selectedThread
                    ? `Reply to ${selectedThread.participant?.display_name || selectedThread.participant?.email || "user"}...`
                    : "Select a thread or start a new message..."
              }
              disabled={sending || (composeMode ? !recipientId : !selectedThread)}
            />
            <div className="messageComposerActions">
              <button
                type="button"
                className={`messageSendBtn${sending ? " isLoading" : ""}`}
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={sending || !draft.trim() || (composeMode ? !recipientId : !selectedThread)}
              >
                {sending ? (
                  <>
                    <span className="buttonSpinner" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </div>
        </div>

        {composeMode && recipientPickerOpen ? (
          <div className="messageRecipientModalOverlay" role="presentation" onClick={() => setRecipientPickerOpen(false)}>
            <div
              className="messageRecipientModal"
              role="dialog"
              aria-modal="true"
              aria-label="Select recipient"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="messageRecipientModalHeader">
                <div>
                  <div className="messageCenterEyebrow">New Conversation</div>
                  <div className="messageRecipientModalTitle">Choose Recipient</div>
                </div>
                <button
                  type="button"
                  className="messageCenterClose"
                  onClick={() => setRecipientPickerOpen(false)}
                  aria-label="Close recipient picker"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="messageRecipientModalList">
                {contacts.length ? (
                  contacts.map((contact) => {
                    const presence = getPresenceMeta(contact.id, presenceByUserId);
                    const active = String(contact.id) === String(recipientId);

                    return (
                      <button
                        key={contact.id}
                        type="button"
                        className={`messageRecipientOption${active ? " active" : ""}`}
                        onClick={() => handlePickRecipient(contact.id)}
                      >
                        <div className="messageRecipientOptionHeader">
                          <span className="messageThreadIdentity">
                            <span className={`messagePresenceDot${presence.isOnline ? " online" : ""}`} aria-hidden="true" />
                            <span className="messageRecipientOptionName">
                              {contact.display_name || contact.email || "Unknown user"}
                            </span>
                          </span>
                          <span className="messageRecipientOptionStatus">{presence.label}</span>
                        </div>
                        <div className="messageRecipientOptionEmail">{contact.email || "No email"}</div>
                      </button>
                    );
                  })
                ) : (
                  <div className="messageThreadEmpty">
                    <strong>{contactsLoading ? "Loading users..." : "No users available."}</strong>
                    <span>Select a user once contacts are available.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
