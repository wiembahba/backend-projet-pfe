import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator,
  Alert, Platform, Image, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

const T = {
  bg:       '#0a0f1e',
  hero:     '#042C53',
  stripe:   '#185FA5',
  surface:  'rgba(255,255,255,0.05)',
  border:   'rgba(255,255,255,0.09)',
  sep:      'rgba(255,255,255,0.06)',
  pri:      '#e8f4fd',
  sec:      'rgba(255,255,255,0.45)',
  muted:    'rgba(255,255,255,0.28)',
  blue:     '#90cdf4',
  blueDeep: '#185FA5',
  blueMid:  '#378ADD',
  avBg:     '#0C447C',
  avBorder: '#185FA5',
  avText:   '#B5D4F4',
  green:    '#68d391',
  red:      '#fc8181',
  amber:    '#f6ad55',
  dot:      '#4fd1c5',
};

const ROLE_LABEL: Record<string, string> = {
  admin:       'Admin',
  chef_projet: 'Chef de projet',
  employe:     'Employé',
};

function SectionTitle({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 20 }}>
      <View style={{ width: 3, height: 13, borderRadius: 2, backgroundColor: T.blueDeep }} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {label}
      </Text>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: T.surface, borderRadius: 14,
      borderWidth: 1, borderColor: T.border, overflow: 'hidden',
    }}>
      {children}
    </View>
  );
}

