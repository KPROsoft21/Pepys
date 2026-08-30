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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_denials: {
        Row: {
          blocked_count: number
          created_at: string
          cutoff: string
          id: string
          interaction_id: string | null
          reason: string
          requested: string
          subject_id: string
        }
        Insert: {
          blocked_count?: number
          created_at?: string
          cutoff: string
          id?: string
          interaction_id?: string | null
          reason: string
          requested: string
          subject_id: string
        }
        Update: {
          blocked_count?: number
          created_at?: string
          cutoff?: string
          id?: string
          interaction_id?: string | null
          reason?: string
          requested?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_denials_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_denials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      belief_history: {
        Row: {
          belief_id: string
          change_reason: string
          confidence_after: number
          confidence_before: number | null
          conversation_id: string | null
          created_at: string
          evidence: string | null
          id: string
          stance_after: string
          stance_before: string | null
          subject_id: string
        }
        Insert: {
          belief_id: string
          change_reason: string
          confidence_after: number
          confidence_before?: number | null
          conversation_id?: string | null
          created_at?: string
          evidence?: string | null
          id?: string
          stance_after: string
          stance_before?: string | null
          subject_id: string
        }
        Update: {
          belief_id?: string
          change_reason?: string
          confidence_after?: number
          confidence_before?: number | null
          conversation_id?: string | null
          created_at?: string
          evidence?: string | null
          id?: string
          stance_after?: string
          stance_before?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "belief_history_belief_id_fkey"
            columns: ["belief_id"]
            isOneToOne: false
            referencedRelation: "beliefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "belief_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "belief_history_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      beliefs: {
        Row: {
          confidence: number
          contradiction_status: string
          counter_memory_ids: string[]
          created_at: string
          emotional_salience: number
          fork_id: string | null
          id: string
          origin: string
          post_cutoff: boolean
          proposition: string
          provenance: string | null
          stability: number
          stance: string
          subject_id: string
          supporting_memory_ids: string[]
          updated_at: string
        }
        Insert: {
          confidence?: number
          contradiction_status?: string
          counter_memory_ids?: string[]
          created_at?: string
          emotional_salience?: number
          fork_id?: string | null
          id?: string
          origin?: string
          post_cutoff?: boolean
          proposition: string
          provenance?: string | null
          stability?: number
          stance: string
          subject_id: string
          supporting_memory_ids?: string[]
          updated_at?: string
        }
        Update: {
          confidence?: number
          contradiction_status?: string
          counter_memory_ids?: string[]
          created_at?: string
          emotional_salience?: number
          fork_id?: string | null
          id?: string
          origin?: string
          post_cutoff?: boolean
          proposition?: string
          provenance?: string | null
          stability?: number
          stance?: string
          subject_id?: string
          supporting_memory_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beliefs_fork_id_fkey"
            columns: ["fork_id"]
            isOneToOne: false
            referencedRelation: "forks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beliefs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          category: string
          confidence: number
          created_at: string
          explanation: string | null
          first_exposure_at: string | null
          first_known_at: string | null
          fork_id: string | null
          id: string
          name: string
          owner_visitor_key: string | null
          post_cutoff: boolean
          related_concept_ids: string[]
          status: string
          subject_id: string
          taught_by: string | null
          understanding: string | null
          visibility: string
        }
        Insert: {
          category?: string
          confidence?: number
          created_at?: string
          explanation?: string | null
          first_exposure_at?: string | null
          first_known_at?: string | null
          fork_id?: string | null
          id?: string
          name: string
          owner_visitor_key?: string | null
          post_cutoff?: boolean
          related_concept_ids?: string[]
          status?: string
          subject_id: string
          taught_by?: string | null
          understanding?: string | null
          visibility?: string
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          explanation?: string | null
          first_exposure_at?: string | null
          first_known_at?: string | null
          fork_id?: string | null
          id?: string
          name?: string
          owner_visitor_key?: string | null
          post_cutoff?: boolean
          related_concept_ids?: string[]
          status?: string
          subject_id?: string
          taught_by?: string | null
          understanding?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts_fork_id_fkey"
            columns: ["fork_id"]
            isOneToOne: false
            referencedRelation: "forks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concepts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      contradictions: {
        Row: {
          conversation_id: string | null
          created_at: string
          held_belief_id: string | null
          held_memory_id: string | null
          held_proposition: string
          id: string
          new_claim: string
          resolution: string | null
          status: string
          strength: number
          subject_id: string
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          held_belief_id?: string | null
          held_memory_id?: string | null
          held_proposition: string
          id?: string
          new_claim: string
          resolution?: string | null
          status?: string
          strength?: number
          subject_id: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          held_belief_id?: string | null
          held_memory_id?: string | null
          held_proposition?: string
          id?: string
          new_claim?: string
          resolution?: string | null
          status?: string
          strength?: number
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contradictions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_held_belief_id_fkey"
            columns: ["held_belief_id"]
            isOneToOne: false
            referencedRelation: "beliefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_held_memory_id_fkey"
            columns: ["held_memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          subject_id: string
          user_label: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject_id: string
          user_label?: string
        }
        Update: {
          created_at?: string
          id?: string
          subject_id?: string
          user_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      curiosity_questions: {
        Row: {
          answer: string | null
          answered: boolean
          answered_at: string | null
          asked: boolean
          asked_at: string | null
          conversation_id: string | null
          created_at: string
          curiosity_id: string
          depth: number
          expected_information_gain: number
          gap_addressed: string
          grounded_in: string | null
          id: string
          parent_question_id: string | null
          question: string
          rank: number
          resulting_memory_id: string | null
          subject_id: string
        }
        Insert: {
          answer?: string | null
          answered?: boolean
          answered_at?: string | null
          asked?: boolean
          asked_at?: string | null
          conversation_id?: string | null
          created_at?: string
          curiosity_id: string
          depth?: number
          expected_information_gain?: number
          gap_addressed: string
          grounded_in?: string | null
          id?: string
          parent_question_id?: string | null
          question: string
          rank?: number
          resulting_memory_id?: string | null
          subject_id: string
        }
        Update: {
          answer?: string | null
          answered?: boolean
          answered_at?: string | null
          asked?: boolean
          asked_at?: string | null
          conversation_id?: string | null
          created_at?: string
          curiosity_id?: string
          depth?: number
          expected_information_gain?: number
          gap_addressed?: string
          grounded_in?: string | null
          id?: string
          parent_question_id?: string | null
          question?: string
          rank?: number
          resulting_memory_id?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curiosity_questions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curiosity_questions_curiosity_id_fkey"
            columns: ["curiosity_id"]
            isOneToOne: false
            referencedRelation: "curiosity_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curiosity_questions_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "curiosity_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curiosity_questions_resulting_memory_id_fkey"
            columns: ["resulting_memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curiosity_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      curiosity_states: {
        Row: {
          contradiction_strength: number
          created_at: string
          curiosity_strength: number
          decay_rate: number
          emotional_salience: number
          existing_associations: string[]
          exploration_count: number
          fork_id: string | null
          goal_relevance: number
          id: string
          knowledge_gap: number
          last_explored: string | null
          novelty: number
          personal_relevance: number
          questions_answered: number
          questions_generated: number
          relevance_basis: string | null
          resolved: boolean
          subject_id: string
          surprise: number
          target_id: string | null
          target_label: string
          target_type: string
          uncertainty: number
          updated_at: string
        }
        Insert: {
          contradiction_strength?: number
          created_at?: string
          curiosity_strength?: number
          decay_rate?: number
          emotional_salience?: number
          existing_associations?: string[]
          exploration_count?: number
          fork_id?: string | null
          goal_relevance?: number
          id?: string
          knowledge_gap?: number
          last_explored?: string | null
          novelty?: number
          personal_relevance?: number
          questions_answered?: number
          questions_generated?: number
          relevance_basis?: string | null
          resolved?: boolean
          subject_id: string
          surprise?: number
          target_id?: string | null
          target_label: string
          target_type?: string
          uncertainty?: number
          updated_at?: string
        }
        Update: {
          contradiction_strength?: number
          created_at?: string
          curiosity_strength?: number
          decay_rate?: number
          emotional_salience?: number
          existing_associations?: string[]
          exploration_count?: number
          fork_id?: string | null
          goal_relevance?: number
          id?: string
          knowledge_gap?: number
          last_explored?: string | null
          novelty?: number
          personal_relevance?: number
          questions_answered?: number
          questions_generated?: number
          relevance_basis?: string | null
          resolved?: boolean
          subject_id?: string
          surprise?: number
          target_id?: string | null
          target_label?: string
          target_type?: string
          uncertainty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curiosity_states_fork_id_fkey"
            columns: ["fork_id"]
            isOneToOne: false
            referencedRelation: "forks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curiosity_states_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          date_label: string
          embedding: string
          entry_date: string
          entry_id: string
          id: string
          model_version: string
          search_tsv: unknown
          subject_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          date_label: string
          embedding: string
          entry_date: string
          entry_id: string
          id?: string
          model_version?: string
          search_tsv?: unknown
          subject_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          date_label?: string
          embedding?: string
          entry_date?: string
          entry_id?: string
          id?: string
          model_version?: string
          search_tsv?: unknown
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_chunks_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_chunks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          char_count: number
          corpus_version: string
          created_at: string
          date_label: string
          derived: boolean
          entry_date: string
          id: string
          original_text: string
          search_tsv: unknown
          source_id: string | null
          subject_id: string
        }
        Insert: {
          char_count?: number
          corpus_version?: string
          created_at?: string
          date_label: string
          derived?: boolean
          entry_date: string
          id?: string
          original_text: string
          search_tsv?: unknown
          source_id?: string | null
          subject_id: string
        }
        Update: {
          char_count?: number
          corpus_version?: string
          created_at?: string
          date_label?: string
          derived?: boolean
          entry_date?: string
          id?: string
          original_text?: string
          search_tsv?: unknown
          source_id?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      emotional_states: {
        Row: {
          conversation_id: string | null
          created_at: string
          dimensions: Json
          id: string
          subject_id: string
          trigger: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          dimensions: Json
          id?: string
          subject_id: string
          trigger?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          dimensions?: Json
          id?: string
          subject_id?: string
          trigger?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emotional_states_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emotional_states_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_runs: {
        Row: {
          completed_at: string | null
          corpus_version: string | null
          created_at: string
          cutoff: string
          fork_id: string | null
          id: string
          items: Json
          kind: string
          metrics: Json
          model_version: string | null
          notes: string | null
          prompt_version: string | null
          status: string
          subject_id: string
        }
        Insert: {
          completed_at?: string | null
          corpus_version?: string | null
          created_at?: string
          cutoff: string
          fork_id?: string | null
          id?: string
          items?: Json
          kind: string
          metrics?: Json
          model_version?: string | null
          notes?: string | null
          prompt_version?: string | null
          status?: string
          subject_id: string
        }
        Update: {
          completed_at?: string | null
          corpus_version?: string | null
          created_at?: string
          cutoff?: string
          fork_id?: string | null
          id?: string
          items?: Json
          kind?: string
          metrics?: Json
          model_version?: string | null
          notes?: string | null
          prompt_version?: string | null
          status?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_runs_fork_id_fkey"
            columns: ["fork_id"]
            isOneToOne: false
            referencedRelation: "forks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_runs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fork_events: {
        Row: {
          confidence: number
          created_at: string
          date_label: string | null
          description: string | null
          divergence: string
          fork_id: string
          id: string
          title: string
          year: number
        }
        Insert: {
          confidence?: number
          created_at?: string
          date_label?: string | null
          description?: string | null
          divergence?: string
          fork_id: string
          id?: string
          title: string
          year: number
        }
        Update: {
          confidence?: number
          created_at?: string
          date_label?: string | null
          description?: string | null
          divergence?: string
          fork_id?: string
          id?: string
          title?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fork_events_fork_id_fkey"
            columns: ["fork_id"]
            isOneToOne: false
            referencedRelation: "forks"
            referencedColumns: ["id"]
          },
        ]
      }
      forks: {
        Row: {
          condition: string | null
          confidence: number
          created_at: string
          created_by: string | null
          cutoff: string | null
          divergence_label: string | null
          divergence_year: number
          id: string
          kind: string
          label: string
          parent_state_id: string | null
          premise: string
          self_account: string | null
          status: string
          subject_id: string
          summary: string | null
        }
        Insert: {
          condition?: string | null
          confidence?: number
          created_at?: string
          created_by?: string | null
          cutoff?: string | null
          divergence_label?: string | null
          divergence_year: number
          id?: string
          kind?: string
          label: string
          parent_state_id?: string | null
          premise: string
          self_account?: string | null
          status?: string
          subject_id: string
          summary?: string | null
        }
        Update: {
          condition?: string | null
          confidence?: number
          created_at?: string
          created_by?: string | null
          cutoff?: string | null
          divergence_label?: string | null
          divergence_year?: number
          id?: string
          kind?: string
          label?: string
          parent_state_id?: string | null
          premise?: string
          self_account?: string | null
          status?: string
          subject_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forks_parent_state_id_fkey"
            columns: ["parent_state_id"]
            isOneToOne: false
            referencedRelation: "pepys_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_events: {
        Row: {
          conversation_id: string | null
          created_at: string
          from_state: string
          id: string
          reaction: string | null
          subject_id: string
          to_state: string
          trigger_quote: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          from_state: string
          id?: string
          reaction?: string | null
          subject_id: string
          to_state: string
          trigger_quote?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          from_state?: string
          id?: string
          reaction?: string | null
          subject_id?: string
          to_state?: string
          trigger_quote?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_events_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          asked_question_id: string | null
          conversation_id: string | null
          created_at: string
          cutoff: string | null
          denied_count: number
          emotional_state: Json
          id: string
          model_version: string | null
          prompt_version: string | null
          retrieved_belief_ids: string[]
          retrieved_memory_ids: string[]
          subject_id: string
          subject_response: string | null
          teaching_mode: boolean
          user_id: string | null
          user_message: string
          visitor_key: string | null
        }
        Insert: {
          asked_question_id?: string | null
          conversation_id?: string | null
          created_at?: string
          cutoff?: string | null
          denied_count?: number
          emotional_state?: Json
          id?: string
          model_version?: string | null
          prompt_version?: string | null
          retrieved_belief_ids?: string[]
          retrieved_memory_ids?: string[]
          subject_id: string
          subject_response?: string | null
          teaching_mode?: boolean
          user_id?: string | null
          user_message: string
          visitor_key?: string | null
        }
        Update: {
          asked_question_id?: string | null
          conversation_id?: string | null
          created_at?: string
          cutoff?: string | null
          denied_count?: number
          emotional_state?: Json
          id?: string
          model_version?: string | null
          prompt_version?: string | null
          retrieved_belief_ids?: string[]
          retrieved_memory_ids?: string[]
          subject_id?: string
          subject_response?: string | null
          teaching_mode?: boolean
          user_id?: string | null
          user_message?: string
          visitor_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_asked_question_id_fkey"
            columns: ["asked_question_id"]
            isOneToOne: false
            referencedRelation: "curiosity_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      leakage_events: {
        Row: {
          created_at: string
          cutoff: string
          detected_concept: string
          detector: string
          id: string
          interaction_id: string | null
          model_version: string | null
          prompt: string
          response: string
          reviewed: boolean
          severity: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          cutoff: string
          detected_concept: string
          detector?: string
          id?: string
          interaction_id?: string | null
          model_version?: string | null
          prompt: string
          response: string
          reviewed?: boolean
          severity?: string
          subject_id: string
        }
        Update: {
          created_at?: string
          cutoff?: string
          detected_concept?: string
          detector?: string
          id?: string
          interaction_id?: string | null
          model_version?: string | null
          prompt?: string
          response?: string
          reviewed?: boolean
          severity?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leakage_events_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leakage_events_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_log: {
        Row: {
          confidence: number | null
          conversation_id: string | null
          created_at: string
          id: string
          kind: string
          state_after: string | null
          state_before: string | null
          subject_id: string
          summary: string
        }
        Insert: {
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          kind: string
          state_after?: string | null
          state_before?: string | null
          subject_id: string
          summary: string
        }
        Update: {
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          state_after?: string | null
          state_before?: string | null
          subject_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_log_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      life_events: {
        Row: {
          created_at: string
          date_label: string | null
          description: string | null
          diary_entry_id: string | null
          event_date: string | null
          id: string
          salience: number
          source_label: string | null
          subject_id: string
          title: string
          year: number
        }
        Insert: {
          created_at?: string
          date_label?: string | null
          description?: string | null
          diary_entry_id?: string | null
          event_date?: string | null
          id?: string
          salience?: number
          source_label?: string | null
          subject_id: string
          title: string
          year: number
        }
        Update: {
          created_at?: string
          date_label?: string | null
          description?: string | null
          diary_entry_id?: string | null
          event_date?: string | null
          id?: string
          salience?: number
          source_label?: string | null
          subject_id?: string
          title?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "life_events_diary_entry_id_fkey"
            columns: ["diary_entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_events_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          certainty: number
          confidence: number
          content: string
          contradicted_by: string | null
          conversation_id: string | null
          created_at: string
          decay_rate: number
          diary_entry_id: string | null
          emotional_salience: number
          event_date_end: string | null
          event_date_start: string | null
          firsthand: boolean
          fork_id: string | null
          id: string
          immutable_historical: boolean
          impact: string | null
          importance: number
          last_recalled_at: string | null
          learned_label: string | null
          memory_type: string
          owner_user_id: string | null
          owner_visitor_key: string | null
          people_ids: string[]
          post_cutoff: boolean
          recall_count: number
          scope: string
          sought_via_question_id: string | null
          source_date: string | null
          source_label: string | null
          source_type: string
          strength: number
          subject_id: string
          supersedes: string | null
          title: string
          visibility: string
        }
        Insert: {
          certainty?: number
          confidence?: number
          content: string
          contradicted_by?: string | null
          conversation_id?: string | null
          created_at?: string
          decay_rate?: number
          diary_entry_id?: string | null
          emotional_salience?: number
          event_date_end?: string | null
          event_date_start?: string | null
          firsthand?: boolean
          fork_id?: string | null
          id?: string
          immutable_historical?: boolean
          impact?: string | null
          importance?: number
          last_recalled_at?: string | null
          learned_label?: string | null
          memory_type?: string
          owner_user_id?: string | null
          owner_visitor_key?: string | null
          people_ids?: string[]
          post_cutoff?: boolean
          recall_count?: number
          scope?: string
          sought_via_question_id?: string | null
          source_date?: string | null
          source_label?: string | null
          source_type?: string
          strength?: number
          subject_id: string
          supersedes?: string | null
          title: string
          visibility?: string
        }
        Update: {
          certainty?: number
          confidence?: number
          content?: string
          contradicted_by?: string | null
          conversation_id?: string | null
          created_at?: string
          decay_rate?: number
          diary_entry_id?: string | null
          emotional_salience?: number
          event_date_end?: string | null
          event_date_start?: string | null
          firsthand?: boolean
          fork_id?: string | null
          id?: string
          immutable_historical?: boolean
          impact?: string | null
          importance?: number
          last_recalled_at?: string | null
          learned_label?: string | null
          memory_type?: string
          owner_user_id?: string | null
          owner_visitor_key?: string | null
          people_ids?: string[]
          post_cutoff?: boolean
          recall_count?: number
          scope?: string
          sought_via_question_id?: string | null
          source_date?: string | null
          source_label?: string | null
          source_type?: string
          strength?: number
          subject_id?: string
          supersedes?: string | null
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_diary_entry_id_fkey"
            columns: ["diary_entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_fork_id_fkey"
            columns: ["fork_id"]
            isOneToOne: false
            referencedRelation: "forks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          meta: Json
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          meta?: Json
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          meta?: Json
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          confidence: number
          created_at: string
          description: string | null
          id: string
          name: string
          relation: string
          sentiment: number
          subject_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          relation: string
          sentiment?: number
          subject_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          relation?: string
          sentiment?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      pepys_state: {
        Row: {
          belief_version: number
          corpus_version: string
          created_at: string
          curiosity_budget: number
          current_simulated_time: string
          emotional_state: Json
          fork_id: string | null
          historical_cutoff: string
          id: string
          identity_state: string
          label: string
          memory_version: number
          model_version: string
          personality_version: number
          prompt_version: string
          self_model: Json
          subject_id: string
          updated_at: string
        }
        Insert: {
          belief_version?: number
          corpus_version?: string
          created_at?: string
          curiosity_budget?: number
          current_simulated_time?: string
          emotional_state?: Json
          fork_id?: string | null
          historical_cutoff?: string
          id?: string
          identity_state?: string
          label?: string
          memory_version?: number
          model_version?: string
          personality_version?: number
          prompt_version?: string
          self_model?: Json
          subject_id: string
          updated_at?: string
        }
        Update: {
          belief_version?: number
          corpus_version?: string
          created_at?: string
          curiosity_budget?: number
          current_simulated_time?: string
          emotional_state?: Json
          fork_id?: string | null
          historical_cutoff?: string
          id?: string
          identity_state?: string
          label?: string
          memory_version?: number
          model_version?: string
          personality_version?: number
          prompt_version?: string
          self_model?: Json
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pepys_state_fork_id_fkey"
            columns: ["fork_id"]
            isOneToOne: false
            referencedRelation: "forks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pepys_state_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      personality_traits: {
        Row: {
          confidence: number
          created_at: string
          evidence_memory_ids: string[]
          evidence_note: string | null
          fork_id: string | null
          id: string
          inferred_from: string
          period_end: string | null
          period_start: string | null
          subject_id: string
          trait: string
          updated_at: string
          value: number
        }
        Insert: {
          confidence?: number
          created_at?: string
          evidence_memory_ids?: string[]
          evidence_note?: string | null
          fork_id?: string | null
          id?: string
          inferred_from?: string
          period_end?: string | null
          period_start?: string | null
          subject_id: string
          trait: string
          updated_at?: string
          value: number
        }
        Update: {
          confidence?: number
          created_at?: string
          evidence_memory_ids?: string[]
          evidence_note?: string | null
          fork_id?: string | null
          id?: string
          inferred_from?: string
          period_end?: string | null
          period_start?: string | null
          subject_id?: string
          trait?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "personality_traits_fork_id_fkey"
            columns: ["fork_id"]
            isOneToOne: false
            referencedRelation: "forks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personality_traits_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      provenance_records: {
        Row: {
          category: string
          conversation_id: string | null
          created_at: string
          diary_entry_id: string | null
          exact_date: string | null
          id: string
          interaction_id: string | null
          note: string | null
          quote: string | null
          source_edition: string | null
          source_id: string | null
          subject_id: string
          target_id: string
          target_type: string
          taught_by: string | null
        }
        Insert: {
          category: string
          conversation_id?: string | null
          created_at?: string
          diary_entry_id?: string | null
          exact_date?: string | null
          id?: string
          interaction_id?: string | null
          note?: string | null
          quote?: string | null
          source_edition?: string | null
          source_id?: string | null
          subject_id: string
          target_id: string
          target_type: string
          taught_by?: string | null
        }
        Update: {
          category?: string
          conversation_id?: string | null
          created_at?: string
          diary_entry_id?: string | null
          exact_date?: string | null
          id?: string
          interaction_id?: string | null
          note?: string | null
          quote?: string | null
          source_edition?: string | null
          source_id?: string | null
          subject_id?: string
          target_id?: string
          target_type?: string
          taught_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provenance_records_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provenance_records_diary_entry_id_fkey"
            columns: ["diary_entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provenance_records_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provenance_records_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      relationships: {
        Row: {
          display_name: string | null
          emotional_associations: string[]
          familiarity: number
          first_seen_at: string
          fork_id: string | null
          id: string
          interaction_count: number
          last_seen_at: string
          milestones: Json
          subject_id: string
          topics: string[]
          trust: number
          unresolved_questions: string[]
          user_id: string | null
          visitor_key: string
          warmth: number
        }
        Insert: {
          display_name?: string | null
          emotional_associations?: string[]
          familiarity?: number
          first_seen_at?: string
          fork_id?: string | null
          id?: string
          interaction_count?: number
          last_seen_at?: string
          milestones?: Json
          subject_id: string
          topics?: string[]
          trust?: number
          unresolved_questions?: string[]
          user_id?: string | null
          visitor_key: string
          warmth?: number
        }
        Update: {
          display_name?: string | null
          emotional_associations?: string[]
          familiarity?: number
          first_seen_at?: string
          fork_id?: string | null
          id?: string
          interaction_count?: number
          last_seen_at?: string
          milestones?: Json
          subject_id?: string
          topics?: string[]
          trust?: number
          unresolved_questions?: string[]
          user_id?: string | null
          visitor_key?: string
          warmth?: number
        }
        Relationships: [
          {
            foreignKeyName: "relationships_fork_id_fkey"
            columns: ["fork_id"]
            isOneToOne: false
            referencedRelation: "forks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          citation: string | null
          coverage: string | null
          created_at: string
          id: string
          kind: string
          licence: string | null
          subject_id: string
          tier: number
          title: string
          url: string | null
        }
        Insert: {
          citation?: string | null
          coverage?: string | null
          created_at?: string
          id?: string
          kind: string
          licence?: string | null
          subject_id: string
          tier?: number
          title: string
          url?: string | null
        }
        Update: {
          citation?: string | null
          coverage?: string | null
          created_at?: string
          id?: string
          kind?: string
          licence?: string | null
          subject_id?: string
          tier?: number
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          birth_year: number | null
          created_at: string
          cutoff_label: string
          cutoff_year: number
          death_year: number | null
          epitaph: string | null
          honorific: string | null
          id: string
          name: string
          portrait_url: string | null
          reconstructed_at: string
          reveal_status: string
          slug: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          cutoff_label: string
          cutoff_year: number
          death_year?: number | null
          epitaph?: string | null
          honorific?: string | null
          id?: string
          name: string
          portrait_url?: string | null
          reconstructed_at?: string
          reveal_status?: string
          slug: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          cutoff_label?: string
          cutoff_year?: number
          death_year?: number | null
          epitaph?: string | null
          honorific?: string | null
          id?: string
          name?: string
          portrait_url?: string | null
          reconstructed_at?: string
          reveal_status?: string
          slug?: string
        }
        Relationships: []
      }
      validation_runs: {
        Row: {
          completed_at: string | null
          corpus_version: string | null
          critical_passed: number
          critical_total: number
          environment: string
          historical_cutoff: string | null
          id: string
          log: Json
          model: string | null
          model_version: string | null
          notes: string | null
          overall_status: string
          pepys_instance_id: string | null
          prompt_version: string | null
          run_number: number | null
          started_at: string
          subject_id: string
          suite: string
          tests_passed: number
          tests_total: number
          verdict: string | null
        }
        Insert: {
          completed_at?: string | null
          corpus_version?: string | null
          critical_passed?: number
          critical_total?: number
          environment?: string
          historical_cutoff?: string | null
          id?: string
          log?: Json
          model?: string | null
          model_version?: string | null
          notes?: string | null
          overall_status?: string
          pepys_instance_id?: string | null
          prompt_version?: string | null
          run_number?: number | null
          started_at?: string
          subject_id: string
          suite?: string
          tests_passed?: number
          tests_total?: number
          verdict?: string | null
        }
        Update: {
          completed_at?: string | null
          corpus_version?: string | null
          critical_passed?: number
          critical_total?: number
          environment?: string
          historical_cutoff?: string | null
          id?: string
          log?: Json
          model?: string | null
          model_version?: string | null
          notes?: string | null
          overall_status?: string
          pepys_instance_id?: string | null
          prompt_version?: string | null
          run_number?: number | null
          started_at?: string
          subject_id?: string
          suite?: string
          tests_passed?: number
          tests_total?: number
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "validation_runs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_steps: {
        Row: {
          actual: string | null
          created_at: string
          evidence: Json
          evidence_reference: string | null
          evidence_type: string | null
          expected: string | null
          id: string
          name: string
          run_id: string
          status: string
          step_number: number
          test_id: string
        }
        Insert: {
          actual?: string | null
          created_at?: string
          evidence?: Json
          evidence_reference?: string | null
          evidence_type?: string | null
          expected?: string | null
          id?: string
          name: string
          run_id: string
          status?: string
          step_number: number
          test_id: string
        }
        Update: {
          actual?: string | null
          created_at?: string
          evidence?: Json
          evidence_reference?: string | null
          evidence_type?: string | null
          expected?: string | null
          id?: string
          name?: string
          run_id?: string
          status?: string
          step_number?: number
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_steps_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "validation_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_tests: {
        Row: {
          completed_at: string | null
          critical: boolean
          error: string | null
          evidence: Json
          id: string
          run_id: string
          started_at: string
          status: string
          subsystem: string | null
          test_key: string
          test_name: string
        }
        Insert: {
          completed_at?: string | null
          critical?: boolean
          error?: string | null
          evidence?: Json
          id?: string
          run_id: string
          started_at?: string
          status?: string
          subsystem?: string | null
          test_key: string
          test_name: string
        }
        Update: {
          completed_at?: string | null
          critical?: boolean
          error?: string | null
          evidence?: Json
          id?: string
          run_id?: string
          started_at?: string
          status?: string
          subsystem?: string | null
          test_key?: string
          test_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_tests_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_embedded_entries: { Args: never; Returns: number }
      count_pending_embedding_entries: { Args: never; Returns: number }
      hybrid_search_diary: {
        Args: {
          _cutoff: string
          _embedding: string
          _limit?: number
          _query: string
          _subject_id: string
        }
        Returns: {
          content: string
          date_label: string
          entry_date: string
          id: string
          lexical_rank: number
          relevance: number
          similarity: number
        }[]
      }
      pending_embedding_entries: {
        Args: { _limit?: number }
        Returns: {
          date_label: string
          entry_date: string
          id: string
          original_text: string
          subject_id: string
        }[]
      }
      search_diary_entries: {
        Args: {
          _cutoff: string
          _limit?: number
          _query: string
          _subject_id: string
        }
        Returns: {
          date_label: string
          entry_date: string
          id: string
          original_text: string
          relevance: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
