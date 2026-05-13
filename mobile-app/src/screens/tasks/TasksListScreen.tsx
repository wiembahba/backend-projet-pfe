import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  SafeAreaView, TextInput, RefreshControl, ActivityIndicator,
  Modal, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';

// ─── Themes ───────────────────────────────────────────────────────────────────
const DARK = {
  bg:           '#0a0f1e',
  surface:      'rgba(255,255,255,0.05)',
  surfaceSolid: '#0d1b3e',
  border:       'rgba(255,255,255,0.09)',
  stripe:       '#1d6fd8',
  textPri:      '#e8f4fd',
  textSec:      'rgba(255,255,255,0.55)',
  textMuted:    'rgba(255,255,255,0.30)',
  iconBg:       'rgba(29,111,216,0.20)',
  iconColor:    '#63b3ed',
  badgeBg:      'rgba(29,111,216,0.28)',
  badgeBdr:     'rgba(99,179,237,0.30)',
  badgeTxt:     '#90cdf4',
  searchBg:     'rgba(255,255,255,0.06)',
  searchBdr:    'rgba(255,255,255,0.12)',
  chipBg:       'rgba(255,255,255,0.07)',
  chipBdr:      'rgba(255,255,255,0.12)',
  chipActive:   '#1d6fd8',
  statBg:       'rgba(255,255,255,0.05)',
  statBdr:      'rgba(255,255,255,0.08)',
  rowSep:       'rgba(255,255,255,0.06)',
  trackBg:      'rgba(255,255,255,0.10)',
  inputBg:      'rgba(255,255,255,0.06)',
  inputBdr:     'rgba(255,255,255,0.12)',
  cardShadow:   '#000',
  overlay:      'rgba(0,0,0,0.7)',
  modalBg:      '#0a0f1e',
  sectionBg:    'rgba(255,255,255,0.04)',
  toggleBg:     'rgba(29,111,216,0.20)',
  toggleBdr:    'rgba(99,179,237,0.30)',
  toggleTxt:    '#90cdf4',
  avatarBg:     '#1d6fd8',
  subtaskBg:    'rgba(255,255,255,0.04)',
  subtaskBdr:   'rgba(255,255,255,0.08)',
  checkBdr:     'rgba(255,255,255,0.25)',
  countPillBg:  'rgba(29,111,216,0.25)',
  countPillTxt: '#90cdf4',
  hintColor:    '#63b3ed',
  saveBg:       '#1d6fd8',
  deleteBg:     'rgba(190,18,60,0.12)',
  deleteBdr:    'rgba(190,18,60,0.30)',
  deleteTxt:    '#fca5a5',
  commentBg:    'rgba(255,255,255,0.04)',
  commentBdr:   'rgba(255,255,255,0.08)',
  sendBg:       '#1d6fd8',
};

const LIGHT = {
  bg:           '#f1f5f9',
  surface:      '#ffffff',
  surfaceSolid: '#ffffff',
  border:       '#e2e8f0',
  stripe:       '#1e40af',
  textPri:      '#0f172a',
  textSec:      '#475569',
  textMuted:    '#94a3b8',
  iconBg:       '#eff6ff',
  iconColor:    '#1e40af',
  badgeBg:      '#dbeafe',
  badgeBdr:     '#bfdbfe',
  badgeTxt:     '#1e40af',
  searchBg:     '#ffffff',
  searchBdr:    '#e2e8f0',
  chipBg:       '#ffffff',
  chipBdr:      '#e2e8f0',
  chipActive:   '#0c1a3a',
  statBg:       '#ffffff',
  statBdr:      '#f1f5f9',
  rowSep:       '#f1f5f9',
  trackBg:      '#f1f5f9',
  inputBg:      '#f8fafc',
  inputBdr:     '#e2e8f0',
  cardShadow:   '#000',
  overlay:      'rgba(0,0,0,0.45)',
  modalBg:      '#ffffff',
  sectionBg:    '#f8fafc',
  toggleBg:     '#dbeafe',
  toggleBdr:    '#bfdbfe',
  toggleTxt:    '#1e40af',
  avatarBg:     '#1e40af',
  subtaskBg:    '#ffffff',
  subtaskBdr:   '#e2e8f0',
  checkBdr:     '#cbd5e1',
  countPillBg:  '#dbeafe',
  countPillTxt: '#1e40af',
  hintColor:    '#1e40af',
  saveBg:       '#0c1a3a',
  deleteBg:     '#fff1f2',
  deleteBdr:    '#fecdd3',
  deleteTxt:    '#e11d48',
  commentBg:    '#ffffff',
  commentBdr:   '#f1f5f9',
  sendBg:       '#0c1a3a',
};

type Theme = typeof DARK;

// ─── Status / Priority config ─────────────────────────────────────────────────
const STATUT_LABELS: Record<string, string> = {
  a_faire:'À faire', en_cours:'En cours', termine:'Terminé',
};
const PRIO_LABELS: Record<string, string> = {
  haute:'Haute', moyenne:'Moyenne', faible:'Basse',
};

