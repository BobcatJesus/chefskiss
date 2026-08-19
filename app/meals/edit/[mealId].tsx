import { useEffect, useState } from 'react';

import * as DocumentPicker from 'expo-document-picker';
import { Link, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
    getMealById,
    getOwnMealPublishReadiness,
    updateMeal,
    type MealPublishReadiness,
} from '@/features/meals/api';
import { getCurrentUser } from '@/features/profiles/api';
import { isUuid, normalizeRouteParam } from '@/lib/routeParams';
import { uploadMealPhoto } from '@/services/storage/uploadMealPhoto';

export default function EditMealScreen() {
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const normalizedMealId = normalizeRouteParam(mealId);
  const hasValidMealId = isUuid(normalizedMealId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [serviceType, setServiceType] = useState<'prepared_meals' | 'meal_prep' | 'in_home_chef'>('prepared_meals');
  const [ingredientModel, setIngredientModel] = useState<'cook_provides' | 'customer_provides' | 'customer_chooses'>('cook_provides');
  const [offersPickup, setOffersPickup] = useState(true);
  const [offersCookDelivery, setOffersCookDelivery] = useState(false);
  const [mealPhotoUrl, setMealPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishReadiness, setPublishReadiness] = useState<MealPublishReadiness | null>(null);
  const [isReadinessLoading, setIsReadinessLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeal() {
      if (!normalizedMealId) {
        setErrorMessage('Meal id is missing from this route.');
        setIsLoading(false);
        return;
      }

      if (!hasValidMealId) {
        setErrorMessage('This meal link is invalid. Open your menu and choose a meal to edit.');
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage(null);
        const meal = await getMealById(normalizedMealId);
        setTitle(meal.title);
        setDescription(meal.description);
        setPrice((meal.price_cents / 100).toFixed(2));
        setQuantity(String(meal.quantity_available));
        setMealPhotoUrl(meal.photo_url || null);
        setServiceType(meal.service_type);
        setIngredientModel(meal.ingredient_model);
        setOffersPickup(meal.offers_pickup);
        setOffersCookDelivery(meal.offers_cook_delivery);
        setIsPublished(meal.is_published);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load meal.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadMeal();
  }, [hasValidMealId, normalizedMealId]);

  useEffect(() => {
    async function loadReadiness() {
      try {
        setIsReadinessLoading(true);
        const readiness = await getOwnMealPublishReadiness();
        setPublishReadiness(readiness);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to check publish readiness.');
      } finally {
        setIsReadinessLoading(false);
      }
    }

    void loadReadiness();
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [successMessage]);

  async function handlePickMealPhoto() {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsUploadingPhoto(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const user = await getCurrentUser();
      const uploadedUrl = await uploadMealPhoto({
        userId: user.id,
        uri: asset.uri,
        name: asset.name || `${title || 'meal'}-photo`,
        mimeType: asset.mimeType,
        webFile: (asset as any).file || null,
      });

      setMealPhotoUrl(uploadedUrl);
      setSuccessMessage('Meal photo uploaded. Save meal to apply it.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload meal photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleSave(nextPublished = isPublished) {
    if (!normalizedMealId) {
      setErrorMessage('Meal id is missing from this route.');
      return;
    }

    if (!hasValidMealId) {
      setErrorMessage('This meal link is invalid. Open your menu and choose a valid meal.');
      return;
    }

    const priceValue = Number(price);
    const quantityValue = Number(quantity);

    if (!title.trim()) {
      setErrorMessage('Meal title is required.');
      return;
    }

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setErrorMessage('Price must be greater than 0.');
      return;
    }

    if (!Number.isInteger(quantityValue) || quantityValue < 0) {
      setErrorMessage('Quantity must be a whole number 0 or greater.');
      return;
    }

    if (!offersPickup && !offersCookDelivery) {
      setErrorMessage('Select at least one fulfillment option.');
      return;
    }

    if (isUploadingPhoto) {
      setErrorMessage('Please wait for the meal photo upload to finish.');
      return;
    }

    if (nextPublished && publishReadiness && !publishReadiness.is_ready) {
      setErrorMessage(`Cannot publish yet. Missing: ${publishReadiness.missing_requirements.join(', ')}`);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);
    setIsPublished(nextPublished);

    try {
      await updateMeal(normalizedMealId, {
        serviceType,
        ingredientModel,
        offersPickup,
        offersCookDelivery,
        offersPlatformDelivery: false,
        title,
        description,
        photoUrl: mealPhotoUrl,
        priceCents: Math.round(priceValue * 100),
        quantityAvailable: quantityValue,
        isPublished: nextPublished,
      });

      setSuccessMessage(nextPublished ? 'Saved and published to world feed.' : 'Saved as draft.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save meal.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Edit meal</Text>
      <Text style={styles.subtitle}>Meal ID: {mealId}</Text>

      {isLoading ? <Text style={styles.helper}>Loading meal...</Text> : null}

      {!isLoading ? (
        <>
          {errorMessage && !hasValidMealId ? (
            <>
              <Text style={styles.error}>{errorMessage}</Text>
              <Link href="/(cook)/meals" style={styles.link}>Open my menu</Link>
              <Link href="/meals/create" style={styles.link}>Create a new meal</Link>
            </>
          ) : null}

          {!errorMessage || hasValidMealId ? (
            <>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Meal title"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            placeholderTextColor="#6b7280"
            multiline
            style={[styles.input, styles.multilineInput]}
          />

          <Text style={styles.sectionLabel}>Meal photo</Text>
          <View style={styles.photoCard}>
            {mealPhotoUrl ? <Image source={{ uri: mealPhotoUrl }} style={styles.photoPreview} /> : null}
            <Pressable onPress={() => void handlePickMealPhoto()} style={styles.photoButton} disabled={isUploadingPhoto || isSaving}>
              <Text style={styles.photoButtonLabel}>
                {isUploadingPhoto ? 'Uploading photo...' : mealPhotoUrl ? 'Replace photo' : 'Upload photo'}
              </Text>
            </Pressable>
            {!isUploadingPhoto && !mealPhotoUrl ? <Text style={styles.photoHint}>Choose a JPG/PNG image for this meal.</Text> : null}
            {mealPhotoUrl ? <Text style={styles.photoSuccess}>Photo ready. Save meal to keep it.</Text> : null}
            {mealPhotoUrl ? (
              <Pressable onPress={() => setMealPhotoUrl(null)} style={styles.photoRemoveButton}>
                <Text style={styles.photoRemoveButtonLabel}>Remove photo</Text>
              </Pressable>
            ) : null}
          </View>

          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="Price (USD)"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />

          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            placeholder="Quantity available"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>Service type</Text>
          <View style={styles.optionRow}>
            {([
              ['prepared_meals', 'Prepared Meals'],
              ['meal_prep', 'Meal Prep'],
              ['in_home_chef', 'In-Home Chef'],
            ] as const).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setServiceType(value)}
                style={[styles.chip, serviceType === value ? styles.chipActive : null]}
              >
                <Text style={[styles.chipLabel, serviceType === value ? styles.chipLabelActive : null]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Ingredient model</Text>
          <View style={styles.optionRow}>
            {([
              ['cook_provides', 'Cook provides'],
              ['customer_provides', 'Customer provides'],
              ['customer_chooses', 'Customer chooses'],
            ] as const).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setIngredientModel(value)}
                style={[styles.chip, ingredientModel === value ? styles.chipActive : null]}
              >
                <Text style={[styles.chipLabel, ingredientModel === value ? styles.chipLabelActive : null]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Fulfillment offered</Text>
          <View style={styles.optionRow}>
            <Pressable onPress={() => setOffersPickup((v) => !v)} style={[styles.chip, offersPickup ? styles.chipActive : null]}>
              <Text style={[styles.chipLabel, offersPickup ? styles.chipLabelActive : null]}>Pickup</Text>
            </Pressable>
            <Pressable
              onPress={() => setOffersCookDelivery((v) => !v)}
              style={[styles.chip, offersCookDelivery ? styles.chipActive : null]}
            >
              <Text style={[styles.chipLabel, offersCookDelivery ? styles.chipLabelActive : null]}>Cook delivery</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              if (!isPublished && publishReadiness && !publishReadiness.is_ready) {
                setErrorMessage(`Cannot publish yet. Missing: ${publishReadiness.missing_requirements.join(', ')}`);
                return;
              }

              setIsPublished((current) => !current);
            }}
            style={[styles.toggleButton, isPublished ? styles.toggleButtonOn : styles.toggleButtonOff]}
          >
            <Text style={styles.toggleLabel}>Publish to world feed</Text>
            <Text style={styles.toggleValue}>{isPublished ? 'ON' : 'OFF'}</Text>
          </Pressable>

          <View style={styles.readinessCard}>
            <Text style={styles.readinessTitle}>Publish readiness</Text>
            {isReadinessLoading ? <Text style={styles.readinessHelper}>Checking compliance requirements...</Text> : null}
            {!isReadinessLoading && publishReadiness?.is_ready ? (
              <Text style={styles.readinessReady}>Ready to publish.</Text>
            ) : null}
            {!isReadinessLoading && publishReadiness && !publishReadiness.is_ready ? (
              <>
                <Text style={styles.readinessBlocked}>Publishing is blocked until these are complete:</Text>
                {publishReadiness.missing_requirements.map((item) => (
                  <Text key={item} style={styles.readinessItem}>- {item}</Text>
                ))}
              </>
            ) : null}
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

          <Pressable disabled={isSaving} onPress={() => void handleSave()} style={styles.button}>
            <Text style={styles.buttonLabel}>{isSaving ? 'Saving...' : 'Save meal'}</Text>
          </Pressable>

          <Pressable
            disabled={isSaving}
            onPress={() => handleSave(!isPublished)}
            style={[styles.secondaryButton, isPublished ? styles.unpublishButton : styles.publishButton]}
          >
            <Text style={styles.secondaryButtonLabel}>
              {isSaving ? 'Saving...' : isPublished ? 'Unpublish from world feed' : 'Publish to world feed'}
            </Text>
          </Pressable>

          <Link href="/(customer)/discover" style={styles.link}>
            Open world feed
          </Link>
            </>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 24, paddingBottom: 56, gap: 10 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#4b5563', marginBottom: 8 },
  helper: { color: '#4b5563' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: '#f8fafc',
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  photoButton: {
    borderWidth: 1,
    borderColor: '#0f766e',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#ecfeff',
  },
  photoButtonLabel: {
    color: '#115e59',
    fontWeight: '700',
  },
  photoRemoveButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fef2f2',
  },
  photoRemoveButtonLabel: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  photoHint: {
    color: '#475569',
    fontSize: 13,
  },
  photoSuccess: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    marginTop: 6,
    color: '#111827',
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
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
  toggleButton: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleButtonOn: {
    borderColor: '#0f766e',
    backgroundColor: '#ccfbf1',
  },
  toggleButtonOff: {
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  toggleLabel: { fontSize: 16, color: '#111827', fontWeight: '600' },
  toggleValue: { fontSize: 14, color: '#4b5563', fontWeight: '700' },
  readinessCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    backgroundColor: '#fffbeb',
    padding: 10,
    gap: 4,
  },
  readinessTitle: { color: '#92400e', fontWeight: '800' },
  readinessHelper: { color: '#6b7280' },
  readinessReady: { color: '#166534', fontWeight: '700' },
  readinessBlocked: { color: '#b45309', fontWeight: '700' },
  readinessItem: { color: '#7c2d12' },
  error: { color: '#b91c1c' },
  success: { color: '#166534' },
  button: {
    width: '100%',
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonLabel: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    width: '100%',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  publishButton: {
    borderColor: '#0f766e',
    backgroundColor: '#ecfeff',
  },
  unpublishButton: {
    borderColor: '#b91c1c',
    backgroundColor: '#fef2f2',
  },
  secondaryButtonLabel: { color: '#111827', fontWeight: '700', fontSize: 15 },
  link: { marginTop: 10, color: '#0f766e', fontWeight: '600' },
});