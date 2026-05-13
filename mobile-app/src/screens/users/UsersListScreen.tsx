import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, SafeAreaView, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { ROLES } from '../../constants/theme';

// ─── Themes ───────────────────────────────────────────────────────────────────
const DARK = {
  bg:           '#0a0f1e',
  surfaceSolid: '#0d1b3e',
  surface:      'rgba(255,255,255,0.05)',
  border:       'rgba(255,255,255,0.09)',
  stripe:       '#1d6fd8',
  textPri:      '#e8f4fd',
  textSec:      'rgba(255,255,255,0.55)',
  textMuted:    'rgba(255,255,255,0.30)',
  iconBg:       'rgba(29,111,216,0.20)',
  iconColor:    '#63b3ed',
  badgeBdr:     'rgba(99,179,237,0.30)',
  badgeTxt:     '#90cdf4',
  inputBg:      'rgba(255,255,255,0.06)',
  inputBdr:     'rgba(255,255,255,0.12)',
  cardShadow:   '#000',
  toggleBg:     'rgba(29,111,216,0.20)',
  toggleBdr:    'rgba(99,179,237,0.30)',
  toggleTxt:    '#90cdf4',
  saveBg:       '#1d6fd8',
  deleteBdr:    'rgba(190,18,60,0.30)',
  deleteBg:     'rgba(190,18,60,0.12)',
  deleteTxt:    '#fca5a5',
  statBg:       'rgba(255,255,255,0.05)',
  avatarBg:     '#1d6fd8',
  deptBg:       'rgba(255,255,255,0.08)',
  deptTxt:      'rgba(255,255,255,0.45)',
};

const LIGHT = {
  bg:           '#f1f5f9',
  surfaceSolid: '#ffffff',
  surface:      '#ffffff',
  border:       '#e2e8f0',
  stripe:       '#1e40af',
  textPri:      '#0f172a',
  textSec:      '#475569',
  textMuted:    '#94a3b8',
  iconBg:       '#eff6ff',
  iconColor:    '#1e40af',
  badgeBdr:     '#bfdbfe',
  badgeTxt:     '#1e40af',
  inputBg:      '#f8fafc',
  inputBdr:     '#e2e8f0',
  cardShadow:   '#000',
  toggleBg:     '#dbeafe',
  toggleBdr:    '#bfdbfe',
  toggleTxt:    '#1e40af',
  saveBg:       '#0c1a3a',
  deleteBdr:    '#fecdd3',
  deleteBg:     '#fff1f2',
  deleteTxt:    '#e11d48',
  statBg:       '#ffffff',
  avatarBg:     '#1e40af',
  deptBg:       '#f1f5f9',
  deptTxt:      '#64748b',
};

type Theme = typeof DARK;

// ─── Role colors ──────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, {
  lightBg: string; lightBdr: string; lightTxt: string;
  darkBg: string;  darkBdr: string;  darkTxt: string;
}> = {
  admin: {
    lightBg: '#dbeafe', lightBdr: '#bfdbfe', lightTxt: '#1e40af',
    darkBg:  'rgba(29,111,216,0.28)', darkBdr: 'rgba(99,179,237,0.30)', darkTxt: '#90cdf4',
  },
  chef_projet: {
    lightBg: '#ede9fe', lightBdr: '#c4b5fd', lightTxt: '#5b21b6',
    darkBg:  'rgba(139,92,246,0.22)', darkBdr: 'rgba(167,139,250,0.35)', darkTxt: '#c4b5fd',
  },
  employe: {
    lightBg: '#dcfce7', lightBdr: '#86efac', lightTxt: '#15803d',
    darkBg:  'rgba(34,197,94,0.15)',  darkBdr: 'rgba(34,197,94,0.30)',   darkTxt: '#86efac',
  },
};

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function ThemeToggle({ isDark, toggle, t }: { isDark: boolean; toggle: () => void; t: Theme }) {
  return (
    <TouchableOpacity
      onPress={toggle}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: t.toggleBg, borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 1, borderColor: t.toggleBdr,
      }}
    >
      <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={13} color={t.toggleTxt} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: t.toggleTxt }}>
        {isDark ? 'Dark' : 'Light'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role, isDark }: { role: string; isDark: boolean }) {
  const c = ROLE_COLORS[role] || {
    lightBg: '#f1f5f9', lightBdr: '#e2e8f0', lightTxt: '#475569',
    darkBg: 'rgba(255,255,255,0.08)', darkBdr: 'rgba(255,255,255,0.15)', darkTxt: 'rgba(255,255,255,0.55)',
  };
  return (
    <View style={{
      backgroundColor: isDark ? c.darkBg : c.lightBg,
      borderRadius: 20, borderWidth: 1,
      borderColor: isDark ? c.darkBdr : c.lightBdr,
      paddingHorizontal: 9, paddingVertical: 3,
    }}>
      <Text style={{
        fontSize: 10, fontWeight: '700',
        color: isDark ? c.darkTxt : c.lightTxt,
        textTransform: 'uppercase', letterSpacing: 0.4,
      }}>
        {ROLES[role] || role}
      </Text>
    </View>
  );
}

