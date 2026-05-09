import React, { useState, useRef, useEffect, useCallback } from "react";

// ─── Token ────────────────────────────────────────────────────────────────────
const getToken = () =>
  localStorage.getItem("mdw-token") ||
  sessionStorage.getItem("mdw-token") ||
  localStorage.getItem("token") ||
  sessionStorage.getItem("token") || "";

const API = "http://localhost:5000/api/chatbot";

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");
}

function formatSessionDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function formatTime(date) {
  return date?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) || "";
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const SendIcon   = () => <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={15} />;
const PlusIcon   = () => <Icon d="M12 5v14M5 12h14" size={15} />;
const TrashIcon  = () => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={14} />;
const UploadIcon = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" size={15} />;
const ImageIcon  = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
);
const CloseIcon  = () => <Icon d="M18 6L6 18M6 6l12 12" size={16} />;
const BotIcon    = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <path d="M12 11V7M8 7h8"/><circle cx="12" cy="4" r="1"/>
    <path d="M7 15h.01M17 15h.01"/>
  </svg>
);
const ChatBubbleIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatWidget() {
  const [isOpen, setIsOpen]       = useState(false);
  const [messages, setMessages]   = useState([{
    role: "assistant",
    content: "Bonjour ! Je suis votre assistant de gestion de projets.\n\nPosez-moi une question sur vos **projets**, **tâches**, ou **équipe**.",
    timestamp: new Date(),
  }]);
  const [input, setInput]                   = useState("");
  const [isLoading, setIsLoading]           = useState(false);
  const [uploadedFile, setUploadedFile]     = useState(null);
  const [uploadedImage, setUploadedImage]   = useState(null);
  const [imagePreview, setImagePreview]     = useState(null);
  const [isUploading, setIsUploading]       = useState(false);
  const [docLoaded, setDocLoaded]           = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessions, setSessions]             = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsAvailable, setSessionsAvailable] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const fileInputRef   = useRef(null);
  const imageInputRef  = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      loadSessionsList();
    }
  }, [isOpen]);

  const addMessage = (msg) =>
    setMessages((prev) => [...prev, { timestamp: new Date(), ...msg }]);

  // ─── Sessions ──────────────────────────────────────────────
  const loadSessionsList = useCallback(async () => {
    if (!sessionsAvailable) return;
    setSessionsLoading(true);
    try {
      const res = await fetch(`${API}/sessions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 404) { setSessionsAvailable(false); return; }
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch (_) {}
    finally { setSessionsLoading(false); }
  }, [sessionsAvailable]);

  const newConversation = useCallback(async () => {
    if (!sessionsAvailable) return null;
    try {
      const res = await fetch(`${API}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 404) { setSessionsAvailable(false); return null; }
      if (res.ok) {
        const { sessionId } = await res.json();
        setCurrentSessionId(sessionId);
        return sessionId;
      }
    } catch (_) {}
    return null;
  }, [sessionsAvailable]);

  const loadConversation = useCallback(async (sessionId) => {
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/messages`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = (Array.isArray(data) ? data : []).map((m) => ({
          role: m.role, content: m.content,
          timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
        }));
        setCurrentSessionId(sessionId);
        setDocLoaded(null); setUploadedFile(null);
        setUploadedImage(null); setImagePreview(null);
        setMessages(mapped.length > 0 ? mapped : [{
          role: "assistant", content: "Conversation vide.", timestamp: new Date(),
        }]);
      }
    } catch (_) {}
  }, []);

  const ensureSession = useCallback(async () => {
    if (currentSessionId) return currentSessionId;
    const id = await newConversation();
    if (id) { await loadSessionsList(); return id; }
    return null;
  }, [currentSessionId, newConversation, loadSessionsList]);

  const checkToken = () => {
    if (!getToken()) {
      addMessage({ role: "assistant", content: "⚠️ **Non authentifié.** Veuillez vous connecter.", isError: true });
      return false;
    }
    return true;
  };

  // ─── Send message ──────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (!checkToken()) return;
    const sessionId = await ensureSession();
    addMessage({ role: "user", content: text });
    setInput(""); setIsLoading(true);
    try {
      const body = { message: text };
      if (sessionId) body.sessionId = sessionId;
      const res  = await fetch(`${API}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.sessionId) setCurrentSessionId(data.sessionId);
      addMessage({
        role: "assistant",
        content: res.ok ? (data.reply || "⚠️ Pas de réponse.") : (data.error || "⚠️ Erreur serveur."),
        isError: !res.ok,
      });
      if (sessionsAvailable) loadSessionsList();
    } catch {
      addMessage({ role: "assistant", content: "⚠️ Impossible de contacter le service.", isError: true });
    } finally { setIsLoading(false); }
  };

  // ─── Send document ─────────────────────────────────────────
  const sendDocument = async () => {
    if (!uploadedFile || isUploading) return;
    if (!checkToken()) return;
    const sessionId = await ensureSession();
    const question = input.trim() || "Fais un résumé de ce document en français.";
    addMessage({ role: "user", content: `📎 **${uploadedFile.name}**\n${question}` });
    setInput(""); setIsUploading(true); setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("message", question);
      if (sessionId) formData.append("sessionId", sessionId);
      const res  = await fetch(`${API}/document`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: formData,
      });
      const data = await res.json();
      if (data.sessionId) setCurrentSessionId(data.sessionId);
      if (res.ok) {
        setDocLoaded(uploadedFile.name);
        addMessage({ role: "assistant", content: `✅ **${uploadedFile.name}** analysé !\n\n${data.reply}` });
      } else {
        addMessage({ role: "assistant", content: `❌ ${data.error || "Impossible d'analyser."}`, isError: true });
      }
      if (sessionsAvailable) loadSessionsList();
    } catch {
      addMessage({ role: "assistant", content: "⚠️ Erreur document.", isError: true });
    } finally { setUploadedFile(null); setIsUploading(false); setIsLoading(false); }
  };

  // ─── Send image ────────────────────────────────────────────
  const sendImage = async () => {
    if (!uploadedImage || isUploading) return;
    if (!checkToken()) return;
    const sessionId = await ensureSession();
    const question = input.trim() || "Décris cette image en français.";
    addMessage({ role: "user", content: `🖼️ **${uploadedImage.name}**\n${question}`, imagePreview });
    setInput(""); setIsUploading(true); setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedImage);
      formData.append("message", question);
      if (sessionId) formData.append("sessionId", sessionId);
      const res  = await fetch(`${API}/image`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: formData,
      });
      const data = await res.json();
      if (data.sessionId) setCurrentSessionId(data.sessionId);
      addMessage({
        role: "assistant",
        content: res.ok ? data.reply : `❌ ${data.error || "Erreur image."}`,
        isError: !res.ok,
      });
      if (sessionsAvailable) loadSessionsList();
    } catch {
      addMessage({ role: "assistant", content: "⚠️ Erreur image.", isError: true });
    } finally { setUploadedImage(null); setImagePreview(null); setIsUploading(false); setIsLoading(false); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadedFile(file); setUploadedImage(null); setImagePreview(null);
    e.target.value = "";
  };
  const handleImageChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadedImage(file); setUploadedFile(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const startNewChat = async () => {
    const newId = await newConversation();
    setDocLoaded(null); setUploadedFile(null);
    setUploadedImage(null); setImagePreview(null);
    setMessages([{
      role: "assistant",
      content: "Nouvelle conversation démarrée. Comment puis-je vous aider ?",
      timestamp: new Date(),
    }]);
    if (newId && sessionsAvailable) loadSessionsList();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (uploadedImage) sendImage();
      else if (uploadedFile) sendDocument();
      else sendMessage();
    }
  };
  const handleSend = () => {
    if (uploadedImage) sendImage();
    else if (uploadedFile) sendDocument();
    else sendMessage();
  };

  const handleQuickReply = async (qr) => {
    if (!checkToken()) return;
    const sessionId = await ensureSession();
    setMessages((prev) => [...prev, { role: "user", content: qr, timestamp: new Date() }]);
    setIsLoading(true);
    const body = { message: qr };
    if (sessionId) body.sessionId = sessionId;
    fetch(`${API}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.sessionId) setCurrentSessionId(data.sessionId);
        addMessage({ role: "assistant", content: data.reply || "⚠️ Pas de réponse." });
        if (sessionsAvailable) loadSessionsList();
      })
      .catch(() => addMessage({ role: "assistant", content: "⚠️ Erreur.", isError: true }))
      .finally(() => setIsLoading(false));
  };

  const isSendDisabled = (!input.trim() && !uploadedFile && !uploadedImage) || isLoading || isUploading;
  const quickReplies = ["Projets en cours ?", "Tâches en retard ?", "Avancement global ?", "Liste de l'équipe ?"];

  // ─── Render ────────────────────────────────────────────────
  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        title="Assistant IA"
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 52, height: 52, borderRadius: "50%",
          background: "#10a37f", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", boxShadow: "0 4px 24px rgba(16,163,127,0.4)",
          zIndex: 9999, transition: "transform 0.2s",
        }}
      >
        {isOpen ? <CloseIcon /> : <ChatBubbleIcon />}
      </button>

      {isOpen && (
        <div style={{
          position: "fixed", bottom: 88, right: 24,
          width: 760, height: 620,
          background: "#212121", borderRadius: 16,
          boxShadow: "0 16px 64px rgba(0,0,0,0.6)",
          display: "flex", zIndex: 9998,
          overflow: "hidden", border: "1px solid #2f2f2f",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}>

          {/* ── SIDEBAR ── */}
          <div style={{
            width: 240, flexShrink: 0,
            background: "#171717",
            display: "flex", flexDirection: "column",
            borderRight: "1px solid #2a2a2a",
          }}>
            {/* Sidebar top */}
            <div style={{ padding: "14px 10px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Brand */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px 6px" }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: "#10a37f",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                }}>
                  <BotIcon />
                </div>
                <span style={{ color: "#ececec", fontSize: 14, fontWeight: 600 }}>ProBot</span>
              </div>
              {/* New chat button */}
              <button
                onClick={startNewChat}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: 8,
                  background: "transparent", border: "1px solid #333",
                  color: "#ccc", fontSize: 13, cursor: "pointer",
                  width: "100%", transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#252525"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <PlusIcon />
                <span>Nouvelle conversation</span>
              </button>
            </div>

            {/* Sessions list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
              {sessionsLoading ? (
                <div style={{ padding: 16, textAlign: "center", color: "#555", fontSize: 12 }}>Chargement...</div>
              ) : !sessionsAvailable ? (
                <div style={{ padding: 16, textAlign: "center", color: "#555", fontSize: 12 }}>Historique non disponible</div>
              ) : sessions.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: "#555", fontSize: 12 }}>Aucune conversation</div>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: "#444", padding: "6px 4px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Récentes
                  </div>
                  {sessions.map((s) => {
                    const sid = s.id || s.sessionId;
                    const active = sid === currentSessionId;
                    return (
                      <button
                        key={sid}
                        onClick={() => loadConversation(sid)}
                        style={{
                          width: "100%", textAlign: "left",
                          padding: "7px 10px", borderRadius: 8,
                          border: "none", cursor: "pointer",
                          background: active ? "#2a2a2a" : "transparent",
                          marginBottom: 2, display: "flex",
                          alignItems: "center", gap: 8,
                          transition: "background 0.15s", color: "#ececec",
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#222"; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                      >
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, color: active ? "#ececec" : "#bbb",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            fontWeight: active ? 500 : 400,
                          }}>
                            {s.title || "Conversation sans titre"}
                          </div>
                          <div style={{ fontSize: 11, color: "#444", marginTop: 1 }}>
                            {formatSessionDate(s.updatedAt || s.createdAt)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Sidebar footer */}
            <div style={{ padding: "10px 14px", borderTop: "1px solid #222" }}>
              <div style={{ fontSize: 11, color: "#444" }}>
                {isLoading ? "⏳ En cours..." : docLoaded ? `📄 ${docLoaded}` : "🟢 En ligne"}
              </div>
            </div>
          </div>

          {/* ── MAIN ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Header */}
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid #2a2a2a",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <span style={{ color: "#ececec", fontSize: 14, fontWeight: 500 }}>
                {sessions.find(s => (s.id || s.sessionId) === currentSessionId)?.title || "Assistant Projets"}
              </span>
              <button
                onClick={startNewChat}
                style={{
                  background: "transparent", border: "1px solid #333", borderRadius: 6,
                  padding: "5px 10px", color: "#777", cursor: "pointer",
                  fontSize: 12, display: "flex", alignItems: "center", gap: 5,
                  transition: "border-color 0.15s",
                }}
              >
                <TrashIcon /> Nouveau
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  padding: "10px 20px",
                  background: msg.role === "assistant" ? "rgba(255,255,255,0.02)" : "transparent",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: msg.role === "assistant" ? "#10a37f" : "#555",
                    color: "#fff", fontSize: 12, fontWeight: 600, marginTop: 2,
                  }}>
                    {msg.role === "assistant" ? <BotIcon /> : "U"}
                  </div>
                  <div style={{ flex: 1 }}>
                    {msg.imagePreview && (
                      <img src={msg.imagePreview} alt="preview"
                        style={{ maxWidth: 180, borderRadius: 8, marginBottom: 6, display: "block" }} />
                    )}
                    <div
                      style={{
                        fontSize: 14, lineHeight: 1.7, wordBreak: "break-word",
                        color: msg.isError ? "#f87171" : "#e5e5e5",
                      }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                    <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div style={{ padding: "10px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "#10a37f", display: "flex", alignItems: "center",
                    justifyContent: "center", color: "#fff",
                  }}>
                    <BotIcon />
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center", paddingTop: 8 }}>
                    {[0, 1, 2].map((n) => (
                      <span key={n} style={{
                        width: 6, height: 6, borderRadius: "50%", background: "#555",
                        animation: `chatDot 1.2s ${n * 0.2}s ease-in-out infinite`,
                        display: "inline-block",
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            {messages.length <= 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 20px 10px" }}>
                {quickReplies.map((qr) => (
                  <button key={qr} onClick={() => handleQuickReply(qr)} style={{
                    padding: "5px 12px", borderRadius: 20,
                    border: "1px solid #333", background: "transparent",
                    color: "#888", fontSize: 12, cursor: "pointer", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#10a37f"; e.currentTarget.style.color = "#10a37f"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#888"; }}
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}

            {/* File preview */}
            {(uploadedFile || uploadedImage) && (
              <div style={{
                margin: "0 16px 8px", padding: "8px 12px",
                background: "#2a2a2a", border: "1px solid #3a3a3a",
                borderRadius: 8, display: "flex", alignItems: "center",
                justifyContent: "space-between", fontSize: 12, color: "#aaa",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {uploadedImage && imagePreview
                    ? <img src={imagePreview} alt="p" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover" }} />
                    : <span>📎</span>}
                  <span style={{ color: "#ccc" }}>{uploadedImage ? uploadedImage.name : uploadedFile.name}</span>
                  <span style={{ color: "#555" }}>{((uploadedImage || uploadedFile).size / 1024).toFixed(0)} Ko</span>
                </div>
                <button onClick={() => { setUploadedFile(null); setUploadedImage(null); setImagePreview(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 18 }}>×</button>
              </div>
            )}

            {/* Input area */}
            <div style={{ padding: "8px 16px 14px" }}>
              <div style={{
                background: "#2f2f2f", borderRadius: 12,
                border: "1px solid #3a3a3a", padding: "10px 12px",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFileChange} style={{ display: "none" }} />
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={
                    uploadedImage ? "Question sur l'image..." :
                    uploadedFile  ? "Question sur le document..." :
                    "Envoyer un message..."
                  }
                  rows={1}
                  style={{
                    background: "transparent", border: "none", outline: "none",
                    color: "#e5e5e5", fontSize: 14, resize: "none",
                    fontFamily: "inherit", lineHeight: 1.6,
                    maxHeight: 120, overflowY: "auto", width: "100%",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      title="Document"
                      style={{
                        width: 30, height: 30, borderRadius: 6, border: "none",
                        background: uploadedFile ? "rgba(16,163,127,0.15)" : "transparent",
                        color: uploadedFile ? "#10a37f" : "#666",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    ><UploadIcon /></button>
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      title="Image"
                      style={{
                        width: 30, height: 30, borderRadius: 6, border: "none",
                        background: uploadedImage ? "rgba(16,163,127,0.15)" : "transparent",
                        color: uploadedImage ? "#10a37f" : "#666",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    ><ImageIcon /></button>
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={isSendDisabled}
                    style={{
                      width: 30, height: 30, borderRadius: 6, border: "none",
                      background: isSendDisabled ? "#3a3a3a" : "#10a37f",
                      color: isSendDisabled ? "#555" : "#fff",
                      cursor: isSendDisabled ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.15s",
                    }}
                  >
                    {isUploading ? <span style={{ fontSize: 13 }}>⏳</span> : <SendIcon />}
                  </button>
                </div>
              </div>
              <div style={{ textAlign: "center", fontSize: 11, color: "#3a3a3a", marginTop: 8 }}>
                ProBot peut faire des erreurs. Vérifiez les informations importantes.
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        code {
          background: #2a2a2a; padding: 1px 5px;
          border-radius: 4px; font-size: 13px; color: #10a37f;
        }
      `}</style>
    </>
  );
}