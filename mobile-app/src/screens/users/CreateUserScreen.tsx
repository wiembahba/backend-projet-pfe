import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';

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
  sectionBg:    'rgba(255,255,255,0.04)',
  statBg:       'rgba(255,255,255,0.05)',
  avatarBg:     '#1d6fd8',
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
  sectionBg:    '#f8fafc',
  statBg:       '#ffffff',
  avatarBg:     '#1e40af',
};

type Theme = typeof DARK;

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLES_LIST = [
  { value: 'employe',     label: 'Employé',       icon: 'person-outline'    as const },
  { value: 'chef_projet', label: 'Chef de projet', icon: 'briefcase-outline' as const },
  { value: 'admin',       label: 'Admin',           icon: 'shield-outline'    as const },
];

const ROLE_ACTIVE: Record<string, {
  lightBg: string; lightBdr: string; lightTxt: string;
  darkBg: string;  darkBdr: string;  darkTxt: string;
}> = {
  employe: {
    lightBg: '#dcfce7', lightBdr: '#86efac', lightTxt: '#15803d',
    darkBg:  'rgba(34,197,94,0.15)', darkBdr: 'rgba(34,197,94,0.35)', darkTxt: '#86efac',
  },
  chef_projet: {
    lightBg: '#dbeafe', lightBdr: '#bfdbfe', lightTxt: '#1e40af',
    darkBg:  'rgba(29,111,216,0.28)', darkBdr: 'rgba(99,179,237,0.35)', darkTxt: '#90cdf4',
  },
  admin: {
    lightBg: '#fff1f2', lightBdr: '#fecdd3', lightTxt: '#e11d48',
    darkBg:  'rgba(190,18,60,0.18)', darkBdr: 'rgba(252,165,165,0.35)', darkTxt: '#fca5a5',
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CreateUserScreen() {
  const { token }  = useAuth();
  const navigation = useNavigation<any>();
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? DARK : LIGHT;

  const [form, setForm] = useState({
    nom_complet: '', email: '', password: '',
    role: 'employe', departement: '', poste: '', telephone: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const update = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleCreate = async () => {
    if (!form.nom_complet || !form.email || !form.password) {
      Alert.alert('Champs requis', 'Nom, email et mot de passe sont obligatoires');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Minimum 6 caractères requis');
      return;
    }
    setLoading(true);
    try {
      const r = await apiFetch('/users', token, { method: 'POST', body: JSON.stringify(form) });
      if (r.success) {
        Alert.alert('Compte créé', `"${form.nom_complet}" a été ajouté avec succès.`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Erreur', r.message || 'Création échouée');
      }
    } catch (err: any) {
      Alert.alert('Erreur réseau', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'nom_complet', label: 'Nom complet',  placeholder: 'Jean Dupont',          type: 'default',       required: true  },
    { key: 'email',       label: 'Email',         placeholder: 'jean@example.com',      type: 'email-address', required: true  },
    { key: 'departement', label: 'Département',   placeholder: 'Développement',         type: 'default',       required: false },
    { key: 'poste',       label: 'Poste',         placeholder: 'Développeur Frontend',  type: 'default',       required: false },
    { key: 'telephone',   label: 'Téléphone',     placeholder: '0612345678',            type: 'phone-pad',     required: false },
  ] as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>

      {/* ── Header ── */}
      <View style={{
        backgroundColor: t.surfaceSolid,
        borderBottomWidth: 1, borderBottomColor: t.border,
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
      }}>
        {/* Top row: back + toggle */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: t.iconBg, borderRadius: 20,
              paddingHorizontal: 12, paddingVertical: 6,
              borderWidth: 1, borderColor: t.badgeBdr,
            }}
          >
            <Ionicons name="arrow-back" size={14} color={t.toggleTxt} />
            <Text style={{ color: t.toggleTxt, fontWeight: '700', fontSize: 12 }}>Retour</Text>
          </TouchableOpacity>
          <ThemeToggle isDark={isDark} toggle={() => setIsDark(v => !v)} t={t} />
        </View>

        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: t.iconBg,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: t.badgeBdr,
          }}>
            <Ionicons name="person-add" size={22} color={t.iconColor} />
          </View>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 2 }}>
              ADMINISTRATION
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: t.textPri }}>Nouvel utilisateur</Text>
            <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>Créer un compte pour un membre</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Rôle ── */}
        <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10, marginTop: 4 }}>
          Rôle
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {ROLES_LIST.map(r => {
            const active = form.role === r.value;
            const ac     = ROLE_ACTIVE[r.value];
            return (
              <TouchableOpacity
                key={r.value}
                onPress={() => update('role', r.value)}
                activeOpacity={0.8}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                  paddingVertical: 11, borderRadius: 12,
                  borderWidth: 1,
                  backgroundColor: active
                    ? (isDark ? ac.darkBg  : ac.lightBg)
                    : t.surface,
                  borderColor: active
                    ? (isDark ? ac.darkBdr : ac.lightBdr)
                    : t.border,
                }}
              >
                <Ionicons
                  name={r.icon}
                  size={15}
                  color={active ? (isDark ? ac.darkTxt : ac.lightTxt) : t.textMuted}
                />
                <Text style={{
                  fontSize: 11,
                  fontWeight: active ? '700' : '500',
                  color: active ? (isDark ? ac.darkTxt : ac.lightTxt) : t.textMuted,
                }}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Informations ── */}
        <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>
          Informations
        </Text>
        <View style={{
          backgroundColor: t.surface,
          borderRadius: 16, borderWidth: 1, borderColor: t.border,
          overflow: 'hidden',
          shadowColor: t.cardShadow, shadowOpacity: 0.07,
          shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
          marginBottom: 14,
        }}>
          {fields.map((f, i) => (
            <View key={f.key} style={{
              padding: 14,
              borderBottomWidth: i < fields.length - 1 ? 1 : 0,
              borderBottomColor: t.border,
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                {f.label}{f.required ? <Text style={{ color: '#ef4444' }}> *</Text> : ''}
              </Text>
              <TextInput
                style={{
                  backgroundColor: t.inputBg,
                  borderWidth: 1, borderColor: t.inputBdr, borderRadius: 10,
                  paddingHorizontal: 12, paddingVertical: 10,
                  fontSize: 14, color: t.textPri,
                }}
                value={form[f.key]}
                onChangeText={v => update(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor={t.textMuted}
                keyboardType={f.type as any}
                autoCapitalize={f.key === 'email' ? 'none' : 'words'}
              />
            </View>
          ))}

          {/* Password field */}
          <View style={{ padding: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Mot de passe <Text style={{ color: '#ef4444' }}>*</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: t.inputBg,
                  borderWidth: 1, borderColor: t.inputBdr, borderRadius: 10,
                  paddingHorizontal: 12, paddingVertical: 10,
                  fontSize: 14, color: t.textPri,
                }}
                value={form.password}
                onChangeText={v => update('password', v)}
                placeholder="Minimum 6 caractères"
                placeholderTextColor={t.textMuted}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPw(p => !p)}
                style={{
                  paddingHorizontal: 12,
                  backgroundColor: t.inputBg,
                  borderRadius: 10, borderWidth: 1, borderColor: t.inputBdr,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={t.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Créer ── */}
        <TouchableOpacity
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: loading ? t.statBg : t.saveBg,
            borderRadius: 12, paddingVertical: 15,
            opacity: loading ? 0.6 : 1,
          }}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color={t.toggleTxt} />
            : <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                  Créer l'utilisateur
                </Text>
              </>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}