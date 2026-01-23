import { DarkTheme, NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { StatusBar } from "expo-status-bar"
import { useEffect, useState } from "react"
import DashboardScreen from "./src/screens/DashboardScreen"
import ScanScreen from "./src/screens/ScanScreen"
import ResultsScreen from "./src/screens/ResultsScreen"
import HistoryScreen from "./src/screens/HistoryScreen"
import SettingsScreen from "./src/screens/SettingsScreen"
import JournalScreen from "./src/screens/JournalScreen"
import LoginScreen from "./src/screens/LoginScreen"
import SignupScreen from "./src/screens/SignupScreen"
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen"
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen"
import { theme } from "./src/theme"
import { getToken } from "./src/storage/cache"
import { AuthContext } from "./src/auth"

const Tab = createBottomTabNavigator()
const ScanStack = createNativeStackNavigator()
const RootStack = createNativeStackNavigator()
const AuthStack = createNativeStackNavigator()

function ScanStackScreen() {
  return (
    <ScanStack.Navigator>
      <ScanStack.Screen name="ScanHome" component={ScanScreen} options={{ title: "Scan" }} />
      <ScanStack.Screen name="Results" component={ResultsScreen} />
    </ScanStack.Navigator>
  )
}

function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.panel },
        headerTintColor: theme.colors.text,
        tabBarStyle: {
          backgroundColor: theme.colors.panel,
          borderTopColor: theme.colors.panelAlt
        },
        tabBarActiveTintColor: theme.colors.accent2,
        tabBarInactiveTintColor: theme.colors.muted
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Scan" component={ScanStackScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}

export default function App() {
  const [isReady, setIsReady] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getToken()
      setIsAuthed(!!token)
      setIsReady(true)
    }
    checkAuth()
  }, [])

  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: theme.colors.bg,
      card: theme.colors.panel,
      text: theme.colors.text,
      border: theme.colors.panelAlt
    }
  }

  return (
    <AuthContext.Provider value={{ setIsAuthed }}>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        {isReady && (
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {isAuthed ? (
              <RootStack.Screen name="Main" component={MainTabs} />
            ) : (
              <RootStack.Screen name="Auth" component={AuthStackScreen} />
            )}
          </RootStack.Navigator>
        )}
      </NavigationContainer>
    </AuthContext.Provider>
  )
}
