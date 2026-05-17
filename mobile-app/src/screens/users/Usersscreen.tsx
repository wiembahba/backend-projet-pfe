import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator,
  Alert, Modal, FlatList, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, ApiError } from '../../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRole   = 'chef_projet' | 'employe' | 'admin';
type UserStatus = 'Actif' | 'Inactif';

interface User {
  id:                  string;
  nom_complet:         string;
  prenom?:             string;
  email:               string;
  role:                UserRole;
  matricule?:          string;
  telephone?:          string;
  departement?:        string;
  poste?:              string;
  ville?:              string;
  wilaya?:             string;
  adresse?:            string;
  code_postal?:        string;
  date_embauche?:      string;
  date_naissance?:     string;
  lieu_naissance?:     string;
  genre?:              string;
  situation_familiale?: string;
  nombre_enfants?:     number;
  status:              UserStatus;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

const T = {
  bg:      '#0a0f1e',
  surface: 'rgba(255,255,255,0.05)',
  border:  'rgba(255,255,255,0.09)',
  hero:    '#0d1b3e',
  stripe:  '#1d6fd8',
  pri:     '#e8f4fd',
  sec:     'rgba(255,255,255,0.45)',
  muted:   'rgba(255,255,255,0.28)',
  blue:    '#90cdf4',
  sep:     'rgba(255,255,255,0.06)',
  green:   '#68d391',
  red:     '#fc8181',
  amber:   '#f6ad55',
  purple:  '#b794f4',
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin:       'Admin',
  chef_projet: 'Chef de projet',
  employe:     'Employé',
};

const ROLE_BADGE: Record<UserRole, { bg: string; color: string; border: string }> = {
  admin:       { bg: 'rgba(128,90,213,0.25)', color: '#b794f4', border: 'rgba(159,122,234,0.25)' },
  chef_projet: { bg: 'rgba(29,111,216,0.25)', color: '#90cdf4', border: 'rgba(144,205,244,0.25)' },
  employe:     { bg: 'rgba(22,163,74,0.20)',  color: '#68d391', border: 'rgba(104,211,145,0.25)' },
};

const AV_COLOR: Record<UserRole, { bg: string; border: string; color: string }> = {
  admin:       { bg: 'rgba(128,90,213,0.20)', border: 'rgba(159,122,234,0.30)', color: '#b794f4' },
  chef_projet: { bg: 'rgba(29,111,216,0.25)', border: 'rgba(99,179,237,0.35)',  color: '#90cdf4' },
  employe:     { bg: 'rgba(22,163,74,0.20)',  border: 'rgba(104,211,145,0.30)', color: '#68d391' },
};

// ─── Form ────────────────────────────────────────────────────────────────────

const emptyForm = {
  nom_complet:         '',
  prenom:              '',
  email:               '',
  password:            '',
  role:                'employe' as UserRole,
  matricule:           '',
  telephone:           '',
  departement:         '',
  poste:               '',
  ville:               '',
  wilaya:              '',
  adresse:             '',
  code_postal:         '',
  date_embauche:       '',
  date_naissance:      '',
  lieu_naissance:      '',
  genre:               '',
  situation_familiale: '',
  nombre_enfants:      '0',
  __showPersonnel:     '0',
};

const IS = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderWidth: 1,
  borderColor: 'rgba(99,179,237,0.15)',
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: T.pri,
  fontSize: 13,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildBody(form: typeof emptyForm, includePassword: boolean) {
  const body: Record<string, any> = {
    nom_complet:         form.nom_complet,
    prenom:              form.prenom              || null,
    email:               form.email,
    role:                form.role,
    matricule:           form.matricule            || null,
    telephone:           form.telephone            || null,
    departement:         form.departement,
    poste:               form.poste                || null,
    ville:               form.ville                || null,
    wilaya:              form.wilaya               || null,
    adresse:             form.adresse              || null,
    code_postal:         form.code_postal          || null,
    date_embauche:       form.date_embauche        || null,
    date_naissance:      form.date_naissance       || null,
    lieu_naissance:      form.lieu_naissance       || null,
    genre:               form.genre                || null,
    situation_familiale: form.situation_familiale  || null,
    nombre_enfants:      parseInt(form.nombre_enfants) || 0,
  };

  if (includePassword) {
    body.password = form.password;
  } else if (form.password?.trim()) {
    body.password = form.password;
  }

  return body;
}

function handle409(e: unknown, email: string): boolean {
  if (e instanceof ApiError && e.status === 409) {
    Alert.alert(
      'Email déjà utilisé',
      `Un compte avec l'adresse "${email}" existe déjà. Veuillez utiliser une autre adresse email.`,
    );
    return true;
  }
  return false;
}

// ─── Field wrapper ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: T.sec, marginBottom: 6 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

// ─── UserFormModal ────────────────────────────────────────────────────────────

function UserFormModal({
  visible, onClose, onSubmit, initial, isEdit, loading,
}: {
  visible:  boolean;
  onClose:  () => void;
  onSubmit: (form: typeof emptyForm) => void;
  initial:  typeof emptyForm;
  isEdit:   boolean;
  loading:  boolean;
}) {
  const [form, setForm] = useState(initial);

  useEffect(() => { setForm(initial); }, [initial, visible]);

  const set = (k: keyof typeof emptyForm, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={{
            backgroundColor: '#0d1b3e',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            borderWidth: 1, borderColor: 'rgba(99,179,237,0.15)',
            maxHeight: '92%',
          }}>
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
              scrollEventThrottle={16}
            >
              {/* Drag handle */}
              <View style={{
                width: 36, height: 4, borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignSelf: 'center', marginBottom: 20,
              }} />

              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: T.pri }}>
                    {isEdit ? "✏️ Modifier l'utilisateur" : '➕ Créer un utilisateur'}
                  </Text>
                  <Text style={{ fontSize: 12, color: T.sec, marginTop: 3 }}>
                    Remplissez les informations ci-dessous
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                  <Ionicons name="close-circle-outline" size={26} color={T.muted} />
                </TouchableOpacity>
              </View>

