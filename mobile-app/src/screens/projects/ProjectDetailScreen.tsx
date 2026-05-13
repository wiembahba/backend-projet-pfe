import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';

// ─── Themes ───────────────────────────────────────────────────────────────────
const DARK = {
  bg:          '#0a0f1e',
  surface:     'rgba(255,255,255,0.05)',
  surfaceSolid:'#0d1b3e',
  heroBg:      '#0d1b3e',
  border:      'rgba(255,255,255,0.09)',
  stripe:      '#1d6fd8',
  textPri:     '#e8f4fd',
  textSec:     'rgba(255,255,255,0.55)',
  textMuted:   'rgba(255,255,255,0.30)',
  iconBg:      'rgba(29,111,216,0.20)',
  iconColor:   '#63b3ed',
  badgeBg:     'rgba(29,111,216,0.28)',
  badgeBdr:    'rgba(99,179,237,0.30)',
  badgeTxt:    '#90cdf4',
  rowSep:      'rgba(255,255,255,0.06)',
  statBg:      'rgba(255,255,255,0.05)',
  statBdr:     'rgba(255,255,255,0.08)',
  barBg:       'rgba(255,255,255,0.10)',
  cardShadow:  '#000',
  toggleBg:    'rgba(29,111,216,0.20)',
  toggleBdr:   'rgba(99,179,237,0.30)',
  toggleTxt:   '#90cdf4',
  headerBg:    '#0d1b3e',
  backBg:      'rgba(29,111,216,0.20)',
  backColor:   '#63b3ed',
};

const LIGHT = {
  bg:          '#e8edf5',
  surface:     '#ffffff',
  surfaceSolid:'#ffffff',
  heroBg:      '#ffffff',
  border:      '#e8edf5',
  stripe:      '#0f3494',
  textPri:     '#0f1f4a',
  textSec:     '#64748b',
  textMuted:   '#94a3b8',
  iconBg:      '#dbeafe',
  iconColor:   '#0f3494',
  badgeBg:     '#dbeafe',
  badgeBdr:    '#bfdbfe',
  badgeTxt:    '#0f3494',
  rowSep:      '#e8edf5',
  statBg:      '#ffffff',
  statBdr:     '#e8edf5',
  barBg:       '#e8edf5',
  cardShadow:  '#0a286e',
  toggleBg:    '#dbeafe',
  toggleBdr:   '#bfdbfe',
  toggleTxt:   '#0f3494',
  headerBg:    '#ffffff',
  backBg:      '#dbeafe',
  backColor:   '#0f3494',
};

type Theme = typeof DARK;

