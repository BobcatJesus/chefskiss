export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          city: string | null;
          is_cook: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          city?: string | null;
          is_cook?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          city?: string | null;
          is_cook?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cook_profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          full_legal_name: string | null;
          phone_number: string | null;
          physical_address: string | null;
          cook_types: Database['public']['Enums']['cook_type'][];
          food_handler_permit_url: string | null;
          food_handler_permit_expires_on: string | null;
          food_handler_permit_number: string | null;
          attests_cottage_food_law_compliance: boolean;
          attests_package_labeling_compliance: boolean;
          attests_kitchen_sanitation_standards: boolean;
          legal_attested_at: string | null;
          public_menu_slug: string;
          bio: string;
          city: string;
          cuisines: string[];
          fulfillment_modes: Database['public']['Enums']['fulfillment_mode'][];
          food_safety_badge: string | null;
          identity_verified: boolean;
          rating_average: number;
          rating_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          full_legal_name?: string | null;
          phone_number?: string | null;
          physical_address?: string | null;
          cook_types?: Database['public']['Enums']['cook_type'][];
          public_menu_slug?: string;
          bio?: string;
          city: string;
          cuisines?: string[];
          fulfillment_modes?: Database['public']['Enums']['fulfillment_mode'][];
          food_safety_badge?: string | null;
          identity_verified?: boolean;
          rating_average?: number;
          rating_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          full_legal_name?: string | null;
          phone_number?: string | null;
          physical_address?: string | null;
          cook_types?: Database['public']['Enums']['cook_type'][];
          food_handler_permit_url?: string | null;
          food_handler_permit_expires_on?: string | null;
          food_handler_permit_number?: string | null;
          attests_cottage_food_law_compliance?: boolean;
          attests_package_labeling_compliance?: boolean;
          attests_kitchen_sanitation_standards?: boolean;
          legal_attested_at?: string | null;
          public_menu_slug?: string;
          bio?: string;
          city?: string;
          cuisines?: string[];
          fulfillment_modes?: Database['public']['Enums']['fulfillment_mode'][];
          food_safety_badge?: string | null;
          identity_verified?: boolean;
          rating_average?: number;
          rating_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meals: {
        Row: {
          id: string;
          cook_profile_id: string;
          service_type: Database['public']['Enums']['service_type'];
          ingredient_model: Database['public']['Enums']['ingredient_model'];
          offers_pickup: boolean;
          offers_cook_delivery: boolean;
          offers_platform_delivery: boolean;
          title: string;
          description: string;
          price_cents: number;
          photo_url: string | null;
          quantity_available: number;
          preorder_notice_hours: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cook_profile_id: string;
          service_type?: Database['public']['Enums']['service_type'];
          ingredient_model?: Database['public']['Enums']['ingredient_model'];
          offers_pickup?: boolean;
          offers_cook_delivery?: boolean;
          offers_platform_delivery?: boolean;
          title: string;
          description?: string;
          price_cents: number;
          photo_url?: string | null;
          quantity_available?: number;
          preorder_notice_hours?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cook_profile_id?: string;
          service_type?: Database['public']['Enums']['service_type'];
          ingredient_model?: Database['public']['Enums']['ingredient_model'];
          offers_pickup?: boolean;
          offers_cook_delivery?: boolean;
          offers_platform_delivery?: boolean;
          title?: string;
          description?: string;
          price_cents?: number;
          photo_url?: string | null;
          quantity_available?: number;
          preorder_notice_hours?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      availability_slots: {
        Row: {
          id: string;
          cook_profile_id: string;
          start_at: string;
          end_at: string;
          order_cutoff_at: string;
          fulfillment_modes: Database['public']['Enums']['fulfillment_mode'][];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cook_profile_id: string;
          start_at: string;
          end_at: string;
          order_cutoff_at: string;
          fulfillment_modes?: Database['public']['Enums']['fulfillment_mode'][];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cook_profile_id?: string;
          start_at?: string;
          end_at?: string;
          order_cutoff_at?: string;
          fulfillment_modes?: Database['public']['Enums']['fulfillment_mode'][];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          customer_user_id: string;
          cook_profile_id: string;
          meal_id: string;
          availability_slot_id: string | null;
          quantity: number;
          fulfillment_mode: Database['public']['Enums']['fulfillment_mode'];
          ingredient_model: Database['public']['Enums']['ingredient_model'];
          status: Database['public']['Enums']['order_status'];
          scheduled_for: string;
          subtotal_cents: number;
          service_fee_cents: number;
          total_cents: number;
          special_instructions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_user_id: string;
          cook_profile_id: string;
          meal_id: string;
          availability_slot_id?: string | null;
          quantity: number;
          fulfillment_mode: Database['public']['Enums']['fulfillment_mode'];
          ingredient_model?: Database['public']['Enums']['ingredient_model'];
          status?: Database['public']['Enums']['order_status'];
          scheduled_for: string;
          subtotal_cents?: number;
          service_fee_cents?: number;
          total_cents?: number;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_user_id?: string;
          cook_profile_id?: string;
          meal_id?: string;
          availability_slot_id?: string | null;
          quantity?: number;
          fulfillment_mode?: Database['public']['Enums']['fulfillment_mode'];
          ingredient_model?: Database['public']['Enums']['ingredient_model'];
          status?: Database['public']['Enums']['order_status'];
          scheduled_for?: string;
          subtotal_cents?: number;
          service_fee_cents?: number;
          total_cents?: number;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          cook_profile_id: string;
          customer_user_id: string;
          rating: number;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          cook_profile_id: string;
          customer_user_id: string;
          rating: number;
          body?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          cook_profile_id?: string;
          customer_user_id?: string;
          rating?: number;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      cook_follows: {
        Row: {
          id: string;
          cook_profile_id: string;
          customer_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cook_profile_id: string;
          customer_user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cook_profile_id?: string;
          customer_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      follow_offer_events: {
        Row: {
          id: string;
          customer_user_id: string;
          cook_profile_id: string;
          meal_id: string;
          event_type: string;
          seen_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_user_id: string;
          cook_profile_id: string;
          meal_id: string;
          event_type?: string;
          seen_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_user_id?: string;
          cook_profile_id?: string;
          meal_id?: string;
          event_type?: string;
          seen_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      menu_events: {
        Row: {
          id: string;
          cook_profile_id: string;
          meal_id: string | null;
          meal_title: string | null;
          source_slug: string | null;
          event_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cook_profile_id: string;
          meal_id?: string | null;
          meal_title?: string | null;
          source_slug?: string | null;
          event_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cook_profile_id?: string;
          meal_id?: string | null;
          meal_title?: string | null;
          source_slug?: string | null;
          event_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      cook_trust_metrics: {
        Row: {
          cook_profile_id: string;
          total_completed_orders: number;
          repeat_customer_rate: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      fulfillment_mode: 'pickup' | 'cook_delivery';
      order_status: 'pending' | 'accepted' | 'declined' | 'ready' | 'completed' | 'canceled';
      service_type: 'prepared_meals' | 'meal_prep' | 'in_home_chef';
      ingredient_model: 'cook_provides' | 'customer_provides' | 'customer_chooses';
      cook_type: 'home_kitchen' | 'commercial_kitchen' | 'in_home_personal_chef';
    };
    CompositeTypes: Record<string, never>;
  };
};