const STATUT_COLORS = {
  a_faire:  { bg:'#f1f5f9', text:'#475569', darkBg:'rgba(148,163,184,0.15)', darkText:'#cbd5e1', darkBdr:'rgba(148,163,184,0.25)' },
  en_cours: { bg:'#dbeafe', text:'#1e40af', darkBg:'rgba(59,130,246,0.18)',  darkText:'#93c5fd', darkBdr:'rgba(59,130,246,0.35)'  },
  termine:  { bg:'#f0fdf4', text:'#15803d', darkBg:'rgba(34,197,94,0.15)',   darkText:'#86efac', darkBdr:'rgba(34,197,94,0.30)'   },
};
const PRIO_COLORS = {
  haute:   { bg:'#fff1f2', text:'#e11d48', darkBg:'rgba(225,29,72,0.15)',   darkText:'#fca5a5', darkBdr:'rgba(225,29,72,0.30)'   },
  moyenne: { bg:'#fffbeb', text:'#b45309', darkBg:'rgba(245,158,11,0.15)',  darkText:'#fcd34d', darkBdr:'rgba(245,158,11,0.30)'  },
  faible:  { bg:'#f0fdf4', text:'#15803d', darkBg:'rgba(34,197,94,0.12)',   darkText:'#86efac', darkBdr:'rgba(34,197,94,0.25)'   },
};

const API_URL = 'http://localhost:5000/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SubTask { id:number; titre:string; description?:string; termine:boolean; }
interface Comment { id:number; auteur_nom:string; texte:string; created_at:string; user_id:number; }
interface AnalyseAvancement { conseil:string; avancement_recommande:string; statut_risque:string; }
interface Task {
  id:number; titre:string; description?:string;
  projet_id:number; nom_projet:string;
  assigne_a:number; assigne_nom:string; chef_nom?:string;
  priorite:string; statut:string;
  date_debut?:string; date_echeance:string;
  progression:number; alerte?:string;
  commentaires?:Comment[];
  analyse_avancement?:AnalyseAvancement;
  subtasks?:SubTask[];
}

const calcProgression = (st:SubTask[]) =>
  st.length === 0 ? 0 : Math.round(st.filter(s => s.termine).length / st.length * 100);
const fmtDate = (d:string) =>
  new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function ThemeToggle({ isDark, toggle, t }: { isDark:boolean; toggle:()=>void; t:Theme }) {
  return (
    <TouchableOpacity onPress={toggle}
      style={{ flexDirection:'row', alignItems:'center', gap:5, backgroundColor:t.toggleBg, borderRadius:20, paddingHorizontal:10, paddingVertical:5, borderWidth:1, borderColor:t.toggleBdr }}>
      <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={13} color={t.toggleTxt} />
      <Text style={{ fontSize:10, fontWeight:'700', color:t.toggleTxt }}>{isDark ? 'Dark' : 'Light'}</Text>
    </TouchableOpacity>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ statut, isDark }: { statut:string; isDark:boolean }) {
  const c = STATUT_COLORS[statut as keyof typeof STATUT_COLORS] || STATUT_COLORS.a_faire;
  const bg   = isDark ? c.darkBg  : c.bg;
  const text = isDark ? c.darkText : c.text;
  const bdr  = isDark ? c.darkBdr  : c.bg;
  return (
    <View style={{ backgroundColor:bg, borderRadius:20, borderWidth:1, borderColor:bdr, paddingHorizontal:9, paddingVertical:3 }}>
      <Text style={{ fontSize:10, fontWeight:'700', color:text }}>{STATUT_LABELS[statut] || statut}</Text>
    </View>
  );
}

