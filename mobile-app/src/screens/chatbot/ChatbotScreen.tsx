import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, KeyboardAvoidingView, Platform, StyleSheet,
  ActivityIndicator, ScrollView, Image, SafeAreaView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:5000/api/chatbot";

// ─── Design tokens ─────────────────────────────────────────
const C = {
  bg:        "#212121",
  sidebar:   "#171717",
  input:     "#2f2f2f",
  card:      "#2a2a2a",
  border:    "#2f2f2f",
  border2:   "#333",
  border3:   "#3a3a3a",
  green:     "#10a37f",
  greenDim:  "rgba(16,163,127,0.15)",
  text:      "#e5e5e5",
  textMid:   "#bbb",
  textMuted: "#888",
  textDim:   "#555",
  textLabel: "#444",
  error:     "#f87171",
  userAv:    "#555",
  white:     "#ececec",
};

// ─── Markdown inline bold ───────────────────────────────────
function MarkdownText({ text, isError }: { text: string; isError?: boolean }) {
  const baseColor = isError ? C.error : C.text;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={{ fontSize: 14, lineHeight: 22, color: baseColor }}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <Text key={i} style={{ fontWeight: "700", color: baseColor }}>{part.slice(2, -2)}</Text>
          : <Text key={i}>{part}</Text>
      )}
    </Text>
  );
}

