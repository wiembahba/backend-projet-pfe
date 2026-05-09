import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';

const NAVY = '#0f3494';

// ─── Badge ────────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { bg: string; text: string; border: string; label: string }> = {
  en_cours:   { bg: '#dbeafe', text: NAVY,      border: '#bfdbfe', label: 'En cours'   },
  termine:    { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', label: 'Terminé'    },
  en_attente: { bg: '#fef9c3', text: '#a16207', border: '#fde68a', label: 'En attente' },
  en_retard:  { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', label: 'En retard'  },
  a_faire:    { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', label: 'À faire'    },
};

function Badge({ status }: { status: string }) {
  const c = STATUS_MAP[status] || { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', label: status };
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 6, borderWidth: 1,
      borderColor: c.border, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text style={{ color: c.text, fontSize: 10, fontWeight: '700' }}>{c.label}</Text>
    </View>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 700, useNativeDriver: false }).start();
  }, [value]);
  const color = value >= 75 ? '#15803d' : value >= 40 ? '#d97706' : '#be123c';
  const width  = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View>
      <View style={{ height: 7, backgroundColor: '#e8edf5', borderRadius: 4, overflow: 'hidden' }}>
        <Animated.View style={{ height: 7, borderRadius: 4, width, backgroundColor: color }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>{value}% complété</Text>
        <Text style={{ fontSize: 11, color, fontWeight: '600' }}>
          {value >= 75 ? 'Bon avancement' : value >= 40 ? 'En progression' : 'Faible avancement'}
        </Text>
      </View>
    </View>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#e8edf5' }}>
      <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: '#dbeafe',
        alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={13} color={NAVY} />
      </View>
      <Text style={{ fontSize: 11, color: '#94a3b8', width: 70 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: '#0f1f4a', fontWeight: '500', flex: 1 }}>{value}</Text>
    </View>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task }: { task: any }) {
  const PRIORITY: Record<string, string> = { haute: '🔴', moyenne: '🟡', basse: '🟢' };
  return (
    <View style={s.taskCard}>
      <View style={[s.taskAccent, {
        backgroundColor: task.statut === 'termine' ? '#15803d' : task.statut === 'en_cours' ? NAVY : '#94a3b8'
      }]} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={s.taskTitle} numberOfLines={1}>{task.titre}</Text>
          <Badge status={task.statut || 'a_faire'} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="person-outline" size={11} color="#94a3b8" />
            <Text style={s.taskMeta}>{task.assigne_nom || 'Non assigné'}</Text>
          </View>
          {task.priorite && (
            <Text style={s.taskMeta}>{PRIORITY[task.priorite] || ''} {task.priorite}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProjectDetailScreen() {
  const route      = useRoute<any>();
  const navigation = useNavigation<any>();
  const { token }  = useAuth();
  const { projectId, projectName } = route.params || {};

  const [projet,  setProjet]  = useState<any>(null);
  const [taches,  setTaches]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || projectId === 'new') { setLoading(false); return; }
    Promise.all([
      apiFetch(`/projets/${projectId}`, token),
      apiFetch(`/projets/${projectId}/taches`, token),
    ]).then(([p, t]) => {
      if (p.success) setProjet(p.projet);
      if (t.success) setTaches(t.taches || []);
    }).finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <SafeAreaView style={s.loadWrap}>
      <ActivityIndicator color={NAVY} size="large" />
    </SafeAreaView>
  );

  const prog      = projet?.progression || 0;
  const termine   = taches.filter(t => t.statut === 'termine').length;
  const en_cours  = taches.filter(t => t.statut === 'en_cours').length;

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{projectName || 'Projet'}</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>

        {projet && (
          <>
            {/* ── Hero card ── */}
            <View style={s.heroCard}>
              {/* Top stripe */}
              <View style={s.heroStripe} />

              <View style={{ padding: 16 }}>
                {/* Title + badge */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Text style={s.heroTitle}>{projet.nom_projet}</Text>
                  <Badge status={projet.statut} />
                </View>

                {projet.description && (
                  <Text style={s.heroDesc}>{projet.description}</Text>
                )}

                {/* Progress */}
                <View style={{ marginBottom: 16 }}>
                  <ProgressBar value={prog} />
                </View>

                {/* Info rows */}
                {projet.chef_nom && (
                  <InfoRow icon="person-outline" label="Chef de projet" value={projet.chef_nom} />
                )}
                {projet.date_debut && (
                  <InfoRow icon="calendar-outline" label="Date début" value={new Date(projet.date_debut).toLocaleDateString('fr-FR')} />
                )}
                {projet.date_fin_prevue && (
                  <InfoRow icon="time-outline" label="Fin prévue" value={new Date(projet.date_fin_prevue).toLocaleDateString('fr-FR')} />
                )}
              </View>
            </View>

            {/* ── Task stats ── */}
            <View style={s.taskStats}>
              {[
                { label: 'Total',    value: taches.length, color: NAVY,      bg: '#dbeafe' },
                { label: 'En cours', value: en_cours,       color: '#d97706', bg: '#fef9c3' },
                { label: 'Terminées',value: termine,        color: '#15803d', bg: '#dcfce7' },
              ].map(({ label, value, color, bg }) => (
                <View key={label} style={[s.taskStat, { backgroundColor: bg }]}>
                  <Text style={[s.taskStatN, { color }]}>{value}</Text>
                  <Text style={[s.taskStatL, { color }]}>{label}</Text>
                </View>
              ))}
            </View>

            {/* ── Tasks list ── */}
            <View style={s.sectionHeader}>
              <View style={s.sectionAccent} />
              <Text style={s.sectionTitle}>Tâches ({taches.length})</Text>
            </View>

            {taches.length > 0 ? (
              taches.map(t => <TaskCard key={t.id} task={t} />)
            ) : (
              <View style={s.emptyWrap}>
                <View style={s.emptyIcon}>
                  <Ionicons name="checkmark-done-outline" size={28} color={NAVY} />
                </View>
                <Text style={s.emptyTitle}>Aucune tâche</Text>
                <Text style={s.emptySub}>Aucune tâche n'a encore été créée pour ce projet.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#e8edf5' },
  loadWrap:  { flex: 1, backgroundColor: '#e8edf5', alignItems: 'center', justifyContent: 'center' },

  // Header
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
               paddingHorizontal: 16, paddingVertical: 12,
               backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5' },
  backBtn:   { width: 34, height: 34, borderRadius: 9, backgroundColor: '#dbeafe',
               alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 15, fontWeight: '700', color: '#0f1f4a', flex: 1,
               textAlign: 'center', marginHorizontal: 8 },

  // Hero card
  heroCard:  { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
               borderWidth: 1, borderColor: '#e8edf5',
               shadowColor: '#0a286e', shadowOpacity: 0.07, shadowRadius: 10,
               shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  heroStripe:{ height: 4, backgroundColor: NAVY },
  heroTitle: { fontSize: 17, fontWeight: '700', color: '#0f1f4a', flex: 1, marginRight: 10 },
  heroDesc:  { fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 14 },

  // Task stats
  taskStats: { flexDirection: 'row', gap: 8 },
  taskStat:  { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  taskStatN: { fontSize: 20, fontWeight: '700' },
  taskStatL: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  // Section header
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionAccent:{ width: 3, height: 16, backgroundColor: NAVY, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f1f4a' },

  // Task card
  taskCard:  { flexDirection: 'row', alignItems: 'center', gap: 10,
               backgroundColor: '#fff', borderRadius: 10, padding: 12,
               borderWidth: 1, borderColor: '#e8edf5', marginBottom: 8,
               shadowColor: '#0a286e', shadowOpacity: 0.04, shadowRadius: 6,
               shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  taskAccent:{ width: 3, alignSelf: 'stretch', borderRadius: 2 },
  taskTitle: { fontSize: 13, fontWeight: '600', color: '#0f1f4a', flex: 1, marginRight: 8 },
  taskMeta:  { fontSize: 11, color: '#94a3b8' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { width: 60, height: 60, borderRadius: 14, backgroundColor: '#dbeafe',
               alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle:{ fontSize: 14, fontWeight: '700', color: '#0f1f4a', marginBottom: 4 },
  emptySub:  { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
});