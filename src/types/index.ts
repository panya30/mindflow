/**
 * Mindflow Type Definitions
 * Core types for AI-Native Project Management
 */

// ============================================================================
// Node Types (Mind Graph)
// ============================================================================

export type NodeType =
  | 'thought'      // Raw idea
  | 'outcome'      // Desired result
  | 'action'       // Something to do
  | 'person'       // Team member
  | 'artifact'     // File, design, doc
  | 'decision'     // Choice made
  | 'blocker'      // What's stuck
  | 'context';     // Background info

export type NodeStatus =
  | 'active'
  | 'completed'
  | 'blocked'
  | 'archived';

export type Horizon = 'now' | 'soon' | 'later' | 'someday';

export interface Node {
  id: string;
  type: NodeType;
  content: string;

  // Metadata
  createdBy: string;
  createdAt: number;
  updatedAt: number;

  // State
  status: NodeStatus;
  confidence: number;          // 0-1, how certain
  energy: 'low' | 'medium' | 'high';  // Effort required

  // Ownership
  owner?: string;
  contributors: string[];

  // Temporal
  horizon: Horizon;

  // Privacy
  visibility: 'private' | 'team' | 'public';

  // Tags
  tags: string[];
}

// ============================================================================
// Edge Types (Mind Graph)
// ============================================================================

export type EdgeType =
  | 'requires'     // A requires B
  | 'blocks'       // A blocks B
  | 'related'      // A related to B
  | 'caused'       // A caused B
  | 'owns'         // Person owns outcome
  | 'contributes'  // Person contributes to
  | 'decides'      // Person decides on
  | 'informs';     // A informs B

export interface Edge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
  strength: number;  // 0-1
  createdAt: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Outcome Types
// ============================================================================

export type OutcomeStatus =
  | 'exploring'    // Still figuring out
  | 'committed'    // Someone owns it
  | 'in-progress'  // Being worked on
  | 'blocked'      // Stuck
  | 'review'       // Needs verification
  | 'achieved'     // Done!
  | 'abandoned';   // Not doing anymore

export interface Criterion {
  id: string;
  description: string;
  met: boolean;
}

export interface HorizonInfo {
  type: Horizon;
  idealBy?: number;
  flexibleBy?: number;
  reason?: string;
}

export interface Outcome {
  id: string;

  // What
  description: string;
  successCriteria: Criterion[];

  // Why
  parentOutcome?: string;
  motivation: string;

  // Who
  requestedBy: string;
  ownedBy?: string;
  contributors: string[];

  // When
  horizon: HorizonInfo;
  createdAt: number;
  completedAt?: number;

  // How (derived by AI)
  suggestedActions: string[];

  // State
  status: OutcomeStatus;
  progress: number;  // 0-100
  confidence: number;
  blockers: string[];
}

// ============================================================================
// Commitment Types
// ============================================================================

export type CommitmentStatus =
  | 'proposed'
  | 'accepted'
  | 'in-progress'
  | 'delivered'
  | 'verified'
  | 'withdrawn';

export interface Commitment {
  id: string;

  // What
  outcomeId: string;
  scope: string;

  // Who
  from: string;  // Buddy ID
  to: string;    // Requester Buddy ID

  // When
  madeAt: number;
  expectedBy: HorizonInfo;

  // Confidence
  confidence: number;
  caveats: string[];

  // State
  status: CommitmentStatus;

  // Updates
  updates: CommitmentUpdate[];
}

export interface CommitmentUpdate {
  timestamp: number;
  progress: number;
  notes?: string;
}

// ============================================================================
// Buddy Types
// ============================================================================

export type WorkStyle = 'deep-focus' | 'context-switch' | 'collaborative';
export type CommunicationStyle = 'direct' | 'detailed' | 'visual';
export type NotificationPreference = 'minimal' | 'moderate' | 'all';
export type DecisionStyle = 'quick' | 'deliberate' | 'collaborative';

export interface PersonalityProfile {
  preferredWorkStyle: WorkStyle;
  communicationStyle: CommunicationStyle;
  notificationPreference: NotificationPreference;
  interruptTolerance: 'low' | 'medium' | 'high';
  decisionStyle: DecisionStyle;

  // Neurodivergent support
  adhdMode: boolean;
  anxietyAware: boolean;
  visualThinker: boolean;
}

export interface TimeRange {
  start: string;  // HH:mm
  end: string;
}

export interface WorkPatterns {
  productiveHours: TimeRange[];
  meetingPreference: TimeRange[];
  focusBlocks: TimeRange[];
  maxActiveCommitments: number;
  preferredBatchSize: number;
  recoveryTimeNeeded: number;
}

export interface HumanContext {
  currentTime: number;
  estimatedEnergy: 'low' | 'medium' | 'high';
  currentWork?: string;
  recentActivity: string[];
  upcomingCommitments: string[];
}

export interface AIBuddyConfig {
  id: string;
  name: string;
  humanId: string;
  humanName: string;

  personality: PersonalityProfile;
  workPatterns: WorkPatterns;
}

// ============================================================================
// Mesh Types
// ============================================================================

export type MessageType =
  | 'outcome-request'
  | 'commitment-offer'
  | 'context-share'
  | 'status-update'
  | 'blocker-alert'
  | 'decision-request'
  | 'acknowledgment'
  | 'negotiation';

export interface MeshMessage {
  id: string;
  from: string;
  to: string | 'broadcast';
  type: MessageType;
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: number;
  requiresHumanApproval: boolean;
  timestamp: number;
}

// ============================================================================
// Privacy Types
// ============================================================================

export type PrivacyLevel = 'private' | 'selective' | 'team' | 'public';

export interface PrivacySettings {
  shareCalendar: PrivacyLevel;
  shareCapacity: PrivacyLevel;
  sharePreferences: PrivacyLevel;
  shareCurrentWork: PrivacyLevel;
  restrictedTopics: string[];
}

// ============================================================================
// Chat Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'buddy';
  content: string;
  timestamp: number;
  metadata?: {
    intent?: string;
    outcomeId?: string;
    actionTaken?: string;
  };
}

export interface ChatSession {
  id: string;
  buddyId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
