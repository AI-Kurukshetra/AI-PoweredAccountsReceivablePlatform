export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          company_id: string;
          created_at: string;
          details: Json;
          entity_id: string | null;
          entity_type: string;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          company_id: string;
          created_at?: string;
          details?: Json;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
      };
      companies: {
        Row: {
          base_currency: string;
          created_at: string;
          created_by: string | null;
          id: string;
          legal_name: string | null;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          base_currency?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          legal_name?: string | null;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
      };
      company_members: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_members"]["Insert"]>;
      };
      customers: {
        Row: {
          billing_address: Json;
          company_id: string;
          created_at: string;
          credit_limit: number;
          email: string | null;
          external_ref: string | null;
          id: string;
          metadata: Json;
          name: string;
          portal_access_token: string | null;
          portal_enabled: boolean;
          payment_terms_days: number;
          segment: string | null;
          updated_at: string;
        };
        Insert: {
          billing_address?: Json;
          company_id: string;
          created_at?: string;
          credit_limit?: number;
          email?: string | null;
          external_ref?: string | null;
          id?: string;
          metadata?: Json;
          name: string;
          payment_terms_days?: number;
          portal_access_token?: string | null;
          portal_enabled?: boolean;
          segment?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      documents: {
        Row: {
          bucket_path: string;
          company_id: string;
          created_at: string;
          customer_id: string | null;
          dispute_id: string | null;
          id: string;
          invoice_id: string | null;
          kind: string;
          uploaded_by: string | null;
        };
        Insert: {
          bucket_path: string;
          company_id: string;
          created_at?: string;
          customer_id?: string | null;
          dispute_id?: string | null;
          id?: string;
          invoice_id?: string | null;
          kind: string;
          uploaded_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
      };
      invoice_deliveries: {
        Row: {
          channel: string;
          company_id: string;
          confirmed_at: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          delivered_at: string | null;
          failure_reason: string | null;
          id: string;
          invoice_id: string;
          recipient: string | null;
          scheduled_for: string;
          sent_at: string | null;
          status: string;
          tracking_ref: string | null;
        };
        Insert: {
          channel: string;
          company_id: string;
          confirmed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id: string;
          delivered_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          invoice_id: string;
          recipient?: string | null;
          scheduled_for?: string;
          sent_at?: string | null;
          status?: string;
          tracking_ref?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_deliveries"]["Insert"]>;
      };
      disputes: {
        Row: {
          company_id: string;
          customer_id: string;
          description: string | null;
          id: string;
          invoice_id: string;
          opened_at: string;
          opened_by: string | null;
          resolved_at: string | null;
          status: string;
          title: string;
        };
        Insert: {
          company_id: string;
          customer_id: string;
          description?: string | null;
          id?: string;
          invoice_id: string;
          opened_at?: string;
          opened_by?: string | null;
          resolved_at?: string | null;
          status?: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["disputes"]["Insert"]>;
      };
      invoices: {
        Row: {
          balance_due: number;
          company_id: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          customer_id: string;
          delivery_channel: string | null;
          due_date: string;
          id: string;
          invoice_number: string;
          issue_date: string;
          notes: string | null;
          status: string;
          subtotal: number;
          tax_total: number;
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          balance_due?: number;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          customer_id: string;
          delivery_channel?: string | null;
          due_date: string;
          id?: string;
          invoice_number: string;
          issue_date: string;
          notes?: string | null;
          status?: string;
          subtotal?: number;
          tax_total?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };
      invoice_line_items: {
        Row: {
          description: string;
          id: string;
          invoice_id: string;
          line_total: number;
          quantity: number;
          sort_order: number;
          tax_rate: number;
          unit_price: number;
        };
        Insert: {
          description: string;
          id?: string;
          invoice_id: string;
          line_total?: number;
          quantity?: number;
          sort_order?: number;
          tax_rate?: number;
          unit_price?: number;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_line_items"]["Insert"]>;
      };
      invoice_templates: {
        Row: {
          accent_color: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          delivery_channel: string | null;
          description: string | null;
          footer_text: string | null;
          id: string;
          is_default: boolean;
          name: string;
          payment_terms_days: number;
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          delivery_channel?: string | null;
          description?: string | null;
          footer_text?: string | null;
          id?: string;
          is_default?: boolean;
          name: string;
          payment_terms_days?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_templates"]["Insert"]>;
      };
      integration_connections: {
        Row: {
          category: string;
          company_id: string;
          config: Json;
          created_at: string;
          created_by: string | null;
          health_note: string | null;
          id: string;
          last_sync_at: string | null;
          name: string;
          provider: string;
          status: string;
          updated_at: string;
          webhook_url: string | null;
        };
        Insert: {
          category: string;
          company_id: string;
          config?: Json;
          created_at?: string;
          created_by?: string | null;
          health_note?: string | null;
          id?: string;
          last_sync_at?: string | null;
          name: string;
          provider: string;
          status?: string;
          updated_at?: string;
          webhook_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["integration_connections"]["Insert"]>;
      };
      payments: {
        Row: {
          amount: number;
          channel: string;
          company_id: string;
          created_at: string;
          customer_id: string;
          external_ref: string | null;
          id: string;
          invoice_id: string | null;
          metadata: Json;
          received_at: string | null;
          status: string;
        };
        Insert: {
          amount: number;
          channel: string;
          company_id: string;
          created_at?: string;
          customer_id: string;
          external_ref?: string | null;
          id?: string;
          invoice_id?: string | null;
          metadata?: Json;
          received_at?: string | null;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      payment_gateway_accounts: {
        Row: {
          account_label: string;
          checkout_url: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          last_event_at: string | null;
          merchant_ref: string | null;
          provider: string;
          settlement_days: number;
          status: string;
          supported_channels: Json;
          updated_at: string;
          webhook_status: string;
        };
        Insert: {
          account_label: string;
          checkout_url?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          last_event_at?: string | null;
          merchant_ref?: string | null;
          provider: string;
          settlement_days?: number;
          status?: string;
          supported_channels?: Json;
          updated_at?: string;
          webhook_status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payment_gateway_accounts"]["Insert"]>;
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      recovery_snapshots: {
        Row: {
          backup_kind: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          notes: string | null;
          restore_tested_at: string | null;
          scope: string;
          snapshot_name: string;
          status: string;
          storage_ref: string;
        };
        Insert: {
          backup_kind: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          notes?: string | null;
          restore_tested_at?: string | null;
          scope: string;
          snapshot_name: string;
          status?: string;
          storage_ref: string;
        };
        Update: Partial<Database["public"]["Tables"]["recovery_snapshots"]["Insert"]>;
      };
      reminders: {
        Row: {
          channel: string;
          company_id: string;
          created_at: string;
          customer_id: string;
          id: string;
          invoice_id: string;
          scheduled_for: string;
          sent_at: string | null;
          stage: string;
          status: string;
        };
        Insert: {
          channel: string;
          company_id: string;
          created_at?: string;
          customer_id: string;
          id?: string;
          invoice_id: string;
          scheduled_for: string;
          sent_at?: string | null;
          stage: string;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reminders"]["Insert"]>;
      };
      security_controls: {
        Row: {
          category: string;
          company_id: string;
          control_name: string;
          created_at: string;
          created_by: string | null;
          framework: string;
          id: string;
          last_reviewed_at: string | null;
          next_review_due: string | null;
          notes: string | null;
          owner: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          company_id: string;
          control_name: string;
          created_at?: string;
          created_by?: string | null;
          framework: string;
          id?: string;
          last_reviewed_at?: string | null;
          next_review_due?: string | null;
          notes?: string | null;
          owner?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["security_controls"]["Insert"]>;
      };
    };
  };
};
