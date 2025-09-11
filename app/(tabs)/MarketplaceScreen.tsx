"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const MarketplaceScreen = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("All")

  const filters = ["All", "Corn", "Soybeans", "Wheat"]

  const listings = [
    {
      id: 1,
      crop: "Corn",
      quantity: "250 lbs",
      price: "$12.20",
      location: "Erie, PA",
      seller: "John Farm",
      availableDate: "Jul 20",
      quality: "72+",
    },
    {
      id: 2,
      crop: "Soybeans",
      quantity: "180 lbs",
      price: "$9.58",
      location: "Pittsburgh, PA",
      seller: "Green Valley",
      availableDate: "Jul 18",
      quality: "68+",
    },
    {
      id: 3,
      crop: "Wheat",
      quantity: "300 lbs",
      price: "$8.92",
      location: "Harrisburg, PA",
      seller: "Sunrise Farm",
      availableDate: "Jul 17",
      quality: "75+",
    },
  ]

  const filteredListings =
    selectedFilter === "All" ? listings : listings.filter((listing) => listing.crop === selectedFilter)

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search crops, locations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, selectedFilter === filter && styles.filterButtonActive]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[styles.filterButtonText, selectedFilter === filter && styles.filterButtonTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Listings */}
      <ScrollView style={styles.listingsContainer}>
        <Text style={styles.sectionTitle}>Marketplace</Text>

        {filteredListings.map((listing) => (
          <View key={listing.id} style={styles.listingCard}>
            <View style={styles.listingHeader}>
              <View>
                <Text style={styles.cropName}>{listing.crop}</Text>
                <Text style={styles.quantity}>{listing.quantity}</Text>
              </View>
              <View style={styles.qualityBadge}>
                <Text style={styles.qualityText}>{listing.quality}</Text>
              </View>
            </View>

            <View style={styles.listingDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color="#6b7280" />
                <Text style={styles.detailText}>{listing.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={16} color="#6b7280" />
                <Text style={styles.detailText}>{listing.seller}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text style={styles.detailText}>Available {listing.availableDate}</Text>
              </View>
            </View>

            <View style={styles.listingFooter}>
              <Text style={styles.price}>{listing.price}</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.preOrderButton}>
                  <Text style={styles.preOrderText}>Pre-Order</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.messageButton}>
                  <Text style={styles.messageText}>Message Seller</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
  },
  filterContainer: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  filterButtonActive: {
    backgroundColor: "#2d5016",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  listingsContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  listingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cropName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  quantity: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  qualityBadge: {
    backgroundColor: "#2d5016",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
  listingDetails: {
    gap: 6,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: "#6b7280",
  },
  listingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2d5016",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  preOrderButton: {
    backgroundColor: "#2d5016",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  preOrderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  messageButton: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  messageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
})

export default MarketplaceScreen
