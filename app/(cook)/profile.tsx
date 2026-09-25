import { useCallback, useEffect, useMemo, useState } from 'react';

import * as DocumentPicker from 'expo-document-picker';
import * as ExpoLinking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
    buildComplianceSuggestions,
    type ComplianceJurisdiction,
} from '@/constants/complianceGuidance';
import {
    checkOwnCookPublicMenuSlugAvailability,
    getOwnCookProfile,
    getOwnMenuAnalytics,
    updateOwnCookPublicMenuSlug,
    updateOwnCookRequiredProfileInfo,
    uploadOwnFoodHandlerPermit,
    type CookType,
    type MenuAnalyticsRange,
    type MenuAnalyticsSnapshot,
    type OwnCookProfileRecord,
} from '@/features/profiles/api';

type SlugStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'current';

const COOK_TYPE_OPTIONS: Array<{ value: CookType; label: string; description: string }> = [
  { value: 'in_home_personal_chef', label: "Private chef at the customer's home", description: 'You travel to the customer and cook in their kitchen.' },
  { value: 'commercial_kitchen', label: 'Meals from a commercial kitchen', description: 'You prepare meals in a licensed or shared professional kitchen.' },
  { value: 'home_kitchen', label: 'Meals from my home kitchen', description: 'You cook at home for pickup or an offered delivery service.' },
  { value: 'hosted_home_dining', label: 'Host guests in my home', description: 'Customers come to your home for a hosted meal or food experience.' },
];

const STATE_OPTIONS: Array<{ value: ComplianceJurisdiction; label: string }> = [
  { value: 'TX', label: 'Texas' },
  { value: 'CA', label: 'California' },
  { value: 'NY', label: 'New York' },
  { value: 'FL', label: 'Florida' },
  { value: 'OTHER', label: 'Other' },
];

