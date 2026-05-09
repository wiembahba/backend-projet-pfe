import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { T, ROLE_COLORS } from '../../constants/theme';

const NAVY     = '#042C53';
const NAVY_MID = '#0C447C';
const NAVY_LT  = '#185FA5';
const BLUE_TXT = '#378ADD';
const BLUE_PAL = '#B5D4F4';

interface KPI { label: string; value: string | number; icon: string; accent: string; accentLight: string; }

function KPICard({ label, value, icon, accent, accentLight }: KPI) {
  return (
    <View style={[s.kpi, { backgroundColor: accentLight }]}>
      <View style={[s.kpiIcon, { backgroundColor: accent }]}>
        <Ionicons name={icon as any} size={16} color="#fff" />
      </View>
      <Text style={[s.kpiValue, { color: accent }]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 75 ? '#16a34a' : value >= 40 ? '#d97706' : '#dc2626';
  return (
    <View style={s.progressBg}>
      <View style={[s.progressFill, { width: `${Math.min(value, 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    en_cours:   { bg: '#eff6ff', text: '#185FA5', label: 'En cours'   },
    termine:    { bg: '#f0fdf4', text: '#16a34a', label: 'Terminé'    },
    en_attente: { bg: '#fffbeb', text: '#d97706', label: 'En attente' },
    en_retard:  { bg: '#fff1f2', text: '#dc2626', label: 'En retard'  },
    a_faire:    { bg: '#f8fafc', text: '#64748b', label: 'À faire'    },
    haute:      { bg: '#fff1f2', text: '#dc2626', label: 'Haute'      },
    moyenne:    { bg: '#fffbeb', text: '#d97706', label: 'Moyenne'    },
    basse:      { bg: '#f0fdf4', text: '#16a34a', label: 'Basse'      },
  };
  const st = map[status] || { bg: '#f1f5f9', text: '#64748b', label: status };
  return (
    <View style={{ backgroundColor: st.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: st.text, fontSize: 10, fontWeight: '700' }}>{st.label}</Text>
    </View>
  );
}

/* ─── Admin ─── */
function AdminView({ token }: { token: string | null }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiFetch('/projets/stats/globales', token).then(d => { if (d.success) setStats(d.stats); }).finally(() => setLoading(false));
  }, []);
  if (loading) return <ActivityIndicator color={NAVY_LT} style={{ marginTop: 40 }} size="large" />;
  const kpis: KPI[] = [
    { label: 'Total projets',   value: stats?.total_projets ?? 0,         icon: 'folder-outline',           accent: NAVY_LT,  accentLight: '#e0eaf5' },
    { label: 'En cours',        value: stats?.projets_en_cours ?? 0,      icon: 'play-circle-outline',      accent: '#0f766e', accentLight: '#f0fdfa' },
    { label: 'Terminés',        value: stats?.projets_termines ?? 0,      icon: 'checkmark-circle-outline', accent: '#16a34a', accentLight: '#f0fdf4' },
    { label: 'En retard',       value: stats?.projets_en_retard ?? 0,     icon: 'alert-circle-outline',     accent: '#dc2626', accentLight: '#fff1f2' },
    { label: 'Total tâches',    value: stats?.total_taches ?? 0,          icon: 'list-outline',             accent: '#7c3aed', accentLight: '#f5f3ff' },
    { label: 'Taux complétion', value: `${stats?.taux_completion ?? 0}%`, icon: 'stats-chart-outline',      accent: NAVY,      accentLight: '#e0eaf5' },
  ];
  return <View style={s.kpiGrid}>{kpis.map(k => <KPICard key={k.label} {...k} />)}</View>;
}

/* ─── Chef ─── */
function ChefView({ token }: { token: string | null }) {
  const [stats, setStats]     = useState<any>(null);
  const [projets, setProjets] = useState<any[]>([]);
  const [taches, setTaches]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      apiFetch('/projets/stats/globales', token),
      apiFetch('/projets?limit=5', token),
      apiFetch('/projets/taches/risquees', token),
    ]).then(([s, p, t]) => {
      if (s.success) setStats(s.stats);
      if (p.success) setProjets(p.projets?.slice(0, 5) || []);
      if (t.success) setTaches(t.taches?.slice(0, 5) || []);
    }).finally(() => setLoading(false));
  }, []);
  if (loading) return <ActivityIndicator color={NAVY_LT} style={{ marginTop: 40 }} size="large" />;
  return (
    <View>
      <View style={s.kpiGrid}>
        <KPICard label="Mes projets"     value={stats?.total_projets ?? 0}          icon="folder-outline"         accent={NAVY_LT}  accentLight="#e0eaf5" />
        <KPICard label="Tâches équipe"   value={stats?.total_taches_equipe ?? 0}    icon="people-outline"         accent="#0f766e"  accentLight="#f0fdfa" />
        <KPICard label="Tâches risquées" value={stats?.taches_risquees ?? 0}        icon="warning-outline"        accent="#dc2626"  accentLight="#fff1f2" />
        <KPICard label="Taux complétion" value={`${stats?.taux_completion ?? 0}%`}  icon="stats-chart-outline"    accent="#16a34a"  accentLight="#f0fdf4" />
      </View>
      {projets.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Mes projets récents</Text>
          {projets.map((p: any) => (
            <View key={p.id} style={s.card}>
              <View style={s.cardRow}>
                <Text style={s.cardTitle} numberOfLines={1}>{p.nom_projet}</Text>
                <StatusBadge status={p.statut} />
              </View>
              <ProgressBar value={p.progression || 0} />
              <Text style={s.cardSub}>{p.progression || 0}% • {p.nb_taches || 0} tâches</Text>
            </View>
          ))}
        </View>
      )}
      {taches.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Tâches risquées</Text>
          {taches.map((t: any) => (
            <View key={t.id} style={[s.card, s.cardDanger]}>
              <View style={s.cardRow}>
                <Text style={s.cardTitle} numberOfLines={1}>{t.titre}</Text>
                <StatusBadge status={t.priorite} />
              </View>
              <Text style={s.cardSub}>{t.assigne_nom} • {t.date_echeance ? new Date(t.date_echeance).toLocaleDateString('fr-FR') : '—'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ─── Employé ─── */
function EmployeView({ token }: { token: string | null }) {
  const [tasks, setTasks]       = useState<any[]>([]);
  const [stats, setStats]       = useState({ total_taches: 0, taches_terminees: 0, taches_en_cours: 0, taches_urgentes: 0 });
  const [loading, setLoading]   = useState(true);
  useEffect(() => {
    Promise.all([
      apiFetch('/projets/taches/mes-taches', token),
      apiFetch('/projets?limit=3', token),
    ]).then(([t]) => {
      if (t.success) {
        const taches = t.taches || [];
        setTasks(taches.slice(0, 5));
        setStats({
          total_taches:     taches.length,
          taches_terminees: taches.filter((x: any) => x.statut === 'termine').length,
          taches_en_cours:  taches.filter((x: any) => x.statut === 'en_cours').length,
          taches_urgentes:  taches.filter((x: any) => x.priorite === 'haute').length,
        });
      }
    }).finally(() => setLoading(false));
  }, []);
  if (loading) return <ActivityIndicator color={NAVY_LT} style={{ marginTop: 40 }} size="large" />;
  return (
    <View>
      <View style={s.kpiGrid}>
        <KPICard label="Mes tâches"  value={stats.total_taches}     icon="list-outline"              accent={NAVY_LT}  accentLight="#e0eaf5" />
        <KPICard label="En cours"    value={stats.taches_en_cours}  icon="play-circle-outline"       accent="#0f766e"  accentLight="#f0fdfa" />
        <KPICard label="Terminées"   value={stats.taches_terminees} icon="checkmark-circle-outline"  accent="#16a34a"  accentLight="#f0fdf4" />
        <KPICard label="Urgentes"    value={stats.taches_urgentes}  icon="alert-circle-outline"      accent="#dc2626"  accentLight="#fff1f2" />
      </View>
      {tasks.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Mes tâches récentes</Text>
          {tasks.map((t: any) => (
            <View key={t.id} style={[s.card, t.priorite === 'haute' && s.cardDanger]}>
              <View style={s.cardRow}>
                <Text style={s.cardTitle} numberOfLines={1}>{t.titre}</Text>
                <StatusBadge status={t.statut} />
              </View>
              <Text style={s.cardSub}>{t.projet_nom || 'Sans projet'} • {t.date_echeance ? new Date(t.date_echeance).toLocaleDateString('fr-FR') : '—'}</Text>
              <ProgressBar value={t.progression || 0} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ─── Main ─── */
export default function DashboardScreen() {
  const { user, token, isAdmin, isChef } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [key, setKey] = useState(0);
  const rc = ROLE_COLORS[user?.role || 'employe'];
  const today = new Date();
  const hour  = today.getHours();
  const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const onRefresh = () => { setRefreshing(true); setKey(k => k + 1); setTimeout(() => setRefreshing(false), 1000); };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY_LT} />}>

        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={s.heroStripe} />
          <View style={s.heroBody}>
            <View style={s.heroTop}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{user?.name?.[0]?.toUpperCase() ?? 'U'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroGreet}>{greet}, {user?.name?.split(' ')[0]} 👋</Text>
                <View style={s.heroBadge}>
                  <Text style={s.heroBadgeText}>{rc.label}</Text>
                </View>
              </View>
              <View style={s.dateBox}>
                <Text style={s.dateNum}>{today.getDate()}</Text>
                <Text style={s.dateMon}>{today.toLocaleDateString('fr-FR', { month: 'short' })}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Content ── */}
        <View style={s.content}>
          {isAdmin ? <AdminView   key={key} token={token} /> :
           isChef  ? <ChefView    key={key} token={token} /> :
                     <EmployeView key={key} token={token} />}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  hero:       { backgroundColor: NAVY },
  heroStripe: { height: 4, backgroundColor: NAVY_LT },
  heroBody:   { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 20 },
  heroTop:    { flexDirection: 'row', alignItems: 'center', gap: 14 },

  avatar: {
    width: 52, height: 52, borderRadius: 13,
    backgroundColor: NAVY_MID,
    borderWidth: 1.5, borderColor: NAVY_LT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: BLUE_PAL, fontSize: 20, fontWeight: '800' },

  heroGreet:      { fontSize: 16, fontWeight: '800', color: '#E6F1FB', marginBottom: 5 },
  heroBadge:      { backgroundColor: NAVY_LT, borderRadius: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3 },
  heroBadgeText:  { fontSize: 10, fontWeight: '700', color: BLUE_PAL, textTransform: 'uppercase', letterSpacing: 0.4 },

  dateBox:  { alignItems: 'center', backgroundColor: NAVY_MID, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: NAVY_LT },
  dateNum:  { fontSize: 20, fontWeight: '800', color: BLUE_PAL },
  dateMon:  { fontSize: 9, fontWeight: '700', color: BLUE_TXT, textTransform: 'uppercase', letterSpacing: 0.5 },

  content: { padding: 16 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  kpi:     { flex: 1, minWidth: '45%', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: '#e5e7eb' },
  kpiIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue:{ fontSize: 22, fontWeight: '800', marginBottom: 2 },
  kpiLabel:{ fontSize: 11, color: '#6b7280', fontWeight: '500' },

  section:      { marginTop: 16 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 },

  card:     { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: '#e5e7eb' },
  cardDanger: { borderLeftWidth: 3, borderLeftColor: '#dc2626' },
  cardRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle:{ fontSize: 14, fontWeight: '600', color: '#1f2937', flex: 1, marginRight: 8 },
  cardSub:  { fontSize: 12, color: '#6b7280', marginTop: 4 },

  progressBg:   { height: 5, backgroundColor: '#f1f5f9', borderRadius: 3, marginTop: 8 },
  progressFill: { height: 5, borderRadius: 3 },
});