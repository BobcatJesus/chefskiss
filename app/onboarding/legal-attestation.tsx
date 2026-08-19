import { useMemo, useState } from 'react';

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
    buildComplianceSuggestions,
    type ComplianceCookType,
    type ComplianceJurisdiction,
} from '@/constants/complianceGuidance';
import { updateOwnCookLegalAttestation } from '@/features/profiles/api';

const STATE_OPTIONS: Array<{ value: ComplianceJurisdiction; label: string }> = [
  { value: 'TX', label: 'Texas' },
  { value: 'CA', label: 'California' },
  { value: 'NY', label: 'New York' },
  { value: 'FL', label: 'Florida' },
  { value: 'OTHER', label: 'Other' },
];

const COOK_TYPE_OPTIONS: Array<{ value: ComplianceCookType; label: string }> = [
  { value: 'home_kitchen', label: 'Home kitchen' },
  { value: 'commercial_kitchen', label: 'Commercial kitchen' },
  { value: 'in_home_personal_chef', label: 'In-home personal chef' },
];

export default function LegalAttestationScreen() {
  const router = useRouter();
  const [jurisdiction, setJurisdiction] = useState<ComplianceJurisdiction>('TX');
  const [cookTypes, setCookTypes] = useState<ComplianceCookType[]>(['home_kitchen']);
  const [attestsCottageLaw, setAttestsCottageLaw] = useState(false);
  const [attestsLabeling, setAttestsLabeling] = useState(false);
  const [attestsSanitation, setAttestsSanitation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const guidance = useMemo(
    () => buildComplianceSuggestions({ jurisdiction, cookTypes }),
    [cookTypes, jurisdiction]
  );

  function handleToggleCookType(nextType: ComplianceCookType) {
    setCookTypes((current) => {
      if (current.includes(nextType)) {
        const trimmed = current.filter((value) => value !== nextType);
        return trimmed.length > 0 ? trimmed : current;
      }

      return [...current, nextType];
    });
  }

  async function handleSubmit() {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsSubmitting(true);
      await updateOwnCookLegalAttestation({
        attestsCottageFoodLawCompliance: attestsCottageLaw,
        attestsPackageLabelingCompliance: attestsLabeling,
        attestsKitchenSanitationStandards: attestsSanitation,
      });
      setSuccessMessage('Legal attestation submitted. You can now continue cook setup.');
      router.replace('/(cook)/profile');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit legal attestation.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Legal Attestation</Text>
      <Text style={styles.subtitle}>
        This declaration is legally binding. You must affirm all statements before publishing meals.
      </Text>

      <View style={styles.helperCard}>
        <Text style={styles.helperTitle}>Compliance assistant prototype</Text>
        <Text style={styles.helperText}>Choose your likely operating state and model to see suggested legal prep steps.</Text>

        <Text style={styles.sectionLabel}>Operating state</Text>
        <View style={styles.chipRow}>
          {STATE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setJurisdiction(option.value)}
              style={[styles.chip, jurisdiction === option.value ? styles.chipActive : null]}
            >
              <Text style={[styles.chipLabel, jurisdiction === option.value ? styles.chipLabelActive : null]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Service model</Text>
        <View style={styles.chipRow}>
          {COOK_TYPE_OPTIONS.map((option) => {
            const isSelected = cookTypes.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => handleToggleCookType(option.value)}
                style={[styles.chip, isSelected ? styles.chipActive : null]}
              >
                <Text style={[styles.chipLabel, isSelected ? styles.chipLabelActive : null]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Suggested next actions</Text>
        {guidance.map((item) => (
          <View key={item.id} style={styles.suggestionRow}>
            <Text style={[styles.badge, item.severity === 'required' ? styles.badgeRequired : styles.badgeRecommended]}>
              {item.severity === 'required' ? 'Required' : 'Recommended'}
            </Text>
            <View style={styles.suggestionTextWrap}>
              <Text style={styles.suggestionTitle}>{item.title}</Text>
              <Text style={styles.suggestionBody}>{item.detail}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.disclaimer}>Guidance is informational only and not legal advice. Always confirm local requirements.</Text>
      </View>

      <Pressable style={[styles.statementRow, attestsCottageLaw ? styles.statementRowChecked : null]} onPress={() => setAttestsCottageLaw((v) => !v)}>
        <Text style={styles.checkbox}>{attestsCottageLaw ? '☑' : '☐'}</Text>
        <Text style={styles.statementText}>I attest that I comply with applicable cottage food laws in my jurisdiction.</Text>
      </Pressable>

      <Pressable style={[styles.statementRow, attestsLabeling ? styles.statementRowChecked : null]} onPress={() => setAttestsLabeling((v) => !v)}>
        <Text style={styles.checkbox}>{attestsLabeling ? '☑' : '☐'}</Text>
        <Text style={styles.statementText}>I agree to package and label food items according to legal requirements.</Text>
      </Pressable>

      <Pressable style={[styles.statementRow, attestsSanitation ? styles.statementRowChecked : null]} onPress={() => setAttestsSanitation((v) => !v)}>
        <Text style={styles.checkbox}>{attestsSanitation ? '☑' : '☐'}</Text>
        <Text style={styles.statementText}>I acknowledge and will maintain kitchen sanitation standards required by law.</Text>
      </Pressable>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

      <Pressable style={[styles.submitButton, isSubmitting ? styles.submitButtonDisabled : null]} disabled={isSubmitting} onPress={() => void handleSubmit()}>
        <Text style={styles.submitButtonLabel}>{isSubmitting ? 'Submitting...' : 'Submit legal attestation'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffaf0',
  },
  content: {
    padding: 24,
    paddingBottom: 56,
    gap: 12,
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#475569',
    lineHeight: 20,
  },
  helperCard: {
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    padding: 12,
    gap: 8,
  },
  helperTitle: {
    color: '#0c4a6e',
    fontWeight: '800',
    fontSize: 16,
  },
  helperText: {
    color: '#155e75',
  },
  sectionLabel: {
    marginTop: 4,
    color: '#0f172a',
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  chipActive: {
    borderColor: '#0f766e',
    backgroundColor: '#ccfbf1',
  },
  chipLabel: {
    color: '#334155',
    fontWeight: '600',
  },
  chipLabelActive: {
    color: '#115e59',
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  badge: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '800',
  },
  badgeRequired: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  badgeRecommended: {
    backgroundColor: '#e0f2fe',
    color: '#075985',
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  suggestionBody: {
    color: '#334155',
    lineHeight: 18,
  },
  disclaimer: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 12,
  },
  statementRow: {
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  statementRowChecked: {
    borderColor: '#0f766e',
    backgroundColor: '#ecfeff',
  },
  checkbox: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  statementText: {
    flex: 1,
    color: '#1f2937',
    lineHeight: 20,
  },
  submitButton: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f766e',
    alignSelf: 'flex-start',
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonLabel: {
    color: '#ecfeff',
    fontWeight: '800',
  },
  error: {
    color: '#b91c1c',
  },
  success: {
    color: '#166534',
  },
});
