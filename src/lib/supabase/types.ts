export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// Minimal Database type to satisfy imports during build.
// Expand with real table/view/function types as needed.
export type Database = {
  public: {
    Tables: Record<string, { Row: any; Insert: any; Update: any }>;
    Views: Record<string, any>;
    Functions: Record<string, any>;
  };
};
