import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert,
  Modal, ScrollView, StatusBar, SafeAreaView, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

// ═══════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════
const DARK = {
  bg:        '#0a0f1e',
  surface:   'rgba(255,255,255,0.05)',
  border:    'rgba(255,255,255,0.09)',
  heroBg:    '#0d1b3e',
  stripe:    '#1d6fd8',
  textPri:   '#e8f4fd',
  textSec:   'rgba(255,255,255,0.45)',
  textMuted: 'rgba(255,255,255,0.28)',
  input:     'rgba(255,255,255,0.07)',
  inputBdr:  'rgba(255,255,255,0.12)',
  inputTxt:  '#e8f4fd',
  placeholder: 'rgba(255,255,255,0.3)',
  btnSecBg:  'rgba(255,255,255,0.07)',
  btnSecBdr: 'rgba(255,255,255,0.12)',
  btnSecTxt: 'rgba(255,255,255,0.6)',
  progBg:    'rgba(255,255,255,0.08)',
  kpi: {
    blue:  { bg: 'rgba(29,111,216,0.20)',  border: 'rgba(29,111,216,0.28)',  val: '#63b3ed' },
    green: { bg: 'rgba(72,187,120,0.20)',  border: 'rgba(72,187,120,0.28)',  val: '#68d391' },
    amber: { bg: 'rgba(237,203,104,0.18)', border: 'rgba(237,203,104,0.28)', val: '#f6e05e' },
    red:   { bg: 'rgba(245,101,101,0.20)', border: 'rgba(245,101,101,0.28)', val: '#fc8181' },
  },
  status: {
    Disponible: { bg: 'rgba(72,187,120,0.18)',   text: '#68d391' },
    Occupé:     { bg: 'rgba(237,203,104,0.18)',  text: '#f6e05e' },
    Surchargé:  { bg: 'rgba(245,101,101,0.18)',  text: '#fc8181' },
  },
  chart: { blue: '#63b3ed', green: '#68d391', amber: '#f6e05e', danger: '#fc8181' },
};

const LIGHT = {
  bg:        '#f1f5f9',
  surface:   '#ffffff',
  border:    '#e2e8f0',
  heroBg:    '#042C53',
  stripe:    '#185FA5',
  textPri:   '#1e293b',
  textSec:   '#64748b',
  textMuted: '#94a3b8',
  input:     '#ffffff',
  inputBdr:  '#e2e8f0',
  inputTxt:  '#0f172a',
  placeholder: '#94a3b8',
  btnSecBg:  '#f1f5f9',
  btnSecBdr: '#e2e8f0',
  btnSecTxt: '#334155',
  progBg:    '#e2e8f0',
  kpi: {
    blue:  { bg: '#E6F1FB', border: '#B5D4F4', val: '#185FA5' },
    green: { bg: '#EAF3DE', border: '#C0DD97', val: '#3B6D11' },
    amber: { bg: '#FAEEDA', border: '#FAC775', val: '#854F0B' },
    red:   { bg: '#FCEBEB', border: '#F7C1C1', val: '#A32D2D' },
  },
  status: {
    Disponible: { bg: '#EAF3DE', text: '#3B6D11' },
    Occupé:     { bg: '#FAEEDA', text: '#854F0B' },
    Surchargé:  { bg: '#FCEBEB', text: '#A32D2D' },
  },
  chart: { blue: '#185FA5', green: '#3B6D11', amber: '#854F0B', danger: '#A32D2D' },
};

type Theme = typeof DARK;
const ThemeCtx = createContext<{ t: Theme; isDark: boolean; toggle: () => void }>({
  t: DARK, isDark: true, toggle: () => {},
});
const useTheme = () => useContext(ThemeCtx);

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════
interface Member {
  id: number;
  nom_complet: string;
  email: string;
  role: string;
  departement: string;
  telephone?: string;
  poste?: string;
  status: number;
  charge_actuelle?: number;
  taches_terminees?: number;
  taches_actives?: number;
  total_taches?: number;
  taches_en_retard?: number;
}

