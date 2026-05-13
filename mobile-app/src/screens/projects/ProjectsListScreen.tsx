import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  TextInput, RefreshControl, ActivityIndicator, Animated, ScrollView,
  Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { ROLE_COLORS } from '../../constants/theme';

// ─── Themes ───────────────────────────────────────────────────────────────────
const DARK = {
  bg:          '#0a0f1e',
  surface:     'rgba(255,255,255,0.05)',
  surfaceSolid:'#0d1b3e',
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
  searchBg:    'rgba(255,255,255,0.06)',
  searchBdr:   'rgba(255,255,255,0.12)',
  chipBg:      'rgba(255,255,255,0.07)',
  chipBdr:     'rgba(255,255,255,0.12)',
  chipActive:  '#1d6fd8',
  statBg:      'rgba(255,255,255,0.05)',
  statBdr:     'rgba(255,255,255,0.08)',
  cardShadow:  '#000',
  rowSep:      'rgba(255,255,255,0.06)',
  inputBg:     'rgba(255,255,255,0.06)',
  inputBdr:    'rgba(255,255,255,0.12)',
  overlay:     'rgba(0,0,0,0.7)',
  sheetBg:     '#0d1520',
  sheetHandle: 'rgba(255,255,255,0.15)',
  errBg:       'rgba(190,18,60,0.15)',
  errBdr:      'rgba(190,18,60,0.35)',
  addBtn:      '#1d6fd8',
  logoutBg:    'rgba(245,101,101,0.10)',
  logoutBdr:   'rgba(245,101,101,0.22)',
  logoutTxt:   '#fc8181',
  memberActive:'rgba(29,111,216,0.25)',
  toggleBg:    'rgba(29,111,216,0.20)',
  toggleBdr:   'rgba(99,179,237,0.30)',
  toggleTxt:   '#90cdf4',
};

const LIGHT = {
  bg:          '#f1f5f9',
  surface:     '#ffffff',
  surfaceSolid:'#ffffff',
  border:      '#e2e8f0',
  stripe:      '#185FA5',
  textPri:     '#1e293b',
  textSec:     '#64748b',
  textMuted:   '#94a3b8',
  iconBg:      '#eff6ff',
  iconColor:   '#185FA5',
  badgeBg:     '#dbeafe',
  badgeBdr:    '#bfdbfe',
  badgeTxt:    '#0f3494',
  searchBg:    '#ffffff',
  searchBdr:   '#d6dff0',
  chipBg:      '#ffffff',
  chipBdr:     '#d6dff0',
  chipActive:  '#0f3494',
  statBg:      '#ffffff',
  statBdr:     '#e8edf5',
  cardShadow:  '#0a286e',
  rowSep:      '#f1f5f9',
  inputBg:     '#f3f6fc',
  inputBdr:    '#d6dff0',
  overlay:     'rgba(0,0,0,0.45)',
  sheetBg:     '#ffffff',
  sheetHandle: '#d6dff0',
  errBg:       '#fff1f2',
  errBdr:      '#fecdd3',
  addBtn:      '#0f3494',
  logoutBg:    'rgba(239,68,68,0.07)',
  logoutBdr:   'rgba(239,68,68,0.20)',
  logoutTxt:   '#dc2626',
  memberActive:'#dbeafe',
  toggleBg:    '#dbeafe',
  toggleBdr:   '#bfdbfe',
  toggleTxt:   '#0f3494',
};

