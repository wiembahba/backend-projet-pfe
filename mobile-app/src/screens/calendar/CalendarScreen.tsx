import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, SafeAreaView, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';

const NAVY     = '#042C53';
const NAVY_MID = '#0C447C';
const NAVY_LT  = '#185FA5';
const BLUE_TXT = '#378ADD';
const BLUE_PAL = '#B5D4F4';

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  projet: { bg: '#eff6ff', text: '#185FA5' },
  tache:  { bg: '#f0fdf4', text: '#16a34a' },
  rappel: { bg: '#fffbeb', text: '#d97706' },
};

export default function CalendarScreen() {
  const { token } = useAuth();
  const [events, setEvents]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date();

  const load = async () => {
    try {
      const d = await apiFetch('/projets/calendrier/evenements', token);
      if (d.success) setEvents(d.evenements || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upcoming = events
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 20);

  const todayCount    = upcoming.filter(e => new Date(e.date).toDateString() === today.toDateString()).length;
  const thisWeekCount = upcoming.filter(e => {
    const d = new Date(e.date);
    const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff < 7;
  }).length;

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={NAVY_LT} size="large" />
    </SafeAreaView>
  );

  const renderEvent = ({ item }: { item: any }) => {
    const date    = new Date(item.date);
    const isToday = date.toDateString() === today.toDateString();
    const tc      = TYPE_COLORS[item.type] || { bg: '#f1f5f9', text: '#64748b' };
    return (
      <View style={[s.card, isToday && s.cardToday]}>
        <View style={[s.dateBox, isToday && s.dateBoxToday]}>
          <Text style={[s.dateDay, isToday && { color: '#fff' }]}>{date.getDate()}</Text>
          <Text style={[s.dateMon, isToday && { color: 'rgba(255,255,255,.75)' }]}>
            {date.toLocaleDateString('fr-FR', { month: 'short' })}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.eventTitle} numberOfLines={1}>{item.titre}</Text>
          {item.description ? <Text style={s.eventSub} numberOfLines={1}>{item.description}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 }}>
            <View style={{ backgroundColor: tc.bg, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: tc.text, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>{item.type}</Text>
            </View>
            {isToday && (
              <View style={{ backgroundColor: '#eff6ff', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: NAVY_LT, fontSize: 10, fontWeight: '700' }}>Aujourd'hui</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root}>

      {/* ── Hero ── */}
      <View style={s.hero}>
        <View style={s.heroStripe} />
        <View style={s.heroBody}>
          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <Ionicons name="calendar" size={24} color={BLUE_PAL} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>Calendrier</Text>
              <Text style={s.heroSub}>
                {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>
          </View>

          {/* stats row */}
          <View style={s.statsRow}>
            {[
              { num: String(upcoming.length), lbl: 'À venir'     },
              { num: String(todayCount),       lbl: "Aujourd'hui" },
              { num: String(thisWeekCount),    lbl: 'Cette semaine'},
              { num: String(upcoming.filter(e => e.type === 'projet').length), lbl: 'Projets' },
            ].map((st, i, arr) => (
              <View key={st.lbl} style={[s.statCell, i < arr.length - 1 && s.statBorder]}>
                <Text style={s.statNum}>{st.num}</Text>
                <Text style={s.statLbl}>{st.lbl}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Liste ── */}
      {upcoming.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="calendar-outline" size={32} color={BLUE_TXT} />
          </View>
          <Text style={s.emptyText}>Aucun événement à venir</Text>
        </View>
      ) : (
        <FlatList
          data={upcoming}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderEvent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={NAVY_LT} />}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          ListHeaderComponent={
            <Text style={s.listHeader}>Événements à venir</Text>
          }
        />
      )}

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  hero:       { backgroundColor: NAVY },
  heroStripe: { height: 4, backgroundColor: NAVY_LT },
  heroBody:   { paddingTop: 20, paddingHorizontal: 20 },
  heroTop:    { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  heroIcon: {
    width: 52, height: 52, borderRadius: 13,
    backgroundColor: NAVY_MID,
    borderWidth: 1.5, borderColor: NAVY_LT,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#E6F1FB', marginBottom: 3 },
  heroSub:   { fontSize: 12, fontWeight: '500', color: BLUE_TXT, textTransform: 'capitalize' },

  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: NAVY_MID,
    marginHorizontal: -20,
  },
  statCell:   { flex: 1, paddingVertical: 12, paddingLeft: 14, alignItems: 'flex-start' },
  statBorder: { borderRightWidth: 1, borderRightColor: NAVY_MID },
  statNum:    { fontSize: 15, fontWeight: '800', color: BLUE_PAL, marginBottom: 2 },
  statLbl:    { fontSize: 8, fontWeight: '700', color: BLUE_TXT, textTransform: 'uppercase', letterSpacing: 0.5 },

  listHeader: { fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 },

  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 12, padding: 14, gap: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
  },
  cardToday: { borderLeftWidth: 3, borderLeftColor: NAVY_LT },

  dateBox: {
    width: 46, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eff6ff', borderRadius: 10, paddingVertical: 7,
    borderWidth: 0.5, borderColor: '#bfdbfe',
  },
  dateBoxToday: { backgroundColor: NAVY_LT, borderColor: NAVY_LT },
  dateDay:  { fontSize: 20, fontWeight: '800', color: NAVY_LT },
  dateMon:  { fontSize: 10, color: NAVY_LT, fontWeight: '700', textTransform: 'uppercase' },

  eventTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  eventSub:   { fontSize: 12, color: '#6b7280', marginTop: 2 },

  empty:     { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
});