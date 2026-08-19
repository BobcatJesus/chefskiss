import React, { useState, useEffect } from 'react';
import CookOnboardingWizard from './cooks/CookOnboardingWizard'; // Adjust relative path as needed
import { supabase } from '../supabaseClient'; // Adjust path to your Supabase client

export default function BecomeACook() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch current authenticated session
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getSession();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Loading onboarding portal...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '24px', textAlign: 'center', fontFamily: 'sans-serif', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <h2>Sign In Required</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          You need to be logged in to apply for a cook profile and complete kitchen certification.
        </p>
        <button 
          onClick={() => window.location.href = '/login'}
          style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 16px', minHeight: '80vh', backgroundColor: '#f8fafc' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '8px', color: '#0f172a' }}>Become a Kitchen Host</h1>
        <p style={{ color: '#475569', fontSize: '1rem', margin: 0 }}>
          Complete your kitchen certification below to start offering meals on the platform.
        </p>
      </div>

      <CookOnboardingWizard 
        userId={user.id} 
        onComplete={() => {
          // Redirect cook after successful onboarding
          alert('Certification submitted successfully!');
          window.location.href = '/dashboard'; // Replace with your cook dashboard or profile route
        }} 
      />
    </div>
  );