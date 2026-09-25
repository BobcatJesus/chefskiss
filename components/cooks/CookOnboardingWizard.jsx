import { useState } from 'react';
import { supabase } from '../../supabaseClient'; // Adjust relative path to your Supabase client

export default function CookOnboardingWizard({ userId, onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    fullLegalName: '',
    stateCode: 'TX',
    kitchenType: 'cottage',
    foodCategories: [],
    expiresAt: '',
    agreedToTerms: false,
  });
  const [file, setFile] = useState(null);

  // Available food categories
  const availableCategories = [
    { id: 'baked_goods', label: 'Baked Goods & Pastries' },
    { id: 'jams_preserves', label: 'Jams, Jellies & Preserves' },
    { id: 'dry_goods', label: 'Spices, Teas & Dry Mixes' },
    { id: 'confections', label: 'Candies & Confections' },
    { id: 'prepared_meals', label: 'Hot / Temperature-Controlled Meals' },
  ];

  const handleCategoryToggle = (id) => {
    setFormData((prev) => {
      const exists = prev.foodCategories.includes(id);
      return {
        ...prev,
        foodCategories: exists
          ? prev.foodCategories.filter((c) => c !== id)
          : [...prev.foodCategories, id],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agreedToTerms) {
      setErrorMsg('You must agree to the compliance declaration to proceed.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      let fileUrl = null;

      // 1. Upload Food Handler Card if selected
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/food_handler_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('cook-docs')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('cook-docs')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
      }

      // 2. Upsert record into Supabase 'cooks' table
      const { error: dbError } = await supabase.from('cooks').upsert(
        {
          user_id: userId,
          full_legal_name: formData.fullLegalName,
          state_code: formData.stateCode,
          kitchen_type: formData.kitchenType,
          food_categories: formData.foodCategories,
          food_handler_url: fileUrl,
          food_handler_expires_at: formData.expiresAt || null,
          agreed_to_terms: formData.agreedToTerms,
          attestation_timestamp: new Date().toISOString(),
          verification_status: 'pending',
        },
        { onConflict: 'user_id' }
      );

      if (dbError) throw dbError;

      if (onComplete) onComplete();
    } catch (err) {
      console.error('Error saving cook certification:', err);
      setErrorMsg(err.message || 'Failed to complete certification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
        <span>Cook Certification</span>
        <span>Step {step} of 3</span>
      </div>

      {errorMsg && (
        <div style={{ padding: '10px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      {/* STEP 1: Basic Info & Kitchen Type */}
      {step === 1 && (
        <div>
          <h2 style={{ marginTop: 0 }}>Kitchen & Identity Setup</h2>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Full Legal Name</label>
            <input
              type="text"
              value={formData.fullLegalName}
              onChange={(e) => setFormData({ ...formData, fullLegalName: e.target.value })}
              placeholder="e.g. Jane Doe"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Operating State</label>
            <select
              value={formData.stateCode}
              onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="TX">Texas</option>
              <option value="CA">California</option>
              <option value="NY">New York</option>
              <option value="FL">Florida</option>
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Kitchen Setup</label>
            <select
              value={formData.kitchenType}
              onChange={(e) => setFormData({ ...formData, kitchenType: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="cottage">Home Kitchen (Cottage Food Operation)</option>
              <option value="commercial">Licensed Commercial Kitchen</option>
              <option value="personal_chef">In-Home Personal Chef Services</option>
            </select>
          </div>

          <button
            type="button"
            disabled={!formData.fullLegalName.trim()}
            onClick={() => setStep(2)}
            style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            Continue to Food Safety
          </button>
        </div>
      )}

      {/* STEP 2: Categories & Document Upload */}
      {step === 2 && (
        <div>
          <h2 style={{ marginTop: 0 }}>Permit & Food Offerings</h2>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>What categories of food will you offer?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {availableCategories.map((cat) => (
              <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.foodCategories.includes(cat.id)}
                  onChange={() => handleCategoryToggle(cat.id)}
                />
                {cat.label}
              </label>
            ))}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Food Handler Permit (Upload PDF or Image)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Permit Expiration Date (Optional)</label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              style={{ flex: 2, padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              Review Declaration
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Legal Declaration & Submission */}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <h2 style={{ marginTop: 0 }}>Compliance Declaration</h2>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', color: '#475569', marginBottom: '16px', lineHeight: '1.4' }}>
            <p style={{ marginTop: 0 }}>By completing registration, I certify under penalty of account termination that:</p>
            <ol style={{ paddingLeft: '18px', margin: 0 }}>
              <li>All items offered comply with my state and local food preparation laws (including Cottage Food regulations or Commercial Kitchen licensing).</li>
              <li>I maintain a clean, sanitary food preparation environment.</li>
              <li>I will accurately disclose major food allergens on product packaging and listings.</li>
              <li>I assume sole responsibility for food quality and preparation safety.</li>
            </ol>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', marginBottom: '20px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.agreedToTerms}
              onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
              style={{ marginTop: '2px' }}
            />
            I acknowledge and agree to the compliance declaration above.
          </label>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={loading}
              style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !formData.agreedToTerms}
              style={{ flex: 2, padding: '12px', backgroundColor: loading ? '#93c5fd' : '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              {loading ? 'Saving...' : 'Submit Certification'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}