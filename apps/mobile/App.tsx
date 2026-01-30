import { DefaultTheme, NavigationContainer } from "@react-navigation/native"
import { BottomTabBarProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem
} from "@react-navigation/drawer"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { StatusBar } from "expo-status-bar"
import { Image, Pressable, Text, View } from "react-native"
import { useEffect, useState, useContext } from "react"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"
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
import { cleanupScanImageCache, clearAuth, getToken } from "./src/storage/cache"
import { AuthContext } from "./src/auth"
import HeaderAvatar from "./src/components/HeaderAvatar"

const Tab = createBottomTabNavigator()
const ScanStack = createNativeStackNavigator()
const RootStack = createNativeStackNavigator()
const AuthStack = createNativeStackNavigator()
const Drawer = createDrawerNavigator()

const tabConfig: Array<{
  name: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
}> = [
  { name: "Dashboard", label: "Dashboard", icon: "speedometer-outline" },
  { name: "Journal", label: "Journal", icon: "book-outline" },
  { name: "Scan", label: "Scan", icon: "camera-outline" },
  { name: "History", label: "History", icon: "time-outline" },
  { name: "Settings", label: "Profile", icon: "settings-outline" }
]

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
        backgroundColor: theme.colors.panel,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index
        const config = tabConfig.find((item) => item.name === route.name)
        if (!config) return null

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true
          })
          if (event.defaultPrevented) return
          if (route.name === "Scan") {
            navigation.navigate("Scan", { screen: "ScanHome" })
            return
          }
          if (!isFocused) {
            navigation.navigate(route.name)
          }
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}
          >
            <Ionicons
              name={config.icon}
              size={20}
              color={isFocused ? theme.colors.accent2 : theme.colors.muted}
            />
            <Text
              style={{
                fontSize: 11,
                marginTop: 4,
                color: isFocused ? theme.colors.accent2 : theme.colors.muted
              }}
            >
              {config.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function ScanStackScreen() {
  return (
    <ScanStack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: theme.colors.panel },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontFamily: theme.font.heading },
        headerTitleAlign: "left",
        headerLeft: () => (
          <Pressable
            style={{ paddingHorizontal: 16, paddingVertical: 8 }}
            onPress={() => navigation.getParent()?.getParent()?.openDrawer()}
          >
            <Ionicons name="menu" size={20} color={theme.colors.text} />
          </Pressable>
        ),
        headerRight: () => <HeaderAvatar />
      })}
    >
      <ScanStack.Screen name="ScanHome" component={ScanScreen} options={{ title: "Scan" }} />
      <ScanStack.Screen
        name="Results"
        component={ResultsScreen}
        options={({ navigation, route }) => ({
          title: "Results",
          headerLeft: () => (
            <Pressable
              style={{ paddingHorizontal: 16, paddingVertical: 8 }}
              onPress={() => {
                const fromHistory = (route.params as { fromHistory?: boolean } | undefined)?.fromHistory
                if (fromHistory) {
                  navigation.getParent()?.navigate("History")
                } else {
                  navigation.goBack()
                }
              }}
            >
              <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
            </Pressable>
          )
        })}
      />
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
      initialRouteName="Dashboard"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: theme.colors.panel },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontFamily: theme.font.heading },
        headerTitleAlign: "left",
        headerLeft: () => (
          <Pressable
            style={{ paddingHorizontal: 16, paddingVertical: 8 }}
            onPress={() => navigation.getParent()?.openDrawer()}
          >
            <Ionicons name="menu" size={20} color={theme.colors.text} />
          </Pressable>
        ),
        headerRight: () => <HeaderAvatar />,
        tabBarStyle: {
          backgroundColor: theme.colors.panel,
          borderTopColor: theme.colors.border
        }
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerTitle: "Dashboard" }}
      />
      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{ headerTitle: "Journal" }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanStackScreen}
        options={{
          headerShown: false
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ headerTitle: "History" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerTitle: "Profile" }}
      />
    </Tab.Navigator>
  )
}

function DrawerContent({ navigation }: { navigation: any }) {
  const { setIsAuthed } = useContext(AuthContext)
  const insets = useSafeAreaInsets()

  return (
    <DrawerContentScrollView
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: insets.top + 24,
        paddingBottom: 24
      }}
    >
      <View style={{ marginBottom: 28, paddingLeft: 14 }}>
        <Image
          source={require("./assets/drawer-logo.png")}
          style={{ width: 200, height: 88, resizeMode: "contain" }}
        />
      </View>
      <DrawerItem
        label="Dashboard"
        onPress={() => navigation.navigate("MainTabs", { screen: "Dashboard" })}
        icon={({ color, size }) => <Ionicons name="speedometer-outline" color={color} size={size} />}
      />
      <DrawerItem
        label="Scan"
        onPress={() => navigation.navigate("MainTabs", { screen: "Scan" })}
        icon={({ color, size }) => <Ionicons name="camera-outline" color={color} size={size} />}
      />
      <DrawerItem
        label="Journal"
        onPress={() => navigation.navigate("MainTabs", { screen: "Journal" })}
        icon={({ color, size }) => <Ionicons name="book-outline" color={color} size={size} />}
      />
      <DrawerItem
        label="History"
        onPress={() => navigation.navigate("MainTabs", { screen: "History" })}
        icon={({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />}
      />
      <DrawerItem
        label="Profile"
        onPress={() => navigation.navigate("MainTabs", { screen: "Settings" })}
        icon={({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />}
      />
      <DrawerItem
        label="Logout"
        onPress={async () => {
          await clearAuth()
          setIsAuthed(false)
        }}
        icon={({ color, size }) => <Ionicons name="log-out-outline" color={color} size={size} />}
      />
    </DrawerContentScrollView>
  )
}

function DrawerRoot() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: theme.colors.panel },
        drawerActiveTintColor: theme.colors.accent2,
        drawerInactiveTintColor: theme.colors.muted
      }}
      drawerContent={(props) => <DrawerContent {...props} />}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} />
    </Drawer.Navigator>
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
    cleanupScanImageCache().catch(() => {})
  }, [])

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.bg,
      card: theme.colors.panel,
      text: theme.colors.text,
      border: theme.colors.border
    }
  }

  return (
    <AuthContext.Provider value={{ setIsAuthed }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          {isReady && (
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              {isAuthed ? (
                <RootStack.Screen name="Main" component={DrawerRoot} />
              ) : (
                <RootStack.Screen name="Auth" component={AuthStackScreen} />
              )}
            </RootStack.Navigator>
          )}
        </NavigationContainer>
      </GestureHandlerRootView>
    </AuthContext.Provider>
  )
}
