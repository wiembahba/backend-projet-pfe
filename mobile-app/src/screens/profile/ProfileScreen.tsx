import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet,
  TouchableOpacity, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { T, ROLE_COLORS } from '../../constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const rc = ROLE_COLORS[user?.role || 'employe'];

  const handleLogout = async () => {
    // على الويب Alert.alert ما تشتغلش صح — نستعملو confirm عوضها
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Voulez-vous vous déconnecter ?')
      : true; // على mobile نستعمل Alert عادي

    if (!confirmed) return;

    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLoggingOut(false);
    }
  };

  const infoItems = [
    { icon: 'person-outline',   label: 'Nom complet', value: user?.name },
    { icon: 'mail-outline',     label: 'Email',       value: user?.email },
    { icon: 'business-outline', label: 'Département', value: user?.department || '—' },
    { icon: 'shield-outline',   label: 'Rôle',        value: rc.label },
  ];

  const accessItems = [
    { label: 'Tableau de bord',     access: true },
    { label: 'Projets',             access: user?.role !== 'admin' },
    { label: 'Tâches',              access: user?.role !== 'admin' },
    { label: 'Calendrier',          access: true },
    { label: 'Équipe',              access: user?.role === 'admin' || user?.role === 'chef_projet' },
    { label: 'Analyse des risques', access: user?.role === 'chef_projet' },
    { label: 'Utilisateurs',        access: user?.role === 'admin' },
  ];

  const stats = [
    { num: '14',    lbl: 'Projets'    },
    { num: '3',     lbl: 'Équipes'    },
    { num: '98%',   lbl: 'Complétion' },
    { num: '2 ans', lbl: 'Ancienneté' },
  ];

  return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={s.heroStripe} />
          <View style={s.heroBody}>

            {/* avatar + name */}
            <View style={s.heroTop}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{user?.name?.[0]?.toUpperCase() ?? 'U'}</Text>
              </View>
              <View style={s.heroInfo}>
                <Text style={s.heroName}>{user?.name}</Text>
                <View style={s.heroMeta}>
                  <View style={s.roleBadge}>
                    <Text style={s.roleBadgeText}>{rc.label}</Text>
                  </View>
                  {user?.department ? (
                    <Text style={s.heroDept}>{user.department}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* stats row */}
            <View style={s.statsRow}>
              {stats.map((st, i) => (
                <View key={st.lbl} style={[s.statCell, i < stats.length - 1 && s.statBorder]}>
                  <Text style={s.statNum}>{st.num}</Text>
                  <Text style={s.statLbl}>{st.lbl}</Text>
                </View>
              ))}
            </View>

          </View>
        </View>

        {/* ── Informations ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Informations</Text>
          <View style={s.card}>
            {infoItems.map((item, i) => (
              <View
                key={item.label}
                style={[s.infoRow, i < infoItems.length - 1 && s.rowSep]}
              >
                <View style={s.infoIcon}>
                  <Ionicons name={item.icon as any} size={14} color="#185FA5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.infoLabel}>{item.label}</Text>
                  <Text style={s.infoValue}>{item.value || '—'}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Mes accès ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Mes accès</Text>
          <View style={s.card}>
            {accessItems.map((item, i) => (
              <View
                key={item.label}
                style={[s.infoRow, i < accessItems.length - 1 && s.rowSep]}
              >
                <Ionicons
                  name={item.access ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={item.access ? '#16a34a' : '#d1d5db'}
                />
                <Text style={[s.infoValue, { marginLeft: 10, color: item.access ? T.slate900 : T.slate300 }]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Session / Logout ── */}
        <View style={[s.section, { marginBottom: 40 }]}>
          {/* session bar */}
          <View style={s.sessionBar}>
            <View style={s.onlineDot} />
            <Text style={s.sessionText}>
              Connecté en tant que{' '}
              <Text style={s.sessionBold}>{user?.name}</Text>
            </Text>
          </View>

          {/* logout button */}
          <TouchableOpacity
            style={[s.logoutBtn, loggingOut && { opacity: 0.6 }]}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.75}
          >
            {loggingOut
              ? <ActivityIndicator color="#dc2626" size="small" />
              : <Ionicons name="log-out-outline" size={17} color="#dc2626" />
            }
            <Text style={s.logoutText}>
              {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ─────────────── styles ─────────────── */
const NAVY     = '#042C53';
const NAVY_MID = '#0C447C';
const NAVY_LT  = '#185FA5';
const BLUE_TXT = '#378ADD';
const BLUE_PAL = '#B5D4F4';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  hero:       { backgroundColor: NAVY, marginBottom: 0 },
  heroStripe: { height: 4, backgroundColor: NAVY_LT },
  heroBody:   { paddingTop: 20, paddingHorizontal: 20 },
  heroTop:    { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },

  avatar: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: NAVY_MID,
    borderWidth: 1.5, borderColor: NAVY_LT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: BLUE_PAL, fontSize: 22, fontWeight: '800' },

  heroInfo:  { flex: 1 },
  heroName:  { fontSize: 17, fontWeight: '800', color: '#E6F1FB', marginBottom: 6 },
  heroMeta:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  roleBadge: { backgroundColor: NAVY_LT, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: BLUE_PAL, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroDept:  { fontSize: 12, fontWeight: '600', color: BLUE_TXT },

  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: NAVY_MID,
    marginHorizontal: -20,
  },
  statCell:   { flex: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'flex-start', paddingLeft: 16 },
  statBorder: { borderRightWidth: 1, borderRightColor: NAVY_MID },
  statNum:    { fontSize: 15, fontWeight: '800', color: BLUE_PAL, marginBottom: 2 },
  statLbl:    { fontSize: 8, fontWeight: '700', color: BLUE_TXT, textTransform: 'uppercase', letterSpacing: 0.5 },

  section:      { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: 8,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  infoRow:  { flexDirection: 'row', alignItems: 'center', padding: 12 },
  rowSep:   { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoIcon: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  infoLabel: { fontSize: 10, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: '500', color: '#1f2937' },

  sessionBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 10, borderWidth: 0.5, borderColor: '#e5e7eb',
    paddingVertical: 12, paddingHorizontal: 14,
    marginBottom: 10,
  },
  onlineDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10b981' },
  sessionText:  { fontSize: 12, color: '#6b7280', flex: 1, flexWrap: 'wrap' },
  sessionBold:  { fontWeight: '700', color: '#1f2937' },

  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.07)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 10, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
});