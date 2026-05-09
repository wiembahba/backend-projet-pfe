import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Animated, Easing, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const { width: SW, height: SH } = Dimensions.get('window');
const API_URL = 'http://localhost:5000/api';

// ─── Animated orb ────────────────────────────────────────────────────────────
function Orb({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.28, 0.15] });
  return (
    <Animated.View style={{ position: 'absolute', left: x, top: y, width: size, height: size,
      borderRadius: size / 2, backgroundColor: 'rgba(100,150,255,1)', opacity, transform: [{ translateY }] }} />
  );
}

// ─── Pulse dot ───────────────────────────────────────────────────────────────
function PulseDot() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#0f3494', opacity: anim }} />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SignInScreen() {
  const { login }    = useAuth();
  const navigation   = useNavigation<any>();

  // login state
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [attempts,     setAttempts]     = useState(0);
  const [blocked,      setBlocked]      = useState(false);

  // forgot state
  const [showForgot,      setShowForgot]      = useState(false);
  const [forgotEmail,     setForgotEmail]     = useState('');
  const [forgotSent,      setForgotSent]      = useState(false);
  const [forgotLoading,   setForgotLoading]   = useState(false);
  const [forgotError,     setForgotError]     = useState('');
  const [forgotResetLink, setForgotResetLink] = useState('');

  // shake animation for error
  const shake = useRef(new Animated.Value(0)).current;
  const triggerShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -4, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue:  4, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -3, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue:  0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (blocked) return;
    if (!email || !password) { setError('Veuillez remplir tous les champs.'); triggerShake(); return; }
    setLoading(true); setError('');
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        navigation.navigate('Dashboard' as never);
      } else {
        const n = attempts + 1;
        setAttempts(n);
        if (n >= 3) {
          setBlocked(true);
          setError('Compte bloqué après 3 tentatives. Réessayez dans 30s.');
          setTimeout(() => { setBlocked(false); setAttempts(0); }, 30000);
        } else {
          setError(`Email ou mot de passe incorrect. (${n}/3 tentatives)`);
        }
        triggerShake();
        setLoading(false);
      }
    } catch {
      setError('Erreur de connexion.');
      triggerShake();
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true); setForgotError('');
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setForgotSent(true);
        setForgotResetLink(data.resetLink);
      } else {
        setForgotError(data.message || 'Email introuvable ou erreur serveur.');
      }
    } catch {
      setForgotError('Erreur de connexion au serveur.');
    } finally {
      setForgotLoading(false);
    }
  };

  const openForgot = () => {
    setShowForgot(true); setForgotError(''); setForgotEmail('');
    setForgotResetLink(''); setForgotSent(false);
  };

  const closeForgot = () => {
    setShowForgot(false); setForgotSent(false);
    setForgotEmail(''); setForgotError(''); setForgotResetLink('');
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* ── CARD ── */}
          <View style={s.card}>

            {/* LEFT PANEL */}
            <View style={s.left}>
              {/* Background orbs */}
              <Orb x={10}  y={20}  size={70}  delay={0}    />
              <Orb x={60}  y={90}  size={50}  delay={600}  />
              <Orb x={5}   y={160} size={40}  delay={1200} />
              <Orb x={55}  y={200} size={60}  delay={400}  />

              <View style={s.leftInner}>
                {/* Brand */}
                <View style={s.brand}>
                  <View style={s.brandLogo}><Text style={s.brandLogoText}>MW</Text></View>
                  <Text style={s.brandName}>Maison du Web</Text>
                </View>

                {/* Copy */}
                <View style={s.copy}>
                  <Text style={s.copyH}>Gérez vos projets avec clarté.</Text>
                  <Text style={s.copyP}>Plateforme centralisée pour vos équipes et livrables.</Text>
                </View>

                {/* Stats */}
                <View style={s.stats}>
                  {[['24','Projets'],['8','Membres'],['97%','Temps']].map(([n, l]) => (
                    <View key={l} style={s.stat}>
                      <Text style={s.statN}>{n}</Text>
                      <Text style={s.statL}>{l}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* RIGHT PANEL */}
            <View style={s.right}>
              {!showForgot ? (
                <>
                  {/* Pill */}
                  <View style={s.pill}>
                    <PulseDot />
                    <Text style={s.pillText}>Espace sécurisé</Text>
                  </View>

                  <Text style={s.formTitle}>Connexion</Text>

                  {/* Email */}
                  <Text style={s.lbl}>Email</Text>
                  <TextInput
                    style={[s.inp, blocked && s.inpDisabled]}
                    value={email} onChangeText={setEmail}
                    placeholder="vous@maisonweb.com" placeholderTextColor="#aab4c8"
                    keyboardType="email-address" autoCapitalize="none"
                    editable={!blocked}
                  />

                  {/* Password row */}
                  <View style={s.lblRow}>
                    <Text style={s.lbl}>Mot de passe</Text>
                    <TouchableOpacity onPress={openForgot}>
                      <Text style={s.forgotLink}>Oublié ?</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.ibox}>
                    <TextInput
                      style={[s.inp, s.inpPr, blocked && s.inpDisabled]}
                      value={password} onChangeText={setPassword}
                      placeholder="••••••••" placeholderTextColor="#aab4c8"
                      secureTextEntry={!showPassword} editable={!blocked}
                    />
                    <TouchableOpacity style={s.eye} onPress={() => setShowPassword(!showPassword)}>
                      <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Error */}
                  {!!error && (
                    <Animated.View style={[s.errBox, { transform: [{ translateX: shake }] }]}>
                      <Text style={s.errIcon}>⚠</Text>
                      <Text style={s.errText}>{error}</Text>
                    </Animated.View>
                  )}

                  {/* Submit */}
                  <TouchableOpacity
                    style={[s.btn, (loading || blocked) && s.btnDisabled]}
                    onPress={handleSubmit} disabled={loading || blocked}
                  >
                    {blocked
                      ? <Text style={s.btnText}>🔒 Bloqué temporairement</Text>
                      : loading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.btnText}>Se connecter →</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                /* ── FORGOT PASSWORD ── */
                <>
                  <Text style={s.formTitle}>Mot de passe oublié</Text>
                  <Text style={s.forgotSub}>Entrez votre email pour recevoir un lien de réinitialisation.</Text>

                  {forgotSent ? (
                    <View style={s.successBox}>
                      <Text style={s.successTitle}>✅ Lien généré avec succès !</Text>
                      <Text style={s.successLink}>{forgotResetLink}</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={s.lbl}>Email</Text>
                      <TextInput
                        style={s.inp}
                        value={forgotEmail} onChangeText={setForgotEmail}
                        placeholder="vous@maisonweb.com" placeholderTextColor="#aab4c8"
                        keyboardType="email-address" autoCapitalize="none"
                      />
                      {!!forgotError && (
                        <View style={s.errBox}>
                          <Text style={s.errIcon}>⚠</Text>
                          <Text style={s.errText}>{forgotError}</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[s.btn, forgotLoading && s.btnDisabled]}
                        onPress={handleForgot} disabled={forgotLoading}
                      >
                        {forgotLoading
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={s.btnText}>Générer le lien →</Text>}
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity style={s.backBtn} onPress={closeForgot}>
                    <Text style={s.backText}>← Retour à la connexion</Text>
                  </TouchableOpacity>
                </>
              )}

              <Text style={s.footer}>© {new Date().getFullYear()} Maison du Web</Text>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const NAVY = '#0f3494';

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: '#e8edf5' },
  kav:      { flex: 1 },
  scroll:   { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16, minHeight: SH },

  // Card
  card:     { flexDirection: 'row', borderRadius: 16, overflow: 'hidden',
              width: Math.min(SW - 32, 680), minHeight: 380,
              shadowColor: '#0a286e', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
              elevation: 10 },

  // LEFT
  left:     { width: '42%', backgroundColor: NAVY, padding: 20, overflow: 'hidden', position: 'relative' },
  leftInner:{ flex: 1, justifyContent: 'space-between', zIndex: 2 },
  brand:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo:{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center' },
  brandLogoText: { color: '#fff', fontWeight: '800', fontSize: 9 },
  brandName:{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.88)' },
  copy:     { gap: 4 },
  copyH:    { fontSize: 13, fontWeight: '700', color: '#fff', lineHeight: 18 },
  copyP:    { fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 14 },
  stats:    { flexDirection: 'row', gap: 5 },
  stat:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 0.5,
              borderColor: 'rgba(255,255,255,0.15)', borderRadius: 7, padding: 6 },
  statN:    { fontSize: 13, fontWeight: '700', color: '#fff' },
  statL:    { fontSize: 8,  color: 'rgba(255,255,255,0.38)', marginTop: 1 },

  // RIGHT
  right:    { flex: 1, backgroundColor: '#fff', padding: 20, justifyContent: 'center' },
  pill:     { flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: '#dbeafe', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
              alignSelf: 'flex-start', marginBottom: 10 },
  pillText: { fontSize: 9, fontWeight: '600', color: NAVY },
  formTitle:{ fontSize: 16, fontWeight: '700', color: '#0f1f4a', marginBottom: 14 },

  // Fields
  lblRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lbl:      { fontSize: 10, fontWeight: '600', color: '#5a6a85', marginBottom: 4, marginTop: 8 },
  inp:      { backgroundColor: '#f3f6fc', borderWidth: 1.5, borderColor: '#d6dff0',
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
              fontSize: 12, color: '#0f1f4a' },
  inpDisabled: { opacity: 0.5 },
  inpPr:    { paddingRight: 36 },
  ibox:     { position: 'relative' },
  eye:      { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center' },
  eyeIcon:  { fontSize: 14 },
  forgotLink: { fontSize: 10, fontWeight: '600', color: NAVY },
  forgotSub:  { fontSize: 11, color: '#6b7280', marginBottom: 12 },

  // Error
  errBox:   { flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3',
              borderRadius: 7, padding: 8, marginTop: 8 },
  errIcon:  { fontSize: 12, color: '#be123c' },
  errText:  { fontSize: 11, fontWeight: '500', color: '#be123c', flex: 1 },

  // Button
  btn:      { backgroundColor: NAVY, borderRadius: 8, padding: 11, alignItems: 'center', marginTop: 10 },
  btnDisabled: { opacity: 0.45 },
  btnText:  { color: '#fff', fontWeight: '600', fontSize: 12 },

  // Forgot success
  successBox:  { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
                 borderRadius: 8, padding: 12, marginBottom: 10 },
  successTitle:{ fontSize: 12, fontWeight: '600', color: '#15803d', marginBottom: 6 },
  successLink: { fontSize: 10, color: NAVY, fontWeight: '600' },

  // Back
  backBtn:  { borderWidth: 1, borderColor: '#d6dff0', borderRadius: 8, padding: 9,
              alignItems: 'center', marginTop: 10 },
  backText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },

  // Footer
  footer:   { textAlign: 'center', marginTop: 14, fontSize: 9, color: '#c8d4e8' },
});