import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';

// ─── Themes ───────────────────────────────────────────────────────────────────
const DARK = {
  bg:          '#0a0f1e',
  surface:     'rgba(255,255,255,0.05)',
  surfaceSolid:'#0d1b3e',
  border:      'rgba(255,255,255,0.09)',
  stripe:      '#1d6fd8',
  textPri:     '#e8f4fd',
  textSec:     'rgba(255,255,255,0.55)',
  textMuted:   'rgba(255,255,255,0.30)',
  iconBg:      'rgba(29,111,216,0.20)',
  iconColor:   '#63b3ed',
  statBg:      'rgba(255,255,255,0.05)',
  statBdr:     'rgba(255,255,255,0.08)',
  cardShadow:  '#000',
  rowSep:      'rgba(255,255,255,0.06)',
  trackBg:     'rgba(255,255,255,0.10)',
  toggleBg:    'rgba(29,111,216,0.20)',
  toggleBdr:   'rgba(99,179,237,0.30)',
  toggleTxt:   '#90cdf4',
  headerBg:    '#0d1b3e',
};

const LIGHT = {
  bg:          '#f1f5f9',
  surface:     '#ffffff',
  surfaceSolid:'#ffffff',
  border:      '#e2e8f0',
  stripe:      '#185FA5',
  textPri:     '#0f172a',
  textSec:     '#64748b',
  textMuted:   '#94a3b8',
  iconBg:      '#eff6ff',
  iconColor:   '#185FA5',
  statBg:      '#ffffff',
  statBdr:     '#e2e8f0',
  cardShadow:  '#0a286e',
  rowSep:      '#f1f5f9',
  trackBg:     '#e8edf5',
  toggleBg:    '#dbeafe',
  toggleBdr:   '#bfdbfe',
  toggleTxt:   '#0f3494',
  headerBg:    '#ffffff',
};

type Theme = typeof DARK;

// ─── Risk config ──────────────────────────────────────────────────────────────
const RISK_CONFIG: Record<string, {
  label: string; bg: string; text: string; bar: string; border: string;
  icon: keyof typeof Ionicons.glyphMap;
  darkBg: string; darkText: string; darkBorder: string;
}> = {
  critique: { label:'Critique', bg:'#fff1f2', text:'#be123c', bar:'#ef4444', border:'#fecdd3', icon:'alert-circle',       darkBg:'rgba(239,68,68,0.15)',   darkText:'#fca5a5', darkBorder:'rgba(239,68,68,0.35)'   },
  élevé:    { label:'Élevé',    bg:'#fef9c3', text:'#a16207', bar:'#f59e0b', border:'#fde68a', icon:'warning',             darkBg:'rgba(245,158,11,0.15)',  darkText:'#fcd34d', darkBorder:'rgba(245,158,11,0.35)'  },
  eleve:    { label:'Élevé',    bg:'#fef9c3', text:'#a16207', bar:'#f59e0b', border:'#fde68a', icon:'warning',             darkBg:'rgba(245,158,11,0.15)',  darkText:'#fcd34d', darkBorder:'rgba(245,158,11,0.35)'  },
  moyen:    { label:'Moyen',    bg:'#dbeafe', text:'#1d4ed8', bar:'#3b82f6', border:'#bfdbfe', icon:'information-circle',  darkBg:'rgba(59,130,246,0.15)',  darkText:'#93c5fd', darkBorder:'rgba(59,130,246,0.35)'  },
  faible:   { label:'Faible',   bg:'#dcfce7', text:'#15803d', bar:'#22c55e', border:'#bbf7d0', icon:'checkmark-circle',   darkBg:'rgba(34,197,94,0.12)',   darkText:'#86efac', darkBorder:'rgba(34,197,94,0.30)'   },
  normal:   { label:'Normal',   bg:'#f1f5f9', text:'#64748b', bar:'#94a3b8', border:'#e2e8f0', icon:'help-circle',         darkBg:'rgba(148,163,184,0.12)', darkText:'#cbd5e1', darkBorder:'rgba(148,163,184,0.25)' },
};

