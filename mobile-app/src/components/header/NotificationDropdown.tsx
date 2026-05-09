import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';  // ✅ Ajout de useNavigate
import { useAuth } from '../../context/AuthContext';

interface Notification {
  id: number;
  type: string;
  titre: string;
  message: string;
  lien: string;
  est_lue: boolean;
  created_at: string;
}

const API_URL = 'http://localhost:5000/api';

const typeConfig: Record<string, { bg: string; color: string; icon: string }> = {
  tache_assignee: { bg: '#eff6ff', color: '#1e40af', icon: '📋' },
  rappel_deadline: { bg: '#fff7ed', color: '#9a3412', icon: '⏰' },
  alerte_risque: { bg: '#fef2f2', color: '#991b1b', icon: '🔴' },
  projet_update: { bg: '#f0fdf4', color: '#166534', icon: '📁' },
};

export default function NotificationDropdown() {
  const navigate = useNavigate();  // ✅ Ajout du hook de navigation
  const { token, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.est_lue).length;
  const filtered = activeFilter === 'unread' 
    ? notifications.filter((n) => !n.est_lue) 
    : notifications;

  // ✅ Fonction pour transformer les liens
  const transformLink = (lien: string): string => {
    if (!lien) return '/tasks';
    
    // Si le lien est du type /tasks/123, le transformer en /tasks?highlight=123
    if (lien.match(/^\/tasks\/\d+$/)) {
      const taskId = lien.split('/').pop();
      return `/tasks?highlight=${taskId}`;
    }
    
    // Si le lien est du type /tasks/123/commentaires, etc.
    if (lien.match(/^\/tasks\/\d+\//)) {
      const parts = lien.split('/');
      const taskId = parts[2];
      return `/tasks?highlight=${taskId}`;
    }
    
    return lien;
  };

  // Charger les notifications
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/notifications/mes-notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marquer comme lue
  const markAsRead = async (id: number) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/lire`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, est_lue: true } : n)
      );
    } catch (error) {
      console.error('Erreur marquage lecture:', error);
    }
  };

  // Marquer toutes comme lues
  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/lire-toutes`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, est_lue: true })));
    } catch (error) {
      console.error('Erreur marquage toutes lues:', error);
    }
  };

  // Supprimer une notification
  const deleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  // Effacer toutes les notifications
  const clearAllNotifications = async () => {
    try {
      await fetch(`${API_URL}/notifications/clear-all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications([]);
    } catch (error) {
      console.error('Erreur effacement:', error);
    }
  };

  // ✅ Gérer le clic sur une notification (VERSION CORRIGÉE)
  const handleNotificationClick = (notif: Notification) => {
    console.log('🔔 Notification cliquée:', notif); // Pour déboguer
    
    // Marquer comme lue
    markAsRead(notif.id);
    
    // Fermer le dropdown
    setIsOpen(false);
    
    // Rediriger si un lien existe
    if (notif.lien && notif.lien !== '#') {
      const correctedLink = transformLink(notif.lien);
      console.log('🔄 Redirection vers:', correctedLink); // Pour déboguer
      navigate(correctedLink);  // ✅ Utilisation de navigate au lieu de window.location
    } else {
      // Par défaut, rediriger vers la liste des tâches
      navigate('/tasks');
    }
  };

  // Formater la date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `à l'instant`;
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
    return date.toLocaleDateString('fr-FR');
  };

  // Fermer en cliquant ailleurs
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Charger au montage et toutes les 30 secondes
  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const getTypeStyle = (type: string) => {
    return typeConfig[type] || { bg: '#f8fafc', color: '#475569', icon: '🔔' };
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bouton de notification */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '18px',
            height: '18px',
            background: '#ef4444',
            color: '#fff',
            borderRadius: '50%',
            fontSize: '10px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fff'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          width: '380px',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  🔔 Notifications
                </h3>
                {unreadCount > 0 && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: '20px',
                    background: '#fee2e2',
                    color: '#be123c'
                  }}>
                    {unreadCount} nouvelle{unreadCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    fontSize: '12px',
                    color: '#1e40af',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Tout marquer lu
                </button>
              )}
            </div>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveFilter('all')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: activeFilter === 'all' ? '#1e3a8a' : '#f1f5f9',
                  color: activeFilter === 'all' ? '#fff' : '#64748b',
                }}
              >
                Toutes
              </button>
              <button
                onClick={() => setActiveFilter('unread')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: activeFilter === 'unread' ? '#1e3a8a' : '#f1f5f9',
                  color: activeFilter === 'unread' ? '#fff' : '#64748b',
                }}
              >
                Non lues ({unreadCount})
              </button>
            </div>
          </div>

          {/* Liste */}
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                <p style={{ fontSize: '13px', margin: 0 }}>Chargement...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
                <p style={{ fontSize: '13px', margin: 0 }}>Aucune notification</p>
              </div>
            ) : (
              filtered.map((notif) => {
                const style = getTypeStyle(notif.type);
                const isNew = (new Date().getTime() - new Date(notif.created_at).getTime()) < 60000;
                
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px 16px',
                      borderBottom: '1px solid #f8fafc',
                      background: notif.est_lue ? '#fff' : (isNew ? '#fef3c7' : '#fafbff'),
                      transition: 'background 0.15s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => {
                      if (notif.est_lue) e.currentTarget.style.background = '#fff';
                      else if (isNew) e.currentTarget.style.background = '#fef3c7';
                      else e.currentTarget.style.background = '#fafbff';
                    }}
                  >
                    {/* Icone */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: style.bg,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0
                    }}>
                      {style.icon}
                    </div>

                    {/* Contenu */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <p style={{
                          fontSize: '13px',
                          fontWeight: notif.est_lue ? 500 : 700,
                          color: '#0f172a',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {notif.titre}
                        </p>
                        <button
                          onClick={(e) => deleteNotification(notif.id, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            fontSize: '14px',
                            padding: '0 4px',
                            lineHeight: 1
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <p style={{
                        fontSize: '12px',
                        color: '#64748b',
                        margin: '4px 0 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {notif.message}
                      </p>
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                        {formatDate(notif.created_at)}
                      </p>
                    </div>

                    {/* Indicateur non lu */}
                    {!notif.est_lue && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        background: '#1d4ed8',
                        borderRadius: '50%',
                        marginTop: '8px',
                        flexShrink: 0
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''} au total
              </span>
              <button
                onClick={clearAllNotifications}
                style={{
                  fontSize: '12px',
                  color: '#ef4444',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Tout effacer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}