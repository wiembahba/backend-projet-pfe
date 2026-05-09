import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';

// ── Design tokens ──────────────────────────────────────────
const T = {
  white:    '#ffffff',
  slate50:  '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate900: '#0f172a',
  blue50:   '#e6f1fb',
  blue600:  '#185fa5',
  blue800:  '#0c447c',
  red50:    '#fcebeb',
  red400:   '#e24b4a',
  red700:   '#a32d2d',
  amber50:  '#faeeda',
  amber600: '#ba7517',
  amber800: '#854f0b',
  green50:  '#eaf3de',
  green600: '#3b6d11',
};

// ── Risk level config ──────────────────────────────────────
type RiskKey = 'critique' | 'élevé' | 'eleve' | 'moyen' | 'faible' | 'normal';

const RISK_CONFIG: Record<string, { label: string; bg: string; text: string; bar: string; border: string; icon: keyof typeof Ionicons.glyphMap }> = {
  critique: { label: 'Critique', bg: T.red50,    text: T.red700,    bar: T.red400,    border: T.red400,    icon: 'alert-circle'        },
  élevé:    { label: 'Élevé',    bg: T.amber50,  text: T.amber800,  bar: T.amber600,  border: T.amber600,  icon: 'warning'             },
  eleve:    { label: 'Élevé',    bg: T.amber50,  text: T.amber800,  bar: T.amber600,  border: T.amber600,  icon: 'warning'             },
  moyen:    { label: 'Moyen',    bg: T.blue50,   text: T.blue800,   bar: T.blue600,   border: T.blue600,   icon: 'information-circle'  },
  faible:   { label: 'Faible',   bg: T.green50,  text: T.green600,  bar: T.green600,  border: T.green600,  icon: 'checkmark-circle'    },
  normal:   { label: 'Normal',   bg: T.slate100, text: T.slate600,  bar: T.slate400,  border: T.slate400,  icon: 'help-circle'         },
};

const getRisk = (key?: string) => RISK_CONFIG[key?.toLowerCase() ?? ''] ?? RISK_CONFIG.normal;

