import { Coordinates } from './game';

export type ReportStatus = 'pending' | 'applied' | 'rejected';

export interface QuestionReport {
  id: string;
  questionId: string;
  questionTitle: string;
  originalName: string;
  originalCoordinates: Coordinates;
  reportedCoordinates: Coordinates;
  reportedName?: string;
  evidenceUrl?: string;
  comment?: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionReportInput {
  questionId: string;
  questionTitle: string;
  originalName: string;
  originalCoordinates: Coordinates;
  reportedCoordinates: Coordinates;
  reportedName?: string;
  evidenceUrl?: string;
  comment?: string;
}