              {/* Core fields */}
              <Field label="Nom complet *">
                <TextInput
                  style={IS}
                  value={form.nom_complet}
                  onChangeText={v => set('nom_complet', v)}
                  placeholder="Nom complet"
                  placeholderTextColor={T.muted}
                />
              </Field>

              <Field label="Email *">
                <TextInput
                  style={IS}
                  value={form.email}
                  onChangeText={v => set('email', v)}
                  placeholder="Email"
                  placeholderTextColor={T.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Field>

              <Field label={isEdit ? 'Mot de passe (laisser vide = inchangé)' : 'Mot de passe *'}>
                <TextInput
                  style={IS}
                  value={form.password}
                  onChangeText={v => set('password', v)}
                  placeholder="Mot de passe"
                  placeholderTextColor={T.muted}
                  secureTextEntry
                />
              </Field>

              <Field label="Département *">
                <TextInput
                  style={IS}
                  value={form.departement}
                  onChangeText={v => set('departement', v)}
                  placeholder="Département"
                  placeholderTextColor={T.muted}
                />
              </Field>

              <Field label="Téléphone">
                <TextInput
                  style={IS}
                  value={form.telephone}
                  onChangeText={v => set('telephone', v)}
                  placeholder="Téléphone"
                  placeholderTextColor={T.muted}
                  keyboardType="phone-pad"
                />
              </Field>

              <Field label="Poste">
                <TextInput
                  style={IS}
                  value={form.poste}
                  onChangeText={v => set('poste', v)}
                  placeholder="Poste"
                  placeholderTextColor={T.muted}
                />
              </Field>

              {/* Role selector */}
              <Field label="Rôle">
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(['employe', 'chef_projet'] as const).map(r => {
                    const sel = form.role === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        onPress={() => set('role', r)}
                        activeOpacity={0.7}
                        style={{
                          flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
                          borderWidth: 2,
                          borderColor: sel ? T.blue : 'rgba(255,255,255,0.12)',
                          backgroundColor: sel ? 'rgba(29,111,216,0.18)' : 'rgba(255,255,255,0.04)',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? T.blue : T.sec }}>
                          {r === 'employe' ? 'Employé' : 'Chef de projet'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Field>

              {/* Personal info accordion */}
              <TouchableOpacity
                onPress={() => set('__showPersonnel', form.__showPersonnel === '1' ? '0' : '1')}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 18, marginBottom: 4,
                  paddingVertical: 10, paddingHorizontal: 12,
                  backgroundColor: 'rgba(144,205,244,0.08)',
                  borderRadius: 10, borderWidth: 1,
                  borderColor: 'rgba(99,179,237,0.18)',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: T.blue, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  👤 Informations personnelles
                </Text>
                <Ionicons
                  name={form.__showPersonnel === '1' ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={14}
                  color={T.blue}
                />
              </TouchableOpacity>

              {form.__showPersonnel === '1' && (
                <View style={{ marginTop: 8 }}>
                  <Field label="Date de naissance">
                    <TextInput
                      style={IS}
                      value={form.date_naissance}
                      onChangeText={v => set('date_naissance', v)}
                      placeholder="AAAA-MM-JJ"
                      placeholderTextColor={T.muted}
                    />
                  </Field>
                  <Field label="Lieu de naissance">
                    <TextInput
                      style={IS}
                      value={form.lieu_naissance}
                      onChangeText={v => set('lieu_naissance', v)}
                      placeholder="Ex: Alger"
                      placeholderTextColor={T.muted}
                    />
                  </Field>
                  <Field label="Genre">
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {['Homme', 'Femme', 'Autre'].map(g => {
                        const sel = form.genre === g;
                        return (
                          <TouchableOpacity
                            key={g}
                            onPress={() => set('genre', g)}
                            activeOpacity={0.7}
                            style={{
                              flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
                              borderWidth: 1.5,
                              borderColor: sel ? T.blue : 'rgba(255,255,255,0.12)',
                              backgroundColor: sel ? 'rgba(29,111,216,0.18)' : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: sel ? '700' : '400', color: sel ? T.blue : T.sec }}>
                              {g}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </Field>
                  <Field label="Situation familiale">
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve'].map(s => {
                        const sel = form.situation_familiale === s;
                        return (
                          <TouchableOpacity
                            key={s}
                            onPress={() => set('situation_familiale', s)}
                            activeOpacity={0.7}
                            style={{
                              paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                              borderWidth: 1.5,
                              borderColor: sel ? T.blue : 'rgba(255,255,255,0.12)',
                              backgroundColor: sel ? 'rgba(29,111,216,0.18)' : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: sel ? '700' : '400', color: sel ? T.blue : T.sec }}>
                              {s}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </Field>
                  <Field label="Nombre d'enfants">
                    <TextInput
                      style={IS}
                      value={form.nombre_enfants}
                      onChangeText={v => set('nombre_enfants', v)}
                      placeholder="0"
                      placeholderTextColor={T.muted}
                      keyboardType="numeric"
                    />
                  </Field>
                  <Field label="Adresse">
                    <TextInput
                      style={IS}
                      value={form.adresse}
                      onChangeText={v => set('adresse', v)}
                      placeholder="Rue, numéro, résidence..."
                      placeholderTextColor={T.muted}
                    />
                  </Field>
                  <Field label="Ville">
                    <TextInput
                      style={IS}
                      value={form.ville}
                      onChangeText={v => set('ville', v)}
                      placeholder="Ex: Alger"
                      placeholderTextColor={T.muted}
                    />
                  </Field>
                  <Field label="Wilaya">
                    <TextInput
                      style={IS}
                      value={form.wilaya}
                      onChangeText={v => set('wilaya', v)}
                      placeholder="Ex: Alger"
                      placeholderTextColor={T.muted}
                    />
                  </Field>
                  <Field label="Code postal">
                    <TextInput
                      style={IS}
                      value={form.code_postal}
                      onChangeText={v => set('code_postal', v)}
                      placeholder="Ex: 16000"
                      placeholderTextColor={T.muted}
                      keyboardType="numeric"
                    />
                  </Field>
                  <Field label="Date d'embauche">
                    <TextInput
                      style={IS}
                      value={form.date_embauche}
                      onChangeText={v => set('date_embauche', v)}
                      placeholder="AAAA-MM-JJ"
                      placeholderTextColor={T.muted}
                    />
                  </Field>
                  <Field label="Matricule">
                    <TextInput
                      style={IS}
                      value={form.matricule}
                      onChangeText={v => set('matricule', v)}
                      placeholder="Ex: MW-2024-001"
                      placeholderTextColor={T.muted}
                    />
                  </Field>
                </View>
              )}

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={{
                    flex: 1, padding: 13, borderRadius: 12,
                    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: T.sec, fontWeight: '700', fontSize: 14 }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onSubmit(form)}
                  disabled={loading}
                  activeOpacity={0.7}
                  style={{
                    flex: 2, padding: 13, borderRadius: 12,
                    backgroundColor: loading ? '#94a3b8' : '#1d4ed8',
                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading && <ActivityIndicator color="#fff" size="small" />}
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                    {loading
                      ? (isEdit ? 'Enregistrement...' : 'Création...')
                      : (isEdit ? '💾 Enregistrer' : "✅ Créer l'utilisateur")}
                  </Text>
                </TouchableOpacity>
              </View>

              {!isEdit && (
                <Text style={{ fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 14 }}>
                  📧 Un email de bienvenue sera automatiquement envoyé à l'utilisateur avec ses identifiants.
                </Text>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── UserCard ─────────────────────────────────────────────────────────────────

function UserCard({ user, onEdit, onDelete, onToggle }: {
  user:     User;
  onEdit:   () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const av       = AV_COLOR[user.role];
  const rb       = ROLE_BADGE[user.role];
  const isActive = user.status === 'Actif';

  return (
    <View style={{
      backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
      borderRadius: 16, padding: 14, marginBottom: 10,
    }}>
      {/* Top row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <View style={{
          width: 42, height: 42, borderRadius: 11,
          backgroundColor: av.bg, borderWidth: 1.5, borderColor: av.border,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: av.color }}>
            {user.nom_complet?.[0] ?? 'U'}
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.pri, marginBottom: 3 }} numberOfLines={1}>
            {user.nom_complet}
          </Text>
          {user.prenom ? (
            <Text style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>{user.prenom}</Text>
          ) : null}
          <Text style={{ fontSize: 11, color: T.sec }} numberOfLines={1}>{user.email}</Text>
        </View>

        <View style={{ gap: 4, alignItems: 'flex-end' }}>
          <View style={{
            backgroundColor: rb.bg, borderWidth: 1, borderColor: rb.border,
            borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: rb.color }}>
              {ROLE_LABEL[user.role]}
            </Text>
          </View>
          <View style={{
            backgroundColor: isActive ? 'rgba(22,163,74,0.15)' : 'rgba(255,255,255,0.07)',
            borderWidth: 1,
            borderColor: isActive ? 'rgba(104,211,145,0.20)' : 'rgba(255,255,255,0.10)',
            borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: isActive ? T.green : T.sec }}>
              {user.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Meta row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {user.matricule ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="id-card-outline" size={12} color={T.muted} />
            <Text style={{ fontSize: 11, color: T.sec, fontFamily: 'monospace' }}>{user.matricule}</Text>
          </View>
        ) : null}
        {user.departement ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="business-outline" size={12} color={T.muted} />
            <Text style={{ fontSize: 11, color: T.sec }}>{user.departement}</Text>
          </View>
        ) : null}
        {user.poste ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="briefcase-outline" size={12} color={T.muted} />
            <Text style={{ fontSize: 11, color: T.sec }}>{user.poste}</Text>
          </View>
        ) : null}
      </View>

      {/* Action row */}
      <View style={{ flexDirection: 'row', gap: 6, borderTopWidth: 1, borderTopColor: T.sep, paddingTop: 12 }}>
        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.7}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 5, padding: 8, borderRadius: 8,
            backgroundColor: 'rgba(29,111,216,0.12)', borderWidth: 1, borderColor: 'rgba(144,205,244,0.20)',
          }}
        >
          <Ionicons name="create-outline" size={14} color={T.blue} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: T.blue }}>Modifier</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggle}
          activeOpacity={0.7}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 5, padding: 8, borderRadius: 8,
            backgroundColor: 'rgba(246,173,85,0.10)', borderWidth: 1, borderColor: 'rgba(246,173,85,0.20)',
          }}
        >
          <Ionicons name={isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={14} color={T.amber} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: T.amber }}>
            {isActive ? 'Désactiver' : 'Activer'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDelete}
          activeOpacity={0.7}
          style={{
            padding: 8, borderRadius: 8,
            backgroundColor: 'rgba(252,129,129,0.10)', borderWidth: 1, borderColor: 'rgba(252,129,129,0.20)',
          }}
        >
          <Ionicons name="trash-outline" size={16} color={T.red} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── UsersScreen ──────────────────────────────────────────────────────────────

export default function UsersScreen() {
  const { isAdmin, token } = useAuth();

  const [users,       setUsers]       = useState<User[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState<string>('all');
  const [showCreate,  setShowCreate]  = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg,  setSuccessMsg]  = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/auth/users', token);
      if (data.success) {
        setUsers(
          data.users.map((u: any) => ({
            ...u,
            status: u.status === 1 ? 'Actif' : 'Inactif',
          })),
        );
      }
    } catch (e) {
      console.error('fetchUsers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && token) fetchUsers();
  }, [isAdmin, token]);

  // ── Success toast ──────────────────────────────────────────────────────────

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleCreate = async (form: typeof emptyForm) => {
    if (!form.nom_complet.trim() || !form.email.trim() || !form.password.trim() || !form.departement.trim()) {
      Alert.alert('Champs requis', 'Nom complet, email, mot de passe et département sont obligatoires.');
      return;
    }

    setFormLoading(true);
    try {
      const data = await apiFetch('/auth/users', token, {
        method: 'POST',
        body: JSON.stringify(buildBody(form, true)),
      });

      if (data.success) {
        setShowCreate(false);
        fetchUsers();
        showSuccess(`✅ Utilisateur "${form.nom_complet}" créé avec succès !`);
      } else {
        Alert.alert('Erreur', data.message || 'Erreur lors de la création');
      }
    } catch (e) {
      if (!handle409(e, form.email)) {
        Alert.alert('Erreur', 'Erreur de connexion au serveur');
      }
    } finally {
      setFormLoading(false);
    }
  };

  // ── Update ─────────────────────────────────────────────────────────────────

  const handleUpdate = async (form: typeof emptyForm) => {
    if (!editingUser) return;
    if (!form.nom_complet.trim() || !form.email.trim() || !form.departement.trim()) {
      Alert.alert('Champs requis', 'Nom complet, email et département sont obligatoires.');
      return;
    }

    setFormLoading(true);
    try {
      const data = await apiFetch(`/auth/users/${editingUser.id}`, token, {
        method: 'PUT',
        body: JSON.stringify(buildBody(form, false)),
      });

      if (data.success) {
        setShowEdit(false);
        setEditingUser(null);
        fetchUsers();
        showSuccess(`✅ Utilisateur "${form.nom_complet}" modifié avec succès !`);
      } else {
        Alert.alert('Erreur', data.message || 'Erreur lors de la modification');
      }
    } catch (e) {
      if (!handle409(e, form.email)) {
        Alert.alert('Erreur', 'Erreur de connexion au serveur');
      }
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Confirmer la suppression', `Supprimer "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            const data = await apiFetch(`/auth/users/${id}`, token, { method: 'DELETE' });
            if (data.success) {
              fetchUsers();
              showSuccess(`✅ Utilisateur "${name}" supprimé`);
            } else {
              Alert.alert('Erreur', data.message || 'Erreur lors de la suppression');
            }
          } catch (e) {
            Alert.alert('Erreur', 'Erreur de connexion');
          }
        },
      },
    ]);
  };

  // ── Toggle status ──────────────────────────────────────────────────────────

  const handleToggle = async (user: User) => {
    const newStatus = user.status === 'Actif' ? 0 : 1;
    try {
      await apiFetch(`/auth/users/${user.id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchUsers();
      showSuccess('✅ Statut mis à jour');
    } catch (e) {
      Alert.alert('Erreur', 'Erreur de connexion');
    }
  };

  // ── Filters ────────────────────────────────────────────────────────────────

  const filtered = users.filter(u => {
    const q      = search.toLowerCase();
    const matchQ =
      u.nom_complet?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      (u.matricule ?? '').toLowerCase().includes(q);
    const matchR = roleFilter === 'all' || u.role === roleFilter;
    return matchQ && matchR;
  });

  const FILTERS = [
    { value: 'all',         label: 'Tous',            count: users.length },
    { value: 'employe',     label: 'Employés',        count: users.filter(u => u.role === 'employe').length },
    { value: 'chef_projet', label: 'Chefs de projet', count: users.filter(u => u.role === 'chef_projet').length },
  ];

  // ── Edit initial values ────────────────────────────────────────────────────

  const editInitial: typeof emptyForm = editingUser
    ? {
        nom_complet:         editingUser.nom_complet,
        prenom:              editingUser.prenom              ?? '',
        email:               editingUser.email,
        password:            '',
        role:                editingUser.role,
        matricule:           editingUser.matricule           ?? '',
        telephone:           editingUser.telephone           ?? '',
        departement:         editingUser.departement         ?? '',
        poste:               editingUser.poste               ?? '',
        ville:               editingUser.ville               ?? '',
        wilaya:              editingUser.wilaya              ?? '',
        adresse:             editingUser.adresse             ?? '',
        code_postal:         editingUser.code_postal         ?? '',
        date_embauche:       editingUser.date_embauche       ?? '',
        date_naissance:      editingUser.date_naissance      ?? '',
        lieu_naissance:      editingUser.lieu_naissance      ?? '',
        genre:               editingUser.genre               ?? '',
        situation_familiale: editingUser.situation_familiale ?? '',
        nombre_enfants:      String(editingUser.nombre_enfants ?? 0),
        __showPersonnel:     '0',
      }
    : emptyForm;

  // ── Access guard ───────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="ban-outline" size={48} color={T.red} />
        <Text style={{ color: T.pri, fontSize: 18, fontWeight: '800', marginTop: 16 }}>Accès refusé</Text>
        <Text style={{ color: T.sec, marginTop: 8 }}>Droits administrateur requis</Text>
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>

      {/* ── Header ── */}
      <View style={{ backgroundColor: T.hero }}>
        <View style={{ height: 3, backgroundColor: T.stripe }} />
        <View style={{ padding: 16, paddingBottom: 0 }}>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 12,
              backgroundColor: 'rgba(29,111,216,0.25)', borderWidth: 1.5,
              borderColor: 'rgba(99,179,237,0.35)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="people-outline" size={22} color={T.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: T.pri }}>👥 Utilisateurs</Text>
              <Text style={{ fontSize: 12, color: T.sec, marginTop: 2 }}>
                {users.length} utilisateur(s) au total
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              activeOpacity={0.7}
              style={{
                backgroundColor: 'rgba(29,111,216,0.28)', borderWidth: 1,
                borderColor: 'rgba(99,179,237,0.30)', borderRadius: 10,
                paddingHorizontal: 14, paddingVertical: 8,
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }}
            >
              <Ionicons name="add" size={16} color={T.blue} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: T.blue }}>Nouveau</Text>
            </TouchableOpacity>
          </View>

          {/* Success toast */}
          {!!successMsg && (
            <View style={{
              padding: 10,
              backgroundColor: 'rgba(22,163,74,0.15)', borderWidth: 1,
              borderColor: 'rgba(104,211,145,0.25)', borderRadius: 10, marginBottom: 10,
            }}>
              <Text style={{ color: T.green, fontSize: 13, fontWeight: '600' }}>{successMsg}</Text>
            </View>
          )}

          {/* Search */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1,
            borderColor: 'rgba(99,179,237,0.20)', borderRadius: 12,
            paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10,
          }}>
            <Ionicons name="search-outline" size={16} color={T.muted} />
            <TextInput
              style={{ flex: 1, color: T.pri, fontSize: 13 }}
              placeholder="Rechercher par nom, email ou matricule..."
              placeholderTextColor={T.muted}
              value={search}
              onChangeText={setSearch}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color={T.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Role filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
          >
            {FILTERS.map(f => {
              const active = roleFilter === f.value;
              return (
                <TouchableOpacity
                  key={f.value}
                  onPress={() => setRoleFilter(f.value)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                    borderWidth: 2,
                    borderColor: active ? 'rgba(144,205,244,0.50)' : 'rgba(255,255,255,0.12)',
                    backgroundColor: active ? 'rgba(29,111,216,0.22)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? T.blue : T.sec }}>
                    {f.label}
                  </Text>
                  <View style={{
                    backgroundColor: active ? T.blue : 'rgba(255,255,255,0.10)',
                    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
                  }}>
                    <Text style={{ fontSize: 10, color: active ? '#fff' : T.muted, fontWeight: '700' }}>
                      {f.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.blue} size="large" />
          <Text style={{ color: T.sec, marginTop: 12, fontSize: 13 }}>
            Chargement des utilisateurs...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={u => u.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="people-outline" size={48} color={T.muted} />
              <Text style={{ color: T.muted, marginTop: 12, fontSize: 14 }}>
                Aucun utilisateur trouvé
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <UserCard
              user={item}
              onEdit={() => { setEditingUser(item); setShowEdit(true); }}
              onDelete={() => handleDelete(item.id, item.nom_complet)}
              onToggle={() => handleToggle(item)}
            />
          )}
        />
      )}

      {/* ── Modals ── */}
      <UserFormModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        initial={emptyForm}
        isEdit={false}
        loading={formLoading}
      />
      <UserFormModal
        visible={showEdit}
        onClose={() => { setShowEdit(false); setEditingUser(null); }}
        onSubmit={handleUpdate}
        initial={editInitial}
        isEdit={true}
        loading={formLoading}
      />

    </SafeAreaView>
  );
}