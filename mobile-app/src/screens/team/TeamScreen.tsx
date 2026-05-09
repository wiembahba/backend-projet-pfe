import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, SafeAreaView, ActivityIndicator,
  StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { Colors, ROLES } from '../../constants/theme';

/* ── couleurs navy (identiques au ProfileScreen) ── */
const NAVY     = '#042C53';
const NAVY_MID = '#0C447C';
const NAVY_LT  = '#185FA5';
const BLUE_TXT = '#378ADD';
const BLUE_PAL = '#B5D4F4';

/* ── badge rôle ── */
const ROLE_MAP: Record<string, { bg: string; text: string }> = {
  admin:       { bg: NAVY_LT,  text: BLUE_PAL  },
  chef_projet: { bg: '#0a3d6b', text: '#7ec8f7' },
  employe:     { bg: '#0f4d2e', text: '#6ee7b7' },
};

function RoleBadge({ role }: { role: string }) {
  const st = ROLE_MAP[role] || { bg: '#374151', text: '#d1d5db' };
  return (
    <View style={{ backgroundColor: st.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: st.text, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {ROLES[role] || role}
      </Text>
    </View>
  );
}

export default function TeamScreen() {
  const { token } = useAuth();
  const [membres, setMembres]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const r = await apiFetch('/users', token);
      setMembres(r.users || r.data || r.utilisateurs || []);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || "Impossible de charger l'équipe");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={NAVY_LT} size="large" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.root}>

      {/* ── Hero ── */}
      <View style={s.hero}>
        <View style={s.heroStripe} />
        <View style={s.heroBody}>
          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <Ionicons name="people" size={24} color={BLUE_PAL} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>Équipe</Text>
              <Text style={s.heroSub}>
                {membres.length} membre{membres.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* stats row */}
          <View style={s.statsRow}>
            {[
              { num: String(membres.length),                                              lbl: 'Total'       },
              { num: String(membres.filter(m => m.role === 'admin').length),              lbl: 'Admins'      },
              { num: String(membres.filter(m => m.role === 'chef_projet').length),        lbl: 'Chefs proj.' },
              { num: String(membres.filter(m => m.role === 'employe').length),            lbl: 'Employés'    },
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
      <FlatList
        data={membres}
        keyExtractor={i => String(i.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={NAVY_LT}
          />
        }
        renderItem={({ item }) => {
          const initials = [item.prenom?.[0], item.nom?.[0]]
            .filter(Boolean).join('').toUpperCase() || '?';
          return (
            <View style={s.card}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.prenom} {item.nom}</Text>
                <Text style={s.email} numberOfLines={1}>{item.email}</Text>
                {item.department ? (
                  <Text style={s.dept} numberOfLines={1}>{item.department}</Text>
                ) : null}
              </View>
              <RoleBadge role={item.role} />
            </View>
          );
        }}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        ListHeaderComponent={
          membres.length > 0
            ? <Text style={s.listHeader}>Membres</Text>
            : null
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="people-outline" size={32} color={BLUE_TXT} />
            </View>
            <Text style={s.emptyText}>Aucun membre trouvé</Text>
          </View>
        }
      />

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  /* hero */
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
  heroSub:   { fontSize: 12, fontWeight: '600', color: BLUE_TXT },

  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: NAVY_MID,
    marginHorizontal: -20,
  },
  statCell:   { flex: 1, paddingVertical: 12, paddingLeft: 16, alignItems: 'flex-start' },
  statBorder: { borderRightWidth: 1, borderRightColor: NAVY_MID },
  statNum:    { fontSize: 15, fontWeight: '800', color: BLUE_PAL, marginBottom: 2 },
  statLbl:    { fontSize: 8, fontWeight: '700', color: BLUE_TXT, textTransform: 'uppercase', letterSpacing: 0.5 },

  /* list */
  listHeader: {
    fontSize: 10, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: 8,
  },

  /* card */
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 11,
    backgroundColor: '#eff6ff',
    borderWidth: 1, borderColor: '#bfdbfe',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: NAVY_LT },
  name:       { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  email:      { fontSize: 12, color: '#6b7280', marginTop: 2 },
  dept:       { fontSize: 11, color: '#9ca3af', marginTop: 1 },

  /* empty */
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
});