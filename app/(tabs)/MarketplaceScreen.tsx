import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform } from "react-native";
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
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [message, setMessage] = useState("");

  const { preorders, addPreorder, isPreordered } = usePreorders();
  const { listings: userListings } = useListings();

  const filters = ["All", "Corn", "Soybeans", "Wheat", "Other"];

  // Mock marketplace listings with realistic prices
  const mockListings: Listing[] = [
    {
      id: "1",
      crop: "Corn",
      quantity: "500 bu",
      price: "$4.45/bu",
      pricePerUnit: 4.45,
      location: "Erie, PA",
      seller: "John's Farm",
      availableDate: "Nov 15",
      quality: "Grade 1",
    },
    {
      id: "2",
      crop: "Soybeans",
      quantity: "300 bu",
      price: "$10.15/bu",
      pricePerUnit: 10.15,
      location: "Pittsburgh, PA",
      seller: "Green Valley Farms",
      availableDate: "Nov 12",
      quality: "Grade 1",
    },
    {
      id: "3",
      crop: "Wheat",
      quantity: "400 bu",
      price: "$4.95/bu",
      pricePerUnit: 4.95,
      location: "Harrisburg, PA",
      seller: "Sunrise Farm Co",
      availableDate: "Nov 10",
      quality: "Grade 2",
    },
    {
      id: "4",
      crop: "Corn",
      quantity: "750 bu",
      price: "$4.50/bu",
      pricePerUnit: 4.50,
      location: "Lancaster, PA",
      seller: "Miller's Grain",
      availableDate: "Nov 18",
      quality: "Grade 1",
    },
    {
      id: "5",
      crop: "Apples",
      quantity: "200 lbs",
      price: "$1.25/lb",
      pricePerUnit: 1.25,
      location: "Gettysburg, PA",
      seller: "Orchard Valley",
      availableDate: "Oct 25",
      quality: "Premium",
    },
    {
      id: "6",
      crop: "Milk",
      quantity: "50 gal",
      price: "$3.50/gal",
      pricePerUnit: 3.50,
      location: "State College, PA",
      seller: "Happy Cow Dairy",
      availableDate: "Daily",
    },
  ];

  // Combine mock listings with user listings
  const allListings = [
    ...mockListings,
    ...userListings.map(listing => ({
      id: listing.id,
      crop: listing.crop,
      quantity: `${listing.quantity} units`,
      price: `$${listing.pricePerUnit.toFixed(2)}/unit`,
      pricePerUnit: listing.pricePerUnit,
      location: listing.location,
      seller: "You",
      availableDate: "Now",
      isUserListing: true,
    }))
  ];

  const filteredListings = selectedFilter === "All"
    ? allListings
    : allListings.filter((listing) => listing.crop === selectedFilter);

  const handlePreorder = async (listing: Listing) => {
    if (isPreordered(listing.id)) {
      Alert.alert("Already Pre-ordered", "You've already pre-ordered this item.");
      return;
    }

    await addPreorder({
      listingId: listing.id,
      crop: listing.crop,
      quantity: parseInt(listing.quantity),
      pricePerUnit: listing.pricePerUnit,
      seller: listing.seller,
      location: listing.location,
    });

    Alert.alert("Pre-order Confirmed!", `You've pre-ordered ${listing.crop} from ${listing.seller}`);
  };

  const handleMessageSeller = (listing: Listing) => {
    setSelectedListing(listing);
    setShowMessageModal(true);
  };

  const sendMessage = () => {
    if (!message.trim()) {
      Alert.alert("Empty Message", "Please enter a message");
      return;
    }

    setShowMessageModal(false);
    setMessage("");
    
    // Show confirmation
    setTimeout(() => {
      Alert.alert(
        "Message Sent ✓",
        `Your message has been sent to ${selectedListing?.seller}. They'll respond within 24 hours.`,
        [{ text: "OK" }]
      );
    }, 300);
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
        {/* My Listings Section */}
        {userListings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>My Listings ({userListings.length})</Text>
            {filteredListings
              .filter(l => l.isUserListing)
              .map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  isPreordered={false}
                  onPreorder={() => {}}
                  onMessage={() => {}}
                  isUserListing
                />
              ))}
          </>
        )}

        <Text style={styles.sectionTitle}>
          {userListings.length > 0 ? "Marketplace" : "Available Listings"}
        </Text>

        {filteredListings
          .filter(l => !l.isUserListing)
          .map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isPreordered={isPreordered(listing.id)}
              onPreorder={() => handlePreorder(listing)}
              onMessage={() => handleMessageSeller(listing)}
            />
          ))}
      </ScrollView>

      {/* Message Seller Modal */}
      <Modal visible={showMessageModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setShowMessageModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Message {selectedListing?.seller}</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.listingPreview}>
              <Text style={styles.previewCrop}>{selectedListing?.crop}</Text>
              <Text style={styles.previewDetails}>
                {selectedListing?.quantity} • {selectedListing?.price}
              </Text>
            </View>

            <TextInput
              style={styles.messageInput}
              placeholder="Type your message here..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Text style={styles.sendButtonText}>Send Message</Text>
              <Ionicons name="send" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// Separate ListingCard component for cleaner code
const ListingCard = ({
  listing,
  isPreordered,
  onPreorder,
  onMessage,
  isUserListing = false,
}: {
  listing: Listing;
  isPreordered: boolean;
  onPreorder: () => void;
  onMessage: () => void;
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
        <Text style={styles.detailText}>Available {listing.availableDate}</Text>
      </View>
    </View>

    <View style={styles.listingFooter}>
      <Text style={styles.price}>{listing.price}</Text>
      {!isUserListing && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.preOrderButton, isPreordered && styles.preOrderButtonPressed]}
            onPress={onPreorder}
            disabled={isPreordered}
          >
            <Text style={styles.preOrderText}>
              {isPreordered ? "Pre-ordered ✓" : "Pre-Order"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.messageButton} onPress={onMessage}>
            <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
    marginTop: 8,
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
  actionButtons: {
    flexDirection: "row",
    gap: 8,
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
  messageButton: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  listingPreview: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewCrop: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  previewDetails: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
    minHeight: 100,
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: "#2d5016",
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default MarketplaceScreen;
