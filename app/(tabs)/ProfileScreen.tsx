import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUserProfile } from "../../components/UserProfileContext";
import { useAuth } from "../../components/AuthContext";
import { useListings } from "../../components/ListingsContext";
import { useAlerts, PriceAlert } from "../../components/AlertsContext";
import { usePreorders } from "../../components/PreordersContext";
import { signOutUser } from "../../lib/authService";

const ProfileScreen = () => {
  const { profile, updateProfile } = useUserProfile();
  const { user } = useAuth();
  const { getUserListings } = useListings();
  const { alerts, removeAlert, updateAlert } = useAlerts();
  const { preorders } = usePreorders();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PriceAlert | null>(null);

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

  const userListings = getUserListings();
  
  const summary = {
    listings: userListings.length,
    preorders: preorders.length,
    pastSales: 23, // Mock for demo
  };

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
    <ScrollView style={styles.container}>
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
            <Text style={styles.summaryNumber}>{summary.listings}</Text>
            <Text style={styles.summaryLabel}>Listings</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.preorders}</Text>
            <Text style={styles.summaryLabel}>Pre-orders</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.pastSales}</Text>
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

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={24} color="#6b7280" />
            <Text style={styles.settingText}>Notifications</Text>
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={editFormData.displayName}
              onChangeText={(text) => setEditFormData({ ...editFormData, displayName: text })}
              placeholder="Your Name"
            />

            <Text style={styles.inputLabel}>Farm Name</Text>
            <TextInput
              style={styles.input}
              value={editFormData.farmName}
              onChangeText={(text) => setEditFormData({ ...editFormData, farmName: text })}
              placeholder="Green Valley Farm"
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.input}
              value={editFormData.location}
              onChangeText={(text) => setEditFormData({ ...editFormData, location: text })}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Earnings Overview</Text>
              <TouchableOpacity onPress={() => setShowEarningsModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.earningsCard}>
              <Text style={styles.earningsLabel}>Total Earnings (All Time)</Text>
              <Text style={styles.earningsAmount}>$3,240</Text>
            </View>

            <View style={styles.earningsBreakdown}>
              <Text style={styles.breakdownTitle}>This Month</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Total Sales</Text>
                <Text style={styles.breakdownValue}>$580</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Pending Orders</Text>
                <Text style={styles.breakdownValue}>{preorders.length}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Active Listings</Text>
                <Text style={styles.breakdownValue}>{userListings.length}</Text>
              </View>
            </View>

            <View style={styles.earningsBreakdown}>
              <Text style={styles.breakdownTitle}>Recent Transactions</Text>
              <View style={styles.transactionRow}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionCrop}>Corn - 500 bu</Text>
                  <Text style={styles.transactionDate}>Oct 10, 2025</Text>
                </View>
                <Text style={styles.transactionAmount}>+$2,250</Text>
              </View>
              <View style={styles.transactionRow}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionCrop}>Soybeans - 200 bu</Text>
                  <Text style={styles.transactionDate}>Oct 3, 2025</Text>
                </View>
                <Text style={styles.transactionAmount}>+$2,040</Text>
              </View>
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