// ─── Status map ───────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { bg: string; text: string; border: string; label: string }> = {
  en_cours:   { bg:'#dbeafe', text:'#0f3494', border:'#bfdbfe', label:'En cours'   },
  termine:    { bg:'#dcfce7', text:'#15803d', border:'#bbf7d0', label:'Terminé'    },
  en_attente: { bg:'#fef9c3', text:'#a16207', border:'#fde68a', label:'En attente' },
  en_retard:  { bg:'#fff1f2', text:'#be123c', border:'#fecdd3', label:'En retard'  },
  a_faire:    { bg:'#f1f5f9', text:'#64748b', border:'#e2e8f0', label:'À faire'    },
};

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ status }: { status: string }) {
  const c = STATUS_MAP[status] || { bg:'#f1f5f9', text:'#64748b', border:'#e2e8f0', label:status };
  return (
    <View style={{ backgroundColor:c.bg, borderRadius:6, borderWidth:1, borderColor:c.border, paddingHorizontal:9, paddingVertical:3 }}>
      <Text style={{ color:c.text, fontSize:10, fontWeight:'700' }}>{c.label}</Text>
    </View>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, t }: { value: number; t: Theme }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(anim, { toValue:value, duration:700, useNativeDriver:false }).start(); }, [value]);
  const color = value >= 75 ? '#15803d' : value >= 40 ? '#1d6fd8' : '#be123c';
  const width  = anim.interpolate({ inputRange:[0,100], outputRange:['0%','100%'] });
  return (
    <View>
      <View style={{ height:7, backgroundColor:t.barBg, borderRadius:4, overflow:'hidden' }}>
        <Animated.View style={{ height:7, borderRadius:4, width, backgroundColor:color }} />
      </View>
      <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:5 }}>
        <Text style={{ fontSize:11, color:t.textMuted }}>{value}% complété</Text>
        <Text style={{ fontSize:11, color, fontWeight:'600' }}>
          {value >= 75 ? 'Bon avancement' : value >= 40 ? 'En progression' : 'Faible avancement'}
        </Text>
      </View>
    </View>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, t }: { icon: any; label: string; value: string; t: Theme }) {
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:10, paddingVertical:9, borderBottomWidth:1, borderBottomColor:t.rowSep }}>
      <View style={{ width:28, height:28, borderRadius:7, backgroundColor:t.iconBg, alignItems:'center', justifyContent:'center' }}>
        <Ionicons name={icon} size={13} color={t.iconColor} />
      </View>
      <Text style={{ fontSize:11, color:t.textMuted, width:90 }}>{label}</Text>
      <Text style={{ fontSize:13, color:t.textPri, fontWeight:'500', flex:1 }}>{value}</Text>
    </View>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, t }: { task: any; t: Theme }) {
  const PRIORITY: Record<string, string> = { haute:'🔴', moyenne:'🟡', basse:'🟢' };
  const accentColor = task.statut === 'termine' ? '#15803d' : task.statut === 'en_cours' ? t.stripe : t.textMuted;
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:10, backgroundColor:t.surface, borderRadius:10, padding:12, borderWidth:1, borderColor:t.border, marginBottom:8, shadowColor:t.cardShadow, shadowOpacity:0.08, shadowRadius:8, shadowOffset:{ width:0, height:2 }, elevation:2 }}>
      <View style={{ width:3, alignSelf:'stretch', borderRadius:2, backgroundColor:accentColor }} />
      <View style={{ flex:1 }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
          <Text style={{ fontSize:13, fontWeight:'600', color:t.textPri, flex:1, marginRight:8 }} numberOfLines={1}>{task.titre}</Text>
          <Badge status={task.statut || 'a_faire'} />
        </View>
        <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <Ionicons name="person-outline" size={11} color={t.textMuted} />
            <Text style={{ fontSize:11, color:t.textMuted }}>{task.assigne_nom || 'Non assigné'}</Text>
          </View>
          {task.priorite && (
            <Text style={{ fontSize:11, color:t.textMuted }}>{PRIORITY[task.priorite] || ''} {task.priorite}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function ThemeToggle({ isDark, toggle, t }: { isDark: boolean; toggle: () => void; t: Theme }) {
  return (
    <TouchableOpacity
      onPress={toggle}
      style={{ flexDirection:'row', alignItems:'center', gap:5, backgroundColor:t.toggleBg, borderRadius:20, paddingHorizontal:10, paddingVertical:5, borderWidth:1, borderColor:t.toggleBdr }}
    >
      <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={13} color={t.toggleTxt} />
      <Text style={{ fontSize:10, fontWeight:'700', color:t.toggleTxt }}>{isDark ? 'Dark' : 'Light'}</Text>
    </TouchableOpacity>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProjectDetailScreen() {
  const route      = useRoute<any>();
  const navigation = useNavigation<any>();
  const { token }  = useAuth();
  const { projectId, projectName } = route.params || {};

  const [isDark,   setIsDark]  = useState(true);
  const t = isDark ? DARK : LIGHT;

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
    <SafeAreaView style={{ flex:1, backgroundColor:t.bg, alignItems:'center', justifyContent:'center' }}>
      <ActivityIndicator color={t.stripe} size="large" />
    </SafeAreaView>
  );

  const prog     = projet?.progression || 0;
  const termine  = taches.filter(x => x.statut === 'termine').length;
  const en_cours = taches.filter(x => x.statut === 'en_cours').length;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:t.bg }}>

      {/* ── Header ── */}
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:12, backgroundColor:t.headerBg, borderBottomWidth:1, borderBottomColor:t.border }}>
        <TouchableOpacity style={{ width:34, height:34, borderRadius:9, backgroundColor:t.backBg, alignItems:'center', justifyContent:'center' }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={t.backColor} />
        </TouchableOpacity>
        <Text style={{ fontSize:15, fontWeight:'700', color:t.textPri, flex:1, textAlign:'center', marginHorizontal:8 }} numberOfLines={1}>{projectName || 'Projet'}</Text>
        <ThemeToggle isDark={isDark} toggle={() => setIsDark(v => !v)} t={t} />
      </View>

      <ScrollView contentContainerStyle={{ padding:16, gap:14 }} showsVerticalScrollIndicator={false}>
        {projet && (
          <>
            {/* ── Hero card ── */}
            <View style={{ backgroundColor:t.heroBg, borderRadius:14, overflow:'hidden', borderWidth:1, borderColor:t.border, shadowColor:t.cardShadow, shadowOpacity:0.10, shadowRadius:12, shadowOffset:{ width:0, height:4 }, elevation:4 }}>
              <View style={{ height:4, backgroundColor:t.stripe }} />
              <View style={{ padding:16 }}>
                <View style={{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                  <Text style={{ fontSize:17, fontWeight:'700', color:t.textPri, flex:1, marginRight:10 }}>{projet.nom_projet}</Text>
                  <Badge status={projet.statut} />
                </View>
                {projet.description && (
                  <Text style={{ fontSize:13, color:t.textSec, lineHeight:19, marginBottom:14 }}>{projet.description}</Text>
                )}
                <View style={{ marginBottom:16 }}>
                  <ProgressBar value={prog} t={t} />
                </View>
                {projet.chef_nom && <InfoRow icon="person-outline" label="Chef de projet" value={projet.chef_nom} t={t} />}
                {projet.date_debut && <InfoRow icon="calendar-outline" label="Date début" value={new Date(projet.date_debut).toLocaleDateString('fr-FR')} t={t} />}
                {projet.date_fin_prevue && <InfoRow icon="time-outline" label="Fin prévue" value={new Date(projet.date_fin_prevue).toLocaleDateString('fr-FR')} t={t} />}
              </View>
            </View>

            {/* ── Task stats ── */}
            <View style={{ flexDirection:'row', gap:8 }}>
              {[
                { label:'Total',     value:taches.length, color:t.stripe,   bg:t.statBg, bdr:t.statBdr },
                { label:'En cours',  value:en_cours,       color:'#d97706',  bg:'rgba(217,119,6,0.08)',  bdr:'rgba(217,119,6,0.2)' },
                { label:'Terminées', value:termine,        color:'#15803d',  bg:'rgba(21,128,61,0.08)',  bdr:'rgba(21,128,61,0.2)' },
              ].map(({ label, value, color, bg, bdr }) => (
                <View key={label} style={{ flex:1, borderRadius:10, padding:12, alignItems:'center', backgroundColor:bg, borderWidth:1, borderColor:bdr }}>
                  <Text style={{ fontSize:20, fontWeight:'700', color }}>{value}</Text>
                  <Text style={{ fontSize:10, fontWeight:'600', marginTop:2, color }}>{label}</Text>
                </View>
              ))}
            </View>

            {/* ── Tasks list ── */}
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 }}>
              <View style={{ width:3, height:16, backgroundColor:t.stripe, borderRadius:2 }} />
              <Text style={{ fontSize:14, fontWeight:'700', color:t.textPri }}>Tâches ({taches.length})</Text>
            </View>

            {taches.length > 0 ? (
              taches.map(task => <TaskCard key={task.id} task={task} t={t} />)
            ) : (
              <View style={{ alignItems:'center', paddingVertical:40 }}>
                <View style={{ width:60, height:60, borderRadius:14, backgroundColor:t.iconBg, alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <Ionicons name="checkmark-done-outline" size={28} color={t.iconColor} />
                </View>
                <Text style={{ fontSize:14, fontWeight:'700', color:t.textPri, marginBottom:4 }}>Aucune tâche</Text>
                <Text style={{ fontSize:12, color:t.textMuted, textAlign:'center', lineHeight:18 }}>Aucune tâche n'a encore été créée pour ce projet.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}