import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';

const NAVY     = '#042C53';
const NAVY_MID = '#0C447C';
const NAVY_LT  = '#185FA5';
const BLUE_TXT = '#378ADD';
const BLUE_PAL = '#B5D4F4';

const ROLES = [
  { value: 'employe',     label: 'Employé',        icon: 'person-outline'   as const },
  { value: 'chef_projet', label: 'Chef de projet',  icon: 'briefcase-outline' as const },
  { value: 'admin',       label: 'Admin',            icon: 'shield-outline'   as const },
];

const ROLE_ACTIVE: Record<string, { bg: string; border: string; text: string }> = {
  employe:     { bg: '#0f4d2e', border: '#16a34a', text: '#6ee7b7' },
  chef_projet: { bg: NAVY_MID,  border: NAVY_LT,   text: BLUE_PAL  },
  admin:       { bg: '#7c1d1d', border: '#dc2626',  text: '#fca5a5' },
};

export default function CreateUserScreen() {
  const { token }  = useAuth();
  const navigation = useNavigation<any>();

  const [form, setForm] = useState({
    nom_complet: '', email: '', password: '',
    role: 'employe', departement: '', poste: '', telephone: '',
  });
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

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
    { key: 'nom_complet', label: 'Nom complet',  placeholder: 'Jean Dupont',             type: 'default',       required: true  },
    { key: 'email',       label: 'Email',         placeholder: 'jean@maisonweb.com',       type: 'email-address', required: true  },
    { key: 'departement', label: 'Département',   placeholder: 'Développement',            type: 'default',       required: false },
    { key: 'poste',       label: 'Poste',         placeholder: 'Développeur Frontend',     type: 'default',       required: false },
    { key: 'telephone',   label: 'Téléphone',     placeholder: '0612345678',               type: 'phone-pad',     required: false },
  ] as const;

  return (
    <SafeAreaView style={s.root}>

      {/* ── Hero ── */}
      <View style={s.hero}>
        <View style={s.heroStripe} />
        <View style={s.heroBody}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={BLUE_PAL} />
            <Text style={s.backText}>Retour</Text>
          </TouchableOpacity>
          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <Ionicons name="person-add" size={24} color={BLUE_PAL} />
            </View>
            <View>
              <Text style={s.heroTitle}>Nouvel utilisateur</Text>
              <Text style={s.heroSub}>Créer un compte pour un membre</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* ── Rôle ── */}
        <Text style={s.sectionTitle}>Rôle</Text>
        <View style={s.roleRow}>
          {ROLES.map(r => {
            const active = form.role === r.value;
            const ac     = ROLE_ACTIVE[r.value];
            return (
              <TouchableOpacity
                key={r.value}
                style={[s.roleBtn, active && { backgroundColor: ac.bg, borderColor: ac.border }]}
                onPress={() => update('role', r.value)}
                activeOpacity={0.8}
              >
                <Ionicons name={r.icon} size={16} color={active ? ac.text : '#6b7280'} />
                <Text style={[s.roleBtnText, active && { color: ac.text, fontWeight: '700' }]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Informations ── */}
        <Text style={s.sectionTitle}>Informations</Text>
        <View style={s.card}>
          {fields.map((f, i) => (
            <View key={f.key} style={[s.fieldRow, i < fields.length - 1 && s.fieldSep]}>
              <Text style={s.fieldLabel}>
                {f.label}{f.required ? <Text style={{ color: '#dc2626' }}> *</Text> : ''}
              </Text>
              <TextInput
                style={s.input}
                value={form[f.key]}
                onChangeText={v => update(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor="#d1d5db"
                keyboardType={f.type as any}
                autoCapitalize={f.key === 'email' ? 'none' : 'words'}
              />
            </View>
          ))}

          {/* password séparé pour le eye toggle */}
          <View style={[s.fieldRow, s.fieldSep]}>
            <Text style={s.fieldLabel}>Mot de passe <Text style={{ color: '#dc2626' }}>*</Text></Text>
            <View style={s.pwRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={form.password}
                onChangeText={v => update('password', v)}
                placeholder="Minimum 6 caractères"
                placeholderTextColor="#d1d5db"
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPw(p => !p)} style={s.eyeBtn}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Créer ── */}
        <TouchableOpacity
          style={[s.createBtn, loading && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color={BLUE_PAL} />
            : <>
                <Ionicons name="checkmark-circle-outline" size={18} color={BLUE_PAL} />
                <Text style={s.createBtnText}>Créer l'utilisateur</Text>
              </>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  hero:       { backgroundColor: NAVY },
  heroStripe: { height: 4, backgroundColor: NAVY_LT },
  heroBody:   { paddingTop: 14, paddingHorizontal: 20, paddingBottom: 20 },
  backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, alignSelf: 'flex-start' },
  backText:   { color: BLUE_PAL, fontWeight: '600', fontSize: 13 },
  heroTop:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: {
    width: 52, height: 52, borderRadius: 13,
    backgroundColor: NAVY_MID,
    borderWidth: 1.5, borderColor: NAVY_LT,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#E6F1FB', marginBottom: 3 },
  heroSub:   { fontSize: 12, fontWeight: '500', color: BLUE_TXT },

  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 16, marginBottom: 8 },

  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  roleBtnText: { fontSize: 11, fontWeight: '500', color: '#6b7280' },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#e5e7eb', overflow: 'hidden' },

  fieldRow: { padding: 14 },
  fieldSep: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, color: '#1f2937',
  },

  pwRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 9, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: NAVY, borderWidth: 1, borderColor: NAVY_LT,
    borderRadius: 12, paddingVertical: 15, marginTop: 20,
  },
  createBtnText: { color: BLUE_PAL, fontWeight: '800', fontSize: 15 },
});