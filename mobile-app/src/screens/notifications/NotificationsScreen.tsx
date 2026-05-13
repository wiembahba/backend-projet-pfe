import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Notification {
  id: number;
  titre: string;
  message: string;
  type: string;
  lu: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  alerte:      { icon: 'warning',            color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  info:        { icon: 'information-circle', color: '#63b3ed', bg: 'rgba(99,179,237,0.15)'  },
  success:     { icon: 'checkmark-circle',   color: '#68d391', bg: 'rgba(104,211,145,0.15)' },
  retard:      { icon: 'time',               color: '#f6ad55', bg: 'rgba(246,173,85,0.15)'  },
  risque:      { icon: 'alert-circle',       color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  assignation: { icon: 'person-add',         color: '#63b3ed', bg: 'rgba(99,179,237,0.15)'  },
};

function NotifCard({ notif, onPress, index }: { notif: Notification; onPress: () => void; index: number }) {
  const anim  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 300, delay: index * 45, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 80, friction: 10, delay: index * 45, useNativeDriver: true }),
    ]).start();
  }, []);

  const config  = TYPE_CONFIG[notif.type] || TYPE_CONFIG['info'];
  const timeStr = new Date(notif.created_at).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: slide }] }}>
      <TouchableOpacity
        style={[styles.card, !notif.lu && styles.cardUnread]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {!notif.lu && <View style={styles.unreadDot} />}
        <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, !notif.lu && styles.cardTitleUnread]} numberOfLines={1}>
            {notif.titre}
          </Text>
          <Text style={styles.cardMessage} numberOfLines={2}>{notif.message}</Text>
          <Text style={styles.cardTime}>{timeStr}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await notificationApi.getAll(token);
      setNotifications(data?.notifications || data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const unreadCount = notifications.filter(n => !n.lu).length;

  const handlePress = async (notif: Notification) => {
    if (!notif.lu) {
      try {
        await notificationApi.markRead(notif.id, token);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, lu: true } : n));
      } catch {}
    }
    Alert.alert(notif.titre, notif.message);
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    } catch {
      Alert.alert('Erreur', 'Impossible de marquer tout comme lu.');
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSub}>
              {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Tout est à jour'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} activeOpacity={0.8}>
              <Ionicons name="checkmark-done-outline" size={16} color="#63b3ed" />
              <Text style={styles.markAllText}>Tout lire</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1d6fd8" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d6fd8" />}
          renderItem={({ item, index }) => (
            <NotifCard notif={item} index={index} onPress={() => handlePress(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color="rgba(255,255,255,0.25)" />
              <Text style={styles.emptyText}>Aucune notification</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#0a0f1e' },
  header:      { backgroundColor: '#0d1b3e', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#e8f4fd' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  markAllBtn:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  markAllText:     { fontSize: 12, color: '#63b3ed' },
  list:            { padding: 14, gap: 8 },
  loader:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card:            {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.09)',
    flexDirection: 'row', alignItems: 'center',
    padding: 13, gap: 12,
  },
  cardUnread:      { borderLeftWidth: 2.5, borderLeftColor: '#1d6fd8' },
  unreadDot:       { position: 'absolute', top: 11, right: 11, width: 7, height: 7, borderRadius: 4, backgroundColor: '#1d6fd8' },
  iconWrap:        { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardContent:     { flex: 1, gap: 3 },
  cardTitle:       { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.55)' },
  cardTitleUnread: { color: '#e8f4fd', fontWeight: '600' },
  cardMessage:     { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 18 },
  cardTime:        { fontSize: 11, color: 'rgba(255,255,255,0.30)' },
  empty:           { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText:       { fontSize: 14, color: 'rgba(255,255,255,0.30)' },
});