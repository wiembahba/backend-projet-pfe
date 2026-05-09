import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, SafeAreaView, ActivityIndicator,
  StyleSheet, RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { ROLES } from '../../constants/theme';

const NAVY     = '#042C53';
const NAVY_MID = '#0C447C';
const NAVY_LT  = '#185FA5';
const BLUE_TXT = '#378ADD';
const BLUE_PAL = '#B5D4F4';

const ROLE_MAP: Record<string, { bg: string; text: string }> = {
  admin:       { bg: NAVY_LT,   text: BLUE_PAL  },
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

export default function UsersListScreen() {
  const { token }   = useAuth();
  const navigation  = useNavigation<any>();
  const [users, setUsers]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const r = await apiFetch('/users', token);
      setUsers(r.users || r.data || r.utilisateurs || []);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => load());
    return unsubscribe;
  }, []);

  const handleDelete = (user: any) => {
    Alert.alert(
      'Supprimer l\'utilisateur',
      `Voulez-vous supprimer ${user.nom_complet || `${user.prenom} ${user.nom}`} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              const r = await apiFetch(`/users/${user.id}`, token, { method: 'DELETE' });
              if (r.success) setUsers(prev => prev.filter(u => u.id !== user.id));
              else Alert.alert('Erreur', r.message || 'Suppression échouée');
            } catch (err: any) {
              Alert.alert('Erreur', err.message);
            }
          },
        },
      ]
    );
  };

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={NAVY_LT} size="large" />
    </SafeAreaView>
  );

  const adminCount = users.filter(u => u.role === 'admin').length;
  const chefCount  = users.filter(u => u.role === 'chef_projet').length;
  const empCount   = users.filter(u => u.role === 'employe').length;

  return (
    <SafeAreaView style={s.root}>

      {/* ── Hero ── */}
      <View style={s.hero}>
        <View style={s.heroStripe} />
        <View style={s.heroBody}>
          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <Ionicons name="person-circle" size={26} color={BLUE_PAL} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>Utilisateurs</Text>
              <Text style={s.heroSub}>{users.length} compte{users.length !== 1 ? 's' : ''}</Text>
            </View>
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => navigation.navigate('CreateUser')}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={15} color={BLUE_PAL} />
              <Text style={s.addBtnText}>Nouveau</Text>
            </TouchableOpacity>
          </View>

          {/* stats row */}
          <View style={s.statsRow}>
            {[
              { num: String(users.length), lbl: 'Total'      },
              { num: String(adminCount),   lbl: 'Admins'     },
              { num: String(chefCount),    lbl: 'Chefs proj.'},
              { num: String(empCount),     lbl: 'Employés'   },
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
        data={users}
        keyExtractor={i => String(i.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={NAVY_LT}
          />
        }
        renderItem={({ item }) => {
          const initials = (item.nom_complet?.[0] || item.prenom?.[0] || item.nom?.[0] || '?').toUpperCase();
          const fullName = item.nom_complet || `${item.prenom || ''} ${item.nom || ''}`.trim();
          return (
            <View style={s.card}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{fullName}</Text>
                <Text style={s.email} numberOfLines={1}>{item.email}</Text>
                <View style={{ marginTop: 6, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <RoleBadge role={item.role} />
                  {item.departement ? (
                    <View style={s.deptBadge}>
                      <Text style={s.deptText}>{item.departement}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)} style={s.deleteBtn} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          );
        }}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        ListHeaderComponent={
          users.length > 0
            ? <Text style={s.listHeader}>Tous les comptes</Text>
            : null
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="people-outline" size={32} color={BLUE_TXT} />
            </View>
            <Text style={s.emptyText}>Aucun utilisateur trouvé</Text>
          </View>
        }
      />

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
  heroSub:   { fontSize: 12, fontWeight: '600', color: BLUE_TXT },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: NAVY_MID,
    borderWidth: 1, borderColor: NAVY_LT,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9,
  },
  addBtnText: { color: BLUE_PAL, fontWeight: '700', fontSize: 12 },

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
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 0.5, borderColor: '#e5e7eb',
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
  deleteBtn:  { padding: 8, borderRadius: 8, backgroundColor: 'rgba(239,68,68,.07)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,.2)' },
  deptBadge:  { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  deptText:   { fontSize: 10, color: '#64748b', fontWeight: '500' },

  empty:     { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
});