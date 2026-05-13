import React, { useState, useEffect, createContext, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  FlatList,
  SafeAreaView,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

// ═══════════════════════════════════════════════════════════════════════════
// THEMES — same palette as DashboardScreen
// ═══════════════════════════════════════════════════════════════════════════
const DARK = {
  bg:        "#0a0f1e",
  surface:   "rgba(255,255,255,0.05)",
  border:    "rgba(255,255,255,0.09)",
  heroBg:    "#0d1b3e",
  stripe:    "#1d6fd8",
  textPri:   "#e8f4fd",
  textSec:   "rgba(255,255,255,0.45)",
  textMuted: "rgba(255,255,255,0.28)",
  dateBg:    "rgba(255,255,255,0.07)",
  dateBdr:   "rgba(99,179,237,0.20)",
  dateNum:   "#90cdf4",
  progBg:    "rgba(255,255,255,0.08)",
  inputBg:   "rgba(255,255,255,0.06)",
  inputBdr:  "rgba(255,255,255,0.12)",
  calBg:     "#0d1b3e",
  calText:   "#e8f4fd",
  calSec:    "rgba(255,255,255,0.35)",
  accent:    "#63b3ed",
  accentBg:  "rgba(29,111,216,0.25)",
  accentBdr: "rgba(99,179,237,0.35)",
  blue:   "#63b3ed",
  green:  "#68d391",
  amber:  "#f6e05e",
  danger: "#fc8181",
  public_bg:  "rgba(72,187,120,0.15)",
  dept_bg:    "rgba(237,203,104,0.15)",
  private_bg: "rgba(245,101,101,0.15)",
  modalBg:    "#0d1b3e",
  chipSel:    "rgba(29,111,216,0.28)",
  chipSelBdr: "rgba(99,179,237,0.50)",
};

const LIGHT = {
  bg:        "#f1f5f9",
  surface:   "#ffffff",
  border:    "#e2e8f0",
  heroBg:    "#042C53",
  stripe:    "#185FA5",
  textPri:   "#1e293b",
  textSec:   "#64748b",
  textMuted: "#94a3b8",
  dateBg:    "#0C447C",
  dateBdr:   "#185FA5",
  dateNum:   "#B5D4F4",
  progBg:    "#e2e8f0",
  inputBg:   "#f8fafc",
  inputBdr:  "#cbd5e1",
  calBg:     "#ffffff",
  calText:   "#1e293b",
  calSec:    "#64748b",
  accent:    "#185FA5",
  accentBg:  "#E6F1FB",
  accentBdr: "#B5D4F4",
  blue:   "#185FA5",
  green:  "#3B6D11",
  amber:  "#854F0B",
  danger: "#A32D2D",
  public_bg:  "#EAF3DE",
  dept_bg:    "#FAEEDA",
  private_bg: "#FCEBEB",
  modalBg:    "#ffffff",
  chipSel:    "#E6F1FB",
  chipSelBdr: "#185FA5",
};

type Theme = typeof DARK;

const ThemeCtx = createContext<{
  t: Theme;
  isDark: boolean;
  toggle: () => void;
}>({ t: DARK, isDark: true, toggle: () => {} });

const useTheme = () => useContext(ThemeCtx);

// ─── Theme Toggle ─────────────────────────────────────────────────────────
function ThemeToggle() {
  const { isDark, toggle, t } = useTheme();
  return (
    <TouchableOpacity
      onPress={toggle}
      style={{
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: t.dateBg, borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 1, borderColor: t.dateBdr,
      }}
    >
      <Ionicons
        name={isDark ? "moon-outline" : "sunny-outline"}
        size={13}
        color={t.dateNum}
      />
      <Text style={{ fontSize: 10, fontWeight: "700", color: t.dateNum }}>
        {isDark ? "Dark" : "Light"}
      </Text>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  extendedProps?: { calendar?: string; visibility?: string };
  backgroundColor?: string;
}
interface User {
  id: number;
  nom_complet: string;
  email: string;
  role: string;
  departement: string;
}
interface Department { name: string }
interface MarkedDates {
  [date: string]: {
    dots?: { key: string; color: string }[];
    selected?: boolean;
    selectedColor?: string;
  };
}

const API_BASE = "http://localhost:5000/api/calendar";

const VISIBILITY_COLORS = (t: Theme) => ({
  private:    t.danger,
  department: t.amber,
  public:     t.green,
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CALENDAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const CalendarContent: React.FC = () => {
  const { t, isDark } = useTheme();

  const [events,      setEvents]      = useState<CalendarEvent[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [allUsers,    setAllUsers]    = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userRole,    setUserRole]    = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [dayEvents,   setDayEvents]   = useState<CalendarEvent[]>([]);

  const [modalVisible,          setModalVisible]          = useState(false);
  const [selectedEvent,         setSelectedEvent]         = useState<CalendarEvent | null>(null);
  const [eventTitle,            setEventTitle]            = useState("");
  const [eventStartDate,        setEventStartDate]        = useState("");
  const [eventEndDate,          setEventEndDate]          = useState("");
  const [eventStartTime,        setEventStartTime]        = useState<Date | null>(null);
  const [eventEndTime,          setEventEndTime]          = useState<Date | null>(null);
  const [eventLevel,            setEventLevel]            = useState("");
  const [selectedParticipants,  setSelectedParticipants]  = useState<number[]>([]);
  const [selectedDepartment,    setSelectedDepartment]    = useState("");
  const [showStartTimePicker,   setShowStartTimePicker]   = useState(false);
  const [showEndTimePicker,     setShowEndTimePicker]     = useState(false);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);

  const vc = VISIBILITY_COLORS(t);
  const canModify = () => userRole === "admin" || userRole === "chef_projet";
  const getToken  = async () => AsyncStorage.getItem("mdw-token");
  const formatTime = (d: Date | null) => d ? d.toTimeString().slice(0, 5) : "";

  const fetchUsers = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res  = await fetch(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setAllUsers(data.users);
    } catch {}
  };

  const fetchDepartments = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res  = await fetch(`${API_BASE}/departments`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setDepartments(data.departments);
    } catch {}
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/events`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.events) setEvents(data.events);
    } catch {}
    finally { setLoading(false); }
  };

  const getMarkedDates = (): MarkedDates => {
    const marked: MarkedDates = {};
    events.forEach((event) => {
      const dateKey = event.start?.split("T")[0];
      if (!dateKey) return;
      const vis   = event.extendedProps?.visibility ?? "public";
      const color = vc[vis as keyof typeof vc] ?? t.accent;
      if (!marked[dateKey]) marked[dateKey] = { dots: [] };
      marked[dateKey].dots!.push({ key: event.id, color });
    });
    if (selectedDate) {
      marked[selectedDate] = {
        ...(marked[selectedDate] ?? {}),
        selected: true,
        selectedColor: t.accent,
      };
    }
    return marked;
  };

  const handleDayPress = (day: DateData) => {
    const dateStr = day.dateString;
    setSelectedDate(dateStr);
    setDayEvents(events.filter((e) => e.start?.startsWith(dateStr)));
  };

  const resetModalFields = () => {
    setSelectedEvent(null); setEventTitle(""); setEventStartDate("");
    setEventEndDate(""); setEventStartTime(null); setEventEndTime(null);
    setEventLevel(""); setSelectedParticipants([]); setSelectedDepartment("");
  };

  const openAddModal = () => {
    if (!canModify()) { Alert.alert("Accès refusé", "Vous n'avez pas le droit d'ajouter des événements."); return; }
    resetModalFields();
    const today = new Date().toISOString().split("T")[0];
    setEventStartDate(selectedDate || today);
    setEventEndDate(selectedDate || today);
    setModalVisible(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventTitle(event.title);
    setEventStartDate(event.start?.split("T")[0] ?? "");
    setEventEndDate(event.end?.split("T")[0] ?? "");
    const vis = event.extendedProps?.visibility;
    setEventLevel(vis === "private" ? "Danger" : vis === "department" ? "Warning" : "Success");
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!canModify()) { Alert.alert("Accès refusé", "Vous n'avez pas le droit de modifier des événements."); return; }
    if (!eventTitle.trim()) { Alert.alert("Erreur", "Le titre est obligatoire."); return; }
    try {
      const token = await getToken();
      if (!token) { Alert.alert("Erreur", "Vous devez être connecté."); return; }
      let visibility = "public";
      if (eventLevel === "Danger") visibility = "private";
      else if (eventLevel === "Warning") visibility = "department";
      const eventData: Record<string, unknown> = {
        title: eventTitle,
        description: `Événement ${eventTitle}`,
        start_date: eventStartDate,
        end_date: eventEndDate || eventStartDate,
        start_time: formatTime(eventStartTime),
        end_time: formatTime(eventEndTime),
        visibility, all_day: false,
        color: eventLevel === "Danger" ? t.danger : eventLevel === "Warning" ? t.amber : t.green,
      };
      if (visibility === "department" && selectedDepartment) eventData.department = selectedDepartment;
      if (visibility === "private" && selectedParticipants.length > 0) eventData.participants = selectedParticipants;
      const url    = selectedEvent ? `${API_BASE}/events/${selectedEvent.id}` : `${API_BASE}/events`;
      const method = selectedEvent ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(eventData),
      });
      if (res.ok) {
        await fetchEvents();
        setModalVisible(false); resetModalFields();
        if (selectedDate) setDayEvents(events.filter((e) => e.start?.startsWith(selectedDate)));
      } else {
        const error = await res.json();
        Alert.alert("Erreur", error.message ?? "Impossible de sauvegarder l'événement.");
      }
    } catch { Alert.alert("Erreur", "Connexion au serveur impossible."); }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    Alert.alert("Confirmation", "Êtes-vous sûr de vouloir supprimer cet événement ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        try {
          const token = await getToken();
          if (!token) return;
          const res = await fetch(`${API_BASE}/events/${selectedEvent.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) { await fetchEvents(); setModalVisible(false); resetModalFields(); }
        } catch { Alert.alert("Erreur", "Impossible de supprimer l'événement."); }
      }},
    ]);
  };

  useEffect(() => {
    (async () => {
      const userStr = await AsyncStorage.getItem("mdw-user");
      if (userStr) { try { const u = JSON.parse(userStr); setUserRole(u.role); } catch {} }
      await Promise.all([fetchUsers(), fetchDepartments(), fetchEvents()]);
    })();
  }, []);

  const visibilityOptions = [
    ...(userRole === "admin" ? [{ label: "🌍 Public (tout le monde)", value: "Success" }] : []),
    { label: "🏢 Département (équipe)", value: "Warning" },
    { label: "🔒 Privé (participants uniquement)", value: "Danger" },
  ];

  // ── styles inline (theme-reactive) ────────────────────────────────────────
  const s = {
    container:   { flex: 1, backgroundColor: t.bg },
    centered:    { flex: 1, justifyContent: "center" as const, alignItems: "center" as const, backgroundColor: t.bg },
    label:       { fontSize: 12, fontWeight: "600" as const, color: t.textSec, marginBottom: 6, marginTop: 14, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    input:       { borderWidth: 1, borderColor: t.inputBdr, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: t.textPri, backgroundColor: t.inputBg, justifyContent: "center" as const },
    inputDis:    { opacity: 0.5 },
  };

  if (loading) return (
    <View style={s.centered}>
      <ActivityIndicator size="large" color={t.accent} />
      <Text style={{ marginTop: 12, color: t.textSec, fontSize: 14 }}>Chargement du calendrier...</Text>
    </View>
  );

  return (
    <View style={s.container}>
      {/* ── Hero Header ── */}
      <View style={{ backgroundColor: t.heroBg }}>
        <View style={{ height: 3, backgroundColor: t.stripe }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.textPri }}>📅 Calendrier</Text>
            <Text style={{ fontSize: 11, color: t.textSec, marginTop: 2 }}>Gérez vos événements</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {canModify() && (
              <TouchableOpacity
                style={{
                  flexDirection: "row", alignItems: "center", gap: 5,
                  backgroundColor: t.accent, borderRadius: 20,
                  paddingHorizontal: 12, paddingVertical: 7,
                }}
                onPress={openAddModal}
              >
                <Ionicons name="add" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Ajouter</Text>
              </TouchableOpacity>
            )}
            <ThemeToggle />
          </View>
        </View>
      </View>

      {/* ── Calendrier ── */}
      <Calendar
        markingType="multi-dot"
        markedDates={getMarkedDates()}
        onDayPress={handleDayPress}
        style={{ backgroundColor: t.calBg }}
        theme={{
          backgroundColor:            t.calBg,
          calendarBackground:         t.calBg,
          textSectionTitleColor:      t.textMuted,
          selectedDayBackgroundColor: t.accent,
          selectedDayTextColor:       "#fff",
          todayTextColor:             t.accent,
          dayTextColor:               t.calText,
          textDisabledColor:          t.textMuted,
          dotColor:                   t.accent,
          arrowColor:                 t.accent,
          monthTextColor:             t.textPri,
          indicatorColor:             t.accent,
        }}
      />

      {/* ── Légende ── */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.border }}>
        {[
          { color: t.green,  label: "Public" },
          { color: t.amber,  label: "Département" },
          { color: t.danger, label: "Privé" },
        ].map(item => (
          <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.color }} />
            <Text style={{ fontSize: 11, color: t.textSec }}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Événements du jour ── */}
      {selectedDate ? (
        <View style={{ flex: 1, paddingHorizontal: 14, paddingTop: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.7 }}>
              {selectedDate} — {dayEvents.length} événement(s)
            </Text>
          </View>
          <FlatList
            data={dayEvents}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 30 }}>
                <Ionicons name="calendar-outline" size={36} color={t.textMuted} />
                <Text style={{ color: t.textMuted, marginTop: 10, fontSize: 13 }}>Aucun événement ce jour.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const vis   = item.extendedProps?.visibility ?? "public";
              const color = vc[vis as keyof typeof vc] ?? t.accent;
              const bg    = vis === "private" ? t.private_bg : vis === "department" ? t.dept_bg : t.public_bg;
              return (
                <TouchableOpacity
                  style={{ backgroundColor: bg, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: color, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: t.border }}
                  onPress={() => openEditModal(item)}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: t.textPri }}>{item.title}</Text>
                  <Text style={{ fontSize: 11, color, marginTop: 3, fontWeight: "600" }}>
                    {vis === "private" ? "🔒 Privé" : vis === "department" ? "🏢 Département" : "🌍 Public"}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Ionicons name="finger-print-outline" size={40} color={t.textMuted} />
          <Text style={{ color: t.textMuted, marginTop: 10, fontSize: 13 }}>Appuyez sur un jour pour voir ses événements</Text>
        </View>
      )}

      {/* ════════════════ MODAL AJOUT/EDIT ════════════════ */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: t.modalBg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: "92%", borderTopWidth: 1, borderColor: t.border }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: t.textPri, marginBottom: 3 }}>
                    {selectedEvent ? "Détails de l'événement" : "Ajouter un événement"}
                  </Text>
                  <Text style={{ fontSize: 12, color: t.textSec }}>
                    {canModify() ? "Planifiez votre prochain événement" : "Informations de l'événement"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setModalVisible(false); resetModalFields(); }}
                  style={{ backgroundColor: t.dateBg, borderRadius: 20, padding: 6, borderWidth: 1, borderColor: t.border }}
                >
                  <Ionicons name="close" size={16} color={t.textSec} />
                </TouchableOpacity>
              </View>

              {/* Titre */}
              <Text style={s.label}>Titre de l'événement</Text>
              <TextInput
                style={[s.input, !canModify() && s.inputDis]}
                value={eventTitle}
                onChangeText={setEventTitle}
                placeholder="Ex: Réunion d'équipe"
                placeholderTextColor={t.textMuted}
                editable={canModify()}
              />

              {/* Visibilité */}
              <Text style={s.label}>Visibilité</Text>
              <View style={{ gap: 7 }}>
                {visibilityOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={{
                      borderWidth: 1,
                      borderColor: eventLevel === opt.value ? t.chipSelBdr : t.border,
                      borderRadius: 10,
                      paddingHorizontal: 14, paddingVertical: 10,
                      backgroundColor: eventLevel === opt.value ? t.chipSel : t.surface,
                    }}
                    onPress={() => {
                      if (!canModify()) return;
                      setEventLevel(opt.value);
                      setSelectedParticipants([]);
                      setSelectedDepartment("");
                    }}
                  >
                    <Text style={{ fontSize: 13, color: eventLevel === opt.value ? t.accent : t.textSec, fontWeight: eventLevel === opt.value ? "700" : "400" }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Département */}
              {eventLevel === "Warning" && canModify() && (
                <View style={{ marginTop: 10, padding: 12, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border }}>
                  <Text style={s.label}>🏢 Sélectionner le département</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                    {departments.map((dept) => (
                      <TouchableOpacity
                        key={dept.name}
                        style={{ borderWidth: 1, borderColor: selectedDepartment === dept.name ? t.chipSelBdr : t.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: selectedDepartment === dept.name ? t.chipSel : t.inputBg }}
                        onPress={() => setSelectedDepartment(dept.name)}
                      >
                        <Text style={{ fontSize: 12, color: selectedDepartment === dept.name ? t.accent : t.textSec, fontWeight: selectedDepartment === dept.name ? "700" : "400" }}>{dept.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>✉️ Tous les membres de ce département recevront une notification.</Text>
                </View>
              )}

              {/* Participants */}
              {eventLevel === "Danger" && canModify() && (
                <View style={{ marginTop: 10, padding: 12, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border }}>
                  <Text style={s.label}>👥 Participants</Text>
                  <TouchableOpacity
                    style={{ borderWidth: 1, borderColor: t.chipSelBdr, borderRadius: 10, padding: 10, backgroundColor: t.chipSel }}
                    onPress={() => setParticipantsModalVisible(true)}
                  >
                    <Text style={{ fontSize: 13, color: t.accent, fontWeight: "600" }}>
                      {selectedParticipants.length > 0
                        ? `${selectedParticipants.length} participant(s) sélectionné(s)`
                        : "Choisir les participants..."}
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>✉️ Ces personnes recevront une invitation par email.</Text>
                </View>
              )}

              {/* Dates */}
              <Text style={s.label}>Date de début</Text>
              <TextInput style={[s.input, !canModify() && s.inputDis]} value={eventStartDate} onChangeText={setEventStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={t.textMuted} editable={canModify()} />

              <Text style={s.label}>Date de fin</Text>
              <TextInput style={[s.input, !canModify() && s.inputDis]} value={eventEndDate} onChangeText={setEventEndDate} placeholder="YYYY-MM-DD" placeholderTextColor={t.textMuted} editable={canModify()} />

              {/* Heures */}
              <Text style={s.label}>Heure de début</Text>
              <TouchableOpacity style={s.input} onPress={() => canModify() && setShowStartTimePicker(true)}>
                <Text style={{ color: eventStartTime ? t.textPri : t.textMuted, fontSize: 14 }}>
                  {eventStartTime ? formatTime(eventStartTime) : "Sélectionner l'heure..."}
                </Text>
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker mode="time" value={eventStartTime ?? new Date()}
                  onChange={(_, d) => { setShowStartTimePicker(Platform.OS === "ios"); if (d) setEventStartTime(d); }} />
              )}

              <Text style={s.label}>Heure de fin (optionnel)</Text>
              <TouchableOpacity style={s.input} onPress={() => canModify() && setShowEndTimePicker(true)}>
                <Text style={{ color: eventEndTime ? t.textPri : t.textMuted, fontSize: 14 }}>
                  {eventEndTime ? formatTime(eventEndTime) : "Sélectionner l'heure..."}
                </Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker mode="time" value={eventEndTime ?? new Date()}
                  onChange={(_, d) => { setShowEndTimePicker(Platform.OS === "ios"); if (d) setEventEndTime(d); }} />
              )}

              {/* Footer */}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
                <TouchableOpacity
                  style={{ borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 }}
                  onPress={() => { setModalVisible(false); resetModalFields(); }}
                >
                  <Text style={{ fontSize: 13, color: t.textSec }}>Fermer</Text>
                </TouchableOpacity>
                {canModify() && selectedEvent && (
                  <TouchableOpacity
                    style={{ backgroundColor: t.danger, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 }}
                    onPress={handleDelete}
                  >
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>Supprimer</Text>
                  </TouchableOpacity>
                )}
                {canModify() && (
                  <TouchableOpacity
                    style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 }}
                    onPress={handleSave}
                  >
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                      {selectedEvent ? "Mettre à jour" : "Ajouter"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ════════════════ MODAL PARTICIPANTS ════════════════ */}
      <Modal visible={participantsModalVisible} animationType="slide" transparent onRequestClose={() => setParticipantsModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: t.modalBg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: "80%", borderTopWidth: 1, borderColor: t.border }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: t.textPri }}>Sélectionner les participants</Text>
              <TouchableOpacity onPress={() => setParticipantsModalVisible(false)} style={{ backgroundColor: t.dateBg, borderRadius: 20, padding: 6, borderWidth: 1, borderColor: t.border }}>
                <Ionicons name="close" size={15} color={t.textSec} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={allUsers}
              keyExtractor={(u) => u.id.toString()}
              renderItem={({ item }) => {
                const selected = selectedParticipants.includes(item.id);
                return (
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: t.border, backgroundColor: selected ? t.chipSel : "transparent", paddingHorizontal: 4, borderRadius: 8 }}
                    onPress={() => setSelectedParticipants((prev) => selected ? prev.filter((id) => id !== item.id) : [...prev, item.id])}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: selected ? t.accent : t.border, alignItems: "center", justifyContent: "center", backgroundColor: selected ? t.accent : "transparent" }}>
                      {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "500", color: t.textPri }}>{item.nom_complet}</Text>
                      <Text style={{ fontSize: 11, color: t.textSec }}>{item.role} · {item.departement ?? "Aucun département"}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={{ marginTop: 14, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
              onPress={() => setParticipantsModalVisible(false)}
            >
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Confirmer ({selectedParticipants.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT — wrapped with ThemeProvider, same pattern as DashboardScreen
// ═══════════════════════════════════════════════════════════════════════════
export default function CalendarScreen() {
  const [isDark, setIsDark] = useState(true);
  const t      = isDark ? DARK : LIGHT;
  const toggle = () => setIsDark((v) => !v);
  return (
    <ThemeCtx.Provider value={{ t, isDark, toggle }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <CalendarContent />
      </SafeAreaView>
    </ThemeCtx.Provider>
  );
}