import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { T } from '../../constants/theme';

export default function SignUpScreen() {
  const navigation = useNavigation<any>();
  const [form, setForm] = useState({ nom: '', email: '', password: '', confirm: '', departement: '' });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.nom || !form.email || !form.password) { Alert.alert('Erreur', 'Remplissez tous les champs'); return; }
    if (form.password !== form.confirm) { Alert.alert('Erreur', 'Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom_complet: form.nom, email: form.email, password: form.password, departement: form.departement }),
      });
      const data = await res.json();
      if (data.success) { Alert.alert('Succès', 'Compte créé !', [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]); }
      else { Alert.alert('Erreur', data.message || 'Erreur lors de la création'); }
    } catch { Alert.alert('Info', 'Backend indisponible. Utilisez les comptes de démo.'); }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.slate50 }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 20 }}>
          <Text style={{ color: T.blue600, fontSize: 14 }}>← Retour</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: '700', color: T.slate900, marginBottom: 4 }}>Créer un compte</Text>
        <Text style={{ fontSize: 14, color: T.slate500, marginBottom: 24 }}>Rejoignez l'équipe Maison du Web</Text>

        <View style={{ backgroundColor: T.white, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }}>
          {[
            { key: 'nom', label: 'Nom complet', placeholder: 'Jean Dupont' },
            { key: 'email', label: 'Email', placeholder: 'jean@maisonweb.com', keyboardType: 'email-address' },
            { key: 'departement', label: 'Département', placeholder: 'Développement' },
            { key: 'password', label: 'Mot de passe', placeholder: '••••••••', secure: true },
            { key: 'confirm', label: 'Confirmer', placeholder: '••••••••', secure: true },
          ].map(f => (
            <View key={f.key}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: T.slate700, marginBottom: 6, marginTop: 12 }}>{f.label}</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: T.slate300, borderRadius: 10, padding: 12, fontSize: 14, color: T.slate900, backgroundColor: T.slate50 }}
                value={(form as any)[f.key]}
                onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                placeholder={f.placeholder}
                placeholderTextColor={T.slate400}
                secureTextEntry={f.secure}
                autoCapitalize="none"
                keyboardType={(f as any).keyboardType}
              />
            </View>
          ))}
          <TouchableOpacity style={{ backgroundColor: T.navy900, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 }} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Créer mon compte</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}