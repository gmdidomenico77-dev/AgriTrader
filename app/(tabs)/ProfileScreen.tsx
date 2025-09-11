import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const ProfileScreen = () => {
  const savedAlerts = [
    {
      id: 1,
      title: "Storm expected tomorrow",
      time: "6:12 PM • Ap 24",
      type: "weather",
    },
    {
      id: 2,
      title: "Corn price alert: $7.50",
      time: "2:30 PM • Ap 23",
      type: "price",
    },
  ]

  const farmInfo = {
    name: "Hermitage, PA",
    size: "450 acres",
    crops: ["Corn", "Soybeans", "Wheat"],
  }

  const summary = {
    listings: 3,
    pastSales: 450,
    totalEarnings: "$12,450",
  }

  return (
    <ScrollView style={styles.container}>
      {/* Farm Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Your Farm</Text>
          <TouchableOpacity>
            <Ionicons name="pencil" size={20} color="#2d5016" />
          </TouchableOpacity>
        </View>
        <Text style={styles.farmName}>{farmInfo.name}</Text>
        <Text style={styles.farmSize}>{farmInfo.size}</Text>
        <View style={styles.cropsContainer}>
          {farmInfo.crops.map((crop, index) => (
            <View key={index} style={styles.cropTag}>
              <Text style={styles.cropTagText}>{crop}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.listings}</Text>
            <Text style={styles.summaryLabel}>Listings</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.pastSales}</Text>
            <Text style={styles.summaryLabel}>Past Sales</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.earningsButton}>
          <Text style={styles.earningsButtonText}>View Earnings</Text>
        </TouchableOpacity>
      </View>

      {/* Saved Alerts Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saved Alerts</Text>
        {savedAlerts.map((alert) => (
          <View key={alert.id} style={styles.alertItem}>
            <View style={styles.alertIcon}>
              <Ionicons
                name={alert.type === "weather" ? "thunderstorm" : "trending-up"}
                size={20}
                color={alert.type === "weather" ? "#f59e0b" : "#2d5016"}
              />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertTime}>{alert.time}</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Settings Options */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={24} color="#6b7280" />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="location-outline" size={24} color="#6b7280" />
            <Text style={styles.settingText}>Location Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="help-circle-outline" size={24} color="#6b7280" />
            <Text style={styles.settingText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            <Text style={[styles.settingText, { color: "#ef4444" }]}>Sign Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  farmName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  farmSize: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 12,
  },
  cropsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cropTag: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2d5016",
  },
  cropTagText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2d5016",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1f2937",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  earningsButton: {
    backgroundColor: "#2d5016",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  earningsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  alertItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
  },
  alertTime: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: "#1f2937",
  },
})

export default ProfileScreen
