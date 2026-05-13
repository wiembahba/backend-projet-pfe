import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { ROLE_COLORS } from '../../constants/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// THEMES — identiques au Dashboard
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
  rowSep:    'rgba(255,255,255,0.06)',
  iconBg:    'rgba(29,111,216,0.20)',
  iconColor: '#63b3ed',
  dotColor:  '#4fd1c5',
  logoutBg:  'rgba(245,101,101,0.10)',
  logoutBdr: 'rgba(245,101,101,0.22)',
  logoutTxt: '#fc8181',
  accessOn:  '#68d391',
  accessOff: 'rgba(255,255,255,0.18)',
  statBdr:   'rgba(255,255,255,0.08)',
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
  rowSep:    '#f3f4f6',
  iconBg:    '#eff6ff',
  iconColor: '#185FA5',
  dotColor:  '#10b981',
  logoutBg:  'rgba(239,68,68,0.07)',
  logoutBdr: 'rgba(239,68,68,0.20)',
  logoutTxt: '#dc2626',
  accessOn:  '#16a34a',
  accessOff: '#d1d5db',
  statBdr:   '#0C447C',
};

type Theme = typeof DARK;

// ═══════════════════════════════════════════════════════════════════════════════
// THEME TOGGLE BUTTON
// ═══════════════════════════════════════════════════════════════════════════════
function ThemeToggle({ isDark, toggle, t }: { isDark: boolean; toggle: () => void; t: Theme }) {
  return (
    <TouchableOpacity
      onPress={toggle}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: t.dateBg, borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 1, borderColor: t.dateBdr,
      }}
    >
      <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={13} color={t.dateNum} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: t.dateNum }}>
        {isDark ? 'Dark' : 'Light'}
      </Text>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isDark, setIsDark]         = useState(true);

  const t  = isDark ? DARK : LIGHT;
  const rc = ROLE_COLORS[user?.role || 'employe'];

  const handleLogout = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Voulez-vous vous déconnecter ?')
      : true;
    if (!confirmed) return;
    setLoggingOut(true);
    try { await logout(); } catch { setLoggingOut(false); }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={{ backgroundColor: t.heroBg }}>
          <View style={{ height: 3, backgroundColor: t.stripe }} />
          <View style={{ paddingTop: 20, paddingHorizontal: 20 }}>

            {/* Top row: avatar + info + toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <View style={{
                width: 56, height: 56, borderRadius: 14,
                backgroundColor: t.avBg, borderWidth: 1.5, borderColor: t.avBorder,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: t.avText, fontSize: 22, fontWeight: '800' }}>
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: t.textPri, marginBottom: 6 }}>
                  {user?.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: t.badgeBg, borderWidth: 1, borderColor: t.badgeBdr, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: t.badgeTxt, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {rc.label}
                    </Text>
                  </View>
                  {user?.department ? (
                    <Text style={{ fontSize: 12, fontWeight: '600', color: t.dateMon }}>{user.department}</Text>
                  ) : null}
                </View>
              </View>

              <ThemeToggle isDark={isDark} toggle={() => setIsDark(v => !v)} t={t} />
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: t.statBdr, marginHorizontal: -20 }}>
              {stats.map((st, i) => (
                <View
                  key={st.lbl}
                  style={{
                    flex: 1, paddingVertical: 12, paddingLeft: 16, alignItems: 'flex-start',
                    ...(i < stats.length - 1 ? { borderRightWidth: 1, borderRightColor: t.statBdr } : {}),
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: t.avText, marginBottom: 2 }}>{st.num}</Text>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: t.dateMon, textTransform: 'uppercase', letterSpacing: 0.5 }}>{st.lbl}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Informations ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>
            Informations
          </Text>
          <View style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }}>
            {infoItems.map((item, i) => (
              <View
                key={item.label}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 12,
                  ...(i < infoItems.length - 1 ? { borderBottomWidth: 1, borderBottomColor: t.rowSep } : {}),
                }}
              >
                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: t.iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name={item.icon as any} size={14} color={t.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: t.textMuted, marginBottom: 2 }}>{item.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: t.textPri }}>{item.value || '—'}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Mes accès ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>
            Mes accès
          </Text>
          <View style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }}>
            {accessItems.map((item, i) => (
              <View
                key={item.label}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
                  ...(i < accessItems.length - 1 ? { borderBottomWidth: 1, borderBottomColor: t.rowSep } : {}),
                }}
              >
                <Ionicons
                  name={item.access ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={item.access ? t.accessOn : t.accessOff}
                />
                <Text style={{ fontSize: 13, fontWeight: '500', color: item.access ? t.textPri : t.textMuted }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Session / Logout ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, marginBottom: 40 }}>
          {/* Session bar */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: t.surface, borderRadius: 12,
            borderWidth: 1, borderColor: t.border,
            paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10,
          }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.dotColor }} />
            <Text style={{ fontSize: 12, color: t.textSec, flex: 1, flexWrap: 'wrap' }}>
              Connecté en tant que{' '}
              <Text style={{ fontWeight: '700', color: t.textPri }}>{user?.name}</Text>
            </Text>
          </View>

          {/* Logout button */}
          <TouchableOpacity
            style={{
              backgroundColor: t.logoutBg, borderWidth: 1, borderColor: t.logoutBdr,
              borderRadius: 12, paddingVertical: 13,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loggingOut ? 0.6 : 1,
            }}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.75}
          >
            {loggingOut
              ? <ActivityIndicator color={t.logoutTxt} size="small" />
              : <Ionicons name="log-out-outline" size={17} color={t.logoutTxt} />
            }
            <Text style={{ color: t.logoutTxt, fontWeight: '700', fontSize: 14 }}>
              {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}