// ── Sub-components ─────────────────────────────────────────

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={s.statCard}>
      <View style={[s.statDot, { backgroundColor: color }]} />
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function RiskBadge({ level }: { level: string }) {
  const risk = getRisk(level);
  return (
    <View style={[s.badge, { backgroundColor: risk.bg }]}>
      <Ionicons name={risk.icon} size={11} color={risk.text} />
      <Text style={[s.badgeText, { color: risk.text }]}>{risk.label}</Text>
    </View>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${Math.min(value, 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function TaskCard({ item }: { item: any }) {
  const risk = getRisk(item.niveau_risque);
  const overdue = (item.jours_restants ?? 0) <= 0;
  const urgent  = !overdue && (item.jours_restants ?? 0) <= 3;

  return (
    <View style={[s.card, { borderLeftColor: risk.border }]}>
      {/* top row */}
      <View style={s.cardTop}>
        <Text style={s.cardTitle} numberOfLines={2}>{item.titre}</Text>
        <RiskBadge level={item.niveau_risque} />
      </View>

      {/* project name */}
      <Text style={s.cardProject}>{item.projet_nom || item.projet || '—'}</Text>

      {/* meta row */}
      <View style={s.cardMeta}>
        {item.assigne_nom ? (
          <View style={s.metaItem}>
            <Ionicons name="person-outline" size={12} color={T.slate500} />
            <Text style={s.metaText}>{item.assigne_nom}</Text>
          </View>
        ) : null}

        <View style={s.metaItem}>
          <Ionicons name="time-outline" size={12} color={overdue ? T.red400 : urgent ? T.amber600 : T.slate500} />
          <Text style={[s.metaText, { color: overdue ? T.red400 : urgent ? T.amber600 : T.slate500, fontWeight: urgent || overdue ? '600' : '400' }]}>
            {overdue ? 'En retard' : `${item.jours_restants}j`}
          </Text>
        </View>

        <ProgressBar value={item.progression ?? 0} color={risk.bar} />

        <Text style={[s.progressLabel, { color: risk.text }]}>
          {item.progression ?? 0}%
        </Text>
      </View>

      {/* cause */}
      {item.cause_risque ? (
        <Text style={s.causeText} numberOfLines={1}>{item.cause_risque}</Text>
      ) : null}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────

interface Task {
  id: number;
  titre: string;
  projet_nom?: string;
  projet?: string;
  assigne_nom?: string;
  progression: number;
  jours_restants?: number;
  niveau_risque?: string;
  score_risque?: number;
  cause_risque?: string;
}

interface Stats {
  critique?: number;
  eleve?: number;
  moyen?: number;
  faible?: number;
  // fallback keys
  critiques?: number;
  eleves?: number;
  moderes?: number;
  faibles?: number;
}

export default function RiskScreen() {
  const { token } = useAuth();
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [r, s] = await Promise.all([
        apiFetch('/projets/risques/analyse', token),
        apiFetch('/projets/risques/stats',   token),
      ]);
      if (r?.success) setTasks(r.risques ?? r.taches ?? []);
      if (s?.success) setStats(s.stats ?? null);
    } catch (e) {
      console.error('RiskScreen load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  // normalise stat keys (API returns either singular or plural)
  const critique = stats?.critique ?? stats?.critiques ?? 0;
  const eleve    = stats?.eleve    ?? stats?.eleves    ?? 0;
  const moyen    = stats?.moyen    ?? stats?.moderes   ?? 0;
  const faible   = stats?.faible   ?? stats?.faibles   ?? 0;

  if (loading) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <ActivityIndicator size="large" color={T.blue600} />
      </SafeAreaView>
    );
  }

  const ListHeader = (
    <>
      {/* Stats grid */}
      <View style={s.statsGrid}>
        <StatCard value={critique} label="Critiques" color={T.red400}    />
        <StatCard value={eleve}    label="Élevés"    color={T.amber600}  />
        <StatCard value={moyen}    label="Modérés"   color={T.blue600}   />
        <StatCard value={faible}   label="Faibles"   color={T.green600}  />
      </View>

      {/* Section header */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Tâches classifiées</Text>
        <Text style={s.sectionCount}>{tasks.length} tâches</Text>
      </View>
    </>
  );

  const ListEmpty = (
    <View style={s.emptyContainer}>
      <Ionicons name="checkmark-circle-outline" size={52} color={T.green600} />
      <Text style={s.emptyTitle}>Aucun risque détecté</Text>
      <Text style={s.emptySubtitle}>Tous les projets sont dans les délais</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerLabel}>PRÉDICTION</Text>
          <Text style={s.headerTitle}>Analyse des risques</Text>
        </View>
        <TouchableOpacity style={s.headerIcon}>
          <Ionicons name="notifications-outline" size={20} color={T.slate600} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.blue600} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        renderItem={({ item }) => <TaskCard item={item} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: T.slate50 },
  loadingContainer: { flex: 1, backgroundColor: T.slate50, alignItems: 'center', justifyContent: 'center' },

  // Header
  header:      { backgroundColor: T.white, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: T.slate200, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { fontSize: 10, fontWeight: '600', color: T.slate500, letterSpacing: 0.6 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: T.slate900, marginTop: 1 },
  headerIcon:  { width: 36, height: 36, backgroundColor: T.slate100, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: T.slate200 },

  // Stats
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  statCard:   { flex: 1, minWidth: '45%', backgroundColor: T.white, borderRadius: 12, borderWidth: 0.5, borderColor: T.slate200, padding: 12 },
  statDot:    { width: 7, height: 7, borderRadius: 4, marginBottom: 6 },
  statValue:  { fontSize: 26, fontWeight: '700', lineHeight: 30 },
  statLabel:  { fontSize: 11, color: T.slate500, marginTop: 2 },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  sectionTitle:  { fontSize: 14, fontWeight: '600', color: T.slate900 },
  sectionCount:  { fontSize: 12, color: T.slate500 },

  // Task card
  card:        { backgroundColor: T.white, borderRadius: 12, borderWidth: 0.5, borderColor: T.slate200, borderLeftWidth: 3, padding: 13, marginBottom: 8 },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardTitle:   { fontSize: 13, fontWeight: '600', color: T.slate900, flex: 1, marginRight: 8, lineHeight: 18 },
  cardProject: { fontSize: 11, color: T.slate500, marginBottom: 8 },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:    { fontSize: 11, color: T.slate500 },
  progressTrack: { flex: 1, height: 4, backgroundColor: T.slate100, borderRadius: 99, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 99 },
  progressLabel: { fontSize: 11, fontWeight: '600', minWidth: 30, textAlign: 'right' },
  causeText:   { fontSize: 11, color: T.slate400, marginTop: 6 },

  // Badge
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '600' },

  // Empty
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyTitle:     { fontSize: 16, fontWeight: '600', color: T.slate700, marginTop: 12 },
  emptySubtitle:  { fontSize: 13, color: T.slate400, marginTop: 4, textAlign: 'center' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
});