const roleLabels: Record<string, string> = {
  admin: 'Admin', chef_projet: 'Chef de projet', employe: 'Employé',
};
const avatarColors = ['#1d4ed8', '#0f2057', '#6d28d9', '#db2777', '#ea580c', '#334155'];

const getStatus = (charge?: number) => {
  const n = Number(charge) || 0;
  if (n <= 3) return 'Disponible';
  if (n === 4) return 'Occupé';
  return 'Surchargé';
};

const getPerf = (m: Member) =>
  m.total_taches ? Math.round(((m.taches_terminees || 0) / m.total_taches) * 100) : 0;

// ═══════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════

function ThemeToggle() {
  const { isDark, toggle, t } = useTheme();
  return (
    <TouchableOpacity
      onPress={toggle}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
      }}
      activeOpacity={0.8}
    >
      <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={14} color="#90cdf4" />
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#90cdf4' }}>
        {isDark ? 'Dark' : 'Light'}
      </Text>
    </TouchableOpacity>
  );
}

function KPICard({ label, value, color }: { label: string; value: number; color: keyof Theme['kpi'] }) {
  const { t } = useTheme();
  const c = t.kpi[color];
  return (
    <View style={{ flex: 1, borderRadius: 14, padding: 14, borderWidth: 1, backgroundColor: c.bg, borderColor: c.border, alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: c.val }}>{value}</Text>
      <Text style={{ fontSize: 10, color: t.textSec, fontWeight: '600', marginTop: 3, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function BarMini({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  const { t } = useTheme();
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ color: t.textSec, fontSize: 11 }}>{label}</Text>
        <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{value} ({pct}%)</Text>
      </View>
      <View style={{ height: 4, backgroundColor: t.progBg, borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: 4, width: `${pct}%` as any, backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

function MemberCard({ member, isAdmin, onPress, onDesactiver }: {
  member: Member; isAdmin: boolean;
  onPress: () => void; onDesactiver: () => void;
}) {
  const { t } = useTheme();
  const statusKey = getStatus(member.charge_actuelle) as keyof typeof t.status;
  const statusStyle = t.status[statusKey] || { bg: t.surface, text: t.textSec };
  const perf    = getPerf(member);
  const loadPct = Math.min(((member.charge_actuelle || 0) / 5) * 100, 100);
  const avColor = avatarColors[member.id % avatarColors.length];

  const barColor =
    statusKey === 'Disponible' ? t.chart.green :
    statusKey === 'Occupé'     ? t.chart.amber : t.chart.danger;

  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 18, borderWidth: 1, borderColor: t.border, marginBottom: 14, overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: t.border }}>
        <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: avColor, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>
            {member.nom_complet?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: t.textPri }} numberOfLines={1}>{member.nom_complet}</Text>
          <Text style={{ fontSize: 11, color: t.textSec, marginTop: 2 }} numberOfLines={1}>{member.email}</Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: statusStyle.bg }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: statusStyle.text }}>{statusKey}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: t.kpi.blue.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: t.kpi.blue.border }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.kpi.blue.val }}>
              {roleLabels[member.role] || member.role}
            </Text>
          </View>
          {member.departement ? (
            <Text style={{ fontSize: 11, color: t.textSec }}>📂 {member.departement}</Text>
          ) : null}
        </View>

        {/* Charge */}
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 12, color: t.textSec }}>Charge de travail</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: barColor }}>{member.charge_actuelle || 0} tâche(s)</Text>
          </View>
          <View style={{ height: 5, backgroundColor: t.progBg, borderRadius: 99, overflow: 'hidden' }}>
            <View style={{ height: 5, width: `${loadPct}%` as any, backgroundColor: barColor, borderRadius: 99 }} />
          </View>
        </View>

        {/* Performance */}
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 12, color: t.textSec }}>Performance</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: t.chart.blue }}>{perf}%</Text>
          </View>
          <View style={{ height: 5, backgroundColor: t.progBg, borderRadius: 99, overflow: 'hidden' }}>
            <View style={{ height: 5, width: `${perf}%` as any, backgroundColor: t.chart.blue, borderRadius: 99 }} />
          </View>
          <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 5 }}>
            {member.taches_terminees || 0} terminées · {member.total_taches || 0} au total
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: t.border }}>
        <TouchableOpacity
          style={{ flex: 1, padding: 9, backgroundColor: t.kpi.blue.bg, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: t.kpi.blue.border }}
          onPress={onPress} activeOpacity={0.8}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: t.kpi.blue.val }}>Voir détail</Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity
            style={{ padding: 9, paddingHorizontal: 14, backgroundColor: t.kpi.red.bg, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: t.kpi.red.border }}
            onPress={onDesactiver} activeOpacity={0.8}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: t.kpi.red.val }}>Désactiver</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════
