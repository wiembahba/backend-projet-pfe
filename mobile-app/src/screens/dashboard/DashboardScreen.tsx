import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  View, Text, ScrollView, SafeAreaView,
  RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { ROLE_COLORS } from '../../constants/theme';

// ─── Install if not already: npm install react-native-chart-kit react-native-svg
let LineChart: any = null;
let BarChart: any  = null;
try {
  const ck = require('react-native-chart-kit');
  LineChart = ck.LineChart;
  BarChart  = ck.BarChart;
} catch (_) {}

const W = Dimensions.get('window').width;

// ═══════════════════════════════════════════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════════════════════════════════════════
const DARK = {
  bg:        '#0a0f1e',
  surface:   'rgba(255,255,255,0.05)',
  border:    'rgba(255,255,255,0.09)',
  heroBg:    '#0d1b3e',
  stripe:    '#1d6fd8',
  textPri:   '#e8f4fd',
  textSec:   'rgba(255,255,255,0.45)',
  textMuted: 'rgba(255,255,255,0.28)',
  avBg:      'rgba(29,111,216,0.25)',
  avBorder:  'rgba(99,179,237,0.35)',
  avText:    '#90cdf4',
  badgeBg:   'rgba(29,111,216,0.28)',
  badgeBdr:  'rgba(99,179,237,0.30)',
  badgeTxt:  '#90cdf4',
  dateBg:    'rgba(255,255,255,0.07)',
  dateBdr:   'rgba(99,179,237,0.20)',
  dateNum:   '#90cdf4',
  dateMon:   '#63b3ed',
  progBg:    'rgba(255,255,255,0.08)',
  kpi: {
    blue:  { bg: 'rgba(29,111,216,0.20)',  border: 'rgba(29,111,216,0.28)',  val: '#63b3ed' },
    teal:  { bg: 'rgba(20,184,166,0.20)',  border: 'rgba(20,184,166,0.28)',  val: '#4fd1c5' },
    green: { bg: 'rgba(72,187,120,0.20)',  border: 'rgba(72,187,120,0.28)',  val: '#68d391' },
    red:   { bg: 'rgba(245,101,101,0.20)', border: 'rgba(245,101,101,0.28)', val: '#fc8181' },
    amber: { bg: 'rgba(237,203,104,0.18)', border: 'rgba(237,203,104,0.28)', val: '#f6e05e' },
  },
  badge: {
    en_cours:   { bg: 'rgba(99,179,237,0.18)',  text: '#63b3ed' },
    termine:    { bg: 'rgba(72,187,120,0.18)',   text: '#68d391' },
    en_attente: { bg: 'rgba(237,203,104,0.18)',  text: '#f6e05e' },
    en_retard:  { bg: 'rgba(245,101,101,0.18)',  text: '#fc8181' },
    a_faire:    { bg: 'rgba(255,255,255,0.08)',   text: 'rgba(255,255,255,0.45)' },
    haute:      { bg: 'rgba(245,101,101,0.18)',   text: '#fc8181' },
    moyenne:    { bg: 'rgba(237,203,104,0.18)',   text: '#f6e05e' },
    basse:      { bg: 'rgba(72,187,120,0.18)',    text: '#68d391' },
  },
  chart: {
    bg:     '#0a0f1e',
    line:   (o = 1) => `rgba(99,179,237,${o})`,
    bar:    (o = 1) => `rgba(99,179,237,${o})`,
    label:  () => 'rgba(255,255,255,0.38)',
    grid:   'rgba(255,255,255,0.06)',
    blue:   '#63b3ed',
    green:  '#68d391',
    amber:  '#f6e05e',
    danger: '#fc8181',
  },
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
  avBg:      '#0C447C',
  avBorder:  '#185FA5',
  avText:    '#B5D4F4',
  badgeBg:   '#0C447C',
  badgeBdr:  '#185FA5',
  badgeTxt:  '#B5D4F4',
  dateBg:    '#0C447C',
  dateBdr:   '#185FA5',
  dateNum:   '#B5D4F4',
  dateMon:   '#85B7EB',
  progBg:    '#e2e8f0',
  kpi: {
    blue:  { bg: '#E6F1FB', border: '#B5D4F4', val: '#185FA5' },
    teal:  { bg: '#E1F5EE', border: '#9FE1CB', val: '#0F6E56' },
    green: { bg: '#EAF3DE', border: '#C0DD97', val: '#3B6D11' },
    red:   { bg: '#FCEBEB', border: '#F7C1C1', val: '#A32D2D' },
    amber: { bg: '#FAEEDA', border: '#FAC775', val: '#854F0B' },
  },
  badge: {
    en_cours:   { bg: '#E6F1FB', text: '#185FA5' },
    termine:    { bg: '#EAF3DE', text: '#3B6D11' },
    en_attente: { bg: '#FAEEDA', text: '#854F0B' },
    en_retard:  { bg: '#FCEBEB', text: '#A32D2D' },
    a_faire:    { bg: '#f1f5f9', text: '#64748b' },
    haute:      { bg: '#FCEBEB', text: '#A32D2D' },
    moyenne:    { bg: '#FAEEDA', text: '#854F0B' },
    basse:      { bg: '#EAF3DE', text: '#3B6D11' },
  },
  chart: {
    bg:     '#ffffff',
    line:   (o = 1) => `rgba(24,95,165,${o})`,
    bar:    (o = 1) => `rgba(24,95,165,${o})`,
    label:  () => '#94a3b8',
    grid:   'rgba(0,0,0,0.05)',
    blue:   '#185FA5',
    green:  '#3B6D11',
    amber:  '#854F0B',
    danger: '#A32D2D',
  },
};