type Theme = typeof DARK;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Project {
  id: string; name: string; description: string;
  chef: string; chef_id?: number; status: string; priority: string;
  progress: number; startDate: string; endDate: string; tasks: number;
}
interface User { id: number; nom_complet: string; role: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const NAVY = '#0f3494';
const API_URL = 'http://localhost:5000/api';

const toStatut    = (s: string) => ({ en_cours:'En cours', termine:'Terminé', en_attente:'En attente', en_retard:'En retard', a_faire:'À faire' }[s] || s);
const toPriorite  = (p: string) => ({ haute:'Haute', moyenne:'Moyenne', faible:'Basse', critique:'Critique' }[p] || p);
const fromStatut  = (s: string) => ({ 'En cours':'en_cours', 'Terminé':'termine', 'En attente':'en_attente', 'Annulé':'en_attente' }[s] || 'en_attente');
const fromPriorite= (p: string) => ({ 'Haute':'haute', 'Moyenne':'moyenne', 'Basse':'faible', 'Critique':'haute' }[p] || 'moyenne');

const STATUS_C: Record<string, { bg: string; text: string; border: string }> = {
  'En cours':   { bg:'#dbeafe', text:NAVY,      border:'#bfdbfe' },
  'Terminé':    { bg:'#dcfce7', text:'#15803d', border:'#bbf7d0' },
  'En attente': { bg:'#fef9c3', text:'#a16207', border:'#fde68a' },
  'En retard':  { bg:'#fff1f2', text:'#be123c', border:'#fecdd3' },
  'Annulé':     { bg:'#fff1f2', text:'#be123c', border:'#fecdd3' },
};
const PRIO_C: Record<string, { bg: string; text: string; border: string }> = {
  'Haute':    { bg:'#fff1f2', text:'#be123c', border:'#fecdd3' },
  'Critique': { bg:'#fff1f2', text:'#be123c', border:'#fecdd3' },
  'Moyenne':  { bg:'#fef9c3', text:'#a16207', border:'#fde68a' },
  'Basse':    { bg:'#dcfce7', text:'#15803d', border:'#bbf7d0' },
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Pill({ label, map }: { label: string; map: Record<string, { bg: string; text: string; border: string }> }) {
  const c = map[label] ?? { bg:'#f1f5f9', text:'#64748b', border:'#e2e8f0' };
  return (
    <View style={{ backgroundColor:c.bg, borderRadius:6, borderWidth:1, borderColor:c.border, paddingHorizontal:8, paddingVertical:3 }}>
      <Text style={{ color:c.text, fontSize:10, fontWeight:'700' }}>{label}</Text>
    </View>
  );
}

function AnimatedBar({ value, t }: { value: number; t: Theme }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(anim, { toValue:value, duration:650, useNativeDriver:false }).start(); }, [value]);
  const w = anim.interpolate({ inputRange:[0,100], outputRange:['0%','100%'] });
  const color = value === 100 ? '#16a34a' : value >= 60 ? '#1d6fd8' : '#d97706';
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:7 }}>
      <View style={{ flex:1, height:5, backgroundColor:t.statBdr, borderRadius:3, overflow:'hidden' }}>
        <Animated.View style={{ height:5, borderRadius:3, width:w, backgroundColor:color }} />
      </View>
      <Text style={{ fontSize:10, color:t.textMuted, minWidth:30, textAlign:'right' }}>{value}%</Text>
    </View>
  );
}

function FLabel({ label, required, t }: { label: string; required?: boolean; t: Theme }) {
  return (
    <Text style={{ fontSize:12, fontWeight:'600', color:t.textSec, marginBottom:6, marginTop:12 }}>
      {label}{required ? <Text style={{ color:'#ef4444' }}> *</Text> : null}
    </Text>
  );
}

function FInput({ t, ...props }: React.ComponentProps<typeof TextInput> & { t: Theme }) {
  return (
    <TextInput
      style={{ backgroundColor:t.inputBg, borderWidth:1.5, borderColor:t.inputBdr, borderRadius:9, paddingHorizontal:12, paddingVertical:9, fontSize:13, color:t.textPri }}
      placeholderTextColor={t.textMuted}
      {...props}
    />
  );
}

