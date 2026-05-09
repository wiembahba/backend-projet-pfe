# 📱 ProjetFlow Mobile — Application React Native (Expo)

Application mobile connectée au backend **ProjetFlow** (`backend-projet-pfe`).
Même palette de couleurs que le frontend web.

---

## ✅ Fonctionnalités

| Écran          | Rôles concernés         | Description                                      |
|---------------|------------------------|--------------------------------------------------|
| 🔐 Connexion  | Tous                   | Login avec animations fluides + validation       |
| 🏠 Dashboard  | Tous                   | KPI cards animées selon le rôle (admin/chef/emp) |
| 📁 Projets    | Tous                   | Liste + filtres + recherche + progression        |
| 📋 Détail projet | Tous               | Détail complet, tâches, calendrier               |
| ✅ Tâches     | Tous                   | Liste, filtres, modal de mise à jour progression |
| 🔔 Alertes    | Tous                   | Notifications, marquer lu/tous lus               |
| 👥 Équipe     | Admin + Chef           | Liste membres, filtres par rôle                  |
| 👤 Profil     | Tous                   | Infos utilisateur + navigation + déconnexion     |

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Expo CLI : `npm install -g expo-cli`
- Application **Expo Go** sur votre téléphone (iOS / Android)

### 1. Installer les dépendances

```bash
cd gestion-projets-mobile
npm install
```

### 2. Configurer l'adresse du backend

Ouvrez `src/utils/api.ts` et changez `API_URL` :

```typescript
// Pour émulateur Android :
export const API_URL = 'http://10.0.2.2:5000/api';

// Pour appareil physique sur le même WiFi :
export const API_URL = 'http://192.168.X.X:5000/api';  // IP de votre PC

// Pour développement web/simulateur iOS :
export const API_URL = 'http://localhost:5000/api';
```

### 3. Démarrer le backend

```bash
cd ../backend-projet-pfe-main
npm install
npm start
```

### 4. Démarrer l'app mobile

```bash
npm start
```

Scannez le QR code avec **Expo Go** (Android) ou la caméra (iOS).

---

## 🎨 Thème (identique au frontend web)

| Couleur     | Hex        | Usage                       |
|------------|------------|-----------------------------|
| navy950    | `#0c1a3a`  | Header principal            |
| navy900    | `#0f2057`  | Header gradient             |
| blue600    | `#1e40af`  | Accent principal            |
| blue400    | `#60a5fa`  | Highlight                   |
| rose       | `#e11d48`  | Alerte / Risque             |
| green      | `#15803d`  | Succès / Terminé            |
| amber      | `#b45309`  | Avertissement / Moyenne     |

---

## 📂 Structure du projet

```
src/
├── screens/
│   ├── LoginScreen.tsx           # Connexion animée
│   ├── DashboardScreen.tsx       # Dashboard KPI
│   ├── ProjectsScreen.tsx        # Liste projets
│   ├── ProjectDetailScreen.tsx   # Détail projet
│   ├── TasksScreen.tsx           # Tâches + modal
│   ├── NotificationsScreen.tsx   # Alertes
│   ├── TeamScreen.tsx            # Équipe
│   └── ProfileScreen.tsx         # Profil
├── navigation/
│   └── AppNavigator.tsx          # Navigation principale
├── context/
│   └── AuthContext.tsx           # Auth (JWT + AsyncStorage)
└── utils/
    ├── api.ts                    # Appels API backend
    └── theme.ts                  # Couleurs + styles partagés
```

---

## 🔐 Authentification

L'app utilise le même système JWT que le backend.
- Token stocké dans `AsyncStorage` (clé `mdw-token`)
- Rôles : `admin`, `chef_projet`, `employe`
- Navigation adaptée selon le rôle

---

## 📦 Dépendances principales

- **Expo** 51 — Framework React Native
- **React Navigation** 6 — Navigation
- **expo-linear-gradient** — Gradients
- **@expo/vector-icons** — Icônes Ionicons
- **AsyncStorage** — Stockage local JWT
