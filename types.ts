export type Role = 'user' | 'council';

export type Stage = 'idle' | 'opinions' | 'reviews' | 'chairman' | 'complete';

export interface CouncilMember {
  id: string;
  name: string;
  style: string;
  color: string;
  model: string;
  systemPrompt: string;
}

export interface Opinion {
  memberId: string;
  content: string;
}

export interface Review {
  reviewerId: string;
  content: string;
}

export interface CouncilData {
  stage: Stage;
  opinions: Opinion[];
  reviews: Review[];
  chairmanResponse: string;
  error?: string;
}

export interface Message {
  id: string;
  role: Role;
  text?: string; // For user messages
  councilData?: CouncilData; // For council messages
  timestamp: number;
}
