import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { geocodingService, LocationCandidate } from '../lib/geocodingService';

interface LocationAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Fires only when the user picks a row from the dropdown — this is the validation step. */
  onSelect: (candidate: LocationCandidate) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 350;
const MIN_CHARS = 2;

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChangeText,
  onSelect,
  placeholder = 'Start typing your city, e.g. Erie',
  autoFocus,
}) => {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<LocationCandidate[]>([]);
  const [searched, setSearched] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const runSearch = (query: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const trimmed = query.trim();
    if (trimmed.length < MIN_CHARS) {
      setCandidates([]);
      setSearched(false);
      setLoading(false);
      setOpen(false);
      return;
    }

    setLoading(true);
    setOpen(true);
    debounceTimer.current = setTimeout(async () => {
      const seq = ++requestSeq.current;
      const results = await geocodingService.searchLocations(trimmed);
      if (seq !== requestSeq.current) return; // a newer keystroke superseded this request
      setCandidates(results);
      setSearched(true);
      setLoading(false);
    }, DEBOUNCE_MS);
  };

  const handleChangeText = (text: string) => {
    onChangeText(text);
    runSearch(text);
  };

  const handlePick = (candidate: LocationCandidate) => {
    onChangeText(candidate.label);
    onSelect(candidate);
    setOpen(false);
    setCandidates([]);
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.inputContainer, focused && styles.inputContainerFocused]}>
        <Ionicons
          name="location-outline"
          size={20}
          color={focused ? colors.green : colors.text3}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.text4}
          value={value}
          onChangeText={handleChangeText}
          onFocus={() => {
            setFocused(true);
            if (candidates.length > 0 || value.trim().length >= MIN_CHARS) setOpen(true);
          }}
          onBlur={() => {
            setFocused(false);
            // Small delay so a row tap registers before the dropdown unmounts.
            setTimeout(() => setOpen(false), 150);
          }}
          autoFocus={autoFocus}
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={colors.green} style={styles.spinner} />}
      </View>

      {open && (
        <View style={styles.dropdown}>
          {loading && candidates.length === 0 && (
            <View style={styles.dropdownRow}>
              <Text style={styles.mutedText}>Searching…</Text>
            </View>
          )}

          {!loading && searched && candidates.length === 0 && (
            <View style={styles.dropdownRow}>
              <Text style={styles.mutedText}>No matching US city found — try a different spelling</Text>
            </View>
          )}

          {candidates.map((candidate) => (
            <TouchableOpacity
              key={candidate.id}
              style={styles.dropdownRow}
              activeOpacity={0.7}
              onPress={() => handlePick(candidate)}
            >
              <View style={styles.dropdownRowText}>
                <Text style={styles.candidateLabel}>{candidate.label}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  candidate.isPA ? styles.badgePa : styles.badgeRegional,
                ]}
              >
                <Text style={[styles.badgeText, candidate.isPA ? styles.badgeTextPa : styles.badgeTextRegional]}>
                  {candidate.isPA ? 'Full local pricing' : 'Regional estimate'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputContainerFocused: {
    borderColor: colors.green,
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text1,
    paddingVertical: 16,
  },
  spinner: {
    marginLeft: 8,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 260,
    overflow: 'hidden',
    zIndex: 20,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 8,
  },
  dropdownRowText: {
    flex: 1,
  },
  candidateLabel: {
    fontSize: 15,
    color: colors.text1,
    fontWeight: '500',
  },
  mutedText: {
    fontSize: 14,
    color: colors.text3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgePa: {
    backgroundColor: colors.greenMuted,
    borderColor: colors.greenBorder,
  },
  badgeRegional: {
    backgroundColor: colors.amberMuted,
    borderColor: colors.amberBorder,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextPa: {
    color: colors.greenLight,
  },
  badgeTextRegional: {
    color: colors.amber,
  },
});

export default LocationAutocomplete;
