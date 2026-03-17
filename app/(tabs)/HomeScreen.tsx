import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUserProfile } from "../../components/UserProfileContext";
import { usePreorders } from "../../components/PreordersContext";
import { useAlerts } from "../../components/AlertsContext";
import { weatherService, WeatherData, WeatherAlert } from "../../lib/weatherService";
import { marketPricesService, CropPrice } from "../../lib/marketPricesService";

const HomeScreen = () => {
  const { profile } = useUserProfile();
  const { preorders } = usePreorders();
  const { addAlert } = useAlerts();
  
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [newAlert, setNewAlert] = useState({ crop: 'Corn', condition: 'above', targetPrice: '' });

  useEffect(() => {
    loadData();
  }, [profile?.location]);

  const loadData = async () => {
    const location = profile?.location || 'PA';
    
    // Load weather - pass user's coordinates if available
    const weatherData = await weatherService.getCurrentWeather(
      location, 
      profile?.latitude,  // Pass lat from profile
      profile?.longitude  // Pass lon from profile
    );
    setWeather(weatherData);
    
    // Load weather alerts
    const alerts = await weatherService.getWeatherAlerts(location);
    setWeatherAlerts(alerts);
    
    // Load prices
    const pricesData = await marketPricesService.getCurrentPrices();
    setPrices(pricesData);
  };

  const handleCreateAlert = async () => {
    const targetPrice = parseFloat(newAlert.targetPrice);
    if (isNaN(targetPrice) || targetPrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price');
      return;
    }

    await addAlert({
      crop: newAlert.crop,
      condition: newAlert.condition as 'above' | 'below',
      targetPrice: targetPrice
    });

    setShowAlertModal(false);
    setNewAlert({ crop: 'Corn', condition: 'above', targetPrice: '' });
    Alert.alert('Alert Created', `You'll be notified when ${newAlert.crop} goes ${newAlert.condition} $${targetPrice}`);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header with Weather */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
          {profile?.displayName ? `, ${profile.displayName}` : ''}!
        </Text>
        <View style={styles.weatherRow}>
          <Ionicons name="location-outline" size={16} color="#a3d977" />
          <Text style={styles.location}>
            {profile?.location || 'PA'} • {weather?.description || 'Loading...'} • {weather?.temp || '--'}°F
          </Text>
        </View>
      </View>

      {/* Current Prices Card - National vs Local */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Current Prices</Text>
          <TouchableOpacity onPress={() => setShowAlertModal(true)}>
            <Ionicons name="notifications-outline" size={20} color="#2d5016" />
          </TouchableOpacity>
        </View>
        
        {prices.map((item, index) => (
          <View key={index} style={styles.priceRow}>
            <Text style={styles.cropName}>{item.crop}</Text>
            <View style={styles.priceContainer}>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>National</Text>
                <Text style={styles.price}>${item.nationalPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>Local</Text>
                <Text style={styles.price}>${item.localPrice.toFixed(2)}</Text>
              </View>
              <Text style={[styles.change, { color: item.change >= 0 ? "#22c55e" : "#ef4444" }]}>
                {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
        <Text style={styles.priceNote}>National prices from CBOT futures • Local prices are PA elevator bids</Text>
      </View>

      {/* Weather Alerts - Only show if there are alerts */}
      {weatherAlerts.length > 0 && weatherAlerts.map((alert, index) => (
        <TouchableOpacity 
          key={index} 
          style={[
            styles.card, 
            styles.alertCard,
            { borderLeftColor: alert.type === 'severe' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : '#3b82f6' }
          ]}
        >
          <View style={styles.alertHeader}>
            <Ionicons 
              name={alert.type === 'severe' ? "warning" : alert.type === 'warning' ? "alert-circle" : "information-circle"} 
              size={24} 
              color={alert.type === 'severe' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : '#3b82f6'} 
            />
            <Text style={styles.alertTitle}>{alert.title}</Text>
          </View>
          <Text style={styles.alertText}>{alert.description}</Text>
        </TouchableOpacity>
      ))}

      {/* Preorders Summary */}
      {preorders.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Preorders ({preorders.length})</Text>
          {preorders.slice(0, 3).map((order) => (
            <View key={order.id} style={styles.preorderRow}>
              <Ionicons name="cart-outline" size={20} color="#2d5016" />
              <View style={styles.preorderInfo}>
                <Text style={styles.preorderCrop}>{order.crop}</Text>
                <Text style={styles.preorderDetails}>
                  {order.quantity} units @ ${order.pricePerUnit}/unit from {order.seller}
                </Text>
              </View>
            </View>
          ))}
          {preorders.length > 3 && (
            <Text style={styles.moreText}>+{preorders.length - 3} more preorders</Text>
          )}
        </View>
      )}

      {/* Market Forecast Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Market Forecast Summary</Text>
        <Text style={styles.forecastText}>
          Corn and wheat prices showing slight upward trend. Consider listing soybeans while demand is high.
        </Text>
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Model confidence</Text>
          <Text style={styles.confidenceValue}>96%</Text>
        </View>
      </View>

      {/* Create Price Alert Modal */}
      <Modal visible={showAlertModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setShowAlertModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Price Alert</Text>
              <TouchableOpacity onPress={() => setShowAlertModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Crop</Text>
            <View style={styles.cropSelector}>
              {['Corn', 'Soybeans', 'Wheat'].map((crop) => (
                <TouchableOpacity
                  key={crop}
                  style={[styles.cropOption, newAlert.crop === crop && styles.cropOptionSelected]}
                  onPress={() => setNewAlert({ ...newAlert, crop })}
                >
                  <Text style={[styles.cropOptionText, newAlert.crop === crop && styles.cropOptionTextSelected]}>
                    {crop}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Condition</Text>
            <View style={styles.conditionSelector}>
              <TouchableOpacity
                style={[styles.conditionOption, newAlert.condition === 'above' && styles.conditionOptionSelected]}
                onPress={() => setNewAlert({ ...newAlert, condition: 'above' })}
              >
                <Text style={[styles.conditionText, newAlert.condition === 'above' && styles.conditionTextSelected]}>
                  Above
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.conditionOption, newAlert.condition === 'below' && styles.conditionOptionSelected]}
                onPress={() => setNewAlert({ ...newAlert, condition: 'below' })}
              >
                <Text style={[styles.conditionText, newAlert.condition === 'below' && styles.conditionTextSelected]}>
                  Below
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Target Price ($/bushel)</Text>
            <TextInput
              style={styles.input}
              value={newAlert.targetPrice}
              onChangeText={(text) => setNewAlert({ ...newAlert, targetPrice: text })}
              placeholder="4.50"
              keyboardType="decimal-pad"
            />

            <TouchableOpacity style={styles.createButton} onPress={handleCreateAlert}>
              <Text style={styles.createButtonText}>Create Alert</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

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
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 16,
    color: "#a3d977",
  },
  card: {
    backgroundColor: "#ffffff",
    margin: 16,
    marginBottom: 8,
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
    marginBottom: 16,
  },
  priceRow: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  cropName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceColumn: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  change: {
    fontSize: 14,
    fontWeight: "500",
    minWidth: 50,
    textAlign: "right",
  },
  priceNote: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8,
    fontStyle: "italic",
  },
  alertCard: {
    borderLeftWidth: 4,
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
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  preorderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  preorderInfo: {
    flex: 1,
  },
  preorderCrop: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  preorderDetails: {
    fontSize: 13,
    color: "#6b7280",
  },
  moreText: {
    fontSize: 14,
    color: "#2d5016",
    fontWeight: "500",
    marginTop: 8,
  },
  forecastText: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 12,
    lineHeight: 22,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  cropSelector: {
    flexDirection: "row",
    gap: 8,
  },
  cropOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  cropOptionSelected: {
    backgroundColor: "#2d5016",
    borderColor: "#2d5016",
  },
  cropOptionText: {
    color: "#6b7280",
    fontWeight: "500",
  },
  cropOptionTextSelected: {
    color: "#ffffff",
  },
  conditionSelector: {
    flexDirection: "row",
    gap: 8,
  },
  conditionOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  conditionOptionSelected: {
    backgroundColor: "#2d5016",
    borderColor: "#2d5016",
  },
  conditionText: {
    color: "#6b7280",
    fontWeight: "500",
  },
  conditionTextSelected: {
    color: "#ffffff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  createButton: {
    backgroundColor: "#2d5016",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  createButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HomeScreen;
