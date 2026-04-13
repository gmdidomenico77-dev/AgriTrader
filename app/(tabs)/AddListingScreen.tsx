import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useListings } from "../../components/ListingsContext";
import { useUserProfile } from "../../components/UserProfileContext";

const AddListingScreen = () => {
  const { addListing } = useListings();
  const { profile } = useUserProfile();

  const [formData, setFormData] = useState({
    crop: "Corn",
    customCrop: "",
    weight: "",
    pricePerUnit: "",
    harvestDate: "",
    description: "",
    location: profile?.location || "PA",
  });

  const crops = ["Corn", "Soybeans", "Wheat", "Barley", "Oats", "Other"];
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!formData.weight) errors.weight = "Quantity is required";
    else if (isNaN(parseFloat(formData.weight))) errors.weight = "Enter a valid number";
    if (!formData.pricePerUnit) errors.pricePerUnit = "Price is required";
    else if (isNaN(parseFloat(formData.pricePerUnit))) errors.pricePerUnit = "Enter a valid number";
    if (!formData.harvestDate) errors.harvestDate = "Available date is required";
    if (formData.crop === "Other" && !formData.customCrop.trim()) errors.customCrop = "Specify the crop name";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const cropName = formData.crop === "Other" ? formData.customCrop : formData.crop;
    const quantity = parseFloat(formData.weight);
    const pricePerUnit = parseFloat(formData.pricePerUnit);

    setIsSubmitting(true);
    try {
      await addListing({
        crop: cropName,
        quantity: quantity,
        pricePerUnit: pricePerUnit,
        location: formData.location || profile?.location || "PA",
        description: formData.description,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Listing Posted! ✓",
        `Your ${cropName} listing is now live in the marketplace.`,
        [
          {
            text: "OK",
            onPress: () => {
              setFormData({
                crop: "Corn",
                customCrop: "",
                weight: "",
                pricePerUnit: "",
                harvestDate: "",
                description: "",
                location: profile?.location || "PA",
              });
            },
          },
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Crop Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Crop *</Text>
          <TouchableOpacity style={styles.picker} activeOpacity={0.75} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCropPicker(!showCropPicker); }}>
            <Text style={styles.pickerText}>{formData.crop}</Text>
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>

          {showCropPicker && (
            <View style={styles.pickerOptions}>
              {crops.map((crop) => (
                <TouchableOpacity
                  key={crop}
                  style={styles.pickerOption}
                  onPress={() => {
                    handleInputChange("crop", crop);
                    setShowCropPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{crop}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Custom Crop (if Other selected) */}
        {formData.crop === "Other" && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Specify Crop *</Text>
            <TextInput
              style={[styles.input, focusedField === "customCrop" && styles.inputFocused, fieldErrors.customCrop && styles.inputError]}
              placeholder="e.g., Apples, Tomatoes, etc."
              value={formData.customCrop}
              onChangeText={(value) => { handleInputChange("customCrop", value); setFieldErrors(e => ({ ...e, customCrop: "" })); }}
              onFocus={() => setFocusedField("customCrop")}
              onBlur={() => setFocusedField(null)}
            />
            {!!fieldErrors.customCrop && <Text style={styles.errorText}>{fieldErrors.customCrop}</Text>}
          </View>
        )}

        {/* Weight */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Quantity *</Text>
          <View style={[styles.inputContainer, focusedField === "weight" && styles.inputContainerFocused, fieldErrors.weight && styles.inputContainerError]}>
            <TextInput
              style={styles.input}
              placeholder="250"
              value={formData.weight}
              onChangeText={(value) => { handleInputChange("weight", value); setFieldErrors(e => ({ ...e, weight: "" })); }}
              onFocus={() => setFocusedField("weight")}
              onBlur={() => setFocusedField(null)}
              keyboardType="numeric"
            />
            <Text style={styles.inputSuffix}>
              {formData.crop === "Corn" || formData.crop === "Soybeans" || formData.crop === "Wheat"
                ? "bu"
                : "lbs"}
            </Text>
          </View>
          {!!fieldErrors.weight && <Text style={styles.errorText}>{fieldErrors.weight}</Text>}
        </View>

        {/* Price Per Unit */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Price Per Unit *</Text>
          <View style={[styles.inputContainer, focusedField === "pricePerUnit" && styles.inputContainerFocused, fieldErrors.pricePerUnit && styles.inputContainerError]}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={[styles.input, styles.inputWithPrefix]}
              placeholder="4.50"
              value={formData.pricePerUnit}
              onChangeText={(value) => { handleInputChange("pricePerUnit", value); setFieldErrors(e => ({ ...e, pricePerUnit: "" })); }}
              onFocus={() => setFocusedField("pricePerUnit")}
              onBlur={() => setFocusedField(null)}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputSuffix}>
              /{formData.crop === "Corn" || formData.crop === "Soybeans" || formData.crop === "Wheat"
                ? "bu"
                : "lb"}
            </Text>
          </View>
          {!!fieldErrors.pricePerUnit && <Text style={styles.errorText}>{fieldErrors.pricePerUnit}</Text>}
        </View>

        {/* Harvest Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Available Date *</Text>
          <TextInput
            style={[styles.input, focusedField === "harvestDate" && styles.inputFocused, fieldErrors.harvestDate && styles.inputError]}
            placeholder="Nov 20, 2025"
            value={formData.harvestDate}
            onChangeText={(value) => { handleInputChange("harvestDate", value); setFieldErrors(e => ({ ...e, harvestDate: "" })); }}
            onFocus={() => setFocusedField("harvestDate")}
            onBlur={() => setFocusedField(null)}
          />
          {!!fieldErrors.harvestDate && <Text style={styles.errorText}>{fieldErrors.harvestDate}</Text>}
        </View>

        {/* Location */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={[styles.input, focusedField === "location" && styles.inputFocused]}
            placeholder="Erie, PA"
            value={formData.location}
            onChangeText={(value) => handleInputChange("location", value)}
            onFocus={() => setFocusedField("location")}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, focusedField === "description" && styles.inputFocused]}
            placeholder="Additional details about your crop..."
            value={formData.description}
            onChangeText={(value) => handleInputChange("description", value)}
            onFocus={() => setFocusedField("description")}
            onBlur={() => setFocusedField(null)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Quality Information */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#2d5016" />
            <Text style={styles.infoTitle}>Listing Tips</Text>
          </View>
          <Text style={styles.infoText}>
            • Set competitive prices based on current market rates{'\n'}
            • Provide accurate quantity and quality information{'\n'}
            • Include specific location for easier buyer matching{'\n'}
            • High-quality crops receive better visibility
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Post Listing</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  inputPrefix: {
    paddingLeft: 16,
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  inputWithPrefix: {
    borderWidth: 0,
  },
  inputSuffix: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  picker: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerText: {
    fontSize: 16,
    color: "#1f2937",
  },
  pickerOptions: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  pickerOptionText: {
    fontSize: 16,
    color: "#1f2937",
  },
  infoCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#2d5016",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d5016",
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  inputFocused: {
    borderColor: "#2d5016",
    borderWidth: 2,
  },
  inputError: {
    borderColor: "#ef4444",
    borderWidth: 2,
  },
  inputContainerFocused: {
    borderColor: "#2d5016",
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: "#ef4444",
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
    marginLeft: 2,
  },
  submitButton: {
    backgroundColor: "#2d5016",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: "#6b7280",
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
});

export default AddListingScreen;