type Theme = typeof DARK;
const ThemeCtx = createContext<{ t: Theme; isDark: boolean; toggle: () => void }>({
  t: DARK, isDark: true, toggle: () => {},
});
const useTheme = () => useContext(ThemeCtx);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function KPICard({ label, value, icon, color }: {
  label: string; value: string | number; icon: string; color: keyof Theme['kpi'];
}) {
  const { t } = useTheme();
  const c = t.kpi[color];
  return (
    <View style={{ flex: 1, minWidth: '45%', borderRadius: 14, padding: 14, borderWidth: 1, backgroundColor: c.bg, borderColor: c.border }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Ionicons name={icon as any} size={16} color={c.val} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: '800', color: c.val, marginBottom: 2 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: t.textSec, fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  const { t } = useTheme();
  const color = value >= 75 ? t.chart.green : value >= 40 ? t.chart.amber : t.chart.danger;
  return (
    <View style={{ height: 5, backgroundColor: t.progBg, borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
      <View style={{ height: 5, borderRadius: 3, width: `${Math.min(value, 100)}%` as any, backgroundColor: color }} />
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTheme();
  const map = t.badge as any;
  const st = map[status] || { bg: t.surface, text: t.textSec };
  const labels: Record<string, string> = {
    en_cours: 'En cours', termine: 'Terminé', en_attente: 'En attente',
    en_retard: 'En retard', a_faire: 'À faire',
    haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse',
  };
  return (
    <View style={{ backgroundColor: st.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: st.text, fontSize: 10, fontWeight: '700' }}>{labels[status] ?? status}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { t } = useTheme();
  return (
    <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 18 }}>
      {title}
    </Text>
  );
}

function Card({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  const { t } = useTheme();
  return (
    <View style={{
      backgroundColor: t.surface, borderRadius: 14, padding: 14, marginBottom: 8,
      borderWidth: 1, borderColor: t.border,
      ...(danger ? { borderLeftWidth: 3, borderLeftColor: t.chart.danger } : {}),
    }}>
      {children}
    </View>
  );
}

function ThemeToggle() {
  const { isDark, toggle, t } = useTheme();
  return (
    <TouchableOpacity
      onPress={toggle}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.dateBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: t.dateBdr }}
    >
      <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={13} color={t.dateNum} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: t.dateNum }}>{isDark ? 'Dark' : 'Light'}</Text>
    </TouchableOpacity>
  );
}

// ─── Stat bar fallback ────────────────────────────────────────────────────────
function StatBar({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  const { t } = useTheme();
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={{ marginBottom: 7 }}>
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

// ─── Charts Section ───────────────────────────────────────────────────────────
function ChartsSection({ stats }: { stats: any }) {
  const { t } = useTheme();
  const chartW = (W - 32 - 10) / 2;

  const totalP =
    (stats?.projets_en_cours   ?? 5) +
    (stats?.projets_termines   ?? 4) +
    (stats?.projets_en_attente ?? 2) +
    (stats?.projets_en_retard  ?? 1);

  const completionData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai'],
    datasets: [{ data: [45, 52, 60, 58, stats?.taux_completion ?? 74] }],
  };

  const taskData = {
    labels: ['Basse', 'Moy.', 'Haute', 'Urg.'],
    datasets: [{ data: [12, 20, 8, 5] }],
  };

  const chartCfg = {
    backgroundGradientFrom: t.chart.bg,
    backgroundGradientTo:   t.chart.bg,
    color:       t.chart.line,
    labelColor:  t.chart.label,
    strokeWidth: 2,
    decimalPlaces: 0,
    propsForDots: { r: '4', strokeWidth: '2', stroke: t.chart.blue },
    propsForBackgroundLines: { strokeDasharray: '', stroke: t.chart.grid },
  };

  return (
    <View>
      <SectionTitle title="Statistiques" />

      {/* Row 1: statuts + courbe complétion */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1, backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Statuts</Text>
          <StatBar label="En cours"   value={stats?.projets_en_cours   ?? 5} color={t.chart.blue}   total={totalP} />
          <StatBar label="Terminés"   value={stats?.projets_termines   ?? 4} color={t.chart.green}  total={totalP} />
          <StatBar label="En attente" value={stats?.projets_en_attente ?? 2} color={t.chart.amber}  total={totalP} />
          <StatBar label="En retard"  value={stats?.projets_en_retard  ?? 1} color={t.chart.danger} total={totalP} />
        </View>

        <View style={{ flex: 1, backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }}>Complétion</Text>
          {LineChart ? (
            <LineChart
              data={completionData}
              width={chartW - 28}
              height={120}
              chartConfig={chartCfg}
              withDots
              withInnerLines
              withOuterLines={false}
              bezier
              style={{ marginLeft: -16, marginTop: 2 }}
            />
          ) : (
            completionData.labels.map((l, i) => (
              <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <Text style={{ color: t.textMuted, fontSize: 9, width: 22 }}>{l}</Text>
                <View style={{ flex: 1, height: 4, backgroundColor: t.progBg, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: 4, width: `${completionData.datasets[0].data[i]}%` as any, backgroundColor: t.chart.blue, borderRadius: 2 }} />
                </View>
                <Text style={{ color: t.chart.blue, fontSize: 9, width: 26 }}>{completionData.datasets[0].data[i]}%</Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Row 2: bar chart tâches par priorité */}
      <View style={{ backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>Tâches par priorité</Text>
        {BarChart ? (
          <BarChart
            data={taskData}
            width={W - 32 - 28}
            height={110}
            chartConfig={{ ...chartCfg, color: t.chart.bar }}
            withInnerLines
            showValuesOnTopOfBars
            fromZero
            style={{ marginLeft: -16, marginTop: 2 }}
            yAxisLabel=""
            yAxisSuffix=""
          />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 80, marginTop: 4 }}>
            {[
              { l: 'Basse', v: 12, c: t.chart.green  },
              { l: 'Moy.',  v: 20, c: t.chart.blue   },
              { l: 'Haute', v: 8,  c: t.chart.amber  },
              { l: 'Urg.',  v: 5,  c: t.chart.danger },
            ].map(item => (
              <View key={item.l} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={{ color: item.c, fontSize: 10, fontWeight: '700' }}>{item.v}</Text>
                <View style={{ width: '100%', height: (item.v / 20) * 52, backgroundColor: item.c, borderRadius: 5, opacity: 0.85 }} />
                <Text style={{ color: t.textMuted, fontSize: 9 }}>{item.l}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE VIEWS
// ═══════════════════════════════════════════════════════════════════════════════

function AdminView({ token }: { token: string | null }) {
  const [stats, setStats]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTheme();
  useEffect(() => {
    apiFetch('/projets/stats/globales', token)
      .then(d => { if (d.success) setStats(d.stats); })
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <ActivityIndicator color={t.chart.blue} style={{ marginTop: 40 }} size="large" />;
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        <KPICard label="Total projets"   value={stats?.total_projets ?? 0}         icon="folder-outline"           color="blue"  />
        <KPICard label="En cours"        value={stats?.projets_en_cours ?? 0}      icon="play-circle-outline"      color="teal"  />
        <KPICard label="Terminés"        value={stats?.projets_termines ?? 0}      icon="checkmark-circle-outline" color="green" />
        <KPICard label="En retard"       value={stats?.projets_en_retard ?? 0}     icon="alert-circle-outline"     color="red"   />
        <KPICard label="Total tâches"    value={stats?.total_taches ?? 0}          icon="list-outline"             color="amber" />
        <KPICard label="Taux complétion" value={`${stats?.taux_completion ?? 0}%`} icon="stats-chart-outline"      color="blue"  />
      </View>
      <ChartsSection stats={stats} />
    </View>
  );
}

function ChefView({ token }: { token: string | null }) {
  const [stats, setStats]     = useState<any>(null);
  const [projets, setProjets] = useState<any[]>([]);
  const [taches, setTaches]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTheme();
  useEffect(() => {
    Promise.all([
      apiFetch('/projets/stats/globales', token),
      apiFetch('/projets?limit=5', token),
      apiFetch('/projets/taches/risquees', token),
    ]).then(([s, p, tk]) => {
      if (s.success)  setStats(s.stats);
      if (p.success)  setProjets(p.projets?.slice(0, 5) || []);
      if (tk.success) setTaches(tk.taches?.slice(0, 5) || []);
    }).finally(() => setLoading(false));
  }, []);
  if (loading) return <ActivityIndicator color={t.chart.blue} style={{ marginTop: 40 }} size="large" />;
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        <KPICard label="Mes projets"     value={stats?.total_projets ?? 0}         icon="folder-outline"      color="blue"  />
        <KPICard label="Tâches équipe"   value={stats?.total_taches_equipe ?? 0}   icon="people-outline"      color="teal"  />
        <KPICard label="Tâches risquées" value={stats?.taches_risquees ?? 0}       icon="warning-outline"     color="red"   />
        <KPICard label="Taux complétion" value={`${stats?.taux_completion ?? 0}%`} icon="stats-chart-outline" color="green" />
      </View>
      <ChartsSection stats={stats} />
      {projets.length > 0 && (
        <>
          <SectionTitle title="Mes projets récents" />
          {projets.map((p: any) => (
            <Card key={p.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: t.textPri, flex: 1 }} numberOfLines={1}>{p.nom_projet}</Text>
                <StatusBadge status={p.statut} />
              </View>
              <ProgressBar value={p.progression || 0} />
              <Text style={{ fontSize: 12, color: t.textSec, marginTop: 4 }}>{p.progression || 0}% • {p.nb_taches || 0} tâches</Text>
            </Card>
          ))}
        </>
      )}
      {taches.length > 0 && (
        <>
          <SectionTitle title="Tâches risquées" />
          {taches.map((tk: any) => (
            <Card key={tk.id} danger>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: t.textPri, flex: 1 }} numberOfLines={1}>{tk.titre}</Text>
                <StatusBadge status={tk.priorite} />
              </View>
              <Text style={{ fontSize: 12, color: t.textSec }}>
                {tk.assigne_nom} • {tk.date_echeance ? new Date(tk.date_echeance).toLocaleDateString('fr-FR') : '—'}
              </Text>
            </Card>
          ))}
        </>
      )}
    </View>
  );
}

function EmployeView({ token }: { token: string | null }) {
  const [tasks, setTasks]     = useState<any[]>([]);
  const [stats, setStats]     = useState({ total: 0, terminees: 0, en_cours: 0, urgentes: 0 });
  const [loading, setLoading] = useState(true);
  const { t } = useTheme();
  useEffect(() => {
    apiFetch('/projets/taches/mes-taches', token).then(res => {
      if (res.success) {
        const taches = res.taches || [];
        setTasks(taches.slice(0, 5));
        setStats({
          total:     taches.length,
          terminees: taches.filter((x: any) => x.statut === 'termine').length,
          en_cours:  taches.filter((x: any) => x.statut === 'en_cours').length,
          urgentes:  taches.filter((x: any) => x.priorite === 'haute').length,
        });
      }
    }).finally(() => setLoading(false));
  }, []);
  if (loading) return <ActivityIndicator color={t.chart.blue} style={{ marginTop: 40 }} size="large" />;
  const taux = stats.total > 0 ? Math.round((stats.terminees / stats.total) * 100) : 0;
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        <KPICard label="Mes tâches"  value={stats.total}     icon="list-outline"              color="blue"  />
        <KPICard label="En cours"    value={stats.en_cours}  icon="play-circle-outline"       color="teal"  />
        <KPICard label="Terminées"   value={stats.terminees} icon="checkmark-circle-outline"  color="green" />
        <KPICard label="Urgentes"    value={stats.urgentes}  icon="alert-circle-outline"      color="red"   />
      </View>
      <ChartsSection stats={{
        projets_en_cours: stats.en_cours, projets_termines: stats.terminees,
        projets_en_attente: 0, projets_en_retard: 0, taux_completion: taux,
      }} />
      {tasks.length > 0 && (
        <>
          <SectionTitle title="Mes tâches récentes" />
          {tasks.map((tk: any) => (
            <Card key={tk.id} danger={tk.priorite === 'haute'}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: t.textPri, flex: 1 }} numberOfLines={1}>{tk.titre}</Text>
                <StatusBadge status={tk.statut} />
              </View>
              <Text style={{ fontSize: 12, color: t.textSec }}>
                {tk.projet_nom || 'Sans projet'} • {tk.date_echeance ? new Date(tk.date_echeance).toLocaleDateString('fr-FR') : '—'}
              </Text>
              <ProgressBar value={tk.progression || 0} />
            </Card>
          ))}
        </>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardContent() {
  const { user, token, isAdmin, isChef } = useAuth();
  const { t } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [key, setKey] = useState(0);

  const rc    = ROLE_COLORS[user?.role || 'employe'];
  const today = new Date();
  const hour  = today.getHours();
  const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const onRefresh = () => {
    setRefreshing(true);
    setKey(k => k + 1);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.chart.blue} />}>
        {/* ── Hero ── */}
        <View style={{ backgroundColor: t.heroBg }}>
          <View style={{ height: 3, backgroundColor: t.stripe }} />
          <View style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {/* Avatar */}
              <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: t.avBg, borderWidth: 1.5, borderColor: t.avBorder, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: t.avText, fontSize: 20, fontWeight: '800' }}>{user?.name?.[0]?.toUpperCase() ?? 'U'}</Text>
              </View>
              {/* Greeting */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: t.textPri, marginBottom: 5 }}>{greet}, {user?.name?.split(' ')[0]} 👋</Text>
                <View style={{ backgroundColor: t.badgeBg, borderWidth: 1, borderColor: t.badgeBdr, borderRadius: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: t.badgeTxt, textTransform: 'uppercase', letterSpacing: 0.6 }}>{rc.label}</Text>
                </View>
              </View>
              {/* Right side: toggle + date */}
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <ThemeToggle />
                <View style={{ alignItems: 'center', backgroundColor: t.dateBg, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: t.dateBdr }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: t.dateNum, lineHeight: 22 }}>{today.getDate()}</Text>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: t.dateMon, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {today.toLocaleDateString('fr-FR', { month: 'short' })}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Content ── */}
        <View style={{ padding: 16 }}>
          {isAdmin ? <AdminView   key={key} token={token} /> :
           isChef  ? <ChefView    key={key} token={token} /> :
                     <EmployeView key={key} token={token} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function DashboardScreen() {
  const [isDark, setIsDark] = useState(true);
  const t      = isDark ? DARK : LIGHT;
  const toggle = () => setIsDark(v => !v);
  return (
    <ThemeCtx.Provider value={{ t, isDark, toggle }}>
      <DashboardContent />
    </ThemeCtx.Provider>
  );
}