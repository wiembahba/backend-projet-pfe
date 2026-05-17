import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const { width: SW, height: SH } = Dimensions.get('window');
const API_URL = 'http://localhost:5000/api';

// ─── Floating Orb ─────────────────────────────────────────────────────────────
function Orb({
  x, y, size, delay, color,
}: {
  x: number; y: number; size: number; delay: number; color: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.12, 0.22, 0.12] });

  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, top: y,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

// ─── Pulse Dot ────────────────────────────────────────────────────────────────
function PulseDot() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      width: 6, height: 6, borderRadius: 3,
      backgroundColor: '#60a5fa', opacity: anim,
    }} />
  );
}

// ─── Grid Lines (decorative) ──────────────────────────────────────────────────
function GridLines() {
  const lines = [];
  const cols = Math.ceil(SW / 40) + 1;
  const rows = Math.ceil(SH / 40) + 1;
  for (let i = 0; i < cols; i++) {
    lines.push(
      <View key={`c${i}`} style={{
        position: 'absolute', left: i * 40, top: 0, bottom: 0,
        width: 0.5, backgroundColor: 'rgba(255,255,255,0.025)',
      }} />
    );
  }
  for (let j = 0; j < rows; j++) {
    lines.push(
      <View key={`r${j}`} style={{
        position: 'absolute', top: j * 40, left: 0, right: 0,
        height: 0.5, backgroundColor: 'rgba(255,255,255,0.025)',
      }} />
    );
  }
  return <View style={StyleSheet.absoluteFill} pointerEvents="none">{lines}</View>;
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────
function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.statChip}>
      <Text style={s.statNum}>{value}</Text>
      <Text style={s.statLbl}>{label}</Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SignInScreen() {
  const { login }  = useAuth();
  const navigation = useNavigation<any>();

  // login state
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [attempts,     setAttempts]     = useState(0);
  const [blocked,      setBlocked]      = useState(false);

  // forgot state
  const [showForgot,    setShowForgot]    = useState(false);
  const [forgotEmail,   setForgotEmail]   = useState('');
  const [forgotSent,    setForgotSent]    = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError,   setForgotError]   = useState('');
  const [forgotLink,    setForgotLink]    = useState('');

  // animations
  const shake     = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const triggerShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -6, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue:  6, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -4, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue:  0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (blocked) return;
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      triggerShake();
      return;
    }
    setLoading(true);
    setError('');
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
    setForgotLoading(true);
    setForgotError('');
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setForgotSent(true);
        setForgotLink(data.resetLink || '');
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
    setShowForgot(true);
    setForgotError('');
    setForgotEmail('');
    setForgotSent(false);
    setForgotLink('');
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotSent(false);
    setForgotEmail('');
    setForgotError('');
    setForgotLink('');
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Dark background ── */}
      <View style={StyleSheet.absoluteFill}>
        <View style={s.bgDark} />
        <GridLines />
        {/* Orbs */}
        <Orb x={SW * 0.5}  y={-80}       size={280} delay={0}    color="#2563eb" />
        <Orb x={SW * 0.6}  y={SH * 0.55} size={200} delay={1500} color="#7c3aed" />
        <Orb x={-60}       y={SH * 0.55} size={160} delay={3000} color="#0ea5e9" />
      </View>

      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* ── Brand ── */}
            <View style={s.brand}>
              <View style={s.brandLogo}>
                <Text style={s.brandLogoText}>MW</Text>
              </View>
              <Text style={s.brandName}>Maison du Web</Text>
            </View>

            {/* ── Stats row ── */}
            <View style={s.statsRow}>
              <StatChip value="24"  label="Projets" />
              <StatChip value="8"   label="Membres" />
              <StatChip value="97%" label="Temps" />
            </View>

            {/* ══════════════════════════════════════
                VIEW: LOGIN
            ══════════════════════════════════════ */}
            {!showForgot ? (
              <>
                {/* Pill */}
                <View style={s.pill}>
                  <PulseDot />
                  <Text style={s.pillText}>Espace sécurisé</Text>
                </View>

                <Text style={s.formTitle}>Connexion</Text>
                <Text style={s.formSub}>
                  Accédez à votre espace de gestion de projets.
                </Text>

                {/* Email */}
                <Text style={s.lbl}>Email</Text>
                <TextInput
                  style={[s.inp, blocked && s.inpDisabled]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="vous@maisonweb.com"
                  placeholderTextColor="rgba(255,255,255,0.22)"
                  keyboardType="email-address"
                  autoCapitalize="none"
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
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.22)"
                    secureTextEntry={!showPassword}
                    editable={!blocked}
                  />
                  <TouchableOpacity
                    style={s.eye}
                    onPress={() => setShowPassword(v => !v)}
                  >
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
                  onPress={handleSubmit}
                  disabled={loading || blocked}
                  activeOpacity={0.85}
                >
                  {blocked ? (
                    <Text style={s.btnText}>🔒 Bloqué temporairement</Text>
                  ) : loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.btnText}>Se connecter →</Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={s.divider}>
                  <View style={s.divLine} />
                  <Text style={s.divText}>ou continuer avec</Text>
                  <View style={s.divLine} />
                </View>

                {/* Social buttons */}
                <View style={s.socialRow}>
                  <TouchableOpacity style={s.socialBtn} activeOpacity={0.75}>
                    <Text style={s.socialBtnText}>G  Google</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.socialBtn} activeOpacity={0.75}>
                    <Text style={s.socialBtnText}>⌥  GitHub</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* ══════════════════════════════════════
                 VIEW: FORGOT PASSWORD
              ══════════════════════════════════════ */
              <>
                <TouchableOpacity style={s.backBtn} onPress={closeForgot}>
                  <Text style={s.backText}>← Retour</Text>
                </TouchableOpacity>

                <Text style={s.formTitle}>Mot de passe oublié</Text>
                <Text style={s.formSub}>
                  Entrez votre email pour recevoir un lien de réinitialisation.
                </Text>

                {forgotSent ? (
                  <View style={s.successBox}>
                    <Text style={s.successTitle}>✅ Lien généré avec succès !</Text>
                    {!!forgotLink && (
                      <Text style={s.successLink}>{forgotLink}</Text>
                    )}
                    <Text style={s.successHint}>Vérifiez votre boîte email.</Text>
                  </View>
                ) : (
                  <>
                    <Text style={s.lbl}>Email</Text>
                    <TextInput
                      style={s.inp}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      placeholder="vous@maisonweb.com"
                      placeholderTextColor="rgba(255,255,255,0.22)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    {!!forgotError && (
                      <View style={s.errBox}>
                        <Text style={s.errIcon}>⚠</Text>
                        <Text style={s.errText}>{forgotError}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[s.btn, forgotLoading && s.btnDisabled]}
                      onPress={handleForgot}
                      disabled={forgotLoading}
                      activeOpacity={0.85}
                    >
                      {forgotLoading
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={s.btnText}>Générer le lien →</Text>}
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            <Text style={s.footer}>© {new Date().getFullYear()} Maison du Web</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const BLUE   = '#2563eb';
const BLUE2  = '#1d4ed8';
const CARD_W = Math.min(SW - 32, 420);

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#040e28' },
  bgDark: { ...StyleSheet.absoluteFillObject, backgroundColor: '#040e28' },
  kav:    { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    minHeight: SH,
  },

  // ── Card ──
  card: {
    width: CARD_W,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    padding: 28,
    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    // Android
    elevation: 12,
  },

  // ── Brand ──
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoText: { color: '#fff', fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  brandName:     { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.82)' },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statNum: { fontSize: 15, fontWeight: '700', color: '#93c5fd' },
  statLbl: { fontSize: 9,  color: 'rgba(255,255,255,0.3)', marginTop: 2 },

  // ── Pill ──
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37,99,235,0.18)',
    borderWidth: 0.5,
    borderColor: 'rgba(96,165,250,0.30)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  pillText: { fontSize: 11, fontWeight: '600', color: '#93c5fd' },

  // ── Form titles ──
  formTitle: { fontSize: 22, fontWeight: '700', color: '#f0f6ff', marginBottom: 4 },
  formSub:   { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20, lineHeight: 18 },

  // ── Labels & Inputs ──
  lbl: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  lblRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  inp: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 13,
    color: '#e8f0ff',
  },
  inpDisabled: { opacity: 0.45 },
  inpPr:       { paddingRight: 42 },
  ibox:        { position: 'relative' },
  eye: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon:    { fontSize: 16 },
  forgotLink: { fontSize: 11, fontWeight: '600', color: '#60a5fa' },

  // ── Error ──
  errBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 0.5,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  errIcon: { fontSize: 12, color: '#fca5a5' },
  errText: { fontSize: 11, fontWeight: '500', color: '#fca5a5', flex: 1 },

  // ── Button ──
  btn: {
    backgroundColor: BLUE,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // ── Divider ──
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  divLine: { flex: 1, height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)' },
  divText: { fontSize: 11, color: 'rgba(255,255,255,0.22)' },

  // ── Social buttons ──
  socialRow: { flexDirection: 'row', gap: 8 },
  socialBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 9,
    alignItems: 'center',
  },
  socialBtnText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },

  // ── Forgot success ──
  successBox: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(34,197,94,0.25)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  successTitle: { fontSize: 13, fontWeight: '600', color: '#86efac', marginBottom: 6 },
  successLink:  { fontSize: 11, color: '#60a5fa', fontWeight: '500', marginBottom: 6 },
  successHint:  { fontSize: 11, color: 'rgba(255,255,255,0.35)' },

  // ── Back button ──
  backBtn: { marginBottom: 18 },
  backText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },

  // ── Footer ──
  footer: {
    textAlign: 'center',
    marginTop: 22,
    fontSize: 10,
    color: 'rgba(255,255,255,0.18)',
  },
});