// ─── User Card ────────────────────────────────────────────────────────────────
function UserCard({ item, isDark, t, onDelete }: {
  item: any; isDark: boolean; t: Theme; onDelete: () => void;
}) {
  const initials = (item.nom_complet?.[0] || item.prenom?.[0] || item.nom?.[0] || '?').toUpperCase();
  const fullName = item.nom_complet || `${item.prenom || ''} ${item.nom || ''}`.trim();

  return (
    <View style={{
      backgroundColor: t.surface,
      borderRadius: 16, padding: 14,
      borderWidth: 1, borderColor: t.border,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      shadowColor: t.cardShadow, shadowOpacity: 0.07,
      shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
    }}>
      {/* Avatar */}
      <View style={{
        width: 44, height: 44, borderRadius: 11,
        backgroundColor: t.avatarBg,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{initials}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: t.textPri }}>{fullName}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <Ionicons name="mail-outline" size={11} color={t.textMuted} />
          <Text style={{ fontSize: 12, color: t.textSec }} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          <RoleBadge role={item.role} isDark={isDark} />
          {item.departement ? (
            <View style={{
              backgroundColor: t.deptBg, borderRadius: 20,
              paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{ fontSize: 10, color: t.deptTxt, fontWeight: '500' }}>{item.departement}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Delete */}
      <TouchableOpacity
        onPress={onDelete}
        activeOpacity={0.7}
        style={{
          padding: 9, borderRadius: 10,
          backgroundColor: t.deleteBg,
          borderWidth: 1, borderColor: t.deleteBdr,
        }}
      >
        <Ionicons name="trash-outline" size={15} color={t.deleteTxt} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Stat Cell ────────────────────────────────────────────────────────────────
function StatCell({ num, lbl, last, t }: { num: string; lbl: string; last: boolean; t: Theme }) {
  return (
    <View style={{
      flex: 1, paddingVertical: 14, paddingHorizontal: 16,
      borderRightWidth: last ? 0 : 1,
      borderRightColor: 'rgba(255,255,255,0.08)',
    }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: t.badgeTxt, marginBottom: 2 }}>{num}</Text>
      <Text style={{ fontSize: 9, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {lbl}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function UsersListScreen() {
  const { token }  = useAuth();
  const navigation = useNavigation<any>();
  const [isDark, setIsDark]         = useState(true);
  const [users, setUsers]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = isDark ? DARK : LIGHT;

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
    const name = user.nom_complet || `${user.prenom} ${user.nom}`;
    Alert.alert('Supprimer', `Voulez-vous supprimer ${name} ?`, [
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
    ]);
  };

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={t.stripe} />
      <Text style={{ color: t.textMuted, marginTop: 16, fontSize: 14, fontWeight: '500' }}>
        Chargement des utilisateurs...
      </Text>
    </SafeAreaView>
  );

  const stats = [
    { num: String(users.length),                                       lbl: 'Total'       },
    { num: String(users.filter(u => u.role === 'admin').length),       lbl: 'Admins'      },
    { num: String(users.filter(u => u.role === 'chef_projet').length), lbl: 'Chefs proj.' },
    { num: String(users.filter(u => u.role === 'employe').length),     lbl: 'Employés'    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>

      {/* ── Header ── */}
      <View style={{
        backgroundColor: t.surfaceSolid,
        borderBottomWidth: 1, borderBottomColor: t.border,
      }}>
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16,
        }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, letterSpacing: 1.4, marginBottom: 2, textTransform: 'uppercase' }}>
              ADMINISTRATION
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: t.textPri }}>Utilisateurs</Text>
            <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
              {users.length} compte{users.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Add button */}
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateUser')}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: t.saveBg,
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
              }}
            >
              <Ionicons name="person-add-outline" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Nouveau</Text>
            </TouchableOpacity>
            <ThemeToggle isDark={isDark} toggle={() => setIsDark(v => !v)} t={t} />
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={{
          flexDirection: 'row',
          borderTopWidth: 1, borderTopColor: t.border,
          marginHorizontal: 0,
        }}>
          {stats.map((s, i) => (
            <StatCell key={s.lbl} num={s.num} lbl={s.lbl} last={i === stats.length - 1} t={t} />
          ))}
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={users}
        keyExtractor={i => String(i.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={t.stripe}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        renderItem={({ item }) => (
          <UserCard item={item} isDark={isDark} t={t} onDelete={() => handleDelete(item)} />
        )}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 40 }}
        ListHeaderComponent={
          users.length > 0 ? (
            <Text style={{
              fontSize: 10, fontWeight: '700', color: t.textMuted,
              textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8,
            }}>
              Tous les comptes
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 16,
              backgroundColor: t.iconBg,
              alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
              <Ionicons name="people-outline" size={32} color={t.iconColor} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.textPri, marginBottom: 6 }}>
              Aucun utilisateur trouvé
            </Text>
            <Text style={{ fontSize: 12, color: t.textMuted, textAlign: 'center' }}>
              Créez le premier compte avec le bouton "Nouveau".
            </Text>
          </View>
        }
      />

    </SafeAreaView>
  );
}