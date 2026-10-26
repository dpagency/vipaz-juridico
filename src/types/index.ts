export type UserRole = 'admin' | 'senior_lawyer' | 'lawyer' | 'reviewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  logo_url?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  oab?: string;
  avatar_url?: string;
  organization_id: string;
  created_at: string;
}

export interface OrganizationMember {
  organization_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export type DocumentType =
  | 'Contestação'
  | 'Recurso Inominado'
  | 'Apelação'
  | 'Agravo de Instrumento'
  | 'Contraminuta de Agravo'
  | 'Contrarrazões'
  | 'Petição Intermediária'
  | 'Outros';

export interface Process {
  id: string;
  organization_id: string;
  process_number: string;
  court: string;
  represented_party: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface ProcessSubject {
  id: string;
  process_id: string;
  subject: string;
  custom_subject?: string;
}

export interface DocumentTemplate {
  id: string;
  organization_id: string;
  document_type: DocumentType;
  name: string;
  version: string;
  status: 'draft' | 'in_review' | 'approved' | 'deprecated' | 'archived';
  storage_path: string;
  rules_json?: Record<string, unknown>;
  original_filename?: string;
  mime_type?: string;
  composition_map?: { schemaVersion: number; bindings: unknown[] };
  schema_version?: number;
  checksum?: string;
  change_notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GenerationStep {
  id: string;
  generation_job_id: string;
  step_number: number;
  step_key: string;
  label: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  telemetry?: string;
}

export interface GenerationJob {
  id: string;
  organization_id: string;
  process_id: string;
  user_id: string;
  document_type: DocumentType;
  special_instructions?: string | null;
  status: JobStatus;
  current_step: number;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  process?: Process;
  process_data?: {
    process_number: string;
    court: string;
    represented_party: string;
    subjects: string[];
    file_name?: string;
    file_size?: number;
  };
  steps?: GenerationStep[];
  source_document?: SourceDocument;
}

export interface SourceDocument {
  id: string;
  organization_id: string;
  process_id: string;
  generation_job_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface DocumentSection {
  title: string;
  subtitle?: string;
  paragraphs: string[];
}

export interface StructuredDocumentContent {
  addressing: string;
  qualification: string;
  preliminaries: DocumentSection[];
  facts_summary: DocumentSection[];
  merits: DocumentSection[];
  requests: string[];
  closing: string;
}

export interface GeneratedDocument {
  id: string;
  organization_id: string;
  generation_job_id: string;
  process_number: string;
  document_type: DocumentType;
  version: string;
  docx_storage_path: string;
  pdf_storage_path?: string | null;
  created_at: string;
  updated_at?: string;
  template_id?: string | null;
  template_version?: string | null;
  review_status?: 'draft' | 'awaiting_review' | 'changes_requested' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  title: string;
  metadata: {
    court: string;
    represented_party: string;
    subjects: string[];
    word_count: number;
    pages_estimated: number;
    reviewed_by?: string;
  };
  structured_content: StructuredDocumentContent;
}

export interface AuditEvent {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}
