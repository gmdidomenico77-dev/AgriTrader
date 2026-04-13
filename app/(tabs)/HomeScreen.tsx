import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Animated, RefreshControl } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useUserProfile } from "../../components/UserProfileContext";
import { usePreorders } from "../../components/PreordersContext";
import { useAlerts } from "../../components/AlertsContext";
import { weatherService, WeatherData, WeatherAlert } from "../../lib/weatherService";
import { marketPricesService, CropPrice } from "../../lib/marketPricesService";
import { historicalDataService } from "../../lib/historicalDataService";
import { predictionService } from "../../lib/predictionService";

const HomeScreen = () => {
  const { profile } = useUserProfile();
  const { preorders } = usePreorders();
  const { addAlert } = useAlerts();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [homeForecastText, setHomeForecastText] = useState<string>(
    "Loading market summary…",
  );
  const [homeModelConfidencePct, setHomeModelConfidencePct] = useState<number>(0);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [newAlert, setNewAlert] = useState({ crop: 'Corn', condition: 'above', targetPrice: '' });
  const [forecastError, setForecastError] = useState(false);
  const [priceFocused, setPriceFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.stagger(100, [
        Animated.spring(card1Anim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.spring(card2Anim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.spring(card3Anim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const cardStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  });

  useEffect(() => {
    loadData();
  }, [profile?.location, profile?.latitude, profile?.longitude]);

  const loadData = async () => {
    setForecastError(false);
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
    
    const pricesData = await marketPricesService.getCurrentPrices(location);
    setPrices(pricesData);

    try {
      const [cornWeekPct, cornPred] = await Promise.all([
        historicalDataService.getPriceChange("corn", 7),
        predictionService.getPrediction(
          "corn",
          location,
          profile?.latitude,
          profile?.longitude,
        ),
      ]);
      const dir = cornWeekPct >= 0 ? "up" : "down";
      setHomeForecastText(
        `Corn cash in your dataset is ${dir} ${Math.abs(cornWeekPct).toFixed(1)}% over the past week. Near-term outlook: ${cornPred.market_analysis.trend}. ${cornPred.recommendation.action}: ${cornPred.market_analysis.best_selling_time}.`,
      );
      setHomeModelConfidencePct(
        Math.round((cornPred.model_confidence ?? 0) * 100),
      );
    } catch (e) {
      console.warn("Home market summary:", e);
      setHomeForecastText(
        "Market summary could not be loaded. Tap Retry or open the Forecast tab for price predictions.",
      );
      setHomeModelConfidencePct(0);
      setForecastError(true);
    }
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

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAlertModal(false);
    setNewAlert({ crop: 'Corn', condition: 'above', targetPrice: '' });
    Alert.alert('Alert Created', `You'll be notified when ${newAlert.crop} goes ${newAlert.condition} $${targetPrice}`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#2d5016"
          colors={["#2d5016"]}
        />
      }
    >
      {/* Header with Weather */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
          },
        ]}
      >
        <Text style={styles.greeting}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
          {profile?.displayName ? `, ${profile.displayName}` : ''}!
        </Text>
        <TouchableOpacity
          style={styles.weatherRow}
          onPress={() => {
            if (weather) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                `Weather — ${profile?.location || 'PA'}`,
                `${weather.description || 'Clear'}\n\nTemperature: ${weather.temp || '--'}°F\nFeels like: ${weather.feelsLike ?? weather.temp ?? '--'}°F\nHumidity: ${weather.humidity ?? '--'}%\nWind: ${weather.windSpeed ?? '--'} mph`,
                [{ text: 'Close' }]
              );
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.75)" />
          <Text style={styles.location}>
            {profile?.location || 'PA'} • {weather?.description || 'Loading...'} • {weather?.temp || '--'}°F
          </Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </Animated.View>

      {/* Current Prices Card - National vs Local */}
      <Animated.View style={cardStyle(card1Anim)}>
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
        <Text style={styles.priceNote}>
          Regional price estimates from market data. See the Forecast tab for AI-powered predictions.
        </Text>
      </View>
      </Animated.View>

      {/* Weather Alerts - Only show if there are alerts */}
      {weatherAlerts.length > 0 && weatherAlerts.map((alert, index) => (
        <Animated.View key={index} style={cardStyle(card2Anim)}>
          <TouchableOpacity
            style={[
              styles.card,
              styles.alertCard,
              { borderLeftColor: alert.type === 'severe' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : '#3b82f6' }
            ]}
            activeOpacity={0.85}
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
        </Animated.View>
      ))}

      {/* Preorders Summary */}
      {preorders.length > 0 && (
        <Animated.View style={cardStyle(card2Anim)}>
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
        </Animated.View>
      )}

      {/* Market Forecast Card */}
      <Animated.View style={cardStyle(card3Anim)}>
      <View style={[styles.card, { marginBottom: 24 }]}>
        <Text style={styles.cardTitle}>Market Forecast Summary</Text>
        <Text style={styles.forecastText}>{homeForecastText}</Text>
        {forecastError ? (
          <TouchableOpacity style={styles.retryButton} onPress={loadData} activeOpacity={0.75}>
            <Ionicons name="refresh-outline" size={16} color="#2d5016" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>Model confidence (corn)</Text>
            <Text style={styles.confidenceValue}>
              {homeModelConfidencePct > 0 ? `${homeModelConfidencePct}%` : "—"}
            </Text>
          </View>
        )}
      </View>
      </Animated.View>

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
            <View style={styles.modalHandle} />
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
              style={[styles.input, priceFocused && styles.inputFocused]}
              value={newAlert.targetPrice}
              onChangeText={(text) => setNewAlert({ ...newAlert, targetPrice: text })}
              onFocus={() => setPriceFocused(true)}
              onBlur={() => setPriceFocused(false)}
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
    fontSize: 15,
    color: "rgba(255,255,255,0.82)",
    marginLeft: 4,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#ffffff",
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
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
  inputFocused: {
    borderColor: "#2d5016",
    borderWidth: 2,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2d5016",
    marginTop: 4,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2d5016",
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
