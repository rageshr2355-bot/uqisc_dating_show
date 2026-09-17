export type PollCategory = 
  | 'recoupling' 
  | 'drama' 
  | 'hideaway' 
  | 'dumping' 
  | 'truth_or_dare' 
  | 'wildcard';

export interface PollOption {
  id: string;
  label: string;
  description?: string;
  avatarUrl?: string;
  votes: number;
  isUserCreated?: boolean;
  createdBy?: string;
  requiresWriteIn?: boolean;
  tag?: string;
}

export interface UserVoteInput {
  hotTake?: string;
  customWriteIn?: string;
  spiceLevel?: number;
  voterName: string;
}

export interface VoteRecord {
  id: string;
  pollId: string;
  optionId: string;
  optionLabel: string;
  voterName: string;
  userRequiredInput: UserVoteInput;
  createdAt: string;
}

export interface PollQuestion {
  id: string;
  category: PollCategory;
  categoryLabel: string;
  title: string;
  prompt: string;
  options: PollOption[];
  requiresVoterInput: boolean;
  inputPromptText?: string;
  allowAudienceOptions: boolean;
  status: 'active' | 'locked' | 'revealed';
  totalVotes: number;
  winnerOptionId?: string;
  createdAt: string;
}

export interface AudienceHotTake {
  id: string;
  pollId: string;
  voterName: string;
  optionLabel: string;
  hotTake: string;
  spiceLevel: number;
  timestamp: string;
}

export interface ReactionBurst {
  id: string;
  emoji: string;
  label: string;
  x: number;
}

export interface Confession {
  id: string;
  text: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AppState {
  polls: PollQuestion[];
  activePollId: string;
  hotTakes: AudienceHotTake[];
  reactionCounts: Record<string, number>;
  connectedAudienceCount: number;
  confessions: Confession[];
}

export interface CreateOptionPayload {
  pollId: string;
  label: string;
  description?: string;
  createdBy: string;
  tag?: string;
}

export interface CreatePollPayload {
  title: string;
  prompt: string;
  category: PollCategory;
  categoryLabel: string;
  requiresVoterInput: boolean;
  inputPromptText?: string;
  allowAudienceOptions: boolean;
  options: { label: string; description?: string; avatarUrl?: string; tag?: string; requiresWriteIn?: boolean }[];
}

export interface UpdatePollPayload {
  pollId: string;
  title: string;
  prompt: string;
  category: PollCategory;
  categoryLabel: string;
  requiresVoterInput: boolean;
  inputPromptText?: string;
  allowAudienceOptions: boolean;
  options: {
    id?: string;
    label: string;
    description?: string;
    avatarUrl?: string | null;
    tag?: string;
    requiresWriteIn?: boolean;
    votes?: number;
  }[];
}