export default function CookProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<OwnCookProfileRecord | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [fullLegalName, setFullLegalName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [cookTypes, setCookTypes] = useState<CookType[]>([]);
  const [foodHandlerPermitUrl, setFoodHandlerPermitUrl] = useState('');
  const [foodHandlerPermitExpiresOn, setFoodHandlerPermitExpiresOn] = useState('');
  const [foodHandlerPermitNumber, setFoodHandlerPermitNumber] = useState('');
  const [jurisdiction, setJurisdiction] = useState<ComplianceJurisdiction>('TX');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRequiredInfo, setIsSavingRequiredInfo] = useState(false);
  const [isUploadingPermit, setIsUploadingPermit] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [normalizedSlug, setNormalizedSlug] = useState('');
  const [analytics, setAnalytics] = useState<MenuAnalyticsSnapshot | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [analyticsRange, setAnalyticsRange] = useState<MenuAnalyticsRange>('7d');

  const loadProfile = useCallback(async () => {
    try {
      setErrorMessage(null);
      const row = await getOwnCookProfile();
      setProfile(row);
      setSlugInput(row.public_menu_slug);
      setFullLegalName(row.full_legal_name || '');
      setPhoneNumber(row.phone_number || '');
      setPhysicalAddress(row.physical_address || '');
      setCookTypes(row.cook_types);
      setFoodHandlerPermitUrl(row.food_handler_permit_url || '');
      setFoodHandlerPermitExpiresOn(row.food_handler_permit_expires_on || '');
      setFoodHandlerPermitNumber(row.food_handler_permit_number || '');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load cook profile.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setIsAnalyticsLoading(true);
      const snapshot = await getOwnMenuAnalytics(analyticsRange);
      setAnalytics(snapshot);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load analytics.');
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, [analyticsRange]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      setIsAnalyticsLoading(true);
      void loadProfile();
      void loadAnalytics();
    }, [loadProfile])
  );

  useEffect(() => {
    if (!profile) {
      return;
    }

    void loadAnalytics();
  }, [analyticsRange, loadAnalytics, profile]);

  const previewPath = useMemo(() => {
    if (!slugInput.trim()) {
      return '/m/your-menu-slug';
    }

    return `/m/${normalizeSlugInput(slugInput)}`;
  }, [slugInput]);

  useEffect(() => {
    if (!profile) {
      setSlugStatus('idle');
      setNormalizedSlug('');
      return;
    }

    const nextNormalized = normalizeSlugInput(slugInput);
    setNormalizedSlug(nextNormalized);

    if (nextNormalized === profile.public_menu_slug) {
      setSlugStatus('current');
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const availability = await checkOwnCookPublicMenuSlugAvailability(nextNormalized);
          if (availability.is_current) {
            setSlugStatus('current');
            return;
          }

          setSlugStatus(availability.is_available ? 'available' : 'unavailable');
        } catch {
          setSlugStatus('idle');
        }
      })();
    }, 350);

    return () => clearTimeout(timer);
  }, [profile, slugInput]);

  const previewUrl = useMemo(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${previewPath}`;
    }

    return ExpoLinking.createURL(previewPath);
  }, [previewPath]);

  const slugSuggestions = useMemo(() => {
    if (!profile || slugStatus !== 'unavailable') {
      return [] as string[];
    }

    const base = normalizeSlugInput(slugInput);
    const cityToken = profile.city ? normalizeSlugInput(profile.city).split('-')[0] : 'local';
    const yearToken = String(new Date().getFullYear());

    const candidates = [
      `${base}-${cityToken}`,
      `${base}-${yearToken}`,
      `${base}-${cityToken}-${yearToken}`,
      `${base}-kitchen`,
    ];

    return Array.from(new Set(candidates.map((value) => normalizeSlugInput(value)).filter((value) => value && value !== normalizedSlug))).slice(0, 3);
  }, [normalizedSlug, profile, slugInput, slugStatus]);

  const slugSuffixPresets = useMemo(() => {
    const base = normalizedSlug || normalizeSlugInput(slugInput) || normalizeSlugInput(profile?.display_name || 'cook');
    return ['kitchen', 'meals', 'chef', 'table'].map((suffix) => `${base}-${suffix}`);
  }, [normalizedSlug, profile?.display_name, slugInput]);

  const complianceSuggestions = useMemo(
    () => buildComplianceSuggestions({ jurisdiction, cookTypes }),
    [cookTypes, jurisdiction]
  );

  async function handleSaveSlug() {
    if (slugStatus === 'unavailable') {
      setErrorMessage('That menu slug is already taken. Try another one.');
      return;
    }

    if (slugStatus === 'checking') {
      setErrorMessage('Checking slug availability. Please wait a moment.');
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsSaving(true);
      const updated = await updateOwnCookPublicMenuSlug(normalizeSlugInput(slugInput));
      setProfile(updated);
      setSlugInput(updated.public_menu_slug);
      setNormalizedSlug(updated.public_menu_slug);
      setSlugStatus('current');
      setSuccessMessage('Menu short link updated.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update menu short link.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveRequiredInfo() {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsSavingRequiredInfo(true);
      const updated = await updateOwnCookRequiredProfileInfo({
        fullLegalName,
        phoneNumber,
        physicalAddress,
        cookTypes,
        foodHandlerPermitUrl,
        foodHandlerPermitExpiresOn,
        foodHandlerPermitNumber,
      });
      setProfile(updated);
      setFullLegalName(updated.full_legal_name || '');
      setPhoneNumber(updated.phone_number || '');
      setPhysicalAddress(updated.physical_address || '');
      setCookTypes(updated.cook_types);
      setFoodHandlerPermitUrl(updated.food_handler_permit_url || '');
      setFoodHandlerPermitExpiresOn(updated.food_handler_permit_expires_on || '');
      setFoodHandlerPermitNumber(updated.food_handler_permit_number || '');
      setSuccessMessage('Cook identity and contact details saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save required cook profile info.');
    } finally {
      setIsSavingRequiredInfo(false);
    }
  }

  function handleToggleCookType(nextType: CookType) {
    setCookTypes((current) => {
      if (current.includes(nextType)) {
        return current.filter((value) => value !== nextType);
      }

      return [...current, nextType];
    });
  }

  async function handlePickFoodHandlerPermit() {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsUploadingPermit(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const uploadedUrl = await uploadOwnFoodHandlerPermit({
        uri: asset.uri,
        name: asset.name || 'food-handler-permit',
        mimeType: asset.mimeType,
        webFile: (asset as any).file || null,
      });

      setFoodHandlerPermitUrl(uploadedUrl);
      setSuccessMessage('Food handler permit uploaded. Save required info to apply changes.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload food handler permit.');
    } finally {
      setIsUploadingPermit(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Chef account</Text>
      <Text style={styles.subtitle}>Shape your kitchen profile, menu link, and readiness to publish.</Text>

      {profile ? (
        <View style={styles.identitySummary}>
          <Text style={styles.kitchenName}>{profile.display_name}</Text>
          <Text style={styles.identityLocation}>{profile.city || 'Add your city'} · {profile.is_active ? 'Visible to customers' : 'Hidden from customers'}</Text>
          <Text style={styles.identityBio}>{profile.bio || 'Add a short story about your food and kitchen.'}</Text>
          <Pressable onPress={() => router.push('/(cook)/meals')} style={styles.identityAction}>
            <Text style={styles.identityActionLabel}>Open My Menu</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Required cook profile info</Text>
        <Text style={styles.helper}>These details are used for compliance and support, not public listing copy.</Text>
        <Text style={styles.helper}>
          Legal attestation: {profile?.legal_attested_at ? 'Completed' : 'Pending'}
        </Text>
        <Pressable onPress={() => router.push('/onboarding/legal-attestation')}>
          <Text style={styles.link}>Open legal attestation</Text>
        </Pressable>

        <View style={styles.complianceCard}>
          <Text style={styles.complianceTitle}>Compliance helper</Text>
          <Text style={styles.helper}>Suggestions based on your state and cook type selection.</Text>

          <Text style={styles.label}>Operating state</Text>
          <View style={styles.optionRow}>
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

          {complianceSuggestions.map((item) => (
            <View key={item.id} style={styles.complianceRow}>
              <Text style={[styles.complianceBadge, item.severity === 'required' ? styles.complianceBadgeRequired : styles.complianceBadgeRecommended]}>
                {item.severity === 'required' ? 'Required' : 'Recommended'}
              </Text>
              <View style={styles.complianceTextWrap}>
                <Text style={styles.complianceItemTitle}>{item.title}</Text>
                <Text style={styles.complianceItemText}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.label}>Full legal name</Text>
        <TextInput
          value={fullLegalName}
          onChangeText={setFullLegalName}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="First Last"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Text style={styles.label}>Phone number</Text>
        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="phone-pad"
          placeholder="(555) 123-4567"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Text style={styles.label}>Physical address</Text>
        <TextInput
          value={physicalAddress}
          onChangeText={setPhysicalAddress}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Street, City, State, ZIP"
          placeholderTextColor="#94a3b8"
          multiline
          style={[styles.input, styles.addressInput]}
        />

        <Text style={styles.label}>How do you want to serve customers?</Text>
        <Text style={styles.helper}>Choose every offering you plan to provide. These options shape your compliance checklist and customer-facing profile.</Text>
        <View style={styles.optionRow}>
          {COOK_TYPE_OPTIONS.map((option) => {
            const isSelected = cookTypes.includes(option.value);

            return (
              <Pressable
                key={option.value}
                onPress={() => handleToggleCookType(option.value)}
                style={[styles.chip, isSelected ? styles.chipActive : null]}
              >
                <Text style={[styles.chipLabel, isSelected ? styles.chipLabelActive : null]}>{option.label}</Text>
                <Text style={[styles.optionDescription, isSelected ? styles.optionDescriptionActive : null]}>{option.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Food handler permit (required)</Text>
        <Pressable
          onPress={() => void handlePickFoodHandlerPermit()}
          disabled={isUploadingPermit || isSavingRequiredInfo || isLoading}
          style={[styles.secondaryButton, isUploadingPermit || isSavingRequiredInfo || isLoading ? styles.saveButtonDisabled : null]}
        >
          <Text style={styles.secondaryButtonLabel}>{isUploadingPermit ? 'Uploading permit...' : 'Upload food handler permit'}</Text>
        </Pressable>
        {foodHandlerPermitUrl ? <Text style={styles.uploadedValue}>Uploaded: {foodHandlerPermitUrl}</Text> : <Text style={styles.helper}>PDF or image accepted.</Text>}

        <Text style={styles.label}>Permit expiration date (required)</Text>
        <TextInput
          value={foodHandlerPermitExpiresOn}
          onChangeText={setFoodHandlerPermitExpiresOn}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Text style={styles.label}>License or permit number (optional)</Text>
        <TextInput
          value={foodHandlerPermitNumber}
          onChangeText={setFoodHandlerPermitNumber}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Permit number"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Pressable
          onPress={() => void handleSaveRequiredInfo()}
          disabled={isSavingRequiredInfo || isLoading}
          style={[styles.saveButton, isSavingRequiredInfo || isLoading ? styles.saveButtonDisabled : null]}
        >
          <Text style={styles.saveButtonLabel}>{isSavingRequiredInfo ? 'Saving...' : 'Save required info'}</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Public menu slug</Text>
      <TextInput
        value={slugInput}
        onChangeText={setSlugInput}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="your-kitchen-name"
        placeholderTextColor="#94a3b8"
        style={styles.input}
      />
      <Text style={styles.helper}>Allowed characters will be normalized to lowercase letters, numbers, and dashes.</Text>
      <Text style={[styles.slugStatus, slugStatusStyle(slugStatus)]}>{slugStatusLabel(slugStatus, normalizedSlug)}</Text>
      <View style={styles.presetsWrap}>
        <Text style={styles.presetsLabel}>Brand suffix ideas:</Text>
        <View style={styles.suggestionsRow}>
          {slugSuffixPresets.map((suggestion) => (
            <Pressable key={suggestion} style={styles.suggestionChip} onPress={() => setSlugInput(suggestion)}>
              <Text style={styles.suggestionChipText}>/m/{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {slugSuggestions.length > 0 ? (
        <View style={styles.suggestionsWrap}>
          <Text style={styles.suggestionsLabel}>Try one of these:</Text>
          <View style={styles.suggestionsRow}>
            {slugSuggestions.map((suggestion) => (
              <Pressable key={suggestion} style={styles.suggestionChip} onPress={() => setSlugInput(suggestion)}>
                <Text style={styles.suggestionChipText}>/m/{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={styles.previewLabel}>Your share link</Text>
      <Text style={styles.previewUrl} selectable>{previewUrl}</Text>

      <Pressable
        onPress={() => void handleSaveSlug()}
        disabled={isSaving || isLoading || slugStatus === 'checking' || slugStatus === 'unavailable'}
        style={[styles.saveButton, isSaving || isLoading || slugStatus === 'checking' || slugStatus === 'unavailable' ? styles.saveButtonDisabled : null]}
      >
        <Text style={styles.saveButtonLabel}>{isSaving ? 'Saving...' : 'Save short link'}</Text>
      </Pressable>

      {profile ? (
        <Pressable onPress={() => router.push(`/m/${profile.public_menu_slug}` as any)}>
          <Text style={styles.link}>Open public short link</Text>
        </Pressable>
      ) : null}

      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>Menu performance</Text>
        <View style={styles.rangeRow}>
          {(['7d', '30d', 'all'] as MenuAnalyticsRange[]).map((range) => (
            <Pressable
              key={range}
              style={[styles.rangeChip, analyticsRange === range ? styles.rangeChipActive : null]}
              onPress={() => setAnalyticsRange(range)}
            >
              <Text style={[styles.rangeChipLabel, analyticsRange === range ? styles.rangeChipLabelActive : null]}>
                {range === '7d' ? '7d' : range === '30d' ? '30d' : 'All time'}
              </Text>
            </Pressable>
          ))}
        </View>
        {isAnalyticsLoading ? <Text style={styles.helper}>Loading analytics...</Text> : null}
        {analytics ? (
          <>
            <Text style={styles.analyticsStat}>Period: {analytics.range_label}</Text>
            <Text style={styles.analyticsStat}>Total menu views: {analytics.total_menu_views}</Text>
            <Text style={styles.analyticsStat}>Direct menu views: {analytics.direct_menu_views}</Text>
            <Text style={styles.analyticsStat}>Total short-link visits: {analytics.total_short_link_visits}</Text>
            <Text style={styles.analyticsStat}>Dish clicks: {analytics.total_dish_clicks}</Text>
            <Text style={styles.analyticsStat}>Checkout starts: {analytics.total_checkout_starts}</Text>
            <Text style={styles.analyticsStat}>
              Funnel (click {'>'} checkout): {(analytics.dish_click_to_checkout_rate * 100).toFixed(1)}%
            </Text>
            <Text style={styles.analyticsStat}>
              Funnel (view {'>'} checkout): {(analytics.menu_view_to_checkout_rate * 100).toFixed(1)}%
            </Text>
            <Text style={styles.analyticsStat}>
              Top clicked dish: {analytics.top_viewed_dish_title ? `${analytics.top_viewed_dish_title} (${analytics.top_viewed_dish_clicks})` : 'No dish clicks yet'}
            </Text>
          </>
        ) : null}
      </View>

      {isLoading ? <Text style={styles.helper}>Loading profile...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf0' },
  content: { padding: 24, paddingBottom: 56 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 8, color: '#475569' },
  kitchenName: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '700',
    color: '#92400e',
  },
  identitySummary: {
    width: '100%',
    maxWidth: 720,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfded6',
    backgroundColor: '#e6f4ef',
  },
  identityLocation: { marginTop: 5, color: '#286052', fontSize: 13, fontWeight: '700' },
  identityBio: { marginTop: 8, color: '#475569', lineHeight: 20 },
  identityAction: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: '#17332f',
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  identityActionLabel: { color: '#f5f7f2', fontWeight: '800', fontSize: 13 },
  label: {
    marginTop: 14,
    color: '#0f172a',
    fontWeight: '700',
  },
  card: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    padding: 12,
  },
  cardTitle: {
    color: '#92400e',
    fontSize: 16,
    fontWeight: '800',
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
  },
  addressInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  optionRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    minWidth: 220,
    maxWidth: 420,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  chipActive: {
    borderColor: '#0f766e',
    backgroundColor: '#ccfbf1',
  },
  chipLabel: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: 13,
  },
  chipLabelActive: {
    color: '#115e59',
  },
  optionDescription: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
  },
  optionDescriptionActive: {
    color: '#286052',
  },
  complianceCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    padding: 10,
    gap: 6,
  },
  complianceTitle: {
    color: '#075985',
    fontWeight: '800',
    fontSize: 15,
  },
  complianceRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  complianceBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '800',
  },
  complianceBadgeRequired: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  complianceBadgeRecommended: {
    backgroundColor: '#e0f2fe',
    color: '#075985',
  },
  complianceTextWrap: {
    flex: 1,
  },
  complianceItemTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  complianceItemText: {
    color: '#334155',
    lineHeight: 18,
  },
  helper: {
    marginTop: 8,
    color: '#475569',
  },
  slugStatus: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionsWrap: {
    marginTop: 8,
  },
  presetsWrap: {
    marginTop: 8,
  },
  presetsLabel: {
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 6,
  },
  suggestionsLabel: {
    color: '#7f1d1d',
    fontWeight: '700',
    marginBottom: 6,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    borderRadius: 999,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionChipText: {
    color: '#9f1239',
    fontWeight: '700',
    fontSize: 12,
  },
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  rangeChip: {
    borderRadius: 999,
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rangeChipActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  rangeChipLabel: {
    color: '#075985',
    fontWeight: '700',
    fontSize: 12,
  },
  rangeChipLabelActive: {
    color: '#ecfeff',
  },
  previewLabel: {
    marginTop: 12,
    color: '#0f172a',
    fontWeight: '700',
  },
  previewUrl: {
    marginTop: 6,
    color: '#1d4ed8',
    fontWeight: '700',
  },
  saveButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#0f766e',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonLabel: {
    color: '#ecfeff',
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#0f766e',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonLabel: {
    color: '#0f766e',
    fontWeight: '800',
  },
  uploadedValue: {
    marginTop: 8,
    color: '#1d4ed8',
    fontSize: 12,
  },
  link: {
    marginTop: 10,
    color: '#0f766e',
    fontWeight: '700',
  },
  analyticsCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    padding: 12,
    gap: 6,
  },
  analyticsTitle: {
    color: '#075985',
    fontSize: 16,
    fontWeight: '800',
  },
  analyticsStat: {
    color: '#0f172a',
    fontWeight: '700',
  },
  error: { marginTop: 10, color: '#b91c1c' },
  success: { marginTop: 10, color: '#166534' },
});

function normalizeSlugInput(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'cook';
}

function slugStatusLabel(status: SlugStatus, normalized: string) {
  if (status === 'checking') {
    return 'Checking availability...';
  }

  if (status === 'available') {
    return `Available: /m/${normalized}`;
  }

  if (status === 'unavailable') {
    return `Taken: /m/${normalized}`;
  }

  if (status === 'current') {
    return `Current slug: /m/${normalized}`;
  }

  return 'Enter a slug to check availability.';
}

function slugStatusStyle(status: SlugStatus) {
  if (status === 'available' || status === 'current') {
    return { color: '#166534' };
  }

  if (status === 'unavailable') {
    return { color: '#b91c1c' };
  }

  return { color: '#475569' };
}