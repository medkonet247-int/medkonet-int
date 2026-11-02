export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_allowlist: {
        Row: {
          created_at: string
          email: string
          granted_by: string | null
          is_protected: boolean
        }
        Insert: {
          created_at?: string
          email: string
          granted_by?: string | null
          is_protected?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          granted_by?: string | null
          is_protected?: boolean
        }
        Relationships: []
      }
      applications: {
        Row: {
          application_status: Database["public"]["Enums"]["application_status"]
          course: string
          current_level: string
          email: string
          full_name: string
          id: string
          reason_for_joining: string
          reviewed_at: string | null
          reviewed_by: string | null
          state: string
          submitted_at: string
          university: string
          university_id: string | null
          university_type: Database["public"]["Enums"]["university_type"]
          user_id: string
          whatsapp_number: string
        }
        Insert: {
          application_status?: Database["public"]["Enums"]["application_status"]
          course: string
          current_level: string
          email: string
          full_name: string
          id?: string
          reason_for_joining: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state: string
          submitted_at?: string
          university: string
          university_id?: string | null
          university_type: Database["public"]["Enums"]["university_type"]
          user_id: string
          whatsapp_number: string
        }
        Update: {
          application_status?: Database["public"]["Enums"]["application_status"]
          course?: string
          current_level?: string
          email?: string
          full_name?: string
          id?: string
          reason_for_joining?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          submitted_at?: string
          university?: string
          university_id?: string | null
          university_type?: Database["public"]["Enums"]["university_type"]
          user_id?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
        }
        Relationships: []
      }
      content_items: {
        Row: {
          created_at: string
          description: string
          details: Json
          file_path: string | null
          id: string
          kind: string
          published: boolean
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          details?: Json
          file_path?: string | null
          id?: string
          kind: string
          published?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          details?: Json
          file_path?: string | null
          id?: string
          kind?: string
          published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_pages: {
        Row: {
          intro: string
          sections: Json
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          intro: string
          sections?: Json
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          intro?: string
          sections?: Json
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      membership_management: {
        Row: {
          application_id: string
          invited_at: string | null
          invited_by: string | null
          onboarded_at: string | null
          onboarded_by: string | null
          rejection_reason: string
        }
        Insert: {
          application_id: string
          invited_at?: string | null
          invited_by?: string | null
          onboarded_at?: string | null
          onboarded_by?: string | null
          rejection_reason?: string
        }
        Update: {
          application_id?: string
          invited_at?: string | null
          invited_by?: string | null
          onboarded_at?: string | null
          onboarded_by?: string | null
          rejection_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_management_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_settings: {
        Row: {
          id: boolean
          invitation_template: string
          registration_open: boolean
          representative_programme_active: boolean
          show_whatsapp_to_members: boolean
          updated_at: string
          updated_by: string | null
          whatsapp_link: string
        }
        Insert: {
          id?: boolean
          invitation_template?: string
          registration_open?: boolean
          representative_programme_active?: boolean
          show_whatsapp_to_members?: boolean
          updated_at?: string
          updated_by?: string | null
          whatsapp_link?: string
        }
        Update: {
          id?: boolean
          invitation_template?: string
          registration_open?: boolean
          representative_programme_active?: boolean
          show_whatsapp_to_members?: boolean
          updated_at?: string
          updated_by?: string | null
          whatsapp_link?: string
        }
        Relationships: []
      }
      pending_registrations: {
        Row: {
          created_at: string
          data: Json
          email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          email: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          email?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      rate_events: {
        Row: {
          created_at: string
          id: number
          key: string
          kind: string
        }
        Insert: {
          created_at?: string
          id?: number
          key: string
          kind: string
        }
        Update: {
          created_at?: string
          id?: number
          key?: string
          kind?: string
        }
        Relationships: []
      }
      representative_allowlist: {
        Row: {
          created_at: string
          email: string
          granted_at: string
          granted_by: string | null
          id: string
          notes: string
          show_on_directory: boolean
          status: string
          status_changed_at: string
          university_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string
          show_on_directory?: boolean
          status?: string
          status_changed_at?: string
          university_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string
          show_on_directory?: boolean
          status?: string
          status_changed_at?: string
          university_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representative_allowlist_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_announcements: {
        Row: {
          admin_note: string
          created_at: string
          created_by: string
          id: string
          message: string
          published_item_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          university_id: string
          updated_at: string
        }
        Insert: {
          admin_note?: string
          created_at?: string
          created_by: string
          id?: string
          message: string
          published_item_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          university_id: string
          updated_at?: string
        }
        Update: {
          admin_note?: string
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          published_item_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          university_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "representative_announcements_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_assignments: {
        Row: {
          application_id: string
          assigned_at: string | null
          created_at: string
          id: string
          notes: string
          status: string
          university_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          application_id: string
          assigned_at?: string | null
          created_at?: string
          id?: string
          notes?: string
          status?: string
          university_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          application_id?: string
          assigned_at?: string | null
          created_at?: string
          id?: string
          notes?: string
          status?: string
          university_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representative_assignments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_assignments_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_reports: {
        Row: {
          admin_note: string
          category: string
          created_at: string
          created_by: string
          id: string
          message: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          university_id: string
          updated_at: string
        }
        Insert: {
          admin_note?: string
          category: string
          created_at?: string
          created_by: string
          id?: string
          message: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          university_id: string
          updated_at?: string
        }
        Update: {
          admin_note?: string
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          university_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "representative_reports_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_categories: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      site_text: {
        Row: {
          current_value: string
          default_value: string
          key: string
          label: string
          last_edited_at: string | null
          last_edited_by: string | null
          last_editor_name: string | null
          max_length: number
          page: string
          previous_value: string | null
          route: string
          section: string
          visibility: string
        }
        Insert: {
          current_value: string
          default_value: string
          key: string
          label: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          last_editor_name?: string | null
          max_length?: number
          page: string
          previous_value?: string | null
          route: string
          section?: string
          visibility?: string
        }
        Update: {
          current_value?: string
          default_value?: string
          key?: string
          label?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          last_editor_name?: string | null
          max_length?: number
          page?: string
          previous_value?: string | null
          route?: string
          section?: string
          visibility?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          location: string
          name: string
          state: string
          university_type: Database["public"]["Enums"]["university_type"]
          updated_at: string
          updated_by: string | null
          verification_status: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          location: string
          name: string
          state: string
          university_type: Database["public"]["Enums"]["university_type"]
          updated_at?: string
          updated_by?: string | null
          verification_status?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string
          name?: string
          state?: string
          university_type?: Database["public"]["Enums"]["university_type"]
          updated_at?: string
          updated_by?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invalidated_at: string | null
          request_ip: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invalidated_at?: string | null
          request_ip?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          request_ip?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_membership_summary: { Args: never; Returns: Json }
      approved_whatsapp_link: { Args: never; Returns: string }
      auth_user_status: {
        Args: { _email: string }
        Returns: {
          confirmed: boolean
          user_id: string
        }[]
      }
      can_read_academic_content: { Args: never; Returns: boolean }
      complete_registration: {
        Args: { _dev_mode: boolean; _user_id: string }
        Returns: string
      }
      directory_universities: {
        Args: {
          _active?: string
          _page?: number
          _q?: string
          _state?: string
          _type?: string
          _verification?: string
        }
        Returns: Json
      }
      edit_site_text: {
        Args: { _expected: string; _key: string; _value: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_representative: { Args: { _user_id: string }; Returns: boolean }
      is_active_representative_of: {
        Args: { _university_id: string; _user_id: string }
        Returns: boolean
      }
      is_approved_member: { Args: { _user_id: string }; Returns: boolean }
      manage_membership: {
        Args: { _action: string; _data?: Json; _target?: string }
        Returns: undefined
      }
      match_university: {
        Args: { _new?: Json; _typed: string; _university_id?: string }
        Returns: number
      }
      member_onboarding_status: { Args: never; Returns: boolean }
      membership_reports: {
        Args: { _from?: string; _period?: string; _to?: string }
        Returns: Json
      }
      registration_is_open: { Args: never; Returns: boolean }
      representative_allowlist_admin: { Args: never; Returns: Json }
      representative_context: { Args: never; Returns: Json }
      representative_directory: { Args: never; Returns: Json }
      representative_programme_on: { Args: never; Returns: boolean }
      representative_review_proposal: {
        Args: {
          _action: string
          _id: string
          _message?: string
          _national?: boolean
          _note?: string
          _title?: string
        }
        Returns: string
      }
      representative_update_report: {
        Args: { _id: string; _note?: string; _status: string }
        Returns: undefined
      }
      representative_welcome_list: { Args: never; Returns: Json }
      set_member_whatsapp_visibility: {
        Args: { _show: boolean }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      university_matching_queue: {
        Args: { _page?: number; _q?: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "member"
      application_status: "Pending" | "Approved" | "Rejected"
      university_type: "Federal" | "State" | "Private"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
      application_status: ["Pending", "Approved", "Rejected"],
      university_type: ["Federal", "State", "Private"],
    },
  },
} as const
