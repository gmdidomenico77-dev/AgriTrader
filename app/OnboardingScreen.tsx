import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserProfile } from '../components/UserProfileContext';

interface OnboardingScreenProps {
  onComplete: (profileData: UserProfile) => void;
}

interface UserProfile {
  displayName: string;
  location: string;
  farmName: string;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState<UserProfile>({
    displayName: '',
    location: '',
    farmName: '',
  });
  const { updateProfile } = useUserProfile();

  const steps = [
    {
      title: 'Welcome to AgriTrader!',
      subtitle: 'Let\'s set up your profile',
      icon: 'person-outline',
    },
    {
      title: 'Your Display Name',
      subtitle: 'How should other farmers see you?',
      icon: 'person-circle-outline',
    },
    {
      title: 'Your Location',
      subtitle: 'Where is your farm located?',
      icon: 'location-outline',
    },
    {
      title: 'Farm Name',
      subtitle: 'What do you call your farm?',
      icon: 'leaf-outline',
    },
  ];

  const handleNext = async () => {
    if (currentStep === 1 && !profileData.displayName.trim()) {
      Alert.alert('Required Field', 'Please enter your display name');
      return;
    }
    if (currentStep === 2 && !profileData.location.trim()) {
      Alert.alert('Required Field', 'Please enter your location');
      return;
    }
    if (currentStep === 3 && !profileData.farmName.trim()) {
      Alert.alert('Required Field', 'Please enter your farm name');
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save profile data to Firestore
      const success = await updateProfile({
        ...profileData,
        createdAt: new Date(),
      });
      
      if (success) {
        onComplete(profileData);
      } else {
        Alert.alert('Error', 'Failed to save profile. Please try again.');
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="leaf" size={80} color="#2d5016" />
            </View>
            <Text style={styles.welcomeText}>
              AgriTrader connects farmers, buyers, and agricultural professionals 
              in a powerful marketplace with AI-powered price forecasting.
            </Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="trending-up" size={20} color="#2d5016" />
                <Text style={styles.featureText}>Real-time price forecasting</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="storefront" size={20} color="#2d5016" />
                <Text style={styles.featureText}>Direct marketplace trading</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="cloudy" size={20} color="#2d5016" />
                <Text style={styles.featureText}>Weather alerts & insights</Text>
              </View>
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your display name"
                value={profileData.displayName}
                onChangeText={(value) => handleInputChange('displayName', value)}
                autoFocus
              />
            </View>
            <Text style={styles.helpText}>
              This is how other farmers will see you in the marketplace
            </Text>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Erie, PA"
                value={profileData.location}
                onChangeText={(value) => handleInputChange('location', value)}
                autoFocus
              />
            </View>
            <Text style={styles.helpText}>
              Your location helps us show you relevant local market data
            </Text>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={styles.inputContainer}>
              <Ionicons name="leaf-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Green Valley Farm"
                value={profileData.farmName}
                onChangeText={(value) => handleInputChange('farmName', value)}
                autoFocus
              />
            </View>
            <Text style={styles.helpText}>
              Your farm name will appear on your listings and profile
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentStep + 1) / steps.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.stepCounter}>
            Step {currentStep + 1} of {steps.length}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.stepHeader}>
            <View style={styles.stepIcon}>
              <Ionicons 
                name={steps[currentStep].icon as keyof typeof Ionicons.glyphMap} 
                size={40} 
                color="#2d5016" 
              />
            </View>
            <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
          </View>

          {renderStepContent()}
        </View>

        <View style={styles.footer}>
          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="chevron-back" size={20} color="#6b7280" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2d5016',
    borderRadius: 2,
  },
  stepCounter: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  stepIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
  },
  welcomeIcon: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 30,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 16,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  nextButton: {
    backgroundColor: '#2d5016',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default OnboardingScreen;
