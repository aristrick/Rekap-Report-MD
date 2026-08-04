export type RoleLevel = "mdm" | "rmdm" | "mds" | "admin" | "tl";

export type SubmissionStatus = "pending" | "submitted" | "late" | "rejected" | "approved";

export interface Profile {
  id: string;
  full_name: string;
  role: RoleLevel;
  region_id: string | null;
  territory_id: string | null;
  supervisor_id: string | null;
  telegram_chat_id: string | null;
  is_active: boolean;
}

export interface Region {
  id: string;
  code: string;
  name: string;
}

export interface Territory {
  id: string;
  region_id: string;
  code: string;
  name: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  region_id: string;
  period_month: number;
  period_year: number;
  deadline: string;
  created_by: string;
}

export interface ReportSubmission {
  id: string;
  template_id: string;
  territory_id: string;
  status: SubmissionStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  telegram_file_id: string | null;
  telegram_message_id: string | null;
  note: string | null;
}

export interface Program {
  id: string;
  name: string;
  description: string | null;
  region_id: string;
  letter_file_url: string | null;
  period_month: number;
  period_year: number;
  created_by: string;
}

export interface ProgramRealization {
  id: string;
  program_id: string;
  territory_id: string;
  status: SubmissionStatus;
  excel_file_url: string | null;
  receipt_pdf_url: string | null;
  activity_photo_urls: string[] | null;
  submitted_by: string | null;
  submitted_at: string | null;
  note: string | null;
}
