import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const AddListingScreen = () => {
  const [formData, setFormData] = useState({
    crop: "Corn",
    weight: "",
    pricePerUnit: "",
    harvestDate: "",
    description: "",
    location: "",
  })

  const crops = ["Corn", "Soybeans", "Wheat", "Barley", "Oats"]
  const [showCropPicker, setShowCropPicker] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = () => {
    if (!formData.weight || !formData.pricePerUnit || !formData.harvestDate) {
      Alert.alert("Error", "Please fill in all required fields")
      return
    }

    Alert.alert("Success", "Your listing has been posted successfully!", [
      {
        text: "OK",
        onPress: () => {
          // Reset form
          setFormData({
            crop: "Corn",
            weight: "",
            pricePerUnit: "",
            harvestDate: "",
            description: "",
            location: "",
          })
        },
      },
    ])
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Crop Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Crop *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowCropPicker(!showCropPicker)}>
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
                    handleInputChange("crop", crop)
                    setShowCropPicker(false)
                  }}
                >
                  <Text style={styles.pickerOptionText}>{crop}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Weight */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Weight *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="250"
              value={formData.weight}
              onChangeText={(value) => handleInputChange("weight", value)}
              keyboardType="numeric"
            />
            <Text style={styles.inputSuffix}>lbs</Text>
          </View>
        </View>

        {/* Price Per Unit */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Price Per Unit *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="0.55"
              value={formData.pricePerUnit}
              onChangeText={(value) => handleInputChange("pricePerUnit", value)}
              keyboardType="numeric"
            />
            <Text style={styles.inputSuffix}>$ / lb</Text>
          </View>
        </View>

        {/* Harvest Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Harvest Date *</Text>
          <TextInput
            style={styles.input}
            placeholder="Jul 20, 2024"
            value={formData.harvestDate}
            onChangeText={(value) => handleInputChange("harvestDate", value)}
          />
        </View>

        {/* Location */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Erie, PA"
            value={formData.location}
            onChangeText={(value) => handleInputChange("location", value)}
          />
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional details about your crop..."
            value={formData.description}
            onChangeText={(value) => handleInputChange("description", value)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Quality Information */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#2d5016" />
            <Text style={styles.infoTitle}>Quality Standards</Text>
          </View>
          <Text style={styles.infoText}>
            Your crop will be inspected for quality before listing. High-quality crops receive better visibility and
            pricing.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Post Listing</Text>
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
  inputSuffix: {
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#6b7280",
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
  submitButton: {
    backgroundColor: "#2d5016",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
})

export default AddListingScreen
