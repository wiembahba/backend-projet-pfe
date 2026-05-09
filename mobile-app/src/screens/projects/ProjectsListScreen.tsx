import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  TextInput, RefreshControl, ActivityIndicator, Animated, ScrollView,
  Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const NAVY = '#0f3494';
const API_URL = 'http://localhost:5000/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Project {
  id: string; name: string; description: string;
  chef: string; chef_id?: number; status: string; priority: string;
  progress: number; startDate: string; endDate: string; tasks: number;
}
interface User { id: number; nom_complet: string; role: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toStatut = (s: string) =>
  ({ en_cours: 'En cours', termine: 'Terminé', en_attente: 'En attente', en_retard: 'En retard', a_faire: 'À faire' }[s] || s);
const toPriorite = (p: string) =>
  ({ haute: 'Haute', moyenne: 'Moyenne', faible: 'Basse', critique: 'Critique' }[p] || p);
const fromStatut = (s: string) =>
  ({ 'En cours': 'en_cours', 'Terminé': 'termine', 'En attente': 'en_attente', 'Annulé': 'en_attente' }[s] || 'en_attente');
const fromPriorite = (p: string) =>
  ({ 'Haute': 'haute', 'Moyenne': 'moyenne', 'Basse': 'faible', 'Critique': 'haute' }[p] || 'moyenne');

const STATUS_C: Record<string, { bg: string; text: string; border: string }> = {
  'En cours':   { bg: '#dbeafe', text: NAVY,      border: '#bfdbfe' },
  'Terminé':    { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  'En attente': { bg: '#fef9c3', text: '#a16207', border: '#fde68a' },
  'En retard':  { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  'Annulé':     { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
};
const PRIO_C: Record<string, { bg: string; text: string; border: string }> = {
  'Haute':    { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  'Critique': { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  'Moyenne':  { bg: '#fef9c3', text: '#a16207', border: '#fde68a' },
  'Basse':    { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Pill({ label, map }: { label: string; map: Record<string, { bg: string; text: string; border: string }> }) {
  const c = map[label] ?? { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 6, borderWidth: 1, borderColor: c.border, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: c.text, fontSize: 10, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function AnimatedBar({ value }: { value: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(anim, { toValue: value, duration: 650, useNativeDriver: false }).start(); }, [value]);
  const w = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const color = value === 100 ? '#16a34a' : value >= 60 ? NAVY : '#d97706';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View style={{ flex: 1, height: 5, backgroundColor: '#e8edf5', borderRadius: 3, overflow: 'hidden' }}>
        <Animated.View style={{ height: 5, borderRadius: 3, width: w, backgroundColor: color }} />
      </View>
      <Text style={{ fontSize: 10, color: '#94a3b8', minWidth: 30, textAlign: 'right' }}>{value}%</Text>
    </View>
  );
}

function FLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={s.fLbl}>
      {label}{required ? <Text style={{ color: '#ef4444' }}> *</Text> : null}
    </Text>
  );
}
function FInput(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput style={s.fInput} placeholderTextColor="#aab4c8" {...props} />;
}
function ErrBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <View style={s.errBox}>
      <Ionicons name="warning-outline" size={13} color="#be123c" />
      <Text style={s.errText}>{msg}</Text>
    </View>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ item, canEdit, onOpen, onEdit, onDelete }: {
  item: Project; canEdit: boolean;
  onOpen(): void; onEdit(): void; onDelete(): void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pi = (v: number) => Animated.timing(scale, { toValue: v, duration: 70, useNativeDriver: true }).start();
  return (
    <Animated.View style={[s.card, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onOpen} onPressIn={() => pi(0.982)} onPressOut={() => pi(1)} activeOpacity={1}>
        {/* Top navy stripe */}
        <View style={s.cardStripe} />
        <View style={s.cardBody}>
          {/* Row 1: title + status */}
          <View style={s.row}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.name}</Text>
            <Pill label={item.status} map={STATUS_C} />
          </View>
          {/* description */}
          <Text style={s.cardDesc} numberOfLines={1}>{item.description || 'Aucune description'}</Text>
          {/* meta */}
          <View style={[s.row, { marginTop: 9 }]}>
            <View style={s.metaItem}>
              <Ionicons name="person-outline" size={11} color="#94a3b8" />
              <Text style={s.metaTxt}>{item.chef}</Text>
            </View>
            <View style={s.metaItem}>
              <Pill label={item.priority} map={PRIO_C} />
              <View style={s.metaItem}>
                <Ionicons name="list-outline" size={11} color="#94a3b8" />
                <Text style={s.metaTxt}>{item.tasks} tâches</Text>
              </View>
            </View>
          </View>
          {/* progress */}
          <View style={{ marginTop: 10 }}>
            <AnimatedBar value={item.progress} />
          </View>
          {/* date */}
          <View style={[s.metaItem, { marginTop: 7 }]}>
            <Ionicons name="time-outline" size={11} color="#94a3b8" />
            <Text style={s.metaTxt}>Échéance : {item.endDate || 'Non définie'}</Text>
          </View>
        </View>
      </TouchableOpacity>
      {/* Actions */}
      <View style={s.cardActions}>
        <TouchableOpacity style={s.aBtn} onPress={onOpen}>
          <Text style={s.aBtnTxt}>Ouvrir</Text>
        </TouchableOpacity>
        {canEdit && (
          <>
            <TouchableOpacity style={[s.aBtn, { backgroundColor: '#dcfce7' }]} onPress={onEdit}>
              <Text style={[s.aBtnTxt, { color: '#15803d' }]}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.aBtn, { backgroundColor: '#fff1f2' }]} onPress={onDelete}>
              <Text style={[s.aBtnTxt, { color: '#be123c' }]}>Supprimer</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Bottom Sheet wrapper ─────────────────────────────────────────────────────
function Sheet({ visible, onClose, title, children }: {
  visible: boolean; onClose(): void; title: string; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Seg / Priority selectors ─────────────────────────────────────────────────
function SegSelector({ options, value, onChange }: { options: string[]; value: string; onChange(v: string): void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
      {options.map(o => (
        <TouchableOpacity key={o} style={[s.seg, value === o && s.segActive]} onPress={() => onChange(o)}>
          <Text style={[s.segTxt, value === o && s.segTxtActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
function PrioSelector({ options, value, onChange }: {
  options: { val: string; label: string; color: string; bg: string; border: string }[];
  value: string; onChange(v: string): void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
      {options.map(p => (
        <TouchableOpacity key={p.val} style={[s.prioBtn, value === p.val && { backgroundColor: p.bg, borderColor: p.color }]}
          onPress={() => onChange(p.val)}>
          <Text style={[s.prioBtnTxt, value === p.val && { color: p.color }]}>{p.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProjectsListScreen() {
  const { isChef, isAdmin, token } = useAuth();
  const navigation = useNavigation<any>();
  const canEdit = isChef || isAdmin;

  const [projects,    setProjects]    = useState<Project[]>([]);
  const [users,       setUsers]       = useState<User[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [filterSt,    setFilterSt]    = useState('all');

  // Create
  const [showCreate,    setShowCreate]    = useState(false);
  const [createForm,    setCreateForm]    = useState({
    nom_projet: '', description: '', chef_projet_id: '',
    date_debut: '', date_fin_prevue: '', statut: 'en_attente', priorite: 'moyenne',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState('');

  // Edit
  const [showEdit,  setShowEdit]  = useState(false);
  const [editForm,  setEditForm]  = useState<Project | null>(null);
  const [editError, setEditError] = useState('');

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchProjects = async () => {
    try {
      const r = await fetch(`${API_URL}/projets`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setProjects(d.projets.map((p: any) => ({
        id: String(p.id), name: p.nom_projet, description: p.description || '',
        chef: p.chef_nom || 'Non assigné', chef_id: p.chef_projet_id,
        status: toStatut(p.statut), priority: toPriorite(p.priorite),
        progress: p.progression || 0,
        startDate: p.date_debut        ? new Date(p.date_debut).toISOString().split('T')[0]        : '',
        endDate:   p.date_fin_prevue   ? new Date(p.date_fin_prevue).toISOString().split('T')[0]   : '',
        tasks: p.nb_taches || 0,
      })));
    } catch {}
    setLoading(false); setRefreshing(false);
  };

  const fetchUsers = async () => {
    try {
      const r = await fetch(`${API_URL}/users?role=chef_projet`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setUsers(d.users);
    } catch {}
  };

  useEffect(() => { if (token) { fetchProjects(); fetchUsers(); } else setLoading(false); }, [token]);

  // auto-progress sync when editing status
  useEffect(() => {
    if (!editForm) return;
    let np = editForm.progress;
    if      (editForm.status === 'Terminé'    && np !== 100) np = 100;
    else if (editForm.status === 'En attente' && np > 5)    np = 0;
    else if (editForm.status === 'Annulé')                   np = 0;
    else if (editForm.status === 'En cours'   && np === 0)   np = 10;
    if (np !== editForm.progress) setEditForm(f => f ? { ...f, progress: np } : f);
  }, [editForm?.status]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.nom_projet.trim()) { setCreateError('Le nom du projet est obligatoire'); return; }
    if (!createForm.date_fin_prevue)   { setCreateError('La date de fin est obligatoire');   return; }
    setCreateLoading(true); setCreateError('');
    try {
      const r = await fetch(`${API_URL}/projets`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom_projet: createForm.nom_projet, description: createForm.description || null,
          chef_projet_id: createForm.chef_projet_id ? parseInt(createForm.chef_projet_id) : null,
          date_debut: createForm.date_debut || null, date_fin_prevue: createForm.date_fin_prevue,
          statut: createForm.statut, priorite: createForm.priorite,
        }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        setShowCreate(false);
        setCreateForm({ nom_projet: '', description: '', chef_projet_id: '', date_debut: '', date_fin_prevue: '', statut: 'en_attente', priorite: 'moyenne' });
        fetchProjects();
      } else setCreateError(d.message || 'Erreur lors de la création');
    } catch { setCreateError('Erreur de connexion'); }
    setCreateLoading(false);
  };

  const handleEdit = async () => {
    if (!editForm) return;
    if (!editForm.name.trim()) { setEditError('Le nom est obligatoire'); return; }
    if (!editForm.endDate)     { setEditError('La date de fin est obligatoire'); return; }
    try {
      const r = await fetch(`${API_URL}/projets/${editForm.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom_projet: editForm.name, description: editForm.description,
          chef_projet_id: editForm.chef_id || null,
          date_debut: editForm.startDate || null, date_fin_prevue: editForm.endDate,
          statut: fromStatut(editForm.status), priorite: fromPriorite(editForm.priority),
          progression: editForm.progress,
        }),
      });
      const d = await r.json();
      if (r.ok && d.success) { setShowEdit(false); fetchProjects(); }
      else setEditError(d.message || 'Erreur lors de la modification');
    } catch { setEditError('Erreur de connexion'); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Supprimer le projet ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${API_URL}/projets/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          fetchProjects();
        } catch {}
      }},
    ]);
  };

  const PRIO_OPTS = [
    { val: 'faible',  label: 'Basse',   color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
    { val: 'moyenne', label: 'Moyenne', color: '#a16207', bg: '#fef9c3', border: '#fde68a' },
    { val: 'haute',   label: 'Haute',   color: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
  ];
  const PRIO_OPTS_FR = [
    { val: 'Basse',   label: 'Basse',   color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
    { val: 'Moyenne', label: 'Moyenne', color: '#a16207', bg: '#fef9c3', border: '#fde68a' },
    { val: 'Haute',   label: 'Haute',   color: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
  ];

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterSt === 'all' || p.status === filterSt)
  );

  if (loading) return <SafeAreaView style={s.loadWrap}><ActivityIndicator color={NAVY} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerSub}>Tableau de bord</Text>
          <Text style={s.headerTitle}>Projets</Text>
          <Text style={s.headerCount}>{projects.length} projets au total</Text>
        </View>
        {canEdit && (
          <TouchableOpacity style={s.addBtn} onPress={() => { setCreateError(''); setShowCreate(true); }}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Stats ── */}
      <View style={s.statsRow}>
        {[
          { label: 'Total',     value: projects.length,                                       icon: 'folder-outline'         },
          { label: 'En cours',  value: projects.filter(p => p.status === 'En cours').length,  icon: 'sync-outline'           },
          { label: 'Terminés',  value: projects.filter(p => p.status === 'Terminé').length,   icon: 'checkmark-done-outline' },
          { label: 'En retard', value: projects.filter(p => p.status === 'En retard').length, icon: 'alert-circle-outline'   },
        ].map(({ label, value, icon }) => (
          <View key={label} style={s.statCard}>
            <Ionicons name={icon as any} size={13} color={NAVY} />
            <Text style={s.statN}>{value}</Text>
            <Text style={s.statL}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Search ── */}
      <View style={{ paddingHorizontal: 16, gap: 8, marginBottom: 4 }}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={15} color="#94a3b8" />
          <TextInput style={s.searchInput} placeholder="Rechercher un projet..."
            placeholderTextColor="#aab4c8" value={search} onChangeText={setSearch} />
          {!!search && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#94a3b8" /></TouchableOpacity>}
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {['all', 'En cours', 'En attente', 'Terminé', 'En retard'].map(f => (
              <TouchableOpacity key={f} style={[s.chip, filterSt === f && s.chipActive]} onPress={() => setFilterSt(f)}>
                <Text style={[s.chipTxt, filterSt === f && s.chipTxtActive]}>{f === 'all' ? 'Tous' : f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProjects(); }} tintColor={NAVY} />}
        renderItem={({ item }) => (
          <ProjectCard
            item={item} canEdit={canEdit}
            onOpen={() => navigation.navigate('ProjectDetail', { projectId: item.id, projectName: item.name })}
            onEdit={() => { setEditForm({ ...item }); setEditError(''); setShowEdit(true); }}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}><Ionicons name="folder-open-outline" size={32} color={NAVY} /></View>
            <Text style={s.emptyTitle}>Aucun projet trouvé</Text>
            <Text style={s.emptySub}>Essayez un autre filtre ou créez un nouveau projet.</Text>
          </View>
        }
      />

      {/* ════ CREATE MODAL ════ */}
      <Sheet visible={showCreate} onClose={() => setShowCreate(false)} title="Nouveau projet">
        <ErrBox msg={createError} />

        <FLabel label="Nom du projet" required />
        <FInput value={createForm.nom_projet} onChangeText={t => setCreateForm(f => ({ ...f, nom_projet: t }))} placeholder="Ex : Application Mobile" />

        <FLabel label="Description" />
        <TextInput style={[s.fInput, { height: 80, textAlignVertical: 'top' }]}
          value={createForm.description} onChangeText={t => setCreateForm(f => ({ ...f, description: t }))}
          placeholder="Décrivez les objectifs..." placeholderTextColor="#aab4c8" multiline />

        <FLabel label="Chef de projet" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {users.map(u => {
              const active = createForm.chef_projet_id === String(u.id);
              return (
                <TouchableOpacity key={u.id} style={[s.memberChip, active && s.memberChipActive]}
                  onPress={() => setCreateForm(f => ({ ...f, chef_projet_id: String(u.id) }))}>
                  <View style={s.avatar}><Text style={s.avatarTxt}>{u.nom_complet[0]?.toUpperCase()}</Text></View>
                  <Text style={[s.memberChipTxt, active && { color: NAVY, fontWeight: '700' }]} numberOfLines={1}>{u.nom_complet}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><FLabel label="Date début" /><FInput value={createForm.date_debut} onChangeText={t => setCreateForm(f => ({ ...f, date_debut: t }))} placeholder="AAAA-MM-JJ" /></View>
          <View style={{ flex: 1 }}><FLabel label="Date fin" required /><FInput value={createForm.date_fin_prevue} onChangeText={t => setCreateForm(f => ({ ...f, date_fin_prevue: t }))} placeholder="AAAA-MM-JJ" /></View>
        </View>

        <FLabel label="Statut" />
        <SegSelector options={['en_attente', 'en_cours', 'termine']} value={createForm.statut}
          onChange={v => setCreateForm(f => ({ ...f, statut: v }))} />

        <FLabel label="Priorité" />
        <PrioSelector options={PRIO_OPTS} value={createForm.priorite} onChange={v => setCreateForm(f => ({ ...f, priorite: v }))} />

        <View style={[s.modalActions, { marginTop: 6, marginBottom: 8 }]}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCreate(false)}>
            <Text style={s.cancelTxt}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.confirmBtn, createLoading && { opacity: 0.5 }]} onPress={handleCreate} disabled={createLoading}>
            {createLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmTxt}>Créer le projet</Text>}
          </TouchableOpacity>
        </View>
      </Sheet>

      {/* ════ EDIT MODAL ════ */}
      <Sheet visible={showEdit} onClose={() => setShowEdit(false)} title="Modifier le projet">
        {editForm && (
          <>
            <ErrBox msg={editError} />

            <FLabel label="Nom du projet" required />
            <FInput value={editForm.name} onChangeText={t => setEditForm(f => f ? { ...f, name: t } : f)} />

            <FLabel label="Description" />
            <TextInput style={[s.fInput, { height: 80, textAlignVertical: 'top' }]}
              value={editForm.description} onChangeText={t => setEditForm(f => f ? { ...f, description: t } : f)}
              placeholderTextColor="#aab4c8" multiline />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><FLabel label="Date début" /><FInput value={editForm.startDate} onChangeText={t => setEditForm(f => f ? { ...f, startDate: t } : f)} placeholder="AAAA-MM-JJ" /></View>
              <View style={{ flex: 1 }}><FLabel label="Date fin" required /><FInput value={editForm.endDate} onChangeText={t => setEditForm(f => f ? { ...f, endDate: t } : f)} placeholder="AAAA-MM-JJ" /></View>
            </View>

            <FLabel label="Statut" />
            <SegSelector options={['En attente', 'En cours', 'Terminé', 'Annulé']} value={editForm.status}
              onChange={v => setEditForm(f => f ? { ...f, status: v } : f)} />

            <FLabel label="Priorité" />
            <PrioSelector options={PRIO_OPTS_FR} value={editForm.priority} onChange={v => setEditForm(f => f ? { ...f, priority: v } : f)} />

            <FLabel label={`Avancement : ${editForm.progress}%`} />
            <AnimatedBar value={editForm.progress} />
            <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 10, marginBottom: 16 }}>
              {[0, 10, 25, 50, 75, 90, 100].map(v => (
                <TouchableOpacity key={v} style={[s.chip, editForm.progress === v && s.chipActive]}
                  onPress={() => setEditForm(f => f ? { ...f, progress: v } : f)}>
                  <Text style={[s.chipTxt, editForm.progress === v && s.chipTxtActive]}>{v}%</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[s.modalActions, { marginBottom: 8 }]}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowEdit(false)}>
                <Text style={s.cancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleEdit}>
                <Text style={s.confirmTxt}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Sheet>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#e8edf5' },
  loadWrap:    { flex: 1, backgroundColor: '#e8edf5', alignItems: 'center', justifyContent: 'center' },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5' },
  headerSub:   { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f1f4a' },
  headerCount: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  addBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e8edf5', gap: 3 },
  statN:    { fontSize: 16, fontWeight: '700', color: '#0f1f4a' },
  statL:    { fontSize: 9, color: '#94a3b8', textAlign: 'center' },

  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#d6dff0', height: 40 },
  searchInput: { flex: 1, fontSize: 13, color: '#0f1f4a' },

  chip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d6dff0' },
  chipActive:   { backgroundColor: NAVY, borderColor: NAVY },
  chipTxt:      { fontSize: 11, fontWeight: '600', color: '#64748b' },
  chipTxtActive:{ color: '#fff' },

  card:        { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e8edf5', overflow: 'hidden', shadowColor: '#0a286e', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  cardStripe:  { height: 4, backgroundColor: NAVY },
  cardBody:    { padding: 14 },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: '#0f1f4a', flex: 1, marginRight: 8 },
  cardDesc:    { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt:     { fontSize: 11, color: '#94a3b8' },
  cardActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 13, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexWrap: 'wrap' },
  aBtn:        { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#dbeafe', borderRadius: 7 },
  aBtnTxt:     { fontSize: 11, fontWeight: '700', color: NAVY },

  emptyWrap:  { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 16, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0f1f4a', marginBottom: 6 },
  emptySub:   { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },

  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 40, maxHeight: '92%' },
  sheetHandle:{ width: 40, height: 4, backgroundColor: '#d6dff0', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  sheetHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#0f1f4a' },

  fLbl:   { fontSize: 12, fontWeight: '600', color: '#5a6a85', marginBottom: 6, marginTop: 12 },
  fInput: { backgroundColor: '#f3f6fc', borderWidth: 1.5, borderColor: '#d6dff0', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#0f1f4a' },

  memberChip:       { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#d6dff0', backgroundColor: '#f3f6fc' },
  memberChipActive: { borderColor: NAVY, backgroundColor: '#dbeafe' },
  memberChipTxt:    { fontSize: 12, color: '#5a6a85', maxWidth: 100 },
  avatar:           { width: 26, height: 26, borderRadius: 13, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:        { color: '#fff', fontWeight: '800', fontSize: 11 },

  seg:          { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: '#d6dff0', backgroundColor: '#f3f6fc' },
  segActive:    { borderColor: NAVY, backgroundColor: '#dbeafe' },
  segTxt:       { fontSize: 11, fontWeight: '600', color: '#64748b' },
  segTxtActive: { color: NAVY },

  prioBtn:    { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: '#d6dff0', backgroundColor: '#f3f6fc', alignItems: 'center' },
  prioBtnTxt: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn:    { flex: 1, paddingVertical: 12, borderWidth: 1.5, borderColor: '#d6dff0', borderRadius: 10, alignItems: 'center' },
  cancelTxt:    { fontSize: 13, fontWeight: '600', color: '#64748b' },
  confirmBtn:   { flex: 1, paddingVertical: 12, backgroundColor: NAVY, borderRadius: 10, alignItems: 'center' },
  confirmTxt:   { fontSize: 13, fontWeight: '700', color: '#fff' },

  errBox:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3', borderRadius: 8, padding: 10, marginBottom: 10 },
  errText: { fontSize: 12, color: '#be123c', fontWeight: '500', flex: 1 },
});