function ErrBox({ msg, t }: { msg: string; t: Theme }) {
  if (!msg) return null;
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:7, backgroundColor:t.errBg, borderWidth:1, borderColor:t.errBdr, borderRadius:8, padding:10, marginBottom:10 }}>
      <Ionicons name="warning-outline" size={13} color="#be123c" />
      <Text style={{ fontSize:12, color:'#be123c', fontWeight:'500', flex:1 }}>{msg}</Text>
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

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ item, canEdit, t, onOpen, onEdit, onDelete }: {
  item: Project; canEdit: boolean; t: Theme;
  onOpen(): void; onEdit(): void; onDelete(): void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pi = (v: number) => Animated.timing(scale, { toValue:v, duration:70, useNativeDriver:true }).start();
  return (
    <Animated.View style={[{
      backgroundColor: t.surface,
      borderRadius:14, borderWidth:1, borderColor:t.border, overflow:'hidden',
      shadowColor:t.cardShadow, shadowOpacity:0.1, shadowRadius:12,
      shadowOffset:{ width:0, height:4 }, elevation:4,
      transform:[{ scale }],
    }]}>
      <TouchableOpacity onPress={onOpen} onPressIn={() => pi(0.982)} onPressOut={() => pi(1)} activeOpacity={1}>
        <View style={{ height:3, backgroundColor:t.stripe }} />
        <View style={{ padding:14 }}>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
            <Text style={{ fontSize:14, fontWeight:'700', color:t.textPri, flex:1, marginRight:8 }} numberOfLines={1}>{item.name}</Text>
            <Pill label={item.status} map={STATUS_C} />
          </View>
          <Text style={{ fontSize:11, color:t.textMuted, marginBottom:10 }} numberOfLines={1}>{item.description || 'Aucune description'}</Text>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
              <View style={{ width:22, height:22, borderRadius:6, backgroundColor:t.iconBg, alignItems:'center', justifyContent:'center' }}>
                <Ionicons name="person-outline" size={11} color={t.iconColor} />
              </View>
              <Text style={{ fontSize:11, color:t.textSec }}>{item.chef}</Text>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <Pill label={item.priority} map={PRIO_C} />
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <Ionicons name="list-outline" size={11} color={t.textMuted} />
                <Text style={{ fontSize:11, color:t.textMuted }}>{item.tasks} tâches</Text>
              </View>
            </View>
          </View>
          <AnimatedBar value={item.progress} t={t} />
          <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginTop:8 }}>
            <Ionicons name="time-outline" size={11} color={t.textMuted} />
            <Text style={{ fontSize:11, color:t.textMuted }}>Échéance : {item.endDate || 'Non définie'}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={{ flexDirection:'row', gap:8, paddingHorizontal:14, paddingBottom:13, paddingTop:4, borderTopWidth:1, borderTopColor:t.rowSep, flexWrap:'wrap' }}>
        <TouchableOpacity style={{ paddingHorizontal:12, paddingVertical:6, backgroundColor:t.badgeBg, borderRadius:7 }} onPress={onOpen}>
          <Text style={{ fontSize:11, fontWeight:'700', color:t.badgeTxt }}>Ouvrir</Text>
        </TouchableOpacity>
        {canEdit && (
          <>
            <TouchableOpacity style={{ paddingHorizontal:12, paddingVertical:6, backgroundColor:'rgba(21,128,61,0.15)', borderRadius:7 }} onPress={onEdit}>
              <Text style={{ fontSize:11, fontWeight:'700', color:'#16a34a' }}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ paddingHorizontal:12, paddingVertical:6, backgroundColor:'rgba(190,18,60,0.12)', borderRadius:7 }} onPress={onDelete}>
              <Text style={{ fontSize:11, fontWeight:'700', color:'#be123c' }}>Supprimer</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────
