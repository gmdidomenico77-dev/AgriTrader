import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, LayoutAnimation, Platform, UIManager } from "react-native";
import * as Haptics from "expo-haptics";

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { Ionicons } from "@expo/vector-icons";
import { usePreorders } from "../../components/PreordersContext";
import { useListings } from "../../components/ListingsContext";

interface Listing {
  id: string;
  crop: string;
  quantity: string;
  price: string;
  pricePerUnit: number;
  location: string;
  seller: string;
  availableDate: string;
  quality?: string;
  isUserListing?: boolean;
}

const MarketplaceScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const { addPreorder, isPreordered } = usePreorders();
  const { listings: userListings } = useListings();
  const [preorderingId, setPreorderingId] = useState<string | null>(null);

  const filters = ["All", "Corn", "Soybeans", "Wheat", "Other"];

  const allListings: Listing[] = userListings.map(listing => ({
    id: listing.id,
    crop: listing.crop,
    quantity: `${listing.quantity} units`,
    price: `$${listing.pricePerUnit.toFixed(2)}/unit`,
    pricePerUnit: listing.pricePerUnit,
    location: listing.location,
    seller: "You",
    availableDate: new Date(listing.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    isUserListing: true,
  }));

  const searchFiltered = searchQuery.trim()
    ? allListings.filter(l =>
        l.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allListings;

  const filteredListings = selectedFilter === "All"
    ? searchFiltered
    : searchFiltered.filter((listing) => listing.crop === selectedFilter);

  const applyFilter = (filter: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedFilter(filter);
  };

  const myListings = filteredListings.filter(l => l.isUserListing);
  const otherListings = filteredListings.filter(l => !l.isUserListing);

  const handlePreorder = async (listing: Listing) => {
    if (isPreordered(listing.id)) {
      Alert.alert("Already Pre-ordered", "You've already pre-ordered this item.");
      return;
    }

    setPreorderingId(listing.id);
    try {
      await addPreorder({
        listingId: listing.id,
        crop: listing.crop,
        quantity: parseInt(listing.quantity),
        pricePerUnit: listing.pricePerUnit,
        seller: listing.seller,
        location: listing.location,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Pre-order Confirmed!", `You've pre-ordered ${listing.crop} from ${listing.seller}`);
    } finally {
      setPreorderingId(null);
    }
  };

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
            onPress={() => applyFilter(filter)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterButtonText, selectedFilter === filter && styles.filterButtonTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Listings */}
      <ScrollView style={styles.listingsContainer} contentContainerStyle={styles.listingsContent}>
        {/* My Listings Section */}
        {myListings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>My Listings ({myListings.length})</Text>
            {myListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isPreordered={false}
                onPreorder={() => {}}
                isUserListing
              />
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Marketplace</Text>

        {otherListings.length > 0 ? (
          otherListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isPreordered={isPreordered(listing.id)}
              isPreordering={preorderingId === listing.id}
              onPreorder={() => handlePreorder(listing)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptySubtitle}>
              When other farmers post crops for sale, they'll appear here. Use the{" "}
              <Text style={styles.emptyHighlight}>+ Post Listing</Text> tab to list your own crops.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const ListingCard = ({
  listing,
  isPreordered,
  isPreordering = false,
  onPreorder,
  isUserListing = false,
}: {
  listing: Listing;
  isPreordered: boolean;
  isPreordering?: boolean;
  onPreorder: () => void;
  isUserListing?: boolean;
}) => (
  <View style={[styles.listingCard, isUserListing && styles.userListingCard]}>
    {isUserListing && (
      <View style={styles.userListingBadge}>
        <Text style={styles.userListingText}>YOUR LISTING</Text>
      </View>
    )}

    <View style={styles.listingHeader}>
      <View>
        <Text style={styles.cropName}>{listing.crop}</Text>
        <Text style={styles.quantity}>{listing.quantity}</Text>
      </View>
      {listing.quality && (
        <View style={styles.qualityBadge}>
          <Text style={styles.qualityText}>{listing.quality}</Text>
        </View>
      )}
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
        <Text style={styles.detailText}>Listed {listing.availableDate}</Text>
      </View>
    </View>

    <View style={styles.listingFooter}>
      <Text style={styles.price}>{listing.price}</Text>
      {!isUserListing && (
        <TouchableOpacity
          style={[
            styles.preOrderButton,
            (isPreordered || isPreordering) && styles.preOrderButtonPressed,
          ]}
          onPress={onPreorder}
          disabled={isPreordered || isPreordering}
          activeOpacity={0.75}
        >
          {isPreordering ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.preOrderText}>
              {isPreordered ? "Pre-ordered ✓" : "Pre-Order"}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  </View>
);

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
  listingsContent: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
    marginTop: 8,
  },
  listingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  userListingCard: {
    borderWidth: 2,
    borderColor: "#2d5016",
  },
  userListingBadge: {
    backgroundColor: "#2d5016",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  userListingText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
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
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyHighlight: {
    color: "#2d5016",
    fontWeight: "600",
  },
  preOrderButton: {
    backgroundColor: "#2d5016",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  preOrderButtonPressed: {
    backgroundColor: "#6b7280",
  },
  preOrderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
});

export default MarketplaceScreen;
