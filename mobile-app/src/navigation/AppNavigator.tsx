import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { T } from '../constants/theme';

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

// Chat widget (FAB + Modal)
import ChatWidget from '../components/ChatWidget';

const AuthStack     = createNativeStackNavigator();
const Tab           = createBottomTabNavigator();
const ProjectsStack = createNativeStackNavigator();
const UsersStack    = createNativeStackNavigator();

// ===================== Projects Navigator =====================
function ProjectsNavigator() {
  return (
    <ProjectsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProjectsStack.Screen name="ProjectsList"  component={ProjectsListScreen} />
      <ProjectsStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    </ProjectsStack.Navigator>
  );
}

// ===================== Users Navigator =====================
function UsersNavigator() {
  return (
    <UsersStack.Navigator screenOptions={{ headerShown: false }}>
      <UsersStack.Screen name="UsersList"  component={UsersListScreen} />
      <UsersStack.Screen name="CreateUser" component={CreateUserScreen} />
    </UsersStack.Navigator>
  );
}

// ===================== App Tabs =====================
function AppTabs() {
  const { user, isAdmin, isChef } = useAuth();
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
        {/* Dashboard — tous les rôles */}
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Accueil',
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />

        {/* Projects — chef + employé */}
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

        {/* Tasks — chef + employé */}
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

        {/* Calendar — tous les rôles */}
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{
            tabBarLabel: 'Calendrier',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
          }}
        />

        {/* Team — admin + chef */}
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

        {/* Risk — chef uniquement */}
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

        {/* Users — admin uniquement */}
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

        {/* Profile — tous les rôles */}
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profil',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>

      {/* FAB ChatWidget — visible sur tous les écrans */}
      <ChatWidget />
    </View>
  );
}

// ===================== Root Navigator =====================
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