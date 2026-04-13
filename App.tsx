import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { GestureHandlerRootView } from "react-native-gesture-handler"

// Import contexts
import { AuthProvider, useAuth } from "./components/AuthContext"
import { UserProfileProvider, useUserProfile } from "./components/UserProfileContext"
import { AlertsProvider } from "./components/AlertsContext"
import { PreordersProvider } from "./components/PreordersContext"
import { ListingsProvider } from "./components/ListingsContext"

// Import screens
import HomeScreen from "./app/(tabs)/HomeScreen"
import ForecastScreen from "./app/(tabs)/ForecastScreen"
import MarketplaceScreen from "./app/(tabs)/MarketplaceScreen"
import AddListingScreen from "./app/(tabs)/AddListingScreen"
import ProfileScreen from "./app/(tabs)/ProfileScreen"
import LoginScreen from "./app/LoginScreen"
import RegisterScreen from "./app/RegisterScreen"
import OnboardingScreen from "./app/OnboardingScreen"

const Tab = createBottomTabNavigator()

interface UserProfile {
  displayName: string;
  location: string;
  farmName: string;
}

function AuthNavigator() {
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  if (loading || profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  if (!isAuthenticated) {
    if (authScreen === 'login') {
      return (
        <LoginScreen 
          onLoginSuccess={() => setShowOnboarding(true)}
          onSwitchToRegister={() => setAuthScreen('register')}
        />
      );
    } else {
      return (
        <RegisterScreen 
          onRegisterSuccess={() => setShowOnboarding(true)}
          onSwitchToLogin={() => setAuthScreen('login')}
        />
      );
    }
  }

  if (showOnboarding || !profile) {
    return (
      <OnboardingScreen 
        onComplete={async (profileData: UserProfile) => {
          // Profile will be saved by the UserProfileProvider
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#2d5016" />
      <Tab.Navigator
        screenOptions={({ route }: { route: any }) => ({
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
            if (route.name === "Add") {
              return <Ionicons name="add-circle" size={30} color="#d97706" />
            }

            let iconName: keyof typeof Ionicons.glyphMap
            if (route.name === "Home") {
              iconName = focused ? "home" : "home-outline"
            } else if (route.name === "Forecast") {
              iconName = focused ? "trending-up" : "trending-up-outline"
            } else if (route.name === "Market") {
              iconName = focused ? "storefront" : "storefront-outline"
            } else if (route.name === "Profile") {
              iconName = focused ? "person" : "person-outline"
            } else {
              iconName = "help"
            }

            return <Ionicons name={iconName} size={size} color={color} />
          },
          tabBarActiveTintColor: "#2d5016",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopColor: "#f3f4f6",
            height: 64,
            paddingBottom: 10,
            paddingTop: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 12,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 0.2,
          },
          headerStyle: {
            backgroundColor: "#2d5016",
            shadowColor: "transparent",
            elevation: 0,
          },
          headerTintColor: "#ffffff",
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 18,
            letterSpacing: 0.3,
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: "AgriTrader" }} />
        <Tab.Screen name="Forecast" component={ForecastScreen} options={{ title: "Price Forecast" }} />
        <Tab.Screen name="Market" component={MarketplaceScreen} options={{ title: "Marketplace" }} />
        <Tab.Screen
          name="Add"
          component={AddListingScreen}
          options={{
            title: "Post Crop",
            tabBarActiveTintColor: "#d97706",
            tabBarInactiveTintColor: "#d97706",
          }}
        />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <UserProfileProvider>
          <AlertsProvider>
            <PreordersProvider>
              <ListingsProvider>
                <AuthNavigator />
              </ListingsProvider>
            </PreordersProvider>
          </AlertsProvider>
        </UserProfileProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