const getRisk = (key?: string) => RISK_CONFIG[key?.toLowerCase() ?? ''] ?? RISK_CONFIG.normal;

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function ThemeToggle({ isDark, toggle, t }: { isDark: boolean; toggle: () => void; t: Theme }) {
  return (
    <TouchableOpacity
      onPress={toggle}
      style={{ flexDirection:'row', alignItems:'center', gap:5, backgroundColor:t.toggleBg, borderRadius:20, paddingHorizontal:10, paddingVertical:5, borderWidth:1, borderColor:t.toggleBdr }}
    >
      <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={13} color={t.toggleTxt} />
      <Text style={{ fontSize:10, fontWeight:'700', color:t.toggleTxt }}>{isDark ? 'Dark' : 'Light'}</Text>
    </TouchableOpacity>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, color, iconName, t }: {
  value: number; label: string; color: string;
  iconName: keyof typeof Ionicons.glyphMap; t: Theme;
}) {
  return (
    <View style={{ flex:1, minWidth:'45%', backgroundColor:t.statBg, borderRadius:12, borderWidth:1, borderColor:t.statBdr, padding:13,
      shadowColor:t.cardShadow, shadowOpacity:0.06, shadowRadius:8, shadowOffset:{ width:0, height:2 }, elevation:2 }}>
      <View style={{ width:30, height:30, borderRadius:8, backgroundColor:color + '20', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
        <Ionicons name={iconName} size={15} color={color} />
      </View>
      <Text style={{ fontSize:26, fontWeight:'700', color, lineHeight:30 }}>{value}</Text>
      <Text style={{ fontSize:11, color:t.textMuted, marginTop:3 }}>{label}</Text>
    </View>
  );
}

// ─── Risk Badge ───────────────────────────────────────────────────────────────
function RiskBadge({ level, isDark }: { level: string; isDark: boolean }) {
  const risk = getRisk(level);
  const bg     = isDark ? risk.darkBg     : risk.bg;
  const text   = isDark ? risk.darkText   : risk.text;
  const border = isDark ? risk.darkBorder : risk.border;
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:9, paddingVertical:4, borderRadius:20, backgroundColor:bg, borderWidth:1, borderColor:border }}>
      <Ionicons name={risk.icon} size={11} color={text} />
      <Text style={{ fontSize:10, fontWeight:'700', color:text }}>{risk.label}</Text>
    </View>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, color, t }: { value: number; color: string; t: Theme }) {
  return (
    <View style={{ flex:1, height:5, backgroundColor:t.trackBg, borderRadius:99, overflow:'hidden' }}>
      <View style={{ height:'100%', borderRadius:99, width:`${Math.min(value, 100)}%` as any, backgroundColor:color }} />
    </View>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ item, isDark, t }: { item: any; isDark: boolean; t: Theme }) {
  const risk    = getRisk(item.niveau_risque);
  const overdue = (item.jours_restants ?? 0) <= 0;
  const urgent  = !overdue && (item.jours_restants ?? 0) <= 3;
  const accentColor = isDark ? risk.darkBorder : risk.border;
  const barColor    = isDark ? risk.darkText   : risk.bar;
  const textColor   = isDark ? risk.darkText   : risk.text;

  return (
    <View style={{
      backgroundColor:t.surface, borderRadius:12, borderWidth:1, borderColor:t.border,
      borderLeftWidth:3, borderLeftColor:accentColor,
      padding:13, marginBottom:10,
      shadowColor:t.cardShadow, shadowOpacity:0.08, shadowRadius:10,
      shadowOffset:{ width:0, height:3 }, elevation:3,
    }}>
      {/* Top row */}
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
        <Text style={{ fontSize:13, fontWeight:'600', color:t.textPri, flex:1, marginRight:8, lineHeight:18 }} numberOfLines={2}>
          {item.titre}
        </Text>
        <RiskBadge level={item.niveau_risque} isDark={isDark} />
      </View>

      {/* Project name */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:10 }}>
        <Ionicons name="folder-outline" size={11} color={t.textMuted} />
        <Text style={{ fontSize:11, color:t.textSec }}>{item.projet_nom || item.projet || '—'}</Text>
      </View>

      {/* Meta row */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
        {item.assigne_nom ? (
          <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
            <Ionicons name="person-outline" size={12} color={t.textMuted} />
            <Text style={{ fontSize:11, color:t.textSec }}>{item.assigne_nom}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
          <Ionicons name="time-outline" size={12} color={overdue ? '#ef4444' : urgent ? '#f59e0b' : t.textMuted} />
          <Text style={{ fontSize:11, fontWeight:urgent || overdue ? '600' : '400',
            color:overdue ? '#ef4444' : urgent ? '#f59e0b' : t.textSec }}>
            {overdue ? 'En retard' : `${item.jours_restants}j`}
          </Text>
        </View>

        <ProgressBar value={item.progression ?? 0} color={barColor} t={t} />
        <Text style={{ fontSize:11, fontWeight:'600', minWidth:30, textAlign:'right', color:textColor }}>
          {item.progression ?? 0}%
        </Text>
      </View>

      {/* Cause */}
      {item.cause_risque ? (
        <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginTop:8, paddingTop:8, borderTopWidth:1, borderTopColor:t.rowSep }}>
          <Ionicons name="alert-outline" size={11} color={t.textMuted} />
          <Text style={{ fontSize:11, color:t.textMuted, flex:1 }} numberOfLines={1}>{item.cause_risque}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
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
  critique?: number; critiques?: number;
  eleve?: number;    eleves?: number;
  moyen?: number;    moderes?: number;
  faible?: number;   faibles?: number;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RiskScreen() {
  const { token } = useAuth();
  const [isDark,     setIsDark]     = useState(true);
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [stats,      setStats]      = useState<Stats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = isDark ? DARK : LIGHT;

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

  const critique = stats?.critique ?? stats?.critiques ?? 0;
  const eleve    = stats?.eleve    ?? stats?.eleves    ?? 0;
  const moyen    = stats?.moyen    ?? stats?.moderes   ?? 0;
  const faible   = stats?.faible   ?? stats?.faibles   ?? 0;

  if (loading) {
    return (
      <SafeAreaView style={{ flex:1, backgroundColor:t.bg, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator size="large" color={t.stripe} />
      </SafeAreaView>
    );
  }

  const ListHeader = (
    <>
      {/* Stats grid */}
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, paddingTop:14, paddingBottom:4 }}>
        <StatCard value={critique} label="Critiques" color={isDark ? '#fca5a5' : '#be123c'} iconName="alert-circle"      t={t} />
        <StatCard value={eleve}    label="Élevés"    color={isDark ? '#fcd34d' : '#a16207'} iconName="warning"            t={t} />
        <StatCard value={moyen}    label="Modérés"   color={isDark ? '#93c5fd' : '#1d4ed8'} iconName="information-circle" t={t} />
        <StatCard value={faible}   label="Faibles"   color={isDark ? '#86efac' : '#15803d'} iconName="checkmark-circle"  t={t} />
      </View>

      {/* Section header */}
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:18, paddingBottom:10 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <View style={{ width:3, height:16, backgroundColor:t.stripe, borderRadius:2 }} />
          <Text style={{ fontSize:14, fontWeight:'700', color:t.textPri }}>Tâches classifiées</Text>
        </View>
        <View style={{ backgroundColor:t.statBg, borderRadius:20, paddingHorizontal:10, paddingVertical:4, borderWidth:1, borderColor:t.statBdr }}>
          <Text style={{ fontSize:11, fontWeight:'600', color:t.textSec }}>{tasks.length} tâches</Text>
        </View>
      </View>
    </>
  );

  const ListEmpty = (
    <View style={{ alignItems:'center', marginTop:60, paddingHorizontal:32 }}>
      <View style={{ width:64, height:64, borderRadius:16, backgroundColor:t.iconBg, alignItems:'center', justifyContent:'center', marginBottom:14 }}>
        <Ionicons name="checkmark-circle-outline" size={32} color={t.iconColor} />
      </View>
      <Text style={{ fontSize:15, fontWeight:'700', color:t.textPri, marginBottom:6 }}>Aucun risque détecté</Text>
      <Text style={{ fontSize:12, color:t.textMuted, textAlign:'center', lineHeight:18 }}>Tous les projets sont dans les délais</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:t.bg }}>

      {/* ── Header ── */}
      <View style={{ backgroundColor:t.headerBg, paddingHorizontal:16, paddingTop:10, paddingBottom:12, borderBottomWidth:1, borderBottomColor:t.border, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <View>
          <Text style={{ fontSize:10, fontWeight:'700', color:t.textMuted, letterSpacing:0.7, textTransform:'uppercase' }}>PRÉDICTION</Text>
          <Text style={{ fontSize:20, fontWeight:'700', color:t.textPri, marginTop:1 }}>Analyse des risques</Text>
        </View>
        <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
          <ThemeToggle isDark={isDark} toggle={() => setIsDark(v => !v)} t={t} />
          <TouchableOpacity style={{ width:36, height:36, backgroundColor:t.iconBg, borderRadius:10, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:t.border }}>
            <Ionicons name="notifications-outline" size={18} color={t.iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.stripe} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        renderItem={({ item }) => <TaskCard item={item} isDark={isDark} t={t} />}
        contentContainerStyle={{ paddingHorizontal:16, paddingBottom:24 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}