function Sheet({ visible, onClose, title, t, children }: {
  visible: boolean; onClose(): void; title: string; t: Theme; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:t.overlay }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex:1, justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:t.sheetBg, borderTopLeftRadius:22, borderTopRightRadius:22, padding:20, paddingBottom:40, maxHeight:'92%' }}>
            <View style={{ width:40, height:4, backgroundColor:t.sheetHandle, borderRadius:2, alignSelf:'center', marginBottom:18 }} />
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <Text style={{ fontSize:17, fontWeight:'700', color:t.textPri }}>{title}</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={t.textMuted} /></TouchableOpacity>
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
function SegSelector({ options, value, onChange, t }: { options: string[]; value: string; onChange(v: string): void; t: Theme }) {
  return (
    <View style={{ flexDirection:'row', gap:7, flexWrap:'wrap', marginBottom:14 }}>
      {options.map(o => (
        <TouchableOpacity key={o}
          style={{ paddingHorizontal:12, paddingVertical:7, borderRadius:8, borderWidth:1.5, borderColor:value === o ? t.stripe : t.inputBdr, backgroundColor:value === o ? t.memberActive : t.inputBg }}
          onPress={() => onChange(o)}>
          <Text style={{ fontSize:11, fontWeight:'600', color:value === o ? t.badgeTxt : t.textSec }}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PrioSelector({ options, value, onChange, t }: {
  options: { val: string; label: string; color: string; bg: string; border: string }[];
  value: string; onChange(v: string): void; t: Theme;
}) {
  return (
    <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
      {options.map(p => (
        <TouchableOpacity key={p.val}
          style={{ flex:1, paddingVertical:9, borderRadius:8, borderWidth:1.5, borderColor:value === p.val ? p.color : t.inputBdr, backgroundColor:value === p.val ? p.bg + '33' : t.inputBg, alignItems:'center' }}
          onPress={() => onChange(p.val)}>
          <Text style={{ fontSize:12, fontWeight:'600', color:value === p.val ? p.color : t.textSec }}>{p.label}</Text>
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

  const [isDark, setIsDark] = useState(true);
  const t = isDark ? DARK : LIGHT;

  const [projects,   setProjects]   = useState<Project[]>([]);
  const [users,      setUsers]      = useState<User[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [filterSt,   setFilterSt]   = useState('all');

  const [showCreate,    setShowCreate]    = useState(false);
  const [createForm,    setCreateForm]    = useState({ nom_projet:'', description:'', chef_projet_id:'', date_debut:'', date_fin_prevue:'', statut:'en_attente', priorite:'moyenne' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState('');

  const [showEdit,  setShowEdit]  = useState(false);
  const [editForm,  setEditForm]  = useState<Project | null>(null);
  const [editError, setEditError] = useState('');

  const fetchProjects = async () => {
    try {
      const r = await fetch(`${API_URL}/projets`, { headers: { Authorization:`Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setProjects(d.projets.map((p: any) => ({
        id:String(p.id), name:p.nom_projet, description:p.description || '',
        chef:p.chef_nom || 'Non assigné', chef_id:p.chef_projet_id,
        status:toStatut(p.statut), priority:toPriorite(p.priorite),
        progress:p.progression || 0,
        startDate:p.date_debut      ? new Date(p.date_debut).toISOString().split('T')[0]      : '',
        endDate:  p.date_fin_prevue ? new Date(p.date_fin_prevue).toISOString().split('T')[0] : '',
        tasks:p.nb_taches || 0,
      })));
    } catch {}
    setLoading(false); setRefreshing(false);
  };

  const fetchUsers = async () => {
    try {
      const r = await fetch(`${API_URL}/users?role=chef_projet`, { headers: { Authorization:`Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setUsers(d.users);
    } catch {}
  };

  useEffect(() => { if (token) { fetchProjects(); fetchUsers(); } else setLoading(false); }, [token]);

  useEffect(() => {
    if (!editForm) return;
    let np = editForm.progress;
    if      (editForm.status === 'Terminé'    && np !== 100) np = 100;
    else if (editForm.status === 'En attente' && np > 5)    np = 0;
    else if (editForm.status === 'Annulé')                   np = 0;
    else if (editForm.status === 'En cours'   && np === 0)   np = 10;
    if (np !== editForm.progress) setEditForm(f => f ? { ...f, progress:np } : f);
  }, [editForm?.status]);

  const handleCreate = async () => {
    if (!createForm.nom_projet.trim()) { setCreateError('Le nom du projet est obligatoire'); return; }
    if (!createForm.date_fin_prevue)   { setCreateError('La date de fin est obligatoire');   return; }
    setCreateLoading(true); setCreateError('');
    try {
      const r = await fetch(`${API_URL}/projets`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body:JSON.stringify({ nom_projet:createForm.nom_projet, description:createForm.description || null, chef_projet_id:createForm.chef_projet_id ? parseInt(createForm.chef_projet_id) : null, date_debut:createForm.date_debut || null, date_fin_prevue:createForm.date_fin_prevue, statut:createForm.statut, priorite:createForm.priorite }),
      });
      const d = await r.json();
      if (r.ok && d.success) { setShowCreate(false); setCreateForm({ nom_projet:'', description:'', chef_projet_id:'', date_debut:'', date_fin_prevue:'', statut:'en_attente', priorite:'moyenne' }); fetchProjects(); }
      else setCreateError(d.message || 'Erreur lors de la création');
    } catch { setCreateError('Erreur de connexion'); }
    setCreateLoading(false);
  };

  const handleEdit = async () => {
    if (!editForm) return;
    if (!editForm.name.trim()) { setEditError('Le nom est obligatoire'); return; }
    if (!editForm.endDate)     { setEditError('La date de fin est obligatoire'); return; }
    try {
      const r = await fetch(`${API_URL}/projets/${editForm.id}`, {
        method:'PUT',
        headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body:JSON.stringify({ nom_projet:editForm.name, description:editForm.description, chef_projet_id:editForm.chef_id || null, date_debut:editForm.startDate || null, date_fin_prevue:editForm.endDate, statut:fromStatut(editForm.status), priorite:fromPriorite(editForm.priority), progression:editForm.progress }),
      });
      const d = await r.json();
      if (r.ok && d.success) { setShowEdit(false); fetchProjects(); }
      else setEditError(d.message || 'Erreur lors de la modification');
    } catch { setEditError('Erreur de connexion'); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Supprimer le projet ?', 'Cette action est irréversible.', [
      { text:'Annuler', style:'cancel' },
      { text:'Supprimer', style:'destructive', onPress: async () => {
        try { await fetch(`${API_URL}/projets/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } }); fetchProjects(); } catch {}
      }},
    ]);
  };

  const PRIO_OPTS = [
    { val:'faible',  label:'Basse',   color:'#15803d', bg:'#dcfce7', border:'#bbf7d0' },
    { val:'moyenne', label:'Moyenne', color:'#a16207', bg:'#fef9c3', border:'#fde68a' },
    { val:'haute',   label:'Haute',   color:'#be123c', bg:'#fff1f2', border:'#fecdd3' },
  ];
  const PRIO_OPTS_FR = [
    { val:'Basse',   label:'Basse',   color:'#15803d', bg:'#dcfce7', border:'#bbf7d0' },
    { val:'Moyenne', label:'Moyenne', color:'#a16207', bg:'#fef9c3', border:'#fde68a' },
    { val:'Haute',   label:'Haute',   color:'#be123c', bg:'#fff1f2', border:'#fecdd3' },
  ];

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterSt === 'all' || p.status === filterSt)
  );

  if (loading) return (
    <SafeAreaView style={{ flex:1, backgroundColor:t.bg, alignItems:'center', justifyContent:'center' }}>
      <ActivityIndicator color={t.stripe} size="large" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:t.bg }}>

      {/* ── Header ── */}
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:14, backgroundColor:t.surfaceSolid, borderBottomWidth:1, borderBottomColor:t.border }}>
        <View>
          <Text style={{ fontSize:10, color:t.textMuted, fontWeight:'500' }}>Tableau de bord</Text>
          <Text style={{ fontSize:20, fontWeight:'700', color:t.textPri }}>Projets</Text>
          <Text style={{ fontSize:11, color:t.textMuted, marginTop:1 }}>{projects.length} projets au total</Text>
        </View>
        <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
          <ThemeToggle isDark={isDark} toggle={() => setIsDark(v => !v)} t={t} />
          {canEdit && (
            <TouchableOpacity style={{ width:36, height:36, borderRadius:10, backgroundColor:t.addBtn, alignItems:'center', justifyContent:'center' }}
              onPress={() => { setCreateError(''); setShowCreate(true); }}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Stats ── */}
      <View style={{ flexDirection:'row', gap:8, paddingHorizontal:16, paddingVertical:12 }}>
        {[
          { label:'Total',     value:projects.length,                                       icon:'folder-outline'         },
          { label:'En cours',  value:projects.filter(p => p.status === 'En cours').length,  icon:'sync-outline'           },
          { label:'Terminés',  value:projects.filter(p => p.status === 'Terminé').length,   icon:'checkmark-done-outline' },
          { label:'En retard', value:projects.filter(p => p.status === 'En retard').length, icon:'alert-circle-outline'   },
        ].map(({ label, value, icon }) => (
          <View key={label} style={{ flex:1, backgroundColor:t.statBg, borderRadius:10, padding:10, alignItems:'center', borderWidth:1, borderColor:t.statBdr, gap:3 }}>
            <Ionicons name={icon as any} size={13} color={t.iconColor} />
            <Text style={{ fontSize:16, fontWeight:'700', color:t.textPri }}>{value}</Text>
            <Text style={{ fontSize:9, color:t.textMuted, textAlign:'center' }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Search ── */}
      <View style={{ paddingHorizontal:16, gap:8, marginBottom:4 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:t.searchBg, borderRadius:10, paddingHorizontal:12, borderWidth:1, borderColor:t.searchBdr, height:40 }}>
          <Ionicons name="search-outline" size={15} color={t.textMuted} />
          <TextInput style={{ flex:1, fontSize:13, color:t.textPri }} placeholder="Rechercher un projet..."
            placeholderTextColor={t.textMuted} value={search} onChangeText={setSearch} />
          {!!search && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={t.textMuted} /></TouchableOpacity>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection:'row', gap:7 }}>
            {['all','En cours','En attente','Terminé','En retard'].map(f => (
              <TouchableOpacity key={f}
                style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:20, backgroundColor:filterSt === f ? t.chipActive : t.chipBg, borderWidth:1, borderColor:filterSt === f ? t.chipActive : t.chipBdr }}
                onPress={() => setFilterSt(f)}>
                <Text style={{ fontSize:11, fontWeight:'600', color:filterSt === f ? '#fff' : t.textSec }}>{f === 'all' ? 'Tous' : f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding:16, gap:12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProjects(); }} tintColor={t.stripe} />}
        renderItem={({ item }) => (
          <ProjectCard item={item} canEdit={canEdit} t={t}
            onOpen={() => navigation.navigate('ProjectDetail', { projectId:item.id, projectName:item.name })}
            onEdit={() => { setEditForm({ ...item }); setEditError(''); setShowEdit(true); }}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems:'center', marginTop:60, paddingHorizontal:32 }}>
            <View style={{ width:64, height:64, borderRadius:16, backgroundColor:t.iconBg, alignItems:'center', justifyContent:'center', marginBottom:14 }}>
              <Ionicons name="folder-open-outline" size={32} color={t.iconColor} />
            </View>
            <Text style={{ fontSize:15, fontWeight:'700', color:t.textPri, marginBottom:6 }}>Aucun projet trouvé</Text>
            <Text style={{ fontSize:12, color:t.textMuted, textAlign:'center', lineHeight:18 }}>Essayez un autre filtre ou créez un nouveau projet.</Text>
          </View>
        }
      />

      {/* ════ CREATE MODAL ════ */}
      <Sheet visible={showCreate} onClose={() => setShowCreate(false)} title="Nouveau projet" t={t}>
        <ErrBox msg={createError} t={t} />
        <FLabel label="Nom du projet" required t={t} />
        <FInput t={t} value={createForm.nom_projet} onChangeText={v => setCreateForm(f => ({ ...f, nom_projet:v }))} placeholder="Ex : Application Mobile" />
        <FLabel label="Description" t={t} />
        <TextInput style={{ backgroundColor:t.inputBg, borderWidth:1.5, borderColor:t.inputBdr, borderRadius:9, paddingHorizontal:12, paddingVertical:9, fontSize:13, color:t.textPri, height:80, textAlignVertical:'top' }}
          value={createForm.description} onChangeText={v => setCreateForm(f => ({ ...f, description:v }))}
          placeholder="Décrivez les objectifs..." placeholderTextColor={t.textMuted} multiline />
        <FLabel label="Chef de projet" t={t} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:4 }}>
          <View style={{ flexDirection:'row', gap:8 }}>
            {users.map(u => {
              const active = createForm.chef_projet_id === String(u.id);
              return (
                <TouchableOpacity key={u.id}
                  style={{ flexDirection:'row', alignItems:'center', gap:7, padding:8, borderRadius:10, borderWidth:1.5, borderColor:active ? t.stripe : t.inputBdr, backgroundColor:active ? t.memberActive : t.inputBg }}
                  onPress={() => setCreateForm(f => ({ ...f, chef_projet_id:String(u.id) }))}>
                  <View style={{ width:26, height:26, borderRadius:13, backgroundColor:t.stripe, alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ color:'#fff', fontWeight:'800', fontSize:11 }}>{u.nom_complet[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={{ fontSize:12, color:active ? t.badgeTxt : t.textSec, maxWidth:100, fontWeight:active ? '700' : '400' }} numberOfLines={1}>{u.nom_complet}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <View style={{ flexDirection:'row', gap:10 }}>
          <View style={{ flex:1 }}><FLabel label="Date début" t={t} /><FInput t={t} value={createForm.date_debut} onChangeText={v => setCreateForm(f => ({ ...f, date_debut:v }))} placeholder="AAAA-MM-JJ" /></View>
          <View style={{ flex:1 }}><FLabel label="Date fin" required t={t} /><FInput t={t} value={createForm.date_fin_prevue} onChangeText={v => setCreateForm(f => ({ ...f, date_fin_prevue:v }))} placeholder="AAAA-MM-JJ" /></View>
        </View>
        <FLabel label="Statut" t={t} />
        <SegSelector options={['en_attente','en_cours','termine']} value={createForm.statut} onChange={v => setCreateForm(f => ({ ...f, statut:v }))} t={t} />
        <FLabel label="Priorité" t={t} />
        <PrioSelector options={PRIO_OPTS} value={createForm.priorite} onChange={v => setCreateForm(f => ({ ...f, priorite:v }))} t={t} />
        <View style={{ flexDirection:'row', gap:10, marginTop:6, marginBottom:8 }}>
          <TouchableOpacity style={{ flex:1, paddingVertical:12, borderWidth:1.5, borderColor:t.border, borderRadius:10, alignItems:'center' }} onPress={() => setShowCreate(false)}>
            <Text style={{ fontSize:13, fontWeight:'600', color:t.textSec }}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex:1, paddingVertical:12, backgroundColor:t.addBtn, borderRadius:10, alignItems:'center', opacity:createLoading ? 0.5 : 1 }} onPress={handleCreate} disabled={createLoading}>
            {createLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize:13, fontWeight:'700', color:'#fff' }}>Créer le projet</Text>}
          </TouchableOpacity>
        </View>
      </Sheet>

      {/* ════ EDIT MODAL ════ */}
      <Sheet visible={showEdit} onClose={() => setShowEdit(false)} title="Modifier le projet" t={t}>
        {editForm && (
          <>
            <ErrBox msg={editError} t={t} />
            <FLabel label="Nom du projet" required t={t} />
            <FInput t={t} value={editForm.name} onChangeText={v => setEditForm(f => f ? { ...f, name:v } : f)} />
            <FLabel label="Description" t={t} />
            <TextInput style={{ backgroundColor:t.inputBg, borderWidth:1.5, borderColor:t.inputBdr, borderRadius:9, paddingHorizontal:12, paddingVertical:9, fontSize:13, color:t.textPri, height:80, textAlignVertical:'top' }}
              value={editForm.description} onChangeText={v => setEditForm(f => f ? { ...f, description:v } : f)}
              placeholderTextColor={t.textMuted} multiline />
            <View style={{ flexDirection:'row', gap:10 }}>
              <View style={{ flex:1 }}><FLabel label="Date début" t={t} /><FInput t={t} value={editForm.startDate} onChangeText={v => setEditForm(f => f ? { ...f, startDate:v } : f)} placeholder="AAAA-MM-JJ" /></View>
              <View style={{ flex:1 }}><FLabel label="Date fin" required t={t} /><FInput t={t} value={editForm.endDate} onChangeText={v => setEditForm(f => f ? { ...f, endDate:v } : f)} placeholder="AAAA-MM-JJ" /></View>
            </View>
            <FLabel label="Statut" t={t} />
            <SegSelector options={['En attente','En cours','Terminé','Annulé']} value={editForm.status} onChange={v => setEditForm(f => f ? { ...f, status:v } : f)} t={t} />
            <FLabel label="Priorité" t={t} />
            <PrioSelector options={PRIO_OPTS_FR} value={editForm.priority} onChange={v => setEditForm(f => f ? { ...f, priority:v } : f)} t={t} />
            <FLabel label={`Avancement : ${editForm.progress}%`} t={t} />
            <AnimatedBar value={editForm.progress} t={t} />
            <View style={{ flexDirection:'row', gap:7, flexWrap:'wrap', marginTop:10, marginBottom:16 }}>
              {[0,10,25,50,75,90,100].map(v => (
                <TouchableOpacity key={v}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:20, backgroundColor:editForm.progress === v ? t.chipActive : t.chipBg, borderWidth:1, borderColor:editForm.progress === v ? t.chipActive : t.chipBdr }}
                  onPress={() => setEditForm(f => f ? { ...f, progress:v } : f)}>
                  <Text style={{ fontSize:11, fontWeight:'600', color:editForm.progress === v ? '#fff' : t.textSec }}>{v}%</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection:'row', gap:10, marginBottom:8 }}>
              <TouchableOpacity style={{ flex:1, paddingVertical:12, borderWidth:1.5, borderColor:t.border, borderRadius:10, alignItems:'center' }} onPress={() => setShowEdit(false)}>
                <Text style={{ fontSize:13, fontWeight:'600', color:t.textSec }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex:1, paddingVertical:12, backgroundColor:t.addBtn, borderRadius:10, alignItems:'center' }} onPress={handleEdit}>
                <Text style={{ fontSize:13, fontWeight:'700', color:'#fff' }}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Sheet>

    </SafeAreaView>
  );
}