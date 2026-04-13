import React, { useState, useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Switch } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useUserProfile } from "../../components/UserProfileContext";
import { useAuth } from "../../components/AuthContext";
import { useListings } from "../../components/ListingsContext";
import { useAlerts, PriceAlert } from "../../components/AlertsContext";
import { usePreorders } from "../../components/PreordersContext";
import { signOutUser } from "../../lib/authService";

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let frame = 0;
    const steps = 24;
    const id = setInterval(() => {
      frame++;
      setValue(Math.round(target * (frame / steps)));
      if (frame >= steps) clearInterval(id);
    }, duration / steps);
    return () => clearInterval(id);
  }, [target]);
  return value;
}

const ProfileScreen = () => {
  const { profile, updateProfile } = useUserProfile();
  const { user } = useAuth();
  const { getUserListings } = useListings();
  const { alerts, removeAlert, updateAlert } = useAlerts();
  const { preorders } = usePreorders();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PriceAlert | null>(null);
  const [notifPriceAlerts, setNotifPriceAlerts] = useState(true);
  const [notifMarketUpdates, setNotifMarketUpdates] = useState(false);
  const [notifWeather, setNotifWeather] = useState(true);
  const [editFocusedField, setEditFocusedField] = useState<string | null>(null);

  const [editFormData, setEditFormData] = useState({
    farmName: profile?.farmName || "",
    location: profile?.location || "",
    displayName: profile?.displayName || "",
  });

  const [alertEditData, setAlertEditData] = useState({
    crop: "",
    condition: "above" as "above" | "below",
    targetPrice: "",
  });

  useEffect(() => {
    AsyncStorage.multiGet([
      "@notif_price_alerts",
      "@notif_market_updates",
      "@notif_weather",
    ]).then(pairs => {
      const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      if (map["@notif_price_alerts"] !== null) setNotifPriceAlerts(map["@notif_price_alerts"] === "true");
      if (map["@notif_market_updates"] !== null) setNotifMarketUpdates(map["@notif_market_updates"] === "true");
      if (map["@notif_weather"] !== null) setNotifWeather(map["@notif_weather"] === "true");
    });
  }, []);

  const setNotif = (key: string, setter: (v: boolean) => void, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(value);
    AsyncStorage.setItem(key, String(value));
  };

  const userListings = getUserListings();

  const now = new Date();
  const thisMonthEarnings = preorders
    .filter(p => {
      const d = new Date(p.orderedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.pricePerUnit * p.quantity, 0);

  const totalEarnings = preorders.reduce(
    (sum, p) => sum + p.pricePerUnit * p.quantity,
    0
  );

  const summary = {
    listings: userListings.length,
    preorders: preorders.length,
    pastSales: preorders.length,
  };

  const animListings = useCountUp(summary.listings);
  const animPreorders = useCountUp(summary.preorders);
  const animPastSales = useCountUp(summary.pastSales);

  const handleEditProfile = () => {
    setEditFormData({
      farmName: profile?.farmName || "",
      location: profile?.location || "",
      displayName: profile?.displayName || "",
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editFormData.farmName.trim() || !editFormData.location.trim()) {
      Alert.alert("Missing Information", "Please fill in all fields");
      return;
    }

    await updateProfile({
      farmName: editFormData.farmName,
      location: editFormData.location,
      displayName: editFormData.displayName,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowEditModal(false);
    Alert.alert("Profile Updated ✓", "Your profile has been updated successfully");
  };

  const handleAlertClick = (alert: PriceAlert) => {
    setSelectedAlert(alert);
    setAlertEditData({
      crop: alert.crop,
      condition: alert.condition,
      targetPrice: alert.targetPrice.toString(),
    });
    setShowAlertModal(true);
  };

  const handleUpdateAlert = async () => {
    if (!selectedAlert) return;

    const targetPrice = parseFloat(alertEditData.targetPrice);
    if (isNaN(targetPrice) || targetPrice <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid price");
      return;
    }

    await updateAlert(selectedAlert.id, {
      crop: alertEditData.crop,
      condition: alertEditData.condition,
      targetPrice: targetPrice,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAlertModal(false);
    Alert.alert("Alert Updated ✓", "Your price alert has been updated");
  };

  const handleDeleteAlert = async () => {
    if (!selectedAlert) return;

    Alert.alert(
      "Delete Alert",
      "Are you sure you want to delete this alert?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeAlert(selectedAlert.id);
            setShowAlertModal(false);
            Alert.alert("Alert Deleted", "Price alert has been removed");
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const result = await signOutUser();
          if (!result.success) {
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Farm Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Your Farm</Text>
          <TouchableOpacity onPress={handleEditProfile}>
            <Ionicons name="pencil" size={20} color="#2d5016" />
          </TouchableOpacity>
        </View>
        <Text style={styles.farmName}>{profile?.farmName || "Your Farm"}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text style={styles.farmInfo}>{profile?.location || "PA"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#6b7280" />
          <Text style={styles.farmInfo}>{profile?.displayName || user?.email}</Text>
        </View>
      </View>

      {/* Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{animListings}</Text>
            <Text style={styles.summaryLabel}>Listings</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{animPreorders}</Text>
            <Text style={styles.summaryLabel}>Pre-orders</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{animPastSales}</Text>
            <Text style={styles.summaryLabel}>Past Sales</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.earningsButton} onPress={() => setShowEarningsModal(true)}>
          <Text style={styles.earningsButtonText}>View Earnings</Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Saved Alerts Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Price Alerts ({alerts.length})</Text>
        {alerts.length === 0 ? (
          <Text style={styles.emptyText}>No price alerts set. Create one from the Home screen!</Text>
        ) : (
          alerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertItem}
              onPress={() => handleAlertClick(alert)}
            >
              <View style={styles.alertIcon}>
                <Ionicons name="notifications" size={20} color="#2d5016" />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>
                  {alert.crop} {alert.condition} ${alert.targetPrice.toFixed(2)}
                </Text>
                <Text style={styles.alertTime}>
                  Created {new Date(alert.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Settings Options */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowNotificationsModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={24} color="#6b7280" />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowHelpModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="help-circle-outline" size={24} color="#6b7280" />
            <Text style={styles.settingText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
          <View style={styles.settingLeft}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            <Text style={[styles.settingText, { color: "#ef4444" }]}>Sign Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setShowEditModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={[styles.input, editFocusedField === "displayName" && styles.inputFocused]}
              value={editFormData.displayName}
              onChangeText={(text) => setEditFormData({ ...editFormData, displayName: text })}
              onFocus={() => setEditFocusedField("displayName")}
              onBlur={() => setEditFocusedField(null)}
              placeholder="Your Name"
            />

            <Text style={styles.inputLabel}>Farm Name</Text>
            <TextInput
              style={[styles.input, editFocusedField === "farmName" && styles.inputFocused]}
              value={editFormData.farmName}
              onChangeText={(text) => setEditFormData({ ...editFormData, farmName: text })}
              onFocus={() => setEditFocusedField("farmName")}
              onBlur={() => setEditFocusedField(null)}
              placeholder="Green Valley Farm"
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={[styles.input, editFocusedField === "location" && styles.inputFocused]}
              value={editFormData.location}
              onChangeText={(text) => setEditFormData({ ...editFormData, location: text })}
              onFocus={() => setEditFocusedField("location")}
              onBlur={() => setEditFocusedField(null)}
              placeholder="PA"
            />

            <Text style={styles.infoNote}>
              Changing location will update price predictions throughout the app
            </Text>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Earnings Modal */}
      <Modal visible={showEarningsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Earnings Overview</Text>
              <TouchableOpacity onPress={() => setShowEarningsModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.earningsCard}>
              <Text style={styles.earningsLabel}>Total Pre-order Value</Text>
              <Text style={styles.earningsAmount}>
                ${totalEarnings.toFixed(2)}
              </Text>
            </View>

            <View style={styles.earningsBreakdown}>
              <Text style={styles.breakdownTitle}>This Month</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Pre-order Value</Text>
                <Text style={styles.breakdownValue}>
                  ${thisMonthEarnings.toFixed(2)}
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Total Pre-orders</Text>
                <Text style={styles.breakdownValue}>{preorders.length}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Active Listings</Text>
                <Text style={styles.breakdownValue}>{userListings.length}</Text>
              </View>
            </View>

            <View style={styles.earningsBreakdown}>
              <Text style={styles.breakdownTitle}>Pre-order History</Text>
              {preorders.length === 0 ? (
                <Text style={styles.emptyTransactions}>
                  No pre-orders yet. List your crops on the marketplace to get started.
                </Text>
              ) : (
                preorders
                  .slice()
                  .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())
                  .slice(0, 5)
                  .map(p => (
                    <View key={p.id} style={styles.transactionRow}>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionCrop}>
                          {p.crop} — {p.quantity} units
                        </Text>
                        <Text style={styles.transactionDate}>
                          {new Date(p.orderedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                      <Text style={styles.transactionAmount}>
                        +${(p.pricePerUnit * p.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Alert Modal */}
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
              <Text style={styles.modalTitle}>Edit Price Alert</Text>
              <TouchableOpacity onPress={() => setShowAlertModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Crop</Text>
            <View style={styles.cropSelector}>
              {['Corn', 'Soybeans', 'Wheat'].map((crop) => (
                <TouchableOpacity
                  key={crop}
                  style={[styles.cropOption, alertEditData.crop === crop && styles.cropOptionSelected]}
                  onPress={() => setAlertEditData({ ...alertEditData, crop })}
                >
                  <Text style={[styles.cropOptionText, alertEditData.crop === crop && styles.cropOptionTextSelected]}>
                    {crop}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Condition</Text>
            <View style={styles.conditionSelector}>
              <TouchableOpacity
                style={[styles.conditionOption, alertEditData.condition === 'above' && styles.conditionOptionSelected]}
                onPress={() => setAlertEditData({ ...alertEditData, condition: 'above' })}
              >
                <Text style={[styles.conditionText, alertEditData.condition === 'above' && styles.conditionTextSelected]}>
                  Above
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.conditionOption, alertEditData.condition === 'below' && styles.conditionOptionSelected]}
                onPress={() => setAlertEditData({ ...alertEditData, condition: 'below' })}
              >
                <Text style={[styles.conditionText, alertEditData.condition === 'below' && styles.conditionTextSelected]}>
                  Below
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Target Price ($/bushel)</Text>
            <TextInput
              style={styles.input}
              value={alertEditData.targetPrice}
              onChangeText={(text) => setAlertEditData({ ...alertEditData, targetPrice: text })}
              placeholder="4.50"
              keyboardType="decimal-pad"
            />

            <View style={styles.alertModalActions}>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAlert}>
                <Ionicons name="trash-outline" size={16} color="#ffffff" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.updateButton} onPress={handleUpdateAlert}>
                <Text style={styles.updateButtonText}>Update Alert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Notifications Modal */}
      <Modal visible={showNotificationsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.notifRow}>
              <View style={styles.notifInfo}>
                <Text style={styles.notifTitle}>Price Alerts</Text>
                <Text style={styles.notifDesc}>Get notified when crop prices hit your targets</Text>
              </View>
              <Switch
                value={notifPriceAlerts}
                onValueChange={(v) => setNotif("@notif_price_alerts", setNotifPriceAlerts, v)}
                trackColor={{ false: "#e5e7eb", true: "#a3d977" }}
                thumbColor={notifPriceAlerts ? "#2d5016" : "#9ca3af"}
              />
            </View>

            <View style={styles.notifRow}>
              <View style={styles.notifInfo}>
                <Text style={styles.notifTitle}>Market Updates</Text>
                <Text style={styles.notifDesc}>Daily summary of market price movements</Text>
              </View>
              <Switch
                value={notifMarketUpdates}
                onValueChange={(v) => setNotif("@notif_market_updates", setNotifMarketUpdates, v)}
                trackColor={{ false: "#e5e7eb", true: "#a3d977" }}
                thumbColor={notifMarketUpdates ? "#2d5016" : "#9ca3af"}
              />
            </View>

            <View style={styles.notifRow}>
              <View style={styles.notifInfo}>
                <Text style={styles.notifTitle}>Weather Alerts</Text>
                <Text style={styles.notifDesc}>Severe weather warnings for your region</Text>
              </View>
              <Switch
                value={notifWeather}
                onValueChange={(v) => setNotif("@notif_weather", setNotifWeather, v)}
                trackColor={{ false: "#e5e7eb", true: "#a3d977" }}
                thumbColor={notifWeather ? "#2d5016" : "#9ca3af"}
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setShowNotificationsModal(false)}
            >
              <Text style={styles.saveButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help & Support Modal */}
      <Modal visible={showHelpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Help & Support</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {[
              {
                q: "How do I post a crop listing?",
                a: "Tap the Post Listing tab at the bottom of the screen. Fill in your crop type, quantity, price, and available date, then tap Post Listing.",
              },
              {
                q: "How are price predictions generated?",
                a: "AgriTrader uses ML models trained on USDA historical data to forecast near-term corn, soybean, and wheat prices. Predictions update based on your location.",
              },
              {
                q: "What do the National vs Local prices mean?",
                a: "National prices reflect broad market benchmarks. Local prices are regional estimates adjusted for your area's typical basis spread.",
              },
              {
                q: "How do price alerts work?",
                a: "Set a target price on the Home screen using the bell icon. AgriTrader will notify you when a crop crosses your threshold.",
              },
              {
                q: "How do I update my farm location?",
                a: "Tap the pencil icon on your Profile card. Changing your location updates all price predictions and weather data throughout the app.",
              },
              {
                q: "What does Pre-Order mean?",
                a: "Pre-ordering a listing reserves your interest in that crop. The seller will be notified and can confirm availability with you directly.",
              },
            ].map((item, i) => (
              <View key={i} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{item.q}</Text>
                <Text style={styles.faqAnswer}>{item.a}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.saveButton, { marginTop: 8, marginBottom: 16 }]}
              onPress={() => setShowHelpModal(false)}
            >
              <Text style={styles.saveButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
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
  },
  farmName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  farmInfo: {
    fontSize: 16,
    color: "#6b7280",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2d5016",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  earningsButton: {
    backgroundColor: "#2d5016",
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  earningsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
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
    backgroundColor: "#f0f9ff",
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
    fontSize: 13,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 8,
  },
  infoNote: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 8,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: "#2d5016",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  earningsCard: {
    backgroundColor: "#f0f9ff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#2d5016",
  },
  earningsLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#2d5016",
  },
  earningsBreakdown: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  inputFocused: {
    borderColor: "#2d5016",
    borderWidth: 2,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  notifInfo: {
    flex: 1,
    marginRight: 16,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
    marginBottom: 2,
  },
  notifDesc: {
    fontSize: 13,
    color: "#6b7280",
  },
  faqItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  emptyTransactions: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCrop: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1f2937",
  },
  transactionDate: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#22c55e",
  },
  cropSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
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
    fontSize: 13,
  },
  cropOptionTextSelected: {
    color: "#ffffff",
  },
  conditionSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
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
  alertModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    padding: 14,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  deleteButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  updateButton: {
    flex: 2,
    backgroundColor: "#2d5016",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  updateButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default ProfileScreen;
