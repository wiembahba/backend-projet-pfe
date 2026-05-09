import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, RefreshControl, ActivityIndicator,
  Modal, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';

// ── Design tokens (mirrors web exactly) ──────────────────────
const T = {
  navy950: '#0c1a3a', navy900: '#0f2057',
  blue600: '#1e40af', blue400: '#60a5fa', blue100: '#dbeafe', blue50: '#eff6ff',
  slate900: '#0f172a', slate700: '#334155', slate600: '#475569',
  slate500: '#64748b', slate400: '#94a3b8', slate300: '#cbd5e1',
  slate200: '#e2e8f0', slate100: '#f1f5f9', slate50: '#f8fafc', white: '#ffffff',
  rose: '#e11d48', rose50: '#fff1f2', roseMid: '#fecdd3',
  amber: '#b45309', amber50: '#fffbeb', amberMid: '#fde68a',
  green: '#15803d', green50: '#f0fdf4', greenMid: '#bbf7d0',
};

const STATUT_LABELS: Record<string, string> = {
  a_faire: 'À faire', en_cours: 'En cours', termine: 'Terminé',
};
const STATUT_COLORS: Record<string, { bg: string; text: string }> = {
  a_faire:  { bg: T.slate100, text: T.slate600 },
  en_cours: { bg: T.blue50,   text: T.blue600  },
  termine:  { bg: T.green50,  text: T.green    },
};
const PRIO_COLORS: Record<string, { bg: string; text: string }> = {
  haute:   { bg: T.rose50,  text: T.rose  },
  moyenne: { bg: T.amber50, text: T.amber },
  faible:  { bg: T.green50, text: T.green },
};
const PRIO_LABELS: Record<string, string> = {
  haute: 'Haute', moyenne: 'Moyenne', faible: 'Basse',
};

const API_URL = 'http://localhost:5000/api';

// ── Types ─────────────────────────────────────────────────────
interface SubTask {
  id: number; titre: string; description?: string; termine: boolean;
}
interface Comment {
  id: number; auteur_nom: string; texte: string; created_at: string; user_id: number;
}
interface AnalyseAvancement {
  conseil: string; avancement_recommande: string; statut_risque: string;
}
interface Task {
  id: number; titre: string; description?: string;
  projet_id: number; nom_projet: string;
  assigne_a: number; assigne_nom: string; chef_nom?: string;
  priorite: string; statut: string;
  date_debut?: string; date_echeance: string;
  progression: number; alerte?: string;
  commentaires?: Comment[];
  analyse_avancement?: AnalyseAvancement;
  subtasks?: SubTask[];
}

const calcProgression = (st: SubTask[]) =>
  st.length === 0 ? 0 : Math.round(st.filter(s => s.termine).length / st.length * 100);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

