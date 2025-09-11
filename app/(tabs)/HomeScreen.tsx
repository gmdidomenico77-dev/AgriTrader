import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const HomeScreen = () => {
  const currentPrices = [
    { crop: "Corn", price: "$12.34", change: "+2.1%", positive: true },
    { crop: "Soybeans", price: "$9.58", change: "-1.3%", positive: false },
    { crop: "Wheat", price: "$8.92", change: "+0.8%", positive: true },
  ]

  const weatherAlert = {
    title: "Storm expected tomorrow",
    time: "6:12 PM • Ap 24",
    icon: "thunderstorm-outline",
  }

  const marketForecast = {
    recommendation: "Hold soybeans, consider price listing",
    confidence: "87%",
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning!</Text>
        <Text style={styles.location}>Erie, PA • Sunny • 74°</Text>
      </View>

      {/* Current Prices Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Prices</Text>
        {currentPrices.map((item, index) => (
          <View key={index} style={styles.priceRow}>
            <Text style={styles.cropName}>{item.crop}</Text>
            <View style={styles.priceInfo}>
              <Text style={styles.price}>{item.price}</Text>
              <Text style={[styles.change, { color: item.positive ? "#22c55e" : "#ef4444" }]}>{item.change}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Weather Alert Card */}
      <TouchableOpacity style={[styles.card, styles.alertCard]}>
        <View style={styles.alertHeader}>
          <Ionicons name={weatherAlert.icon as keyof typeof Ionicons.glyphMap} size={24} color="#f59e0b" />
          <Text style={styles.alertTitle}>Weather Alert</Text>
        </View>
        <Text style={styles.alertText}>{weatherAlert.title}</Text>
        <Text style={styles.alertTime}>{weatherAlert.time}</Text>
      </TouchableOpacity>

      {/* Market Forecast Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Market Forecast Summary</Text>
        <Text style={styles.forecastText}>{marketForecast.recommendation}</Text>
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>High confidence</Text>
          <Text style={styles.confidenceValue}>{marketForecast.confidence}</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 20,
    backgroundColor: "#2d5016",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  location: {
    fontSize: 16,
    color: "#a3d977",
  },
  card: {
    backgroundColor: "#ffffff",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  cropName: {
    fontSize: 16,
    color: "#374151",
  },
  priceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  change: {
    fontSize: 14,
    fontWeight: "500",
  },
  alertCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  alertText: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 14,
    color: "#6b7280",
  },
  forecastText: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 12,
  },
  confidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidenceLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#22c55e",
  },
})

export default HomeScreen