// ─── Helpers ────────────────────────────────────────────────
function formatSessionDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 60000)    return "À l'instant";
  if (diff < 3600000)  return `Il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
function formatTime(date?: Date): string {
  return date?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) || "";
}

// ─── Types ──────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
  imagePreview?: string | null;
}
interface Session {
  id?: string; sessionId?: string; title?: string;
  updatedAt?: string; createdAt?: string;
}

const QUICK_REPLIES = ["Projets en cours ?", "Tâches en retard ?", "Avancement global ?", "Liste de l'équipe ?"];

// ─── Typing dots ─────────────────────────────────────────────
function TypingDots() {
  return (
    <View style={s.typingRow}>
      <View style={[s.avatar, s.avatarBot]}>
        <Ionicons name="hardware-chip-outline" size={14} color="#fff" />
      </View>
      <View style={s.dotsWrap}>
        {[0, 1, 2].map(n => <View key={n} style={s.dot} />)}
      </View>
    </View>
  );
}

// ─── Main widget ─────────────────────────────────────────────
export default function ChatWidget() {
  const { token } = useAuth();
  const [isOpen, setIsOpen]               = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages]           = useState<Message[]>([{
    role: "assistant",
    content: "Bonjour ! Je suis votre assistant de gestion de projets.\n\nPosez-moi une question sur vos **projets**, **tâches**, ou **équipe**.",
    timestamp: new Date(),
  }]);
  const [input, setInput]                 = useState("");
  const [isLoading, setIsLoading]         = useState(false);
  const [uploadedFile, setUploadedFile]   = useState<any>(null);
  const [uploadedImage, setUploadedImage] = useState<any>(null);
  const [imagePreview, setImagePreview]   = useState<string | null>(null);
  const [isUploading, setIsUploading]     = useState(false);
  const [docLoaded, setDocLoaded]         = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions]           = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading]   = useState(false);
  const [sessionsAvailable, setSessionsAvailable] = useState(true);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (isOpen && token) loadSessionsList();
  }, [isOpen, token]);

  useEffect(() => {
    if (messages.length > 0)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const addMessage = (msg: Omit<Message, "timestamp">) =>
    setMessages(prev => [...prev, { timestamp: new Date(), ...msg }]);

  // ─── Sessions ──────────────────────────────────────────────
  const loadSessionsList = useCallback(async () => {
    if (!sessionsAvailable || !token) return;
    setSessionsLoading(true);
    try {
      const res = await fetch(`${API}/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) { setSessionsAvailable(false); return; }
      if (res.ok) { const d = await res.json(); setSessions(Array.isArray(d) ? d : []); }
    } catch {} finally { setSessionsLoading(false); }
  }, [sessionsAvailable, token]);

  const newConversation = useCallback(async (): Promise<string | null> => {
    if (!sessionsAvailable || !token) return null;
    try {
      const res = await fetch(`${API}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) { setSessionsAvailable(false); return null; }
      if (res.ok) { const { sessionId } = await res.json(); setCurrentSessionId(sessionId); return sessionId; }
    } catch {}
    return null;
  }, [sessionsAvailable, token]);

  const loadConversation = useCallback(async (sessionId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const mapped: Message[] = (Array.isArray(data) ? data : []).map((m: any) => ({
          role: m.role, content: m.content,
          timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
        }));
        setCurrentSessionId(sessionId);
        setDocLoaded(null); setUploadedFile(null); setUploadedImage(null); setImagePreview(null);
        setMessages(mapped.length > 0 ? mapped : [{ role: "assistant", content: "Conversation vide.", timestamp: new Date() }]);
        setIsSidebarOpen(false);
      }
    } catch {}
  }, [token]);

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (currentSessionId) return currentSessionId;
    const id = await newConversation();
    if (id) { await loadSessionsList(); return id; }
    return null;
  }, [currentSessionId, newConversation, loadSessionsList]);

  const checkToken = (): boolean => {
    if (!token) { addMessage({ role: "assistant", content: "⚠️ **Non authentifié.** Veuillez vous connecter.", isError: true }); return false; }
    return true;
  };

  // ─── Send message ───────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading || !checkToken()) return;
    const sessionId = await ensureSession();
    addMessage({ role: "user", content: text });
    setInput(""); setIsLoading(true);
    try {
      const body: any = { message: text };
      if (sessionId) body.sessionId = sessionId;
      const res = await fetch(`${API}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.sessionId) setCurrentSessionId(data.sessionId);
      addMessage({ role: "assistant", content: res.ok ? (data.reply || "⚠️ Pas de réponse.") : (data.error || "⚠️ Erreur serveur."), isError: !res.ok });
      if (sessionsAvailable) loadSessionsList();
    } catch { addMessage({ role: "assistant", content: "⚠️ Impossible de contacter le service.", isError: true }); }
    finally { setIsLoading(false); }
  };

  // ─── Send document ──────────────────────────────────────────
  const sendDocument = async () => {
    if (!uploadedFile || isUploading || !checkToken()) return;
    const sessionId = await ensureSession();
    const question = input.trim() || "Fais un résumé de ce document en français.";
    addMessage({ role: "user", content: `📎 **${uploadedFile.name}**\n${question}` });
    setInput(""); setIsUploading(true); setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", { uri: uploadedFile.uri, name: uploadedFile.name, type: uploadedFile.mimeType || "application/octet-stream" } as any);
      formData.append("message", question);
      if (sessionId) formData.append("sessionId", sessionId);
      const res = await fetch(`${API}/document`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (data.sessionId) setCurrentSessionId(data.sessionId);
      if (res.ok) { setDocLoaded(uploadedFile.name); addMessage({ role: "assistant", content: `✅ **${uploadedFile.name}** analysé !\n\n${data.reply}` }); }
      else addMessage({ role: "assistant", content: `❌ ${data.error || "Impossible d'analyser."}`, isError: true });
      if (sessionsAvailable) loadSessionsList();
    } catch { addMessage({ role: "assistant", content: "⚠️ Erreur document.", isError: true }); }
    finally { setUploadedFile(null); setIsUploading(false); setIsLoading(false); }
  };

  // ─── Send image ─────────────────────────────────────────────
  const sendImage = async () => {
    if (!uploadedImage || isUploading || !checkToken()) return;
    const sessionId = await ensureSession();
    const question = input.trim() || "Décris cette image en français.";
    addMessage({ role: "user", content: `🖼️ **${uploadedImage.fileName || "image"}**\n${question}`, imagePreview });
    setInput(""); setIsUploading(true); setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", { uri: uploadedImage.uri, name: uploadedImage.fileName || "image.jpg", type: uploadedImage.type || "image/jpeg" } as any);
      formData.append("message", question);
      if (sessionId) formData.append("sessionId", sessionId);
      const res = await fetch(`${API}/image`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (data.sessionId) setCurrentSessionId(data.sessionId);
      addMessage({ role: "assistant", content: res.ok ? data.reply : `❌ ${data.error || "Erreur image."}`, isError: !res.ok });
      if (sessionsAvailable) loadSessionsList();
    } catch { addMessage({ role: "assistant", content: "⚠️ Erreur image.", isError: true }); }
    finally { setUploadedImage(null); setImagePreview(null); setIsUploading(false); setIsLoading(false); }
  };

  // ─── Pickers ────────────────────────────────────────────────
  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "application/msword", "text/plain"] });
    if (!result.canceled && result.assets?.[0]) { setUploadedFile(result.assets[0]); setUploadedImage(null); setImagePreview(null); }
  };
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setUploadedImage(asset); setImagePreview(asset.uri); setUploadedFile(null);
    }
  };

  const startNewChat = async () => {
    const newId = await newConversation();
    setDocLoaded(null); setUploadedFile(null); setUploadedImage(null); setImagePreview(null);
    setMessages([{ role: "assistant", content: "Nouvelle conversation démarrée. Comment puis-je vous aider ?", timestamp: new Date() }]);
    if (newId && sessionsAvailable) loadSessionsList();
    setIsSidebarOpen(false);
  };

  const handleSend = () => {
    if (uploadedImage) sendImage();
    else if (uploadedFile) sendDocument();
    else sendMessage();
  };

  const handleQuickReply = async (qr: string) => {
    if (!checkToken()) return;
    const sessionId = await ensureSession();
    setMessages(prev => [...prev, { role: "user", content: qr, timestamp: new Date() }]);
    setIsLoading(true);
    const body: any = { message: qr };
    if (sessionId) body.sessionId = sessionId;
    fetch(`${API}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
      .then(r => r.json())
      .then(data => {
        if (data.sessionId) setCurrentSessionId(data.sessionId);
        addMessage({ role: "assistant", content: data.reply || "⚠️ Pas de réponse." });
        if (sessionsAvailable) loadSessionsList();
      })
      .catch(() => addMessage({ role: "assistant", content: "⚠️ Erreur.", isError: true }))
      .finally(() => setIsLoading(false));
  };

  const isSendDisabled = (!input.trim() && !uploadedFile && !uploadedImage) || isLoading || isUploading;
  const currentTitle = sessions.find(s => (s.id || s.sessionId) === currentSessionId)?.title || "Assistant Projets";

  const renderMessage = ({ item }: { item: Message }) => {
    const isBot = item.role === "assistant";
    return (
      <View style={[s.messageRow, isBot && s.messageRowBot]}>
        <View style={[s.avatar, isBot ? s.avatarBot : s.avatarUser]}>
          {isBot ? <Ionicons name="hardware-chip-outline" size={14} color="#fff" /> : <Text style={s.avatarUserText}>U</Text>}
        </View>
        <View style={s.messageBubble}>
          {item.imagePreview && <Image source={{ uri: item.imagePreview }} style={s.imagePreview} resizeMode="cover" />}
          <MarkdownText text={item.content} isError={item.isError} />
          <Text style={s.messageTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      {/* ── FAB Button ── */}
      <TouchableOpacity style={s.fab} onPress={() => setIsOpen(o => !o)} activeOpacity={0.85}>
        <Ionicons name={isOpen ? "close" : "chatbubble-ellipses"} size={24} color="#fff" />
      </TouchableOpacity>

      {/* ── Chat Modal ── */}
      <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={() => setIsOpen(false)}>
        <SafeAreaView style={s.modalRoot}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

            {/* Sidebar overlay */}
            {isSidebarOpen && (
              <TouchableOpacity style={s.sidebarOverlay} activeOpacity={1} onPress={() => setIsSidebarOpen(false)} />
            )}

            {/* Sidebar drawer */}
            {isSidebarOpen && (
              <View style={s.sidebarDrawer}>
                <View style={s.sidebarBrand}>
                  <View style={s.botIconWrap}>
                    <Ionicons name="hardware-chip-outline" size={14} color="#fff" />
                  </View>
                  <Text style={s.brandName}>ProBot</Text>
                  <TouchableOpacity onPress={() => setIsSidebarOpen(false)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={s.newChatBtn} onPress={startNewChat}>
                  <Ionicons name="add" size={16} color={C.textMid} />
                  <Text style={s.newChatText}>Nouvelle conversation</Text>
                </TouchableOpacity>

                <ScrollView style={{ flex: 1, paddingHorizontal: 8 }} showsVerticalScrollIndicator={false}>
                  {sessionsLoading ? (
                    <Text style={s.sessionMeta}>Chargement...</Text>
                  ) : !sessionsAvailable ? (
                    <Text style={s.sessionMeta}>Historique non disponible</Text>
                  ) : sessions.length === 0 ? (
                    <Text style={s.sessionMeta}>Aucune conversation</Text>
                  ) : (
                    <>
                      <Text style={s.sessionGroupLabel}>RÉCENTES</Text>
                      {sessions.map(session => {
                        const sid = session.id || session.sessionId || "";
                        const active = sid === currentSessionId;
                        return (
                          <TouchableOpacity key={sid} style={[s.sessionItem, active && s.sessionItemActive]} onPress={() => loadConversation(sid)}>
                            <Ionicons name="chatbubble-outline" size={13} color={C.textDim} style={{ marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={[s.sessionTitle, active && s.sessionTitleActive]} numberOfLines={1}>
                                {session.title || "Conversation sans titre"}
                              </Text>
                              <Text style={s.sessionDate}>{formatSessionDate(session.updatedAt || session.createdAt)}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}
                </ScrollView>

                <View style={s.sidebarFooter}>
                  <Text style={s.sidebarFooterText}>
                    {isLoading ? "⏳ En cours..." : docLoaded ? `📄 ${docLoaded}` : "🟢 En ligne"}
                  </Text>
                </View>
              </View>
            )}

            {/* Header */}
            <View style={s.header}>
              <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={s.headerBtn}>
                <Ionicons name="menu" size={20} color={C.textMid} />
              </TouchableOpacity>
              <Text style={s.headerTitle} numberOfLines={1}>{currentTitle}</Text>
              <TouchableOpacity onPress={startNewChat} style={s.headerBtn}>
                <Ionicons name="create-outline" size={19} color={C.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={s.headerBtn}>
                <Ionicons name="close" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(_, i) => String(i)}
              renderItem={renderMessage}
              contentContainerStyle={s.messageList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListFooterComponent={
                <>
                  {isLoading && <TypingDots />}
                  {messages.length <= 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4, marginBottom: 4 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                      {QUICK_REPLIES.map(qr => (
                        <TouchableOpacity key={qr} style={s.quickReply} onPress={() => handleQuickReply(qr)}>
                          <Text style={s.quickReplyText}>{qr}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </>
              }
            />

            {/* File preview */}
            {(uploadedFile || uploadedImage) && (
              <View style={s.filePreview}>
                <View style={s.filePreviewLeft}>
                  {uploadedImage && imagePreview
                    ? <Image source={{ uri: imagePreview }} style={s.fileThumb} />
                    : <Text style={{ fontSize: 20 }}>📎</Text>}
                  <Text style={s.fileName} numberOfLines={1}>
                    {uploadedImage ? (uploadedImage.fileName || "image") : uploadedFile.name}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setUploadedFile(null); setUploadedImage(null); setImagePreview(null); }}>
                  <Ionicons name="close-circle" size={20} color={C.textDim} />
                </TouchableOpacity>
              </View>
            )}

            {/* Input */}
            <View style={s.inputWrap}>
              <View style={s.inputBox}>
                <TextInput
                  style={s.textInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder={uploadedImage ? "Question sur l'image..." : uploadedFile ? "Question sur le document..." : "Envoyer un message..."}
                  placeholderTextColor={C.textDim}
                  multiline
                  maxLength={2000}
                />
              </View>
              <View style={s.inputActions}>
                <TouchableOpacity onPress={pickDocument} style={[s.actionBtn, uploadedFile && s.actionBtnActive]}>
                  <Ionicons name="document-attach-outline" size={20} color={uploadedFile ? C.green : C.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={pickImage} style={[s.actionBtn, uploadedImage && s.actionBtnActive]}>
                  <Ionicons name="image-outline" size={20} color={uploadedImage ? C.green : C.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSend} disabled={isSendDisabled} style={[s.sendBtn, isSendDisabled && s.sendBtnDisabled]}>
                  {isUploading
                    ? <ActivityIndicator size={14} color="#fff" />
                    : <Ionicons name="send" size={16} color={isSendDisabled ? C.textDim : "#fff"} />}
                </TouchableOpacity>
              </View>
            </View>

            <Text style={s.disclaimer}>ProBot peut faire des erreurs. Vérifiez les informations importantes.</Text>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  fab:               { position: "absolute", bottom: 80, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: C.green, alignItems: "center", justifyContent: "center", zIndex: 999, elevation: 8, shadowColor: C.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  modalRoot:         { flex: 1, backgroundColor: C.bg },
  sidebarOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 10 },
  sidebarDrawer:     { position: "absolute", top: 0, left: 0, bottom: 0, width: 280, backgroundColor: C.sidebar, borderRightWidth: 1, borderRightColor: C.border, zIndex: 11, flexDirection: "column" },
  sidebarBrand:      { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, paddingBottom: 12 },
  botIconWrap:       { width: 26, height: 26, borderRadius: 7, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  brandName:         { flex: 1, color: C.white, fontSize: 15, fontWeight: "600" },
  newChatBtn:        { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12, marginBottom: 8, padding: 9, borderRadius: 8, borderWidth: 1, borderColor: C.border2 },
  newChatText:       { color: C.textMid, fontSize: 13 },
  sessionGroupLabel: { fontSize: 10, color: C.textLabel, paddingHorizontal: 4, paddingVertical: 6, letterSpacing: 0.8 },
  sessionItem:       { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 9, borderRadius: 8, marginBottom: 2 },
  sessionItemActive: { backgroundColor: "#2a2a2a" },
  sessionTitle:      { fontSize: 13, color: C.textMid, marginBottom: 1 },
  sessionTitleActive:{ color: C.white, fontWeight: "500" },
  sessionDate:       { fontSize: 11, color: C.textLabel },
  sessionMeta:       { textAlign: "center", color: C.textDim, fontSize: 12, padding: 16 },
  sidebarFooter:     { padding: 14, borderTopWidth: 1, borderTopColor: "#222" },
  sidebarFooterText: { fontSize: 11, color: C.textLabel },
  header:            { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
  headerBtn:         { padding: 6 },
  headerTitle:       { flex: 1, textAlign: "center", color: C.white, fontSize: 14, fontWeight: "500" },
  messageList:       { paddingVertical: 8, paddingHorizontal: 4 },
  messageRow:        { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, gap: 10, alignItems: "flex-start" },
  messageRowBot:     { backgroundColor: "rgba(255,255,255,0.02)" },
  avatar:            { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  avatarBot:         { backgroundColor: C.green },
  avatarUser:        { backgroundColor: C.userAv },
  avatarUserText:    { color: "#fff", fontSize: 12, fontWeight: "600" },
  messageBubble:     { flex: 1 },
  messageTime:       { fontSize: 11, color: C.textLabel, marginTop: 4 },
  imagePreview:      { width: 160, height: 120, borderRadius: 8, marginBottom: 6 },
  typingRow:         { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, gap: 10, alignItems: "flex-start" },
  dotsWrap:          { flexDirection: "row", gap: 5, alignItems: "center", paddingTop: 10 },
  dot:               { width: 6, height: 6, borderRadius: 3, backgroundColor: C.textDim },
  quickReply:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border2 },
  quickReplyText:    { color: C.textMuted, fontSize: 12 },
  filePreview:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginBottom: 8, padding: 10, backgroundColor: "#2a2a2a", borderRadius: 10, borderWidth: 1, borderColor: C.border3 },
  filePreviewLeft:   { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, marginRight: 8 },
  fileThumb:         { width: 36, height: 36, borderRadius: 6 },
  fileName:          { color: C.textMid, fontSize: 13, flex: 1 },
  inputWrap:         { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 },
  inputBox:          { backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.border3, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
  textInput:         { color: C.text, fontSize: 14, lineHeight: 20, maxHeight: 120 },
  inputActions:      { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 6, marginBottom: 4 },
  actionBtn:         { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  actionBtnActive:   { backgroundColor: C.greenDim },
  sendBtn:           { width: 34, height: 34, borderRadius: 8, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled:   { backgroundColor: "#3a3a3a" },
  disclaimer:        { textAlign: "center", fontSize: 10, color: C.textLabel, paddingBottom: 10, paddingTop: 2 },
});