function FieldRow({
  label, value, editing, onEdit, type = 'default', last = false,
}: {
  label: string; value: string; editing: boolean;
  onEdit: (v: string) => void; type?: 'default' | 'email' | 'phone';
  last?: boolean;
}) {
  return (
    <View style={{
      paddingHorizontal: 14, paddingVertical: 11,
      ...(last ? {} : { borderBottomWidth: 1, borderBottomColor: T.sep }),
    }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: T.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      {editing ? (
        <TextInput
          style={{
            color: T.pri, fontSize: 13, fontWeight: '500',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1, borderColor: 'rgba(99,179,237,0.20)',
            borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
          }}
          value={value}
          onChangeText={onEdit}
          keyboardType={type === 'email' ? 'email-address' : type === 'phone' ? 'phone-pad' : 'default'}
          autoCapitalize={type === 'email' ? 'none' : 'words'}
          placeholderTextColor={T.muted}
        />
      ) : (
        <Text style={{ fontSize: 13, fontWeight: '500', color: value ? T.pri : T.muted }}>
          {value || 'Non renseigné'}
        </Text>
      )}
    </View>
  );
}

function PwField({
  label, value, onChange, show, onToggle, last = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; last?: boolean;
}) {
  return (
    <View style={{
      paddingHorizontal: 14, paddingVertical: 11,
      ...(last ? {} : { borderBottomWidth: 1, borderBottomColor: T.sep }),
    }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
          style={{
            flex: 1, color: T.pri, fontSize: 13, fontWeight: '500',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1, borderColor: 'rgba(99,179,237,0.20)',
            borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
          }}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          placeholder="••••••••"
          placeholderTextColor={T.muted}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={T.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StrengthBar({ password }: { password: string }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const cfg = [
    { w: 0.25, color: '#fc8181', label: 'Faible'    },
    { w: 0.50, color: '#f6ad55', label: 'Moyen'     },
    { w: 0.75, color: '#68d391', label: 'Fort'      },
    { w: 1.00, color: '#4fd1c5', label: 'Très fort' },
  ];
  const s = cfg[score - 1] ?? cfg[0];
  return (
    <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
      <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <View style={{ width: `${s.w * 100}%` as any, height: '100%', backgroundColor: s.color, borderRadius: 2 }} />
      </View>
      <Text style={{ fontSize: 10, color: s.color, marginTop: 3 }}>{s.label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const [editing,    setEditing]    = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPw,   setSavingPw]   = useState(false);
  const [toast,      setToast]      = useState('');
  const [avatarUri,  setAvatarUri]  = useState('');

  const [form, setForm] = useState({
    name:       user?.name       ?? '',
    email:      user?.email      ?? '',
    department: user?.department ?? '',
    phone:      '',
    bio:        '',
  });

  const [pw, setPw]         = useState({ cur: '', nw: '', conf: '' });
  const [showCur, setShowCur] = useState(false);
  const [showNw,  setShowNw]  = useState(false);

  const defaultNotifs = [
    { label: 'Email — Nouveaux projets', sub: 'Recevoir un email à chaque assignation', on: true  },
    { label: 'Email — Rapports hebdo',   sub: 'Résumé chaque lundi matin',             on: true  },
    { label: 'Notifications push',       sub: 'Alertes en temps réel',                 on: false },
    { label: 'Mentions équipe',          sub: "Quand quelqu'un vous mentionne",         on: true  },
  ];
  const [notifs, setNotifs] = useState(defaultNotifs);

  const avatarKey = `user_avatar_${user?.id}`;

  useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(avatarKey).then(v => { if (v) setAvatarUri(v); });
  }, [user?.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "L'accès à la galerie est nécessaire.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      await AsyncStorage.setItem(avatarKey, uri);
      showToast('Photo de profil mise à jour');
    }
  };

  const deleteAvatar = () => {
    Alert.alert('Supprimer la photo', 'Voulez-vous vraiment supprimer votre photo de profil ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          setAvatarUri('');
          await AsyncStorage.removeItem(avatarKey);
          showToast('Photo de profil supprimée');
        },
      },
    ]);
  };

  const saveInfo = async () => {
    setSavingInfo(true);
    await new Promise(r => setTimeout(r, 600));
    setSavingInfo(false);
    setEditing(false);
    showToast('Profil mis à jour avec succès');
  };

  const savePw = async () => {
    if (!pw.cur || !pw.nw || !pw.conf) return showToast('Remplissez tous les champs');
    if (pw.nw !== pw.conf)             return showToast('Les mots de passe ne correspondent pas');
    if (pw.nw.length < 8)             return showToast('Minimum 8 caractères requis');
    setSavingPw(true);
    await new Promise(r => setTimeout(r, 600));
    setSavingPw(false);
    setPw({ cur: '', nw: '', conf: '' });
    showToast('Mot de passe mis à jour');
  };

  // ── Logout ───────────────────────────────────────────────────────────────────

  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    // على الويب Alert.alert ما يشتغلش
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Voulez-vous vous déconnecter ?');
      if (confirmed) doLogout();
      return;
    }

    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: doLogout },
    ]);
  };

  const stats = [
    { num: '14',    lbl: 'Projets'    },
    { num: '3',     lbl: 'Équipes'    },
    { num: '98%',   lbl: 'Complétion' },
    { num: '2 ans', lbl: 'Ancienneté' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Toast ── */}
        {!!toast && (
          <View style={{
            margin: 14, padding: 12, borderRadius: 12,
            backgroundColor: 'rgba(16,185,129,0.10)',
            borderWidth: 1, borderColor: 'rgba(16,185,129,0.22)',
            flexDirection: 'row', alignItems: 'center', gap: 8,
          }}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#10b981', flex: 1 }}>{toast}</Text>
          </View>
        )}

        {/* ── Hero ── */}
        <View style={{ backgroundColor: T.hero }}>
          <View style={{ height: 4, backgroundColor: T.stripe }} />
          <View style={{ padding: 20, paddingBottom: 0 }}>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
              <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} style={{ position: 'relative' }}>
                <View style={{
                  width: 66, height: 66, borderRadius: 14,
                  backgroundColor: T.avBg, borderWidth: 2, borderColor: T.avBorder,
                  alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Text style={{ fontSize: 24, fontWeight: '800', color: T.avText }}>
                      {form.name?.[0]?.toUpperCase() ?? 'U'}
                    </Text>
                  )}
                </View>
                <View style={{
                  position: 'absolute', bottom: -3, right: -3,
                  backgroundColor: T.blueDeep, borderRadius: 8,
                  padding: 3, borderWidth: 1.5, borderColor: T.hero,
                }}>
                  <Ionicons name="camera-outline" size={11} color={T.avText} />
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: T.pri, marginBottom: 6 }}>
                  {form.name || user?.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <View style={{
                    backgroundColor: T.avBg, borderWidth: 1, borderColor: T.avBorder,
                    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: T.avText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {user?.role ? ROLE_LABEL[user.role] : 'Utilisateur'}
                    </Text>
                  </View>
                  {form.department ? (
                    <Text style={{ fontSize: 12, fontWeight: '600', color: T.blueMid }}>{form.department}</Text>
                  ) : null}
                </View>
              </View>

              <View style={{ gap: 6, alignItems: 'flex-end' }}>
                {!editing ? (
                  <TouchableOpacity
                    onPress={() => setEditing(true)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      backgroundColor: T.avBg, borderWidth: 1, borderColor: T.avBorder,
                      borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7,
                    }}
                  >
                    <Ionicons name="create-outline" size={13} color={T.avText} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: T.avText }}>Modifier</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => setEditing(false)}
                      activeOpacity={0.7}
                      style={{
                        borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7,
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: T.sec }}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={saveInfo}
                      disabled={savingInfo}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                        backgroundColor: T.blueDeep, borderRadius: 9,
                        paddingHorizontal: 12, paddingVertical: 7,
                        opacity: savingInfo ? 0.7 : 1,
                      }}
                    >
                      {savingInfo
                        ? <ActivityIndicator size="small" color={T.avText} />
                        : <Ionicons name="checkmark-outline" size={13} color={T.avText} />
                      }
                      <Text style={{ fontSize: 12, fontWeight: '700', color: T.avText }}>
                        {savingInfo ? 'Sauvegarde...' : 'Enregistrer'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Stats */}
            <View style={{ flexDirection: 'row', marginHorizontal: -20, borderTopWidth: 1, borderTopColor: 'rgba(12,68,124,0.8)' }}>
              {stats.map((st, i) => (
                <View
                  key={st.lbl}
                  style={{
                    flex: 1, paddingVertical: 13, paddingLeft: 14,
                    ...(i < stats.length - 1 ? { borderRightWidth: 1, borderRightColor: 'rgba(12,68,124,0.8)' } : {}),
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: T.avText, marginBottom: 2 }}>{st.num}</Text>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: T.blueMid, textTransform: 'uppercase', letterSpacing: 0.5 }}>{st.lbl}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Informations personnelles ── */}
        <View style={{ paddingHorizontal: 16 }}>
          <SectionTitle label="Informations personnelles" />
          <Card>
            <FieldRow label="Nom complet"  value={form.name}       editing={editing} onEdit={v => setForm(f => ({ ...f, name: v }))} />
            <FieldRow label="Email"        value={form.email}      editing={editing} onEdit={v => setForm(f => ({ ...f, email: v }))}      type="email" />
            <FieldRow label="Département"  value={form.department} editing={editing} onEdit={v => setForm(f => ({ ...f, department: v }))} />
            <FieldRow label="Téléphone"    value={form.phone}      editing={editing} onEdit={v => setForm(f => ({ ...f, phone: v }))}      type="phone" />
            <View style={{ paddingHorizontal: 14, paddingVertical: 11 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: T.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bio</Text>
              {editing ? (
                <TextInput
                  style={{
                    color: T.pri, fontSize: 13, fontWeight: '500',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1, borderColor: 'rgba(99,179,237,0.20)',
                    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
                    textAlignVertical: 'top', minHeight: 60,
                  }}
                  value={form.bio}
                  onChangeText={v => setForm(f => ({ ...f, bio: v }))}
                  multiline
                  placeholder="Quelques mots sur vous..."
                  placeholderTextColor={T.muted}
                />
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '500', color: form.bio ? T.pri : T.muted }}>
                  {form.bio || 'Non renseignée'}
                </Text>
              )}
            </View>
          </Card>
        </View>

        {/* ── Mot de passe ── */}
        <View style={{ paddingHorizontal: 16 }}>
          <SectionTitle label="Mot de passe" />
          <Card>
            <PwField label="Mot de passe actuel"  value={pw.cur}  onChange={v => setPw(p => ({ ...p, cur: v }))}  show={showCur} onToggle={() => setShowCur(v => !v)} />
            <PwField label="Nouveau mot de passe" value={pw.nw}   onChange={v => setPw(p => ({ ...p, nw: v }))}   show={showNw}  onToggle={() => setShowNw(v => !v)}  />
            <StrengthBar password={pw.nw} />
            <PwField label="Confirmer"            value={pw.conf} onChange={v => setPw(p => ({ ...p, conf: v }))} show={false}   onToggle={() => {}} last />
          </Card>
          <TouchableOpacity
            onPress={savePw}
            disabled={savingPw}
            activeOpacity={0.75}
            style={{
              marginTop: 10, backgroundColor: T.blueDeep, borderRadius: 12,
              paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 7, opacity: savingPw ? 0.7 : 1,
            }}
          >
            {savingPw && <ActivityIndicator size="small" color={T.avText} />}
            <Text style={{ color: T.avText, fontWeight: '700', fontSize: 14 }}>
              {savingPw ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Photo de profil ── */}
        <View style={{ paddingHorizontal: 16 }}>
          <SectionTitle label="Photo de profil" />
          <Card>
            <TouchableOpacity
              onPress={pickAvatar}
              activeOpacity={0.7}
              style={{
                margin: 14, borderRadius: 10, padding: 18,
                borderWidth: 1.5, borderColor: T.blueMid, borderStyle: 'dashed',
                alignItems: 'center', gap: 8,
              }}
            >
              <Ionicons name="image-outline" size={26} color={T.blueMid} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: T.blueMid }}>Choisir une photo</Text>
              <Text style={{ fontSize: 12, color: T.muted }}>PNG, JPG — max 2 MB</Text>
            </TouchableOpacity>

            {!!avatarUri && (
              <TouchableOpacity
                onPress={deleteAvatar}
                activeOpacity={0.7}
                style={{
                  marginHorizontal: 14, marginBottom: 14, paddingVertical: 10,
                  backgroundColor: 'rgba(252,129,129,0.08)',
                  borderWidth: 1, borderColor: 'rgba(252,129,129,0.22)',
                  borderRadius: 10, alignItems: 'center',
                }}
              >
                <Text style={{ color: T.red, fontWeight: '700', fontSize: 13 }}>Supprimer la photo</Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* ── Notifications ── */}
        <View style={{ paddingHorizontal: 16 }}>
          <SectionTitle label="Notifications" />
          <Card>
            {notifs.map((n, i) => (
              <View
                key={n.label}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingHorizontal: 14, paddingVertical: 12,
                  ...(i < notifs.length - 1 ? { borderBottomWidth: 1, borderBottomColor: T.sep } : {}),
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: T.pri, marginBottom: 2 }}>{n.label}</Text>
                  <Text style={{ fontSize: 11, color: T.muted }}>{n.sub}</Text>
                </View>
                <Switch
                  value={n.on}
                  onValueChange={v => setNotifs(prev => prev.map((x, j) => j === i ? { ...x, on: v } : x))}
                  trackColor={{ false: 'rgba(255,255,255,0.10)', true: T.blueDeep }}
                  thumbColor={n.on ? T.avText : 'rgba(255,255,255,0.4)'}
                  ios_backgroundColor="rgba(255,255,255,0.10)"
                />
              </View>
            ))}
          </Card>
        </View>

        {/* ── Session / Logout ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: T.surface, borderRadius: 12,
            borderWidth: 1, borderColor: T.border,
            paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10,
          }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: T.dot }} />
            <Text style={{ fontSize: 12, color: T.sec, flex: 1 }}>
              Connecté en tant que{' '}
              <Text style={{ fontWeight: '700', color: T.pri }}>{form.name || user?.name}</Text>
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.75}
            style={{
              backgroundColor: 'rgba(252,129,129,0.08)',
              borderWidth: 1, borderColor: 'rgba(252,129,129,0.20)',
              borderRadius: 12, paddingVertical: 13,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loggingOut ? 0.6 : 1,
            }}
          >
            {loggingOut
              ? <ActivityIndicator color={T.red} size="small" />
              : <Ionicons name="log-out-outline" size={17} color={T.red} />
            }
            <Text style={{ color: T.red, fontWeight: '700', fontSize: 14 }}>
              {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}