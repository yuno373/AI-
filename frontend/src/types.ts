export type ModeType = 'super_agent' | 'yuru_sparta' | 'mental_care' | 'ultra_fast';

export interface ReActStep {
  step: number;
  phase: string;
  thought: string;
  action?: string;
  observation?: string;
  feedback?: string;
}

export interface ChatMessage {
  role: string;
  content: string;
  timestamp?: string;
  mode: ModeType;
}

export interface ChatResponse {
  message: string;
  mode: ModeType;
  react_steps: ReActStep[];
  flashcards?: any[];
  schedule?: any;
  mistakes?: any[];
  notifications?: string[];
  mode_display?: string;
}

export interface Flashcard {
  id: number;
  question: string;
  answer: string;
  subject?: string;
  tags: string[];
  is_mastered: boolean;
  created_at: string;
}

export interface Mistake {
  id: number;
  question: string;
  user_answer: string;
  correct_answer: string;
  category: string;
  category_detail?: string;
  tags: string[];
  confidence?: number;
  improvement_suggestion?: string;
  analyzed_at?: string;
}

export interface ScheduleTask {
  id: number;
  subject: string;
  task: string;
  start_date: string;
  end_date: string;
  priority: number;
  status: string;
  tags: string[];
}

export interface Submission {
  id: number;
  title: string;
  type: string;
  deadline?: string;
  needs_parent_signature: boolean;
  needs_payment: boolean;
  payment_amount?: number;
  reminder_sent: boolean;
}

export interface SystemStatus {
  status: string;
  uptime_seconds: number;
  error_count: number;
  self_repairs_performed: number;
  last_diagnosis?: string;
  known_issues: string[];
  components: Record<string, string>;
}

export interface ErrorEntry {
  timestamp: string;
  error_type: string;
  message: string;
  self_repaired: boolean;
  repair_action?: string;
}

export interface AdminStatus {
  mode: string;
  uptime_seconds: number;
  uptime_readable: string;
  total_errors: number;
  self_repairs: number;
  diagnoses_run: number;
  modifications: number;
  components: Record<string, any>;
}