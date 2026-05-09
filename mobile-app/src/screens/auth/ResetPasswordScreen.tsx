import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { T } from '../../constants/theme';

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email) { Alert.alert('Erreur', 'Entrez votre email'); return; }
    setLoading(true);
    try {
      await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {}
    setLoading(false);
    setSent(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.slate50, padding: 24, justifyContent: 'center' }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 24 }}>
        <Text style={{ color: T.blue600 }}>← Retour</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 24, fontWeight: '700', color: T.slate900, marginBottom: 4 }}>Mot de passe oublié</Text>
      <Text style={{ color: T.slate500, marginBottom: 24 }}>Entrez votre email pour recevoir un lien de réinitialisation</Text>

      {sent ? (
        <View style={{ backgroundColor: T.green50, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: T.greenMid }}>
          <Text style={{ color: T.green, fontWeight: '600', fontSize: 16, marginBottom: 4 }}>Email envoyé !</Text>
          <Text style={{ color: T.slate600 }}>Vérifiez votre boîte mail.</Text>
        </View>
      ) : (
        <View style={{ backgroundColor: T.white, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.slate700, marginBottom: 6 }}>Email</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: T.slate300, borderRadius: 10, padding: 12, fontSize: 14, color: T.slate900, backgroundColor: T.slate50 }}
            value={email}
            onChangeText={setEmail}
            placeholder="votre@email.com"
            placeholderTextColor={T.slate400}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={{ backgroundColor: T.navy900, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 }} onPress={handleReset} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Envoyer le lien</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}