import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { T } from '../constants/theme';
import { notificationApi } from '../services/api';

// Auth screens
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// App screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProjectsListScreen from '../screens/projects/ProjectsListScreen';
import ProjectDetailScreen from '../screens/projects/ProjectDetailScreen';
import TasksListScreen from '../screens/tasks/TasksListScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import TeamScreen from '../screens/team/TeamScreen';
import RiskScreen from '../screens/risk/RiskScreen';
import UsersListScreen from '../screens/users/UsersListScreen';
import CreateUserScreen from '../screens/users/CreateUserScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ChatWidget from '../components/ChatWidget';

const AuthStack     = createNativeStackNavigator();
const Tab           = createBottomTabNavigator();
const ProjectsStack = createNativeStackNavigator();
const UsersStack    = createNativeStackNavigator();

function ProjectsNavigator() {
  return (
    <ProjectsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProjectsStack.Screen name="ProjectsList"  component={ProjectsListScreen} />
      <ProjectsStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    </ProjectsStack.Navigator>
  );
}

function UsersNavigator() {
  return (
    <UsersStack.Navigator screenOptions={{ headerShown: false }}>
      <UsersStack.Screen name="UsersList"  component={UsersListScreen} />
      <UsersStack.Screen name="CreateUser" component={CreateUserScreen} />
    </UsersStack.Navigator>
  );
}

function AppTabs() {
  const { user, isAdmin, isChef, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // ---- جلب عدد الإشعارات غير المقروءة ----
  useEffect(() => {
    if (!token) return;

    const fetchCount = async () => {
      try {
        const data = await notificationApi.getAll(token);
        const notifs = data?.notifications || data || [];
        setUnreadCount(notifs.filter((n: any) => !n.lu).length);
      } catch {}
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // كل 30 ثانية
    return () => clearInterval(interval);
  }, [token]);
  // -----------------------------------------

  if (!user) return null;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor:   T.blue600,
          tabBarInactiveTintColor: T.slate400,
          tabBarStyle: {
            backgroundColor: T.white,
            borderTopColor:  T.slate100,
            borderTopWidth:  1,
            paddingBottom:   6,
            paddingTop:      6,
            height:          60,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Accueil',
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />

        {(isChef || !isAdmin) && (
          <Tab.Screen
            name="Projects"
            component={ProjectsNavigator}
            options={{
              tabBarLabel: 'Projets',
              tabBarIcon: ({ color, size }) => <Ionicons name="folder-outline" size={size} color={color} />,
            }}
          />
        )}

        {(isChef || !isAdmin) && (
          <Tab.Screen
            name="Tasks"
            component={TasksListScreen}
            options={{
              tabBarLabel: 'Tâches',
              tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle-outline" size={size} color={color} />,
            }}
          />
        )}

        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{
            tabBarLabel: 'Calendrier',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
          }}
        />

        {(isAdmin || isChef) && (
          <Tab.Screen
            name="Team"
            component={TeamScreen}
            options={{
              tabBarLabel: 'Équipe',
              tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
            }}
          />
        )}

        {isChef && (
          <Tab.Screen
            name="Risk"
            component={RiskScreen}
            options={{
              tabBarLabel: 'Risques',
              tabBarIcon: ({ color, size }) => <Ionicons name="warning-outline" size={size} color={color} />,
            }}
          />
        )}

        {isAdmin && (
          <Tab.Screen
            name="Users"
            component={UsersNavigator}
            options={{
              tabBarLabel: 'Utilisateurs',
              tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
            }}
          />
        )}

        {/* ---- Notifications مع البادج ---- */}
        <Tab.Screen
          name="Notifications"
          options={{
            tabBarLabel: 'Notifications',
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: { backgroundColor: '#f87171', fontSize: 10 },
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications-outline" size={size} color={color} />
            ),
          }}
        >
          {() => (
            <NotificationsScreen onCountChange={setUnreadCount} />
          )}
        </Tab.Screen>
        {/* --------------------------------- */}

        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profil',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>

      <ChatWidget />
    </View>
  );
}

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      {user ? (
        <AppTabs />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="SignIn"        component={SignInScreen} />
          <AuthStack.Screen name="SignUp"        component={SignUpScreen} />
          <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}