function PrioBadge({ priorite, isDark }: { priorite:string; isDark:boolean }) {
  const c = PRIO_COLORS[priorite as keyof typeof PRIO_COLORS] || PRIO_COLORS.faible;
  const bg   = isDark ? c.darkBg  : c.bg;
  const text = isDark ? c.darkText : c.text;
  const bdr  = isDark ? c.darkBdr  : c.bg;
  return (
    <View style={{ backgroundColor:bg, borderRadius:20, borderWidth:1, borderColor:bdr, paddingHorizontal:9, paddingVertical:3 }}>
      <Text style={{ fontSize:10, fontWeight:'700', color:text }}>{PRIO_LABELS[priorite] || priorite}</Text>
    </View>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ item, isDark, t, isChef, isAdmin, onOpen, onStatusChange }: {
  item:Task; isDark:boolean; t:Theme; isChef:boolean; isAdmin:boolean;
  onOpen():void; onStatusChange(id:number, s:string):void;
}) {
  const itemProg = (item.subtasks && item.subtasks.length > 0)
    ? calcProgression(item.subtasks) : item.progression;
  const prioColor = PRIO_COLORS[item.priorite as keyof typeof PRIO_COLORS];
  const accentLeft = isDark ? (prioColor?.darkBdr || 'transparent') : (prioColor?.text || 'transparent');

  return (
    <TouchableOpacity onPress={onOpen} activeOpacity={0.75}
      style={{ backgroundColor:t.surface, borderRadius:16, padding:14, borderWidth:1, borderColor:t.border,
        borderLeftWidth: item.priorite === 'haute' ? 3 : 1,
        borderLeftColor: item.priorite === 'haute' ? accentLeft : t.border,
        shadowColor:t.cardShadow, shadowOpacity:0.07, shadowRadius:10,
        shadowOffset:{ width:0, height:3 }, elevation:3 }}>

      {/* Title + badges */}
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
        <Text style={{ fontSize:14, fontWeight:'700', color:t.textPri, flex:1, marginRight:10, lineHeight:20 }} numberOfLines={2}>
          {item.titre}
        </Text>
        <View style={{ gap:4, alignItems:'flex-end' }}>
          <StatusBadge statut={item.statut} isDark={isDark} />
          <PrioBadge   priorite={item.priorite} isDark={isDark} />
        </View>
      </View>

      <Text style={{ fontSize:10, color:t.textMuted, marginBottom:8 }}>T-{item.id}</Text>

      {/* Meta */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginBottom:3 }}>
        <Ionicons name="folder-outline" size={12} color={t.textMuted} />
        <Text style={{ fontSize:12, color:t.textSec }}>{item.nom_projet || '—'}</Text>
      </View>
      <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginBottom:3 }}>
        <Ionicons name="person-outline" size={12} color={t.textMuted} />
        <Text style={{ fontSize:12, color:t.textSec }}>
          {(isChef || isAdmin) ? (item.assigne_nom || 'Non assigné') : (item.chef_nom || '—')}
        </Text>
      </View>
      <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginBottom:10 }}>
        <Ionicons name="calendar-outline" size={12} color={t.textMuted} />
        <Text style={{ fontSize:12, color:t.textSec }}>{fmtDate(item.date_echeance)}</Text>
        {item.alerte === 'en_retard' && <Text style={{ color:'#ef4444', fontSize:11, marginLeft:2 }}>⚠️</Text>}
      </View>

      {/* Progress */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
        <View style={{ flex:1, height:5, backgroundColor:t.trackBg, borderRadius:99, overflow:'hidden' }}>
          <View style={{ height:5, borderRadius:99, width:`${itemProg}%` as any,
            backgroundColor: itemProg === 100 ? '#22c55e' : t.stripe }} />
        </View>
        <Text style={{ fontSize:11, color:t.textMuted, minWidth:30, textAlign:'right' }}>{itemProg}%</Text>
      </View>

      {/* Quick status */}
      <View style={{ flexDirection:'row', gap:6 }}>
        {['a_faire','en_cours','termine'].map(st => {
          const active = item.statut === st;
          const sc = STATUT_COLORS[st as keyof typeof STATUT_COLORS];
          return (
            <TouchableOpacity key={st}
              style={{ flex:1, paddingVertical:5, borderRadius:20, borderWidth:1,
                borderColor: active ? (isDark ? sc.darkBdr : sc.text) : t.border,
                backgroundColor: active ? (isDark ? sc.darkBg : sc.bg) : t.chipBg,
                alignItems:'center' }}
              onPress={() => onStatusChange(item.id, st)}>
              <Text style={{ fontSize:10, fontWeight: active ? '700' : '500',
                color: active ? (isDark ? sc.darkText : sc.text) : t.textMuted }}>
                {STATUT_LABELS[st]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TasksListScreen() {
  const { token, isChef, isAdmin, user } = useAuth();

  const [isDark,      setIsDark]      = useState(true);
  const t = isDark ? DARK : LIGHT;

  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [filtered,     setFiltered]     = useState<Task[]>([]);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  const [selectedTask,      setSelectedTask]      = useState<Task | null>(null);
  const [subtasks,          setSubtasks]          = useState<SubTask[]>([]);
  const [tempStatut,        setTempStatut]        = useState('');
  const [tempProgression,   setTempProgression]   = useState(0);
  const [newComment,        setNewComment]        = useState('');
  const [newSubtaskTitle,   setNewSubtaskTitle]   = useState('');
  const [saving,            setSaving]            = useState(false);
  const [showDetail,        setShowDetail]        = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      const endpoint = (isChef || isAdmin) ? '/projets/taches/toutes' : '/projets/taches/mes-taches';
      const d = await apiFetch(endpoint, token);
      if (d.success) setTasks(d.taches || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, isChef, isAdmin]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    let res = [...tasks];
    if (filterStatus !== 'all') res = res.filter(t => t.statut === filterStatus);
    if (search) res = res.filter(t => t.titre.toLowerCase().includes(search.toLowerCase()));
    setFiltered(res);
  }, [tasks, filterStatus, search]);

  // ── Open detail ───────────────────────────────────────────────────────────
  const openDetail = async (taskId: number) => {
    try {
      const [dr, sr] = await Promise.all([
        fetch(`${API_URL}/projets/taches/${taskId}`, { headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`${API_URL}/projets/taches/${taskId}/sous-taches`, { headers:{ Authorization:`Bearer ${token}` } }),
      ]);
      const [dd, sd] = await Promise.all([dr.json(), sr.json()]);
      if (dd.success) { setSelectedTask(dd.tache); setTempStatut(dd.tache.statut); setTempProgression(dd.tache.progression); }
      if (sd.success) {
        setSubtasks(sd.sous_taches);
        if (sd.sous_taches.length > 0) {
          const p = calcProgression(sd.sous_taches);
          setTempProgression(p);
          setTempStatut(p === 100 ? 'termine' : p > 0 ? 'en_cours' : 'a_faire');
        }
      }
      setNewComment(''); setNewSubtaskTitle('');
      setShowDetail(true);
    } catch (e) { console.error(e); }
  };

  const closeDetail = () => { setShowDetail(false); setSelectedTask(null); fetchTasks(); };

  // ── Subtasks ──────────────────────────────────────────────────────────────
  const refreshSubtasks = async (taskId: number) => {
    const sr = await fetch(`${API_URL}/projets/taches/${taskId}/sous-taches`, { headers:{ Authorization:`Bearer ${token}` } });
    const sd = await sr.json();
    if (sd.success) {
      setSubtasks(sd.sous_taches);
      const p = calcProgression(sd.sous_taches);
      setTempProgression(p);
      setTempStatut(p === 100 ? 'termine' : p > 0 ? 'en_cours' : 'a_faire');
    }
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || !selectedTask) return;
    try {
      const r = await fetch(`${API_URL}/projets/taches/${selectedTask.id}/sous-taches`, {
        method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ titre:newSubtaskTitle.trim() }),
      });
      const d = await r.json();
      if (d.success) { setNewSubtaskTitle(''); await refreshSubtasks(selectedTask.id); }
      else Alert.alert('Erreur', d.message);
    } catch { Alert.alert('Erreur', 'Connexion impossible'); }
  };

  const toggleSubtask = async (subtaskId: number) => {
    if (!selectedTask) return;
    await fetch(`${API_URL}/projets/taches/${selectedTask.id}/sous-taches/${subtaskId}/toggle`, {
      method:'PUT', headers:{ Authorization:`Bearer ${token}` },
    });
    await refreshSubtasks(selectedTask.id);
  };

  const deleteSubtask = (subtaskId: number) => {
    Alert.alert('Supprimer', 'Supprimer cette sous-tâche ?', [
      { text:'Annuler', style:'cancel' },
      { text:'Supprimer', style:'destructive', onPress: async () => {
        if (!selectedTask) return;
        await fetch(`${API_URL}/projets/taches/${selectedTask.id}/sous-taches/${subtaskId}`, {
          method:'DELETE', headers:{ Authorization:`Bearer ${token}` },
        });
        await refreshSubtasks(selectedTask.id);
      }},
    ]);
  };

  // ── Avancement ────────────────────────────────────────────────────────────
  const handleSaveChanges = async () => {
    if (!selectedTask) return;
    setSaving(true);
    try {
      await Promise.all([
        fetch(`${API_URL}/projets/taches/${selectedTask.id}/progression`, {
          method:'PUT', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
          body: JSON.stringify({ progression:tempProgression }),
        }),
        fetch(`${API_URL}/projets/taches/${selectedTask.id}/status`, {
          method:'PUT', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
          body: JSON.stringify({ statut:tempStatut, progression:tempProgression }),
        }),
      ]);
      Alert.alert('✅', `Avancement mis à jour : ${tempProgression}%`);
      fetchTasks();
    } catch { Alert.alert('Erreur', 'Sauvegarde impossible'); }
    finally { setSaving(false); }
  };

  // ── Comments ──────────────────────────────────────────────────────────────
  const refreshComments = async (taskId: number) => {
    const dr = await fetch(`${API_URL}/projets/taches/${taskId}`, { headers:{ Authorization:`Bearer ${token}` } });
    const dd = await dr.json();
    if (dd.success) setSelectedTask(dd.tache);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    try {
      const r = await fetch(`${API_URL}/projets/taches/${selectedTask.id}/commentaires`, {
        method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ tache_id:selectedTask.id, commentaire:newComment.trim() }),
      });
      const d = await r.json();
      if (r.ok && d.success) { setNewComment(''); await refreshComments(selectedTask.id); }
      else Alert.alert('Erreur', d.message);
    } catch { Alert.alert('Erreur', 'Connexion impossible'); }
  };

  const handleDeleteComment = (commentId: number) => {
    Alert.alert('Supprimer', 'Supprimer ce commentaire ?', [
      { text:'Annuler', style:'cancel' },
      { text:'Supprimer', style:'destructive', onPress: async () => {
        if (!selectedTask) return;
        await fetch(`${API_URL}/projets/commentaires/${commentId}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
        await refreshComments(selectedTask.id);
      }},
    ]);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Supprimer', 'Confirmer la suppression de cette tâche ?', [
      { text:'Annuler', style:'cancel' },
      { text:'Supprimer', style:'destructive', onPress: async () => {
        await fetch(`${API_URL}/projets/taches/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
        closeDetail();
      }},
    ]);
  };

  const handleStatusChange = async (taskId: number, newStatut: string) => {
    const prog = newStatut === 'termine' ? 100 : newStatut === 'en_cours' ? 25 : 0;
    await fetch(`${API_URL}/projets/taches/${taskId}/status`, {
      method:'PUT', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ statut:newStatut, progression:prog }),
    });
    fetchTasks();
  };

  const prog = subtasks.length > 0 ? calcProgression(subtasks) : tempProgression;

  if (loading) return (
    <SafeAreaView style={{ flex:1, backgroundColor:t.bg, alignItems:'center', justifyContent:'center' }}>
      <ActivityIndicator size="large" color={t.stripe} />
      <Text style={{ color:t.textMuted, marginTop:16, fontSize:14, fontWeight:'500' }}>Chargement des tâches...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:t.bg }}>

      {/* ── Header ── */}
      <View style={{ backgroundColor:t.surfaceSolid, padding:16, paddingBottom:14, borderBottomWidth:1, borderBottomColor:t.border, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <View>
          <Text style={{ fontSize:10, fontWeight:'700', color:t.textMuted, letterSpacing:1.4, marginBottom:2, textTransform:'uppercase' }}>GESTION</Text>
          <Text style={{ fontSize:22, fontWeight:'800', color:t.textPri }}>{(isChef || isAdmin) ? 'Toutes les tâches' : 'Mes tâches'}</Text>
          <Text style={{ fontSize:12, color:t.textMuted, marginTop:2 }}>{tasks.length} tâches au total</Text>
        </View>
        <ThemeToggle isDark={isDark} toggle={() => setIsDark(v => !v)} t={t} />
      </View>

      {/* ── Search + Filters ── */}
      <View style={{ backgroundColor:t.surfaceSolid, paddingHorizontal:14, paddingVertical:12, borderBottomWidth:1, borderBottomColor:t.border }}>
        <View style={{ flexDirection:'row', alignItems:'center', backgroundColor:t.searchBg, borderRadius:10, paddingHorizontal:12, height:40, borderWidth:1, borderColor:t.searchBdr }}>
          <Ionicons name="search-outline" size={16} color={t.textMuted} style={{ marginRight:8 }} />
          <TextInput style={{ flex:1, fontSize:14, color:t.textPri }} placeholder="Rechercher une tâche..."
            placeholderTextColor={t.textMuted} value={search} onChangeText={setSearch} />
          {!!search && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={t.textMuted} /></TouchableOpacity>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:10 }}>
          <View style={{ flexDirection:'row', gap:8 }}>
            {[
              { value:'all',      label:'Tous les statuts' },
              { value:'a_faire',  label:'À faire' },
              { value:'en_cours', label:'En cours' },
              { value:'termine',  label:'Terminé' },
            ].map(f => (
              <TouchableOpacity key={f.value}
                style={{ paddingHorizontal:14, paddingVertical:6, borderRadius:20, borderWidth:1,
                  borderColor: filterStatus === f.value ? t.chipActive : t.chipBdr,
                  backgroundColor: filterStatus === f.value ? t.chipActive : t.chipBg }}
                onPress={() => setFilterStatus(f.value)}>
                <Text style={{ fontSize:12, fontWeight:'600', color: filterStatus === f.value ? '#fff' : t.textSec }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        renderItem={({ item }) => (
          <TaskCard item={item} isDark={isDark} t={t} isChef={isChef} isAdmin={isAdmin}
            onOpen={() => openDetail(item.id)}
            onStatusChange={handleStatusChange}
          />
        )}
        contentContainerStyle={{ padding:14, gap:10, paddingBottom:30 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={t.stripe} onRefresh={() => { setRefreshing(true); fetchTasks(); }} />}
        ListEmptyComponent={
          <View style={{ alignItems:'center', marginTop:60, paddingHorizontal:32 }}>
            <View style={{ width:64, height:64, borderRadius:16, backgroundColor:t.iconBg, alignItems:'center', justifyContent:'center', marginBottom:14 }}>
              <Ionicons name="document-outline" size={32} color={t.iconColor} />
            </View>
            <Text style={{ fontSize:15, fontWeight:'700', color:t.textPri, marginBottom:6 }}>Aucune tâche trouvée</Text>
            <Text style={{ fontSize:12, color:t.textMuted, textAlign:'center' }}>Essayez un autre filtre ou terme de recherche.</Text>
          </View>
        }
      />

      {/* ════ DETAIL MODAL ════ */}
      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeDetail}>
        <SafeAreaView style={{ flex:1, backgroundColor:t.modalBg }}>
          <ScrollView contentContainerStyle={{ padding:20, paddingBottom:50 }} keyboardShouldPersistTaps="handled">
            {selectedTask && (
              <>
                {/* Modal Header */}
                <View style={{ flexDirection:'row', alignItems:'flex-start', marginBottom:16 }}>
                  <View style={{ flex:1, marginRight:12 }}>
                    <Text style={{ fontSize:17, fontWeight:'800', color:t.textPri, letterSpacing:-0.3 }}>{selectedTask.titre}</Text>
                    <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:10, alignItems:'center' }}>
                      <PrioBadge priorite={selectedTask.priorite} isDark={isDark} />
                      <Text style={{ fontSize:12, color:t.textMuted }}>
                        Assigné à : <Text style={{ fontWeight:'700', color:t.textSec }}>{selectedTask.assigne_nom}</Text>
                      </Text>
                      <Text style={{ fontSize:12, color:t.textMuted }}>
                        Échéance : <Text style={{ fontWeight:'700', color:t.textSec }}>{fmtDate(selectedTask.date_echeance)}</Text>
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={closeDetail}
                    style={{ width:32, height:32, backgroundColor:t.statBg, borderRadius:8, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:t.border }}>
                    <Ionicons name="close" size={18} color={t.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Description */}
                {selectedTask.description ? (
                  <View style={{ backgroundColor:t.sectionBg, borderRadius:12, padding:14, marginBottom:14, borderWidth:1, borderColor:t.border }}>
                    <Text style={{ fontSize:13, color:t.textSec, lineHeight:20 }}>{selectedTask.description}</Text>
                  </View>
                ) : null}

                {/* Analyse avancement */}
                {selectedTask.analyse_avancement && (() => {
                  const risk = selectedTask.analyse_avancement!.statut_risque;
                  const bg  = risk === 'en_retard' ? (isDark ? 'rgba(225,29,72,0.12)' : '#fff1f2') : risk === 'deadline_proche' ? (isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb') : (isDark ? 'rgba(34,197,94,0.10)' : '#f0fdf4');
                  const bdr = risk === 'en_retard' ? (isDark ? 'rgba(225,29,72,0.30)' : '#fecdd3') : (isDark ? 'rgba(245,158,11,0.30)' : '#fde68a');
                  return (
                    <View style={{ borderRadius:12, padding:12, marginBottom:14, borderWidth:1, backgroundColor:bg, borderColor:bdr }}>
                      <Text style={{ fontSize:12, color:t.textSec }}>📊 {selectedTask.analyse_avancement!.conseil}</Text>
                      <Text style={{ fontSize:11, color: isDark ? '#86efac' : '#15803d', marginTop:4 }}>
                        Recommandé : {selectedTask.analyse_avancement!.avancement_recommande}
                      </Text>
                    </View>
                  );
                })()}

                {/* ── SOUS-TÂCHES ── */}
                <View style={{ backgroundColor:t.sectionBg, borderRadius:14, padding:16, marginBottom:14, borderWidth:1, borderColor:t.border }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:14 }}>
                    <View style={{ width:3, height:16, backgroundColor:t.stripe, borderRadius:99 }} />
                    <Text style={{ fontSize:13, fontWeight:'700', color:t.textPri }}>Sous-tâches</Text>
                    <View style={{ backgroundColor:t.countPillBg, paddingHorizontal:8, paddingVertical:2, borderRadius:20 }}>
                      <Text style={{ fontSize:11, fontWeight:'700', color:t.countPillTxt }}>
                        {subtasks.filter(s => s.termine).length}/{subtasks.length}
                      </Text>
                    </View>
                    {subtasks.length > 0 && (
                      <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginLeft:'auto' as any }}>
                        <View style={{ width:80, height:6, backgroundColor:t.trackBg, borderRadius:3, overflow:'hidden' }}>
                          <View style={{ height:6, borderRadius:3, width:`${prog}%` as any, backgroundColor: prog === 100 ? '#22c55e' : t.stripe }} />
                        </View>
                        <Text style={{ fontSize:12, fontWeight:'700', color: prog === 100 ? '#22c55e' : t.stripe }}>{prog}%</Text>
                      </View>
                    )}
                  </View>

                  {subtasks.length === 0 ? (
                    <Text style={{ fontSize:12, color:t.textMuted, textAlign:'center', paddingVertical:12 }}>
                      {(isChef || isAdmin) ? '👁️ Aucune sous-tâche' : 'Aucune sous-tâche — ajoutez-en ci-dessous'}
                    </Text>
                  ) : subtasks.map(sub => (
                    <View key={sub.id} style={{ flexDirection:'row', alignItems:'flex-start', gap:10, padding:10, backgroundColor:t.subtaskBg, borderRadius:10, marginBottom:6, borderWidth:1, borderColor: sub.termine ? (isDark ? 'rgba(34,197,94,0.30)' : '#bbf7d0') : t.subtaskBdr }}>
                      <TouchableOpacity
                        style={{ width:22, height:22, borderRadius:6, borderWidth:1.5, borderColor: sub.termine ? '#22c55e' : t.checkBdr, backgroundColor: sub.termine ? '#22c55e' : 'transparent', alignItems:'center', justifyContent:'center', marginTop:1 }}
                        onPress={() => toggleSubtask(sub.id)}>
                        {sub.termine && <Ionicons name="checkmark" size={13} color="#fff" />}
                      </TouchableOpacity>
                      <View style={{ flex:1 }}>
                        <Text style={{ fontSize:13, fontWeight:'500', color: sub.termine ? t.textMuted : t.textPri, lineHeight:18, textDecorationLine: sub.termine ? 'line-through' : 'none' }}>
                          {sub.titre}
                        </Text>
                        {sub.description ? (
                          <View style={{ marginTop:4, paddingLeft:8, borderLeftWidth:2, borderLeftColor:t.stripe, backgroundColor:t.sectionBg, borderRadius:4, padding:5 }}>
                            <Text style={{ fontSize:11, color:t.textMuted }}>📝 {sub.description}</Text>
                          </View>
                        ) : null}
                      </View>
                      {!(isChef || isAdmin) && (
                        <TouchableOpacity onPress={() => deleteSubtask(sub.id)} style={{ padding:4 }}>
                          <Ionicons name="close" size={14} color={t.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {!(isChef || isAdmin) ? (
                    <>
                      <View style={{ flexDirection:'row', gap:8, marginTop:4 }}>
                        <TextInput
                          style={{ flex:1, height:38, borderRadius:10, borderWidth:1, borderColor:t.inputBdr, backgroundColor:t.inputBg, paddingHorizontal:12, fontSize:13, color:t.textPri }}
                          placeholder="Titre de la sous-tâche..." placeholderTextColor={t.textMuted}
                          value={newSubtaskTitle} onChangeText={setNewSubtaskTitle}
                          onSubmitEditing={addSubtask} returnKeyType="done" />
                        <TouchableOpacity
                          style={{ paddingHorizontal:14, height:38, borderRadius:10, backgroundColor: newSubtaskTitle.trim() ? t.stripe : t.statBg, alignItems:'center', justifyContent:'center' }}
                          onPress={addSubtask} disabled={!newSubtaskTitle.trim()}>
                          <Text style={{ fontSize:13, fontWeight:'700', color:'#fff' }}>+ Ajouter</Text>
                        </TouchableOpacity>
                      </View>
                      {subtasks.length > 0 && (
                        <Text style={{ fontSize:11, color:t.hintColor, fontWeight:'600', marginTop:8 }}>
                          💡 L'avancement se calcule automatiquement depuis les sous-tâches
                        </Text>
                      )}
                    </>
                  ) : (
                    <View style={{ padding:10, backgroundColor:t.statBg, borderRadius:8, borderWidth:1, borderColor:t.border, marginTop:8 }}>
                      <Text style={{ fontSize:11, color:t.textMuted, textAlign:'center', fontStyle:'italic' }}>
                        👁️ Les sous-tâches sont gérées uniquement par l'employé
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── AVANCEMENT ── */}
                <View style={{ backgroundColor:t.sectionBg, borderRadius:14, padding:16, marginBottom:14, borderWidth:1, borderColor:t.border }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:14 }}>
                    <View style={{ width:3, height:16, backgroundColor:'#22c55e', borderRadius:99 }} />
                    <Text style={{ fontSize:13, fontWeight:'700', color:t.textPri }}>Avancement de la tâche</Text>
                  </View>

                  <Text style={{ fontSize:11, fontWeight:'700', color:t.textMuted, textTransform:'uppercase', letterSpacing:0.6, marginBottom:8 }}>Statut</Text>
                  <View style={{ flexDirection:'row', gap:8, marginBottom:4 }}>
                    {[{ value:'a_faire', label:'À faire' },{ value:'en_cours', label:'En cours' },{ value:'termine', label:'Terminé' }].map(opt => {
                      const active = tempStatut === opt.value;
                      const sc = STATUT_COLORS[opt.value as keyof typeof STATUT_COLORS];
                      return (
                        <TouchableOpacity key={opt.value}
                          style={{ flex:1, paddingVertical:8, borderRadius:10, borderWidth:2,
                            borderColor: active ? (isDark ? sc.darkBdr : sc.text) : t.border,
                            backgroundColor: active ? (isDark ? sc.darkBg : sc.bg) : t.inputBg,
                            alignItems:'center', opacity: subtasks.length > 0 ? 0.5 : 1 }}
                          onPress={() => {
                            if (subtasks.length > 0) return;
                            setTempStatut(opt.value);
                            if (opt.value === 'termine') setTempProgression(100);
                            else if (opt.value === 'a_faire') setTempProgression(0);
                            else if (tempProgression === 0) setTempProgression(25);
                          }}
                          disabled={subtasks.length > 0}>
                          <Text style={{ fontSize:12, fontWeight: active ? '700' : '500', color: active ? (isDark ? sc.darkText : sc.text) : t.textMuted }}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {subtasks.length > 0 && (
                    <Text style={{ fontSize:11, color: isDark ? '#fcd34d' : '#b45309', fontWeight:'600', marginBottom:12 }}>
                      ⚡ Statut géré automatiquement par les sous-tâches
                    </Text>
                  )}

                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:14, marginBottom:8 }}>
                    <Text style={{ fontSize:11, fontWeight:'700', color:t.textMuted, textTransform:'uppercase', letterSpacing:0.6 }}>Avancement</Text>
                    <Text style={{ fontSize:22, fontWeight:'800', letterSpacing:-1, color: prog === 100 ? '#22c55e' : t.stripe }}>{prog}%</Text>
                  </View>

                  {subtasks.length > 0 ? (
                    <>
                      <View style={{ height:10, backgroundColor:t.trackBg, borderRadius:5, overflow:'hidden', marginBottom:8 }}>
                        <View style={{ height:10, borderRadius:5, width:`${prog}%` as any, backgroundColor: prog === 100 ? '#22c55e' : t.stripe }} />
                      </View>
                      <View style={{ flexDirection:'row', gap:3, marginBottom:6 }}>
                        {subtasks.map(sub => (
                          <View key={sub.id} style={{ flex:1, height:4, borderRadius:99, backgroundColor: sub.termine ? '#22c55e' : t.statBdr }} />
                        ))}
                      </View>
                      <Text style={{ fontSize:11, color:t.textMuted, marginTop:4 }}>
                        {subtasks.filter(s => s.termine).length} / {subtasks.length} sous-tâches terminées
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={{ height:6, backgroundColor:t.trackBg, borderRadius:99, overflow:'hidden', marginBottom:10 }}>
                        <View style={{ height:6, borderRadius:99, width:`${tempProgression}%` as any, backgroundColor: tempProgression === 100 ? '#22c55e' : t.stripe }} />
                      </View>
                      <View style={{ flexDirection:'row', gap:6 }}>
                        {[0,25,50,75,100].map(v => (
                          <TouchableOpacity key={v}
                            style={{ flex:1, paddingVertical:6, borderRadius:8, borderWidth:1,
                              borderColor: tempProgression === v ? t.stripe : t.border,
                              backgroundColor: tempProgression === v ? t.stripe : t.inputBg,
                              alignItems:'center' }}
                            onPress={() => { setTempProgression(v); setTempStatut(v === 100 ? 'termine' : v > 0 ? 'en_cours' : 'a_faire'); }}>
                            <Text style={{ fontSize:12, fontWeight: tempProgression === v ? '700' : '500', color: tempProgression === v ? '#fff' : t.textSec }}>
                              {v}%
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  <TouchableOpacity
                    style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', padding:13, backgroundColor: saving ? t.statBg : t.saveBg, borderRadius:10, marginTop:14, opacity: saving ? 0.6 : 1 }}
                    onPress={handleSaveChanges} disabled={saving}>
                    <Ionicons name="save-outline" size={15} color="#fff" style={{ marginRight:8 }} />
                    <Text style={{ color:'#fff', fontSize:13, fontWeight:'700' }}>
                      {saving ? '⏳ Enregistrement...' : '💾 Enregistrer les modifications'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ── COMMENTAIRES ── */}
                <View style={{ backgroundColor:t.sectionBg, borderRadius:14, padding:16, marginBottom:14, borderWidth:1, borderColor:t.border }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:14 }}>
                    <View style={{ width:3, height:16, backgroundColor:t.textSec, borderRadius:99 }} />
                    <Text style={{ fontSize:13, fontWeight:'700', color:t.textPri }}>
                      Commentaires ({selectedTask.commentaires?.length || 0})
                    </Text>
                  </View>

                  {selectedTask.commentaires && selectedTask.commentaires.length > 0
                    ? selectedTask.commentaires.map(c => (
                      <View key={c.id} style={{ backgroundColor:t.commentBg, borderRadius:12, padding:12, marginBottom:8, borderWidth:1, borderColor:t.commentBdr }}>
                        <View style={{ flexDirection:'row', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                          <View style={{ width:28, height:28, borderRadius:14, backgroundColor:t.avatarBg, alignItems:'center', justifyContent:'center' }}>
                            <Text style={{ color:'#fff', fontSize:12, fontWeight:'700' }}>{c.auteur_nom?.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex:1 }}>
                            <Text style={{ fontSize:12, fontWeight:'700', color:isDark ? '#90cdf4' : '#1e40af' }}>{c.auteur_nom}</Text>
                            <Text style={{ fontSize:10, color:t.textMuted }}>
                              {new Date(c.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteComment(c.id)}>
                            <Ionicons name="trash-outline" size={14} color={isDark ? '#fca5a5' : '#e11d48'} />
                          </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize:13, color:t.textSec, lineHeight:20 }}>{c.texte}</Text>
                      </View>
                    ))
                    : (
                      <View style={{ alignItems:'center', padding:20, gap:6 }}>
                        <Text style={{ fontSize:28 }}>💬</Text>
                        <Text style={{ color:t.textMuted, fontSize:13 }}>Aucun commentaire</Text>
                      </View>
                    )
                  }

                  <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
                    <TextInput
                      style={{ flex:1, height:40, borderRadius:10, borderWidth:1, borderColor:t.inputBdr, backgroundColor:t.inputBg, paddingHorizontal:12, fontSize:13, color:t.textPri }}
                      placeholder="Ajouter un commentaire..." placeholderTextColor={t.textMuted}
                      value={newComment} onChangeText={setNewComment}
                      onSubmitEditing={handleAddComment} returnKeyType="send" />
                    <TouchableOpacity
                      style={{ width:40, height:40, borderRadius:10, backgroundColor: newComment.trim() ? t.sendBg : t.statBg, alignItems:'center', justifyContent:'center' }}
                      onPress={handleAddComment} disabled={!newComment.trim()}>
                      <Ionicons name="send" size={15} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Delete task */}
                {(isChef || isAdmin) && (
                  <TouchableOpacity
                    style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', padding:12, borderRadius:10, borderWidth:1, borderColor:t.deleteBdr, backgroundColor:t.deleteBg, marginTop:4 }}
                    onPress={() => handleDelete(selectedTask.id)}>
                    <Ionicons name="trash-outline" size={15} color={t.deleteTxt} style={{ marginRight:6 }} />
                    <Text style={{ fontSize:13, color:t.deleteTxt, fontWeight:'600' }}>🗑️ Supprimer la tâche</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}