// ─────────────────────────────────────────────────────────────
export default function TasksListScreen() {
  const { token, isChef, isAdmin, user } = useAuth();

  const [tasks, setTasks]               = useState<Task[]>([]);
  const [filtered, setFiltered]         = useState<Task[]>([]);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const [selectedTask, setSelectedTask]       = useState<Task | null>(null);
  const [subtasks, setSubtasks]               = useState<SubTask[]>([]);
  const [tempStatut, setTempStatut]           = useState('');
  const [tempProgression, setTempProgression] = useState(0);
  const [newComment, setNewComment]           = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [saving, setSaving]                   = useState(false);
  const [showDetail, setShowDetail]           = useState(false);

  // ── Fetch ─────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      const endpoint = (isChef || isAdmin)
        ? '/projets/taches/toutes'
        : '/projets/taches/mes-taches';
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

  // ── Open detail ───────────────────────────────────────────
  const openDetail = async (taskId: number) => {
    try {
      const [dr, sr] = await Promise.all([
        fetch(`${API_URL}/projets/taches/${taskId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/projets/taches/${taskId}/sous-taches`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [dd, sd] = await Promise.all([dr.json(), sr.json()]);
      if (dd.success) {
        setSelectedTask(dd.tache);
        setTempStatut(dd.tache.statut);
        setTempProgression(dd.tache.progression);
      }
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

  // ── Subtasks ──────────────────────────────────────────────
  const refreshSubtasks = async (taskId: number) => {
    const sr = await fetch(`${API_URL}/projets/taches/${taskId}/sous-taches`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: newSubtaskTitle.trim() }),
      });
      const d = await r.json();
      if (d.success) { setNewSubtaskTitle(''); await refreshSubtasks(selectedTask.id); }
      else Alert.alert('Erreur', d.message);
    } catch { Alert.alert('Erreur', 'Connexion impossible'); }
  };

  const toggleSubtask = async (subtaskId: number) => {
    if (!selectedTask) return;
    await fetch(`${API_URL}/projets/taches/${selectedTask.id}/sous-taches/${subtaskId}/toggle`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}` },
    });
    await refreshSubtasks(selectedTask.id);
  };

  const deleteSubtask = (subtaskId: number) => {
    Alert.alert('Supprimer', 'Supprimer cette sous-tâche ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        if (!selectedTask) return;
        await fetch(`${API_URL}/projets/taches/${selectedTask.id}/sous-taches/${subtaskId}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
        });
        await refreshSubtasks(selectedTask.id);
      }},
    ]);
  };

  // ── Avancement ────────────────────────────────────────────
  const handleSaveChanges = async () => {
    if (!selectedTask) return;
    setSaving(true);
    try {
      await Promise.all([
        fetch(`${API_URL}/projets/taches/${selectedTask.id}/progression`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ progression: tempProgression }),
        }),
        fetch(`${API_URL}/projets/taches/${selectedTask.id}/status`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ statut: tempStatut, progression: tempProgression }),
        }),
      ]);
      Alert.alert('✅', `Avancement mis à jour : ${tempProgression}%`);
      fetchTasks();
    } catch { Alert.alert('Erreur', 'Sauvegarde impossible'); }
    finally { setSaving(false); }
  };

  // ── Comments ──────────────────────────────────────────────
  const refreshComments = async (taskId: number) => {
    const dr = await fetch(`${API_URL}/projets/taches/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dd = await dr.json();
    if (dd.success) setSelectedTask(dd.tache);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    try {
      const r = await fetch(`${API_URL}/projets/taches/${selectedTask.id}/commentaires`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tache_id: selectedTask.id, commentaire: newComment.trim() }),
      });
      const d = await r.json();
      if (r.ok && d.success) { setNewComment(''); await refreshComments(selectedTask.id); }
      else Alert.alert('Erreur', d.message);
    } catch { Alert.alert('Erreur', 'Connexion impossible'); }
  };

  const handleDeleteComment = (commentId: number) => {
    Alert.alert('Supprimer', 'Supprimer ce commentaire ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        if (!selectedTask) return;
        await fetch(`${API_URL}/projets/commentaires/${commentId}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
        });
        await refreshComments(selectedTask.id);
      }},
    ]);
  };

  // ── Delete task ───────────────────────────────────────────
  const handleDelete = (id: number) => {
    Alert.alert('Supprimer', 'Confirmer la suppression de cette tâche ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await fetch(`${API_URL}/projets/taches/${id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
        });
        closeDetail();
      }},
    ]);
  };

  // ── Status change from card ───────────────────────────────
  const handleStatusChange = async (taskId: number, newStatut: string) => {
    const prog = newStatut === 'termine' ? 100 : newStatut === 'en_cours' ? 25 : 0;
    await fetch(`${API_URL}/projets/taches/${taskId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: newStatut, progression: prog }),
    });
    fetchTasks();
  };

  const prog = subtasks.length > 0 ? calcProgression(subtasks) : tempProgression;

  // ── Render card ───────────────────────────────────────────
  const renderItem = ({ item }: { item: Task }) => {
    const sc = STATUT_COLORS[item.statut] || { bg: T.slate100, text: T.slate600 };
    const pc = PRIO_COLORS[item.priorite]  || { bg: T.slate100, text: T.slate600 };
    const itemProg = (item.subtasks && item.subtasks.length > 0)
      ? calcProgression(item.subtasks) : item.progression;

    return (
      <TouchableOpacity
        style={[s.card, item.priorite === 'haute' && s.cardHaute]}
        onPress={() => openDetail(item.id)}
        activeOpacity={0.75}
      >
        <View style={s.cardRow}>
          <Text style={s.cardTitle} numberOfLines={2}>{item.titre}</Text>
          <View>
            <View style={[s.badge, { backgroundColor: sc.bg }]}>
              <Text style={[s.badgeTxt, { color: sc.text }]}>{STATUT_LABELS[item.statut]}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: pc.bg, marginTop: 4 }]}>
              <Text style={[s.badgeTxt, { color: pc.text }]}>{PRIO_LABELS[item.priorite]}</Text>
            </View>
          </View>
        </View>

        <Text style={s.idTxt}>T-{item.id}</Text>

        <View style={s.metaRow}>
          <Ionicons name="folder-outline" size={12} color={T.slate400} />
          <Text style={s.metaTxt}>{item.nom_projet || '—'}</Text>
        </View>
        <View style={s.metaRow}>
          <Ionicons name="person-outline" size={12} color={T.slate400} />
          <Text style={s.metaTxt}>
            {(isChef || isAdmin) ? (item.assigne_nom || 'Non assigné') : (item.chef_nom || '—')}
          </Text>
        </View>
        <View style={s.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={T.slate400} />
          <Text style={s.metaTxt}>{fmtDate(item.date_echeance)}</Text>
          {item.alerte === 'en_retard' && (
            <Text style={{ color: T.rose, fontSize: 11, marginLeft: 4 }}>⚠️</Text>
          )}
        </View>

        <View style={s.progWrap}>
          <View style={s.progTrack}>
            <View style={[s.progFill, {
              width: `${itemProg}%` as any,
              backgroundColor: itemProg === 100 ? T.green : T.blue600,
            }]} />
          </View>
          <Text style={s.progPct}>{itemProg}%</Text>
        </View>

        {/* Quick status — mirrors web table select */}
        <View style={s.quickStatuts}>
          {['a_faire', 'en_cours', 'termine'].map(st => {
            const active = item.statut === st;
            const c = STATUT_COLORS[st];
            return (
              <TouchableOpacity
                key={st}
                style={[s.quickStatBtn, active && { backgroundColor: c.bg, borderColor: c.text }]}
                onPress={() => handleStatusChange(item.id, st)}
              >
                <Text style={[s.quickStatTxt, active && { color: c.text, fontWeight: '700' }]}>
                  {STATUT_LABELS[st]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <SafeAreaView style={s.centered}>
      <View style={s.spinner} />
      <Text style={{ color: T.slate500, marginTop: 16, fontSize: 14, fontWeight: '500' }}>
        Chargement des tâches...
      </Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.root}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>GESTION</Text>
          <Text style={s.headerTitle}>{(isChef || isAdmin) ? 'Toutes les tâches' : 'Mes tâches'}</Text>
          <Text style={s.headerSub}>{tasks.length} tâches au total</Text>
        </View>
      </View>

      {/* ── Search + Filters ── */}
      <View style={s.filtersWrap}>
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={16} color={T.slate400} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher une tâche..."
            placeholderTextColor={T.slate400}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={T.slate400} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { value: 'all',      label: 'Tous les statuts' },
              { value: 'a_faire',  label: 'À faire' },
              { value: 'en_cours', label: 'En cours' },
              { value: 'termine',  label: 'Terminé' },
            ].map(f => (
              <TouchableOpacity
                key={f.value}
                style={[s.filterPill, filterStatus === f.value && s.filterPillActive]}
                onPress={() => setFilterStatus(f.value)}
              >
                <Text style={[s.filterPillTxt, filterStatus === f.value && s.filterPillTxtActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ── Task list ── */}
      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={T.blue600}
            onRefresh={() => { setRefreshing(true); fetchTasks(); }} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 32 }}>📭</Text>
            <Text style={s.emptyTitle}>Aucune tâche trouvée</Text>
          </View>
        }
      />

      {/* ════════════════ DETAIL MODAL ════════════════ */}
      <Modal
        visible={showDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDetail}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: T.white }}>
          <ScrollView
            contentContainerStyle={s.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            {selectedTask && (
              <>
                {/* Modal header */}
                <View style={s.modalHeader}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={s.modalTitle}>{selectedTask.titre}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {(() => {
                        const pc = PRIO_COLORS[selectedTask.priorite] || { bg: T.slate100, text: T.slate600 };
                        return (
                          <View style={[s.badge, { backgroundColor: pc.bg }]}>
                            <Text style={[s.badgeTxt, { color: pc.text }]}>{PRIO_LABELS[selectedTask.priorite]}</Text>
                          </View>
                        );
                      })()}
                      <Text style={s.modalMetaTxt}>
                        Assigné à : <Text style={s.modalMetaBold}>{selectedTask.assigne_nom}</Text>
                      </Text>
                      <Text style={s.modalMetaTxt}>
                        Échéance : <Text style={s.modalMetaBold}>{fmtDate(selectedTask.date_echeance)}</Text>
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={closeDetail} style={s.closeBtn}>
                    <Ionicons name="close" size={18} color={T.slate500} />
                  </TouchableOpacity>
                </View>

                {/* Description */}
                {selectedTask.description ? (
                  <View style={s.descBox}>
                    <Text style={s.descTxt}>{selectedTask.description}</Text>
                  </View>
                ) : null}

                {/* Analyse avancement */}
                {selectedTask.analyse_avancement && (() => {
                  const risk = selectedTask.analyse_avancement!.statut_risque;
                  return (
                    <View style={[s.analyseBox, {
                      backgroundColor: risk === 'en_retard' ? T.rose50 : risk === 'deadline_proche' ? T.amber50 : T.green50,
                      borderColor: risk === 'en_retard' ? T.roseMid : T.amberMid,
                    }]}>
                      <Text style={{ fontSize: 12, color: T.slate700 }}>
                        📊 {selectedTask.analyse_avancement!.conseil}
                      </Text>
                      <Text style={{ fontSize: 11, color: T.green, marginTop: 4 }}>
                        Recommandé : {selectedTask.analyse_avancement!.avancement_recommande}
                      </Text>
                    </View>
                  );
                })()}

                {/* ── SOUS-TÂCHES ── */}
                <View style={s.section}>
                  <View style={s.secHead}>
                    <View style={[s.secBar, { backgroundColor: T.blue600 }]} />
                    <Text style={s.secTitle}>Sous-tâches</Text>
                    <View style={s.countPill}>
                      <Text style={s.countPillTxt}>
                        {subtasks.filter(s => s.termine).length}/{subtasks.length}
                      </Text>
                    </View>
                    {subtasks.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' as any }}>
                        <View style={[s.miniTrack, { width: 80 }]}>
                          <View style={[s.miniFill, {
                            width: `${prog}%` as any,
                            backgroundColor: prog === 100 ? T.green : T.blue600,
                          }]} />
                        </View>
                        <Text style={[s.secPct, { color: prog === 100 ? T.green : T.blue600 }]}>{prog}%</Text>
                      </View>
                    )}
                  </View>

                  {subtasks.length === 0 ? (
                    <Text style={s.emptySecTxt}>
                      {(isChef || isAdmin) ? '👁️ Aucune sous-tâche' : 'Aucune sous-tâche — ajoutez-en ci-dessous'}
                    </Text>
                  ) : subtasks.map(sub => (
                    <View key={sub.id} style={[s.subtaskRow, sub.termine && { borderColor: T.greenMid }]}>
                      <TouchableOpacity
                        style={[s.checkBtn, sub.termine && { backgroundColor: T.green, borderColor: T.green }]}
                        onPress={() => toggleSubtask(sub.id)}
                      >
                        {sub.termine && <Ionicons name="checkmark" size={13} color={T.white} />}
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.subtaskTxt, sub.termine && s.subtaskDone]}>{sub.titre}</Text>
                        {sub.description ? (
                          <View style={s.subtaskDescBox}>
                            <Text style={s.subtaskDescTxt}>📝 {sub.description}</Text>
                          </View>
                        ) : null}
                      </View>
                      {!(isChef || isAdmin) && (
                        <TouchableOpacity onPress={() => deleteSubtask(sub.id)} style={{ padding: 4 }}>
                          <Ionicons name="close" size={14} color={T.slate400} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {!(isChef || isAdmin) ? (
                    <>
                      <View style={s.addRow}>
                        <TextInput
                          style={s.addInput}
                          placeholder="Titre de la sous-tâche..."
                          placeholderTextColor={T.slate400}
                          value={newSubtaskTitle}
                          onChangeText={setNewSubtaskTitle}
                          onSubmitEditing={addSubtask}
                          returnKeyType="done"
                        />
                        <TouchableOpacity
                          style={[s.addBtn, !newSubtaskTitle.trim() && { backgroundColor: T.slate300 }]}
                          onPress={addSubtask}
                          disabled={!newSubtaskTitle.trim()}
                        >
                          <Text style={s.addBtnTxt}>+ Ajouter</Text>
                        </TouchableOpacity>
                      </View>
                      {subtasks.length > 0 && (
                        <Text style={s.hintTxt}>
                          💡 L'avancement se calcule automatiquement depuis les sous-tâches
                        </Text>
                      )}
                    </>
                  ) : (
                    <View style={s.chefNote}>
                      <Text style={s.chefNoteTxt}>
                        👁️ Les sous-tâches sont gérées uniquement par l'employé
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── AVANCEMENT ── */}
                <View style={[s.section, { backgroundColor: T.white, borderColor: T.slate100 }]}>
                  <View style={s.secHead}>
                    <View style={[s.secBar, { backgroundColor: T.green }]} />
                    <Text style={s.secTitle}>Avancement de la tâche</Text>
                  </View>

                  <Text style={s.fieldLbl}>Statut</Text>
                  <View style={s.statusGrid}>
                    {[
                      { value: 'a_faire',  label: 'À faire'  },
                      { value: 'en_cours', label: 'En cours' },
                      { value: 'termine',  label: 'Terminé'  },
                    ].map(opt => {
                      const active = tempStatut === opt.value;
                      const sc = STATUT_COLORS[opt.value];
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            s.statusOpt,
                            active && { borderColor: sc.text, backgroundColor: sc.bg },
                            subtasks.length > 0 && { opacity: 0.5 },
                          ]}
                          onPress={() => {
                            if (subtasks.length > 0) return;
                            setTempStatut(opt.value);
                            if (opt.value === 'termine') setTempProgression(100);
                            else if (opt.value === 'a_faire') setTempProgression(0);
                            else if (tempProgression === 0) setTempProgression(25);
                          }}
                          disabled={subtasks.length > 0}
                        >
                          <Text style={[s.statusOptTxt, active && { color: sc.text, fontWeight: '700' }]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {subtasks.length > 0 && (
                    <Text style={[s.hintTxt, { color: T.amber }]}>
                      ⚡ Statut géré automatiquement par les sous-tâches
                    </Text>
                  )}

                  <View style={[s.secHead, { marginTop: 14, marginBottom: 8 }]}>
                    <Text style={s.fieldLbl}>Avancement</Text>
                    <Text style={[s.bigPct, { color: prog === 100 ? T.green : T.blue600 }]}>{prog}%</Text>
                  </View>

                  {subtasks.length > 0 ? (
                    <>
                      <View style={[s.progTrack, { height: 10, borderRadius: 5 }]}>
                        <View style={[s.progFill, {
                          width: `${prog}%` as any, height: 10, borderRadius: 5,
                          backgroundColor: prog === 100 ? T.green : T.blue600,
                        }]} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 3, marginTop: 6 }}>
                        {subtasks.map(sub => (
                          <View key={sub.id} style={[s.subDot, {
                            backgroundColor: sub.termine ? T.green : T.slate200,
                          }]} />
                        ))}
                      </View>
                      <Text style={s.hintTxt}>
                        {subtasks.filter(s => s.termine).length} / {subtasks.length} sous-tâches terminées
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={[s.progTrack, { height: 6, marginBottom: 10 }]}>
                        <View style={[s.progFill, {
                          width: `${tempProgression}%` as any, height: 6,
                          backgroundColor: tempProgression === 100 ? T.green : T.blue600,
                        }]} />
                      </View>
                      <View style={s.quickPcts}>
                        {[0, 25, 50, 75, 100].map(v => (
                          <TouchableOpacity
                            key={v}
                            style={[s.quickPctBtn, tempProgression === v && s.quickPctActive]}
                            onPress={() => {
                              setTempProgression(v);
                              setTempStatut(v === 100 ? 'termine' : v > 0 ? 'en_cours' : 'a_faire');
                            }}
                          >
                            <Text style={[s.quickPctTxt, tempProgression === v && s.quickPctActiveTxt]}>
                              {v}%
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  <TouchableOpacity
                    style={[s.saveBtn, saving && { backgroundColor: T.slate300 }]}
                    onPress={handleSaveChanges}
                    disabled={saving}
                  >
                    <Ionicons name="save-outline" size={15} color={T.white} style={{ marginRight: 8 }} />
                    <Text style={s.saveBtnTxt}>
                      {saving ? '⏳ Enregistrement...' : '💾 Enregistrer les modifications'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ── COMMENTAIRES ── */}
                <View style={s.section}>
                  <View style={s.secHead}>
                    <View style={[s.secBar, { backgroundColor: T.slate700 }]} />
                    <Text style={s.secTitle}>
                      Commentaires ({selectedTask.commentaires?.length || 0})
                    </Text>
                  </View>

                  {selectedTask.commentaires && selectedTask.commentaires.length > 0
                    ? selectedTask.commentaires.map(c => (
                      <View key={c.id} style={s.commentCard}>
                        <View style={s.commentHead}>
                          <View style={s.avatar}>
                            <Text style={s.avatarTxt}>{c.auteur_nom?.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.commentAuthor}>{c.auteur_nom}</Text>
                            <Text style={s.commentDate}>
                              {new Date(c.created_at).toLocaleString('fr-FR', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteComment(c.id)}>
                            <Ionicons name="trash-outline" size={14} color={T.rose} />
                          </TouchableOpacity>
                        </View>
                        <Text style={s.commentTxt}>{c.texte}</Text>
                      </View>
                    ))
                    : (
                      <View style={s.emptyComments}>
                        <Text style={{ fontSize: 28 }}>💬</Text>
                        <Text style={{ color: T.slate400, fontSize: 13, marginTop: 6 }}>Aucun commentaire</Text>
                      </View>
                    )
                  }

                  <View style={s.commentInputRow}>
                    <TextInput
                      style={s.commentInput}
                      placeholder="Ajouter un commentaire..."
                      placeholderTextColor={T.slate400}
                      value={newComment}
                      onChangeText={setNewComment}
                      onSubmitEditing={handleAddComment}
                      returnKeyType="send"
                    />
                    <TouchableOpacity
                      style={[s.sendBtn, !newComment.trim() && { backgroundColor: T.slate300 }]}
                      onPress={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      <Ionicons name="send" size={15} color={T.white} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Delete task (chef/admin only) */}
                {(isChef || isAdmin) && (
                  <TouchableOpacity
                    style={s.deleteTaskBtn}
                    onPress={() => handleDelete(selectedTask.id)}
                  >
                    <Ionicons name="trash-outline" size={15} color={T.rose} style={{ marginRight: 6 }} />
                    <Text style={s.deleteTaskTxt}>🗑️ Supprimer la tâche</Text>
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

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.slate50 },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.slate50 },
  spinner: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: T.blue100, borderTopColor: T.blue600 },

  header:        { backgroundColor: T.white, padding: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: T.slate100 },
  headerEyebrow: { fontSize: 10, fontWeight: '700', color: T.blue600, letterSpacing: 1.4, marginBottom: 2 },
  headerTitle:   { fontSize: 26, fontWeight: '800', color: T.slate900, letterSpacing: -0.5 },
  headerSub:     { fontSize: 12, color: T.slate500, marginTop: 2 },

  filtersWrap: { backgroundColor: T.white, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.slate100 },
  searchRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: T.slate50, borderRadius: 10, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: T.slate200 },
  searchInput: { flex: 1, fontSize: 14, color: T.slate900 },

  filterPill:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: T.slate200, backgroundColor: T.white },
  filterPillActive:   { backgroundColor: T.navy950, borderColor: T.navy950 },
  filterPillTxt:      { fontSize: 12, fontWeight: '600', color: T.slate600 },
  filterPillTxtActive:{ color: T.white },

  list:       { padding: 14, gap: 10, paddingBottom: 30 },
  empty:      { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: T.slate400 },

  card:      { backgroundColor: T.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.slate100, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  cardHaute: { borderLeftWidth: 3, borderLeftColor: T.rose },
  cardRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: T.slate900, flex: 1, marginRight: 10, lineHeight: 20 },

  badge:    { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  idTxt:    { fontSize: 10, color: T.slate400, marginBottom: 6 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  metaTxt:  { fontSize: 12, color: T.slate600 },

  progWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  progTrack: { flex: 1, height: 5, backgroundColor: T.slate100, borderRadius: 99, overflow: 'hidden' },
  progFill:  { height: 5, borderRadius: 99 },
  progPct:   { fontSize: 11, color: T.slate400, minWidth: 30, textAlign: 'right' },

  quickStatuts: { flexDirection: 'row', gap: 6, marginTop: 10 },
  quickStatBtn: { flex: 1, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: T.slate200, backgroundColor: T.slate50, alignItems: 'center' },
  quickStatTxt: { fontSize: 10, color: T.slate500, fontWeight: '500' },

  // Modal
  modalBody:    { padding: 20, paddingBottom: 40 },
  modalHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  modalTitle:   { fontSize: 17, fontWeight: '800', color: T.slate900, letterSpacing: -0.3 },
  modalMetaTxt: { fontSize: 12, color: T.slate500 },
  modalMetaBold:{ fontWeight: '700', color: T.slate700 },
  closeBtn:     { width: 32, height: 32, backgroundColor: T.slate100, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  descBox:  { backgroundColor: T.slate50, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: T.slate100 },
  descTxt:  { fontSize: 13, color: T.slate600, lineHeight: 20 },
  analyseBox: { borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1 },

  section:     { backgroundColor: T.slate50, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: T.slate100 },
  secHead:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  secBar:      { width: 3, height: 16, borderRadius: 99 },
  secTitle:    { fontSize: 13, fontWeight: '700', color: T.slate900 },
  countPill:   { backgroundColor: T.blue50, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  countPillTxt:{ fontSize: 11, fontWeight: '700', color: T.blue600 },
  miniTrack:   { height: 6, backgroundColor: T.slate200, borderRadius: 3, overflow: 'hidden' },
  miniFill:    { height: 6, borderRadius: 3 },
  secPct:      { fontSize: 12, fontWeight: '700' },
  emptySecTxt: { fontSize: 12, color: T.slate400, textAlign: 'center', paddingVertical: 12 },

  subtaskRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, backgroundColor: T.white, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: T.slate200 },
  checkBtn:      { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: T.slate300, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  subtaskTxt:    { fontSize: 13, color: T.slate900, fontWeight: '500', lineHeight: 18 },
  subtaskDone:   { textDecorationLine: 'line-through', color: T.slate400, fontWeight: '400' },
  subtaskDescBox:{ marginTop: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: T.blue400, backgroundColor: T.slate50, borderRadius: 4, padding: 5 },
  subtaskDescTxt:{ fontSize: 11, color: T.slate500 },

  addRow:   { flexDirection: 'row', gap: 8, marginTop: 4 },
  addInput: { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: T.slate200, backgroundColor: T.white, paddingHorizontal: 12, fontSize: 13, color: T.slate900 },
  addBtn:   { paddingHorizontal: 14, height: 38, borderRadius: 10, backgroundColor: T.blue600, alignItems: 'center', justifyContent: 'center' },
  addBtnTxt:{ fontSize: 13, fontWeight: '700', color: T.white },
  hintTxt:  { fontSize: 11, color: T.blue600, fontWeight: '600', marginTop: 8 },
  chefNote: { padding: 10, backgroundColor: T.white, borderRadius: 8, borderWidth: 1, borderColor: T.slate200, marginTop: 8 },
  chefNoteTxt: { fontSize: 11, color: T.slate500, textAlign: 'center', fontStyle: 'italic' },

  fieldLbl:    { fontSize: 11, fontWeight: '700', color: T.slate500, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  statusGrid:  { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statusOpt:   { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 2, borderColor: T.slate200, alignItems: 'center' },
  statusOptTxt:{ fontSize: 12, fontWeight: '500', color: T.slate500 },

  bigPct:  { fontSize: 22, fontWeight: '800', letterSpacing: -1 },
  subDot:  { flex: 1, height: 4, borderRadius: 99 },

  quickPcts:      { flexDirection: 'row', gap: 6, marginTop: 4 },
  quickPctBtn:    { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: T.slate200, backgroundColor: T.white, alignItems: 'center' },
  quickPctActive: { backgroundColor: T.blue600, borderColor: T.blue600 },
  quickPctTxt:    { fontSize: 12, color: T.slate600 },
  quickPctActiveTxt: { color: T.white, fontWeight: '700' },

  saveBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 13, backgroundColor: T.navy950, borderRadius: 10, marginTop: 14 },
  saveBtnTxt: { color: T.white, fontSize: 13, fontWeight: '700' },

  commentCard:   { backgroundColor: T.white, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: T.slate100 },
  commentHead:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  avatar:        { width: 28, height: 28, borderRadius: 14, backgroundColor: T.blue600, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:     { color: T.white, fontSize: 12, fontWeight: '700' },
  commentAuthor: { fontSize: 12, fontWeight: '700', color: T.blue600 },
  commentDate:   { fontSize: 10, color: T.slate400 },
  commentTxt:    { fontSize: 13, color: T.slate700, lineHeight: 20, wordBreak: 'break-word' as any },
  emptyComments: { alignItems: 'center', padding: 20, gap: 6 },

  commentInputRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  commentInput:    { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: T.slate200, backgroundColor: T.slate50, paddingHorizontal: 12, fontSize: 13, color: T.slate900 },
  sendBtn:         { width: 40, height: 40, borderRadius: 10, backgroundColor: T.navy950, alignItems: 'center', justifyContent: 'center' },

  deleteTaskBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: T.roseMid, backgroundColor: T.rose50, marginTop: 4 },
  deleteTaskTxt: { fontSize: 13, color: T.rose, fontWeight: '600' },
});