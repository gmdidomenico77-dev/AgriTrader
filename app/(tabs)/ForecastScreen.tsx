
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;

const ForecastScreen = () => {
  const [selectedCrop, setSelectedCrop] = useState("Corn")

  const crops = ["Corn", "Soybeans", "Wheat"]

  const chartData = {
    labels: ["5 days", "Crop", "Next 7 Days"],
    datasets: [
      {
        data: [6.8, 6.9, 7.0, 7.02],
        strokeWidth: 3,
      },
    ],
  }

  const recommendation = {
    action: "Hold",
    question: "Sell Now or Hold?",
    confidence: "87%",
    trend: "up",
  }

  return (
    <ScrollView style={styles.container}>
      {/* Crop Selection */}
      <View style={styles.cropSelector}>
        {crops.map((crop) => (
          <TouchableOpacity
            key={crop}
            style={[styles.cropButton, selectedCrop === crop && styles.cropButtonActive]}
            onPress={() => setSelectedCrop(crop)}
          >
            <Text style={[styles.cropButtonText, selectedCrop === crop && styles.cropButtonTextActive]}>{crop}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Price Header */}
      <View style={styles.priceHeader}>
        <Text style={styles.cropName}>{selectedCrop}</Text>
        <Text style={styles.currentPrice}>$7.02</Text>
      </View>

      {/* Chart Card */}
      <View style={styles.card}>
        <LineChart
          data={chartData}
          width={screenWidth - 64}
          height={220}
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(45, 80, 22, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: "#2d5016",
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Recommendation Card */}
      <View style={styles.card}>
        <View style={styles.recommendationHeader}>
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          <Text style={styles.questionText}>{recommendation.question}</Text>
        </View>

        <View style={styles.recommendationContent}>
          <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
          <Text style={styles.actionText}>{recommendation.action}</Text>
        </View>

        <Text style={styles.confidenceText}>High confidence {recommendation.confidence}</Text>
      </View>

      {/* Additional Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Market Analysis</Text>
        <View style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>Trend</Text>
          <View style={styles.trendIndicator}>
            <Ionicons name="trending-up" size={16} color="#22c55e" />
            <Text style={styles.trendText}>Upward</Text>
          </View>
        </View>
        <View style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>Volatility</Text>
          <Text style={styles.analysisValue}>Low</Text>
        </View>
        <View style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>Best selling time</Text>
          <Text style={styles.analysisValue}>Next 2-3 weeks</Text>
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
  cropSelector: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  cropButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
  },
  cropButtonActive: {
    backgroundColor: "#2d5016",
  },
  cropButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  cropButtonTextActive: {
    color: "#ffffff",
  },
  priceHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  cropName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1f2937",
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2d5016",
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  recommendationContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
  },
  confidenceText: {
    fontSize: 14,
    color: "#22c55e",
    fontWeight: "500",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  analysisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  analysisLabel: {
    fontSize: 16,
    color: "#6b7280",
  },
  analysisValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
  },
  trendIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#22c55e",
  },
})

export default ForecastScreen
