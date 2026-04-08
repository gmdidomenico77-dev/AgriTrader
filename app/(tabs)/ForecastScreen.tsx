import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { predictionService, PredictionData, GraphData } from "../../lib/predictionService";
import { historicalDataService } from "../../lib/historicalDataService";
import { useUserProfile } from "../../components/UserProfileContext";

const screenWidth = Dimensions.get("window").width;

const CROPS = ["Corn", "Soybeans", "Wheat"];

const ForecastScreen = () => {
  const [selectedCrop, setSelectedCrop] = useState("Corn");
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [historicalPrices, setHistoricalPrices] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const { profile } = useUserProfile();
  const userLocation = profile?.location || "PA";
  const latitude = profile?.latitude;
  const longitude = profile?.longitude;

  useEffect(() => {
    loadPredictionData();
  }, [selectedCrop, userLocation, latitude, longitude]);

  const loadPredictionData = async () => {
    try {
      setLoading(true);
      setError(null);
      const cropKey = selectedCrop.toLowerCase();

      const [predictionResult, graphResult, historicalResult] = await Promise.all([
        predictionService.getPrediction(cropKey, userLocation, latitude, longitude),
        predictionService.getGraphData(cropKey, userLocation, latitude, longitude),
        historicalDataService.getRecentPrices(cropKey, 5),
      ]);

      setPrediction(predictionResult);
      setGraphData(graphResult);
      setHistoricalPrices(historicalResult);
      setIsUsingFallback(predictionResult.fallback_used === true);
    } catch (err) {
      setError("Could not load predictions. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPredictionData();
    setRefreshing(false);
  };

  // Build chart data: historical prices + confidence band + forecast line
  const getChartData = () => {
    const hist = historicalPrices.filter((n) => Number.isFinite(n) && n > 0);
    const pts = graphData?.data_points ?? [];

    if (!pts.length && !prediction) {
      const a = hist.length ? hist[hist.length - 1]! : 4;
      return {
        labels: ["—", "—"],
        datasets: [{ data: [a, a * 1.002], strokeWidth: 2 }],
      };
    }

    const forwardMain = pts.map((p) => p.predicted_price);
    const forwardUpper = pts.map((p) => p.confidence_upper);
    const forwardLower = pts.map((p) => p.confidence_lower);

    // Historical points have no uncertainty band — use actual price for both bounds
    const mainData = [...hist, ...forwardMain];
    const upperData = [...hist, ...forwardUpper];
    const lowerData = [...hist, ...forwardLower];

    const labels: string[] = [];
    for (let i = 0; i < hist.length; i++) {
      const ago = hist.length - 1 - i;
      labels.push(ago === 0 ? "Now" : `−${ago}d`);
    }
    for (const p of pts) {
      const d = p.days_ahead;
      if (d <= 1) labels.push("+1d");
      else if (d < 30) labels.push(`+${d}d`);
      else labels.push(`+${Math.round(d / 30)}mo`);
    }

    if (mainData.length < 2) {
      const a = mainData[0] ?? 4;
      return {
        labels: ["—", "—"],
        datasets: [{ data: [a, a * 1.002], strokeWidth: 2 }],
      };
    }

    const safeLabels =
      labels.length === mainData.length ? labels : mainData.map((_, i) => `${i + 1}`);

    return {
      labels: safeLabels,
      datasets: [
        // Confidence band — drawn first so the main line sits on top
        {
          data: upperData,
          color: () => "rgba(45, 80, 22, 0.15)",
          strokeWidth: 1,
        },
        {
          data: lowerData,
          color: () => "rgba(45, 80, 22, 0.15)",
          strokeWidth: 1,
        },
        // Main prediction line
        {
          data: mainData,
          color: () => "rgba(45, 80, 22, 1)",
          strokeWidth: 3,
        },
      ],
    };
  };

  const trendLabel = useMemo(
    () => graphData?.near_term_trend || prediction?.market_analysis.trend || "Stable",
    [graphData?.near_term_trend, prediction?.market_analysis.trend],
  );

  const peakPrice = useMemo(() => {
    if (graphData?.peak_price != null) return graphData.peak_price;
    const pts = graphData?.data_points ?? [];
    if (!pts.length) return prediction?.predicted_price ?? null;
    return Math.max(...pts.map((p) => p.predicted_price), graphData?.current_price ?? 0);
  }, [graphData, prediction]);

  const confidenceRange = useMemo(() => {
    if (!prediction) return null;
    return {
      low: prediction.confidence_lower,
      high: prediction.confidence_upper,
    };
  }, [prediction]);

  const recommendationColor = useMemo(() => {
    if (!prediction) return "#22c55e";
    switch (prediction.recommendation.action.toLowerCase()) {
      case "sell": return "#ef4444";
      case "buy": return "#22c55e";
      default: return "#f59e0b";
    }
  }, [prediction]);

  const recommendationIcon = useMemo(() => {
    if (!prediction) return "checkmark-circle";
    switch (prediction.recommendation.action.toLowerCase()) {
      case "buy": return "arrow-up-circle";
      case "sell": return "arrow-down-circle";
      default: return "checkmark-circle";
    }
  }, [prediction]);

  const trendColor = useMemo(() => {
    const t = trendLabel.toLowerCase();
    if (t.includes("bull") || t.includes("upward")) return "#22c55e";
    if (t.includes("bear") || t.includes("downward")) return "#ef4444";
    return "#64748b";
  }, [trendLabel]);

  const trendIcon = useMemo(() => {
    const t = trendLabel.toLowerCase();
    if (t.includes("bull") || t.includes("upward")) return "trending-up";
    if (t.includes("bear") || t.includes("downward")) return "trending-down";
    return "analytics-outline";
  }, [trendLabel]);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d5016" />
        <Text style={styles.loadingText}>Loading predictions for {userLocation}…</Text>
      </View>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline-outline" size={56} color="#d1d5db" />
        <Text style={styles.errorTitle}>Predictions unavailable</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPredictionData}>
          <Ionicons name="refresh" size={18} color="#ffffff" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Offline / fallback banner */}
      {isUsingFallback && (
        <View style={styles.fallbackBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#92400e" />
          <Text style={styles.fallbackText}>
            Using offline estimates — connect to live model for real-time data
          </Text>
        </View>
      )}

      {/* Crop selector */}
      <View style={styles.cropSelector}>
        {CROPS.map((crop) => (
          <TouchableOpacity
            key={crop}
            style={[styles.cropButton, selectedCrop === crop && styles.cropButtonActive]}
            onPress={() => setSelectedCrop(crop)}
            activeOpacity={0.75}
          >
            <Text
              style={[styles.cropButtonText, selectedCrop === crop && styles.cropButtonTextActive]}
            >
              {crop}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Price header */}
      <View style={styles.priceHeader}>
        <Text style={styles.cropName}>{selectedCrop}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>
            ${prediction?.predicted_price?.toFixed(2) ?? "—"}
          </Text>
          {confidenceRange && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceBadgeText}>
                ${confidenceRange.low.toFixed(2)} – ${confidenceRange.high.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.locationText}>
          <Ionicons name="location-outline" size={13} /> {userLocation}
          {!isUsingFallback && (
            <Text style={styles.liveTag}> · Live ML</Text>
          )}
        </Text>
      </View>

      {/* Chart */}
      <View style={styles.card}>
        <View style={styles.chartHeader}>
          <Text style={styles.cardTitle}>Price Forecast</Text>
          <View style={styles.chartLegend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendLabel}>Historical</Text>
            <View style={[styles.legendDot, { backgroundColor: "#2d5016" }]} />
            <Text style={styles.legendLabel}>Forecast</Text>
          </View>
        </View>
        <LineChart
          data={getChartData()}
          width={screenWidth - 64}
          height={220}
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(45, 80, 22, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: "3", strokeWidth: "2", stroke: "#2d5016" },
          }}
          bezier
          withShadow={false}
          style={styles.chart}
        />
        <Text style={styles.chartNote}>
          Shaded lines show 95% confidence interval
        </Text>
      </View>

      {/* Recommendation card */}
      <View style={styles.card}>
        <View style={styles.recommendationHeader}>
          <Ionicons name={recommendationIcon} size={22} color={recommendationColor} />
          <Text style={styles.questionText}>Sell Now or Hold?</Text>
        </View>
        <View style={styles.recommendationContent}>
          <Text style={[styles.actionText, { color: recommendationColor }]}>
            {prediction?.recommendation.action ?? "Hold"}
          </Text>
        </View>
        <Text style={[styles.confidenceText, { color: recommendationColor }]}>
          {prediction?.recommendation.confidence ?? "High"} confidence ·{" "}
          {prediction?.recommendation.confidence_percentage ?? 87}%
        </Text>
      </View>

      {/* Market analysis */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Market Analysis</Text>
        <View style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>Near-Term Trend</Text>
          <View style={styles.trendIndicator}>
            <Ionicons name={trendIcon} size={16} color={trendColor} />
            <Text style={[styles.trendText, { color: trendColor }]}>{trendLabel}</Text>
          </View>
        </View>
        <View style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>Long-Term Trend</Text>
          <Text style={styles.analysisValue}>{graphData?.long_term_trend ?? "Stable"}</Text>
        </View>
        <View style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>Optimal Sell Time</Text>
          <Text style={[styles.analysisValue, { color: "#2d5016", fontWeight: "600" }]}>
            {graphData?.recommended_sell_time ??
              prediction?.market_analysis.best_selling_time ??
              "Within 1–2 months"}
          </Text>
        </View>
        <View style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>6-Month Peak</Text>
          <Text style={styles.analysisValue}>
            {peakPrice != null ? `$${peakPrice.toFixed(2)}` : "—"}
          </Text>
        </View>
        <View style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>Model Confidence</Text>
          <Text style={styles.analysisValue}>
            {Math.round((prediction?.model_confidence ?? 0) * 100)}%
          </Text>
        </View>
      </View>

      {/* Local market bid card — only shown when live backend returns USDA data */}
      {prediction?.local_bid != null && (
        <View style={[styles.card, styles.localBidCard]}>
          <View style={styles.localBidHeader}>
            <Ionicons name="storefront-outline" size={18} color="#2d5016" />
            <Text style={styles.cardTitle}>Local Elevator Bid</Text>
          </View>
          <Text style={styles.localBidPrice}>${prediction.local_bid.toFixed(2)}</Text>
          <Text style={styles.localBidRegion}>
            {prediction.local_bid_region
              ? `${prediction.local_bid_region.charAt(0).toUpperCase()}${prediction.local_bid_region.slice(1)} Pennsylvania`
              : "Pennsylvania"}{" "}
            · USDA AMS Report
          </Text>
          {prediction.confidence_lower && prediction.confidence_upper && (
            <Text style={styles.localBidRange}>
              Bid range: ${prediction.confidence_lower.toFixed(2)} –{" "}
              ${prediction.confidence_upper.toFixed(2)}
            </Text>
          )}
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2d5016",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  fallbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef3c7",
    borderBottomWidth: 1,
    borderBottomColor: "#fde68a",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fallbackText: {
    flex: 1,
    fontSize: 12,
    color: "#92400e",
    lineHeight: 16,
  },
  cropSelector: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  cropButton: {
    flex: 1,
    paddingVertical: 9,
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
    marginBottom: 4,
  },
  cropName: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1f2937",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  currentPrice: {
    fontSize: 36,
    fontWeight: "700",
    color: "#2d5016",
  },
  confidenceBadge: {
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  confidenceBadgeText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "500",
  },
  locationText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 12,
  },
  liveTag: {
    color: "#16a34a",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d1d5db",
  },
  legendLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginRight: 6,
  },
  chart: {
    marginVertical: 4,
    borderRadius: 12,
  },
  chartNote: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  recommendationContent: {
    marginBottom: 6,
  },
  actionText: {
    fontSize: 28,
    fontWeight: "700",
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: "500",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1f2937",
  },
  analysisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  analysisLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  analysisValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  trendIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendText: {
    fontSize: 14,
    fontWeight: "500",
  },
  localBidCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#2d5016",
  },
  localBidHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  localBidPrice: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2d5016",
  },
  localBidRegion: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  localBidRange: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  bottomPadding: {
    height: 24,
  },
});

export default ForecastScreen;