// MAIN CONTENT
// ═══════════════════════════════════════════
function TeamContent() {
  const { token, isAdmin, isChef } = useAuth();
  const { t, isDark } = useTheme();

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [members, setMembers]           = useState<Member[]>([]);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [successMsg, setSuccessMsg]     = useState('');
  const [formError, setFormError]       = useState('');
  const [editForm, setEditForm]         = useState<Partial<Member>>({});
  const [form, setForm] = useState({
    nom_complet: '', email: '', password: '',
    role: 'employe', departement: '', telephone: '', poste: '',
  });

  // ── Fetch ──
  const fetchMembres = async () => {
    try {
      const r = await fetch(`${API_URL}/equipe/membres`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setMembers(d.membres || []);
    } catch {}
  };

  const fetchDisponibilite = async () => {
    try {
      const r = await fetch(`${API_URL}/equipe/disponibilite`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setMembers(d.employes.map((e: any) => ({
        id: e.id, nom_complet: e.nom, email: e.email, role: 'employe',
        departement: e.poste || 'Non défini',
        charge_actuelle: e.taches_actives,
        taches_terminees: e.taches_terminees,
        total_taches: e.total_taches,
      })));
    } catch {}
  };

  const fetchPerformance = async () => {
    try {
      const r = await fetch(`${API_URL}/equipe/performance`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setPerformanceData(d);
    } catch {}
  };

  const fetchChargeAuto = async () => {
    try {
      const r = await fetch(`${API_URL}/equipe/charge-auto`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) {
        setMembers(prev => prev.map(m => {
          const cd = d.analyse_charge?.find((c: any) => c.employe.id === m.id);
          if (cd) {
            const aFaire = cd.details?.a_faire || 0;
            const enCours = cd.details?.en_cours || 0;
            const termines = cd.details?.terminees || 0;
            return { ...m, charge_actuelle: Number(cd.charge), taches_actives: aFaire + enCours, taches_terminees: termines, total_taches: aFaire + enCours + termines };
          }
          return m;
        }));
      }
    } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    if (isAdmin)     { await fetchMembres(); await fetchChargeAuto(); }
    else if (isChef) { await fetchDisponibilite(); await fetchPerformance(); }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { if (token) loadData(); }, [token]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  // ── Actions ──
  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const handleDesactiver = (id: number, nom: string) => {
    Alert.alert('Confirmation', `Désactiver ${nom} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Désactiver', style: 'destructive', onPress: async () => {
        try {
          const r = await fetch(`${API_URL}/equipe/membres/${id}/desactiver`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
          });
          const d = await r.json();
          if (r.ok && d.success) { showSuccess(`✓ ${nom} désactivé`); fetchMembres(); }
          else Alert.alert('Erreur', d.message || 'Erreur');
        } catch { Alert.alert('Erreur', 'Erreur de connexion'); }
      }},
    ]);
  };

  const handleCreate = async () => {
    if (!form.nom_complet || !form.email || !form.password || !form.departement) {
      setFormError('Tous les champs sont obligatoires.'); return;
    }
    try {
      const r = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        setShowAddModal(false);
        setForm({ nom_complet: '', email: '', password: '', role: 'employe', departement: '', telephone: '', poste: '' });
        showSuccess(`✓ "${form.nom_complet}" ajouté`);
        fetchMembres();
      } else setFormError(d.message || 'Erreur');
    } catch { setFormError('Erreur de connexion'); }
  };

  const handleUpdate = async () => {
    if (!selectedMember) return;
    try {
      const r = await fetch(`${API_URL}/equipe/membres/${selectedMember.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const d = await r.json();
      if (r.ok && d.success) { showSuccess('✓ Membre modifié'); setSelectedMember(null); fetchMembres(); }
      else Alert.alert('Erreur', d.message || 'Erreur');
    } catch { Alert.alert('Erreur', 'Erreur de connexion'); }
  };

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = m.nom_complet?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || getStatus(m.charge_actuelle) === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'Total',       value: members.length,                                                         color: 'blue'  as const },
    { label: 'Disponibles', value: members.filter(m => getStatus(m.charge_actuelle) === 'Disponible').length, color: 'green' as const },
    { label: 'Occupés',     value: members.filter(m => getStatus(m.charge_actuelle) === 'Occupé').length,     color: 'amber' as const },
    { label: 'Surchargés',  value: members.filter(m => getStatus(m.charge_actuelle) === 'Surchargé').length,  color: 'red'   as const },
  ];

  const totalM = members.length;

  // Input style
  const inputStyle = {
    backgroundColor: t.input, borderWidth: 1, borderColor: t.inputBdr,
    borderRadius: 12, padding: 13, fontSize: 14, color: t.inputTxt, marginBottom: 10,
  };

  if (!isAdmin && !isChef) return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Ionicons name="lock-closed-outline" size={48} color={t.textMuted} />
      <Text style={{ marginTop: 12, fontSize: 14, color: t.textSec, textAlign: 'center' }}>
        Accès réservé aux admins et chefs de projet
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Hero ── */}
      <View style={{ backgroundColor: t.heroBg }}>
        <View style={{ height: 3, backgroundColor: t.stripe }} />
        <View style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#90cdf4', letterSpacing: 1.5, textTransform: 'uppercase' }}>ÉQUIPE</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#e8f4fd', marginTop: 2 }}>
                {isAdmin ? "Gestion de l'équipe" : "Disponibilité de l'équipe"}
              </Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
                {isAdmin ? 'Ajout, modification et désactivation' : 'Disponibilité et performance'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 10 }}>
              <ThemeToggle />
              {isAdmin && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1d6fd8', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 }}
                  onPress={() => { setShowAddModal(true); setFormError(''); }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Ajouter</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.chart.blue} />}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 14 }}>

            {/* Success */}
            {successMsg ? (
              <View style={{ padding: 12, backgroundColor: t.kpi.green.bg, borderRadius: 12, borderWidth: 1, borderColor: t.kpi.green.border }}>
                <Text style={{ color: t.kpi.green.val, fontWeight: '600', fontSize: 13 }}>{successMsg}</Text>
              </View>
            ) : null}

            {/* Chef perf globale */}
            {isChef && performanceData && (
              <View style={{ backgroundColor: t.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  Performance globale
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    { label: 'Total tâches',   value: performanceData.performance_globale?.total_taches    || 0 },
                    { label: 'Terminées',       value: performanceData.performance_globale?.taches_terminees || 0 },
                    { label: 'Taux réussite',   value: performanceData.performance_globale?.taux_reussite    || '0%' },
                    { label: 'Durée moyenne',   value: performanceData.performance_globale?.duree_moyenne    || 'N/A' },
                  ].map(s => (
                    <View key={s.label} style={{ flex: 1, minWidth: '45%', backgroundColor: t.kpi.blue.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.kpi.blue.border, alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: t.kpi.blue.val }}>{s.value}</Text>
                      <Text style={{ fontSize: 10, color: t.textSec, marginTop: 3 }}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* KPI */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {stats.map(s => <KPICard key={s.label} label={s.label} value={s.value} color={s.color} />)}
            </View>

            {/* Statuts bar */}
            <View style={{ backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                Répartition
              </Text>
              <BarMini label="Disponibles" value={stats[1].value} color={t.chart.green}  total={totalM} />
              <BarMini label="Occupés"     value={stats[2].value} color={t.chart.amber}  total={totalM} />
              <BarMini label="Surchargés"  value={stats[3].value} color={t.chart.danger} total={totalM} />
            </View>

            {/* Search */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.input, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: t.inputBdr }}>
              <Ionicons name="search-outline" size={16} color={t.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: t.inputTxt }}
                placeholder="Rechercher un membre..."
                placeholderTextColor={t.placeholder}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['all', 'Disponible', 'Occupé', 'Surchargé'].map(f => {
                  const active = filterStatus === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: active ? t.stripe : t.surface, borderWidth: 1, borderColor: active ? t.stripe : t.border }}
                      onPress={() => setFilterStatus(f)} activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : t.textSec }}>
                        {f === 'all' ? 'Tous' : f}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <ActivityIndicator size="large" color={t.chart.blue} />
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
              <Ionicons name="people-outline" size={48} color={t.textMuted} />
              <Text style={{ fontSize: 14, color: t.textSec }}>Aucun membre trouvé</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <MemberCard
            member={item} isAdmin={isAdmin}
            onPress={() => { setSelectedMember(item); setEditForm({}); setFormError(''); }}
            onDesactiver={() => handleDesactiver(item.id, item.nom_complet)}
          />
        )}
      />

      {/* ── Modal détail ── */}
      <Modal visible={!!selectedMember} transparent animationType="slide" onRequestClose={() => setSelectedMember(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.surface === '#ffffff' ? '#fff' : '#0d1b3e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%', borderTopWidth: 1, borderColor: t.border }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedMember && (
                <>
                  {/* Header modal */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: avatarColors[selectedMember.id % avatarColors.length], alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20 }}>{selectedMember.nom_complet?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: t.textPri }}>{selectedMember.nom_complet}</Text>
                      <Text style={{ fontSize: 12, color: t.textSec, marginTop: 2 }}>{selectedMember.email}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedMember(null)}>
                      <Ionicons name="close" size={24} color={t.textSec} />
                    </TouchableOpacity>
                  </View>

                  {/* Info grid */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Rôle',            value: roleLabels[selectedMember.role] || selectedMember.role },
                      { label: 'Département',      value: selectedMember.departement || 'Non défini' },
                      { label: 'Statut',           value: getStatus(selectedMember.charge_actuelle) },
                      { label: 'Tâches actives',   value: String(selectedMember.charge_actuelle || 0) },
                      { label: 'Tâches terminées', value: String(selectedMember.taches_terminees || 0) },
                      { label: 'Total tâches',     value: String(selectedMember.total_taches || 0) },
                    ].map(info => (
                      <View key={info.label} style={{ width: '47%', backgroundColor: t.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border }}>
                        <Text style={{ fontSize: 10, color: t.textMuted, fontWeight: '500', marginBottom: 4 }}>{info.label}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: t.textPri }}>{info.value}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Edit (admin) */}
                  {isAdmin && (
                    <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: t.border }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Modifier</Text>
                      {formError ? <Text style={{ color: t.kpi.red.val, fontSize: 13, marginBottom: 10 }}>{formError}</Text> : null}
                      <TextInput style={inputStyle} placeholder="Nom complet"  placeholderTextColor={t.placeholder} defaultValue={selectedMember.nom_complet}  onChangeText={v => setEditForm({ ...editForm, nom_complet: v })} />
                      <TextInput style={inputStyle} placeholder="Email"         placeholderTextColor={t.placeholder} defaultValue={selectedMember.email}         onChangeText={v => setEditForm({ ...editForm, email: v })} />
                      <TextInput style={inputStyle} placeholder="Département"   placeholderTextColor={t.placeholder} defaultValue={selectedMember.departement}   onChangeText={v => setEditForm({ ...editForm, departement: v })} />
                      <TouchableOpacity
                        style={{ backgroundColor: t.stripe, borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 4 }}
                        onPress={handleUpdate} activeOpacity={0.85}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Enregistrer</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    style={{ backgroundColor: t.btnSecBg, borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: t.btnSecBdr }}
                    onPress={() => setSelectedMember(null)} activeOpacity={0.8}
                  >
                    <Text style={{ color: t.btnSecTxt, fontWeight: '600', fontSize: 14 }}>Fermer</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal ajout ── */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.surface === '#ffffff' ? '#fff' : '#0d1b3e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%', borderTopWidth: 1, borderColor: t.border }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: t.textPri }}>Ajouter un membre</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={t.textSec} />
                </TouchableOpacity>
              </View>
              {formError ? <Text style={{ color: t.kpi.red.val, fontSize: 13, marginBottom: 10 }}>{formError}</Text> : null}
              <TextInput style={inputStyle} placeholder="Nom complet"   placeholderTextColor={t.placeholder} value={form.nom_complet}  onChangeText={v => setForm({ ...form, nom_complet: v })} />
              <TextInput style={inputStyle} placeholder="Email"          placeholderTextColor={t.placeholder} value={form.email}        onChangeText={v => setForm({ ...form, email: v })} keyboardType="email-address" />
              <TextInput style={inputStyle} placeholder="Mot de passe"   placeholderTextColor={t.placeholder} value={form.password}     onChangeText={v => setForm({ ...form, password: v })} secureTextEntry />
              <TextInput style={inputStyle} placeholder="Département"    placeholderTextColor={t.placeholder} value={form.departement}  onChangeText={v => setForm({ ...form, departement: v })} />
              <TextInput style={inputStyle} placeholder="Téléphone"      placeholderTextColor={t.placeholder} value={form.telephone}    onChangeText={v => setForm({ ...form, telephone: v })} keyboardType="phone-pad" />
              <TextInput style={inputStyle} placeholder="Poste"          placeholderTextColor={t.placeholder} value={form.poste}        onChangeText={v => setForm({ ...form, poste: v })} />

              <Text style={{ fontSize: 11, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 4 }}>Rôle</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {(['employe', 'chef_projet'] as const).map(r => {
                  const active = form.role === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={{ flex: 1, padding: 11, borderRadius: 12, borderWidth: 2, borderColor: active ? t.stripe : t.border, backgroundColor: active ? t.kpi.blue.bg : t.input, alignItems: 'center' }}
                      onPress={() => setForm({ ...form, role: r })} activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? t.kpi.blue.val : t.textSec }}>
                        {r === 'employe' ? 'Employé' : 'Chef de projet'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, padding: 13, backgroundColor: t.btnSecBg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: t.btnSecBdr }}
                  onPress={() => setShowAddModal(false)} activeOpacity={0.8}
                >
                  <Text style={{ color: t.btnSecTxt, fontWeight: '600', fontSize: 14 }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, padding: 13, backgroundColor: t.stripe, borderRadius: 12, alignItems: 'center' }}
                  onPress={handleCreate} activeOpacity={0.85}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════
export default function TeamScreen() {
  const [isDark, setIsDark] = useState(true);
  const t      = isDark ? DARK : LIGHT;
  const toggle = () => setIsDark(v => !v);
  return (
    <ThemeCtx.Provider value={{ t, isDark, toggle }}>
      <TeamContent />
    </ThemeCtx.Provider>
  );
}