import { NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { GestureHandlerRootView } from "react-native-gesture-handler"

// Import screens
import HomeScreen from "./app/(tabs)/HomeScreen"
import ForecastScreen from "./app/(tabs)/ForecastScreen"
import MarketplaceScreen from "./app/(tabs)/MarketplaceScreen"
import AddListingScreen from "./app/(tabs)/AddListingScreen"
import ProfileScreen from "./app/(tabs)/ProfileScreen"

const Tab = createBottomTabNavigator()

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
      <StatusBar style="light" backgroundColor="#2d5016" />
      <Tab.Navigator
        screenOptions={({ route }: { route: any }) => ({
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
            let iconName: keyof typeof Ionicons.glyphMap

            if (route.name === "Home") {
              iconName = focused ? "home" : "home-outline"
            } else if (route.name === "Forecast") {
              iconName = focused ? "trending-up" : "trending-up-outline"
            } else if (route.name === "Market") {
              iconName = focused ? "storefront" : "storefront-outline"
            } else if (route.name === "Add") {
              iconName = focused ? "add-circle" : "add-circle-outline"
            } else if (route.name === "Profile") {
              iconName = focused ? "person" : "person-outline"
            } else {
              iconName = "help"
            }

            return <Ionicons name={iconName} size={size} color={color} />
          },
          tabBarActiveTintColor: "#2d5016",
          tabBarInactiveTintColor: "#8e8e93",
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopColor: "#e5e5e7",
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          headerStyle: {
            backgroundColor: "#2d5016",
          },
          headerTintColor: "#ffffff",
          headerTitleStyle: {
            fontWeight: "600",
            fontSize: 18,
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: "AgriTrader" }} />
        <Tab.Screen name="Forecast" component={ForecastScreen} options={{ title: "Price Forecast" }} />
        <Tab.Screen name="Market" component={MarketplaceScreen} options={{ title: "Marketplace" }} />
        <Tab.Screen name="Add" component={AddListingScreen} options={{ title: "Add Listing" }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      </Tab.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  )
}
