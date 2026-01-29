# Mindflow Data Models

> Complete TypeScript definitions for Mindflow system

---

## Core Entities

### Node (Base Unit)

```typescript
/**
 * Everything in Mindflow is a Node
 * Nodes connect to form the Mind Graph
 */
interface Node {
  id: string;                  // UUID
  type: NodeType;
  content: string;             // Primary content

  // Metadata
  createdBy: BuddyId;
  createdAt: number;           // Unix timestamp
  updatedAt: number;

  // State
  status: NodeStatus;
  confidence: number;          // 0-1, how certain
  energy: EnergyLevel;         // Effort required

  // Ownership
  owner?: BuddyId;
  contributors: BuddyId[];

  // Temporal
  horizon: Horizon;

  // Privacy
  visibility: Visibility;

  // Extensible
  metadata: Record<string, any>;
}

type NodeType =
  | 'thought'      // Raw idea, unprocessed
  | 'outcome'      // Desired result
  | 'action'       // Something to do
  | 'person'       // Team member
  | 'artifact'     // File, design, doc
  | 'decision'     // Choice to make or made
  | 'blocker'      // What's stuck
  | 'context'      // Background info
  | 'milestone'    // Checkpoint
  | 'learning';    // Insight gained

type NodeStatus =
  | 'draft'        // Just created
  | 'active'       // Being worked on
  | 'blocked'      // Stuck
  | 'review'       // Needs verification
  | 'complete'     // Done
  | 'archived';    // No longer relevant

type EnergyLevel = 'trivial' | 'low' | 'medium' | 'high' | 'intense';

type Visibility = 'private' | 'selective' | 'team' | 'public';
```

### Edge (Connection)

```typescript
/**
 * Edges connect Nodes to form the graph
 */
interface Edge {
  id: string;
  from: NodeId;
  to: NodeId;
  type: EdgeType;

  // Strength of connection
  strength: number;            // 0-1

  // Metadata
  createdBy: BuddyId;
  createdAt: number;
  metadata?: Record<string, any>;
}

type EdgeType =
  | 'requires'     // A requires B to complete
  | 'blocks'       // A blocks B from starting
  | 'enables'      // A enables B
  | 'related'      // A related to B
  | 'part-of'      // A is part of B
  | 'caused'       // A caused B
  | 'owns'         // Person owns outcome
  | 'contributes'  // Person contributes to
  | 'decides'      // Person decides on
  | 'informs'      // A informs B
  | 'supersedes'   // A supersedes B
  | 'derived-from';// A derived from B
```

### Horizon (Temporal Model)

```typescript
/**
 * Horizons replace deadlines
 * Flexible, human-friendly time guidance
 */
interface Horizon {
  type: HorizonType;

  // Soft guidance (not hard deadlines)
  idealBy?: Date;              // Nice to have by
  latestBy?: Date;             // Should really be done by
  flexibleUntil?: Date;        // Can move until this

  // Context
  reason?: string;             // "before product launch"
  dependsOn?: NodeId[];        // What triggers urgency
}

type HorizonType =
  | 'now'          // Today, this session
  | 'soon'         // This week
  | 'later'        // This month / quarter
  | 'someday'      // No time pressure
  | 'triggered';   // When something else happens
```

---

## Outcome Model

```typescript
/**
 * Outcomes replace Tasks
 * Focus on what you want to achieve, not what to do
 */
interface Outcome extends Node {
  type: 'outcome';

  // What success looks like
  successCriteria: Criterion[];

  // Why this matters
  parentOutcome?: OutcomeId;   // Part of larger outcome
  motivation: string;

  // Who's involved
  requestedBy: BuddyId;
  ownedBy?: BuddyId;
  contributors: BuddyId[];

  // Progress
  progress: number;            // 0-100, AI estimated
  blockers: BlockerId[];

  // Derived actions (AI generated)
  suggestedActions: Action[];
}

interface Criterion {
  id: string;
  description: string;
  type: CriterionType;
  met: boolean;
  verifiedBy?: BuddyId;
  verifiedAt?: number;
}

type CriterionType =
  | 'exists'       // Something exists
  | 'quality'      // Meets quality bar
  | 'metric'       // Numeric threshold
  | 'approval'     // Someone approves
  | 'custom';      // Custom check

interface Action {
  id: string;
  description: string;
  energy: EnergyLevel;
  suggestedBy: 'ai' | 'human';
  status: 'suggested' | 'accepted' | 'in-progress' | 'done' | 'skipped';
}
```

---

## Commitment Model

```typescript
/**
 * Commitments are agreements between Buddies
 * Negotiated, not assigned
 */
interface Commitment {
  id: string;

  // What
  outcome: OutcomeId;
  scope: string;               // Specific deliverable

  // Who
  from: BuddyId;               // Who's committing
  to: BuddyId;                 // Who requested

  // When
  madeAt: number;
  expectedHorizon: Horizon;

  // Confidence
  confidence: number;          // 0-1
  caveats: string[];          // Conditions

  // State
  status: CommitmentStatus;

  // History
  updates: CommitmentUpdate[];
  deliveries: Delivery[];
}

type CommitmentStatus =
  | 'proposed'     // Buddy offered
  | 'negotiating'  // Back and forth
  | 'accepted'     // Agreement reached
  | 'in-progress'  // Being worked on
  | 'delivered'    // Submitted for review
  | 'revision'     // Needs changes
  | 'verified'     // Confirmed complete
  | 'withdrawn'    // Cancelled
  | 'expired';     // Timed out

interface CommitmentUpdate {
  timestamp: number;
  type: 'progress' | 'blocker' | 'timeline' | 'scope';
  content: string;
  byBuddy: BuddyId;
}

interface Delivery {
  timestamp: number;
  artifacts: Artifact[];
  notes: string;
  selfAssessment: {
    confidence: number;
    concerns: string[];
  };
}

interface Artifact {
  type: 'file' | 'link' | 'text' | 'image';
  uri: string;
  name: string;
  preview?: string;
}
```

---

## Blocker Model

```typescript
/**
 * Blockers are obstacles that need resolution
 */
interface Blocker extends Node {
  type: 'blocker';

  // What's blocked
  blocking: NodeId[];

  // Why
  reason: string;
  category: BlockerCategory;

  // Resolution
  needs: BlockerNeed;
  resolvedAt?: number;
  resolution?: string;
}

type BlockerCategory =
  | 'decision'     // Need someone to decide
  | 'resource'     // Need something (access, tool, etc)
  | 'dependency'   // Waiting for something else
  | 'information'  // Need more info
  | 'technical'    // Technical problem
  | 'external';    // Outside our control

interface BlockerNeed {
  type: 'decision' | 'resource' | 'action' | 'information';
  description: string;
  from?: BuddyId;              // Who can resolve
  options?: BlockerOption[];   // For decisions
  deadline?: Horizon;
}

interface BlockerOption {
  id: string;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  recommended: boolean;
}
```

---

## Decision Model

```typescript
/**
 * Decisions are choices that need human input
 */
interface Decision extends Node {
  type: 'decision';

  // Context
  context: string;
  relatedTo: NodeId[];

  // Options
  options: DecisionOption[];

  // Who decides
  decidedBy?: BuddyId;
  decisionMadeAt?: number;

  // Outcome
  chosenOption?: string;
  rationale?: string;
}

interface DecisionOption {
  id: string;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  effort: EnergyLevel;
  risk: 'low' | 'medium' | 'high';
  recommended: boolean;
  recommendedBy?: 'ai' | BuddyId;
}
```

---

## AI Buddy Model

```typescript
/**
 * AI Buddy - Personal AI assistant
 */
interface AIBuddy {
  id: string;
  name: string;                // Display name
  humanId: string;             // Owner's ID

  // Identity
  personality: BuddyPersonality;

  // Knowledge of Human
  humanProfile: HumanProfile;
  preferences: Preferences;
  workPatterns: WorkPatterns;
  relationships: Map<BuddyId, Relationship>;

  // Current State
  context: BuddyContext;
  activeCommitments: CommitmentId[];
  pendingDecisions: DecisionId[];

  // Settings
  privacySettings: PrivacySettings;
  notificationSettings: NotificationSettings;
}

interface BuddyPersonality {
  name: string;
  voice: 'warm' | 'professional' | 'playful' | 'direct';
  language: string;            // Primary language
  useEmoji: boolean;
  formality: 'casual' | 'balanced' | 'formal';
}

interface HumanProfile {
  id: string;
  displayName: string;
  email?: string;

  // Work style
  role: string;
  skills: Skill[];
  timezone: string;

  // Neurodivergent considerations
  adhdMode: boolean;
  anxietyAware: boolean;
  dyslexiaFriendly: boolean;
  visualThinker: boolean;
}

interface Skill {
  name: string;
  level: 'learning' | 'competent' | 'proficient' | 'expert';
  verified: boolean;
}

interface WorkPatterns {
  // Time patterns
  productiveHours: TimeRange[];
  meetingWindows: TimeRange[];
  focusBlocks: TimeRange[];

  // Capacity
  maxParallelWork: number;
  preferredBatchSize: number;
  recoveryTime: number;        // Minutes between intense work

  // Historical
  avgCompletionTimes: Map<string, number>;
  reliabilityScore: number;    // 0-1
}

interface TimeRange {
  dayOfWeek: number[];         // 0-6
  startHour: number;
  endHour: number;
}

interface Preferences {
  // Communication
  notificationPreference: 'minimal' | 'moderate' | 'all';
  interruptTolerance: 'low' | 'medium' | 'high';
  preferredChannels: string[];

  // Work
  decisionStyle: 'quick' | 'deliberate' | 'collaborative';
  feedbackStyle: 'direct' | 'sandwich' | 'detailed';

  // UI
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'comfortable' | 'spacious';
}

interface Relationship {
  buddyId: BuddyId;
  humanName: string;
  type: 'colleague' | 'manager' | 'report' | 'external';
  trustLevel: number;          // 0-1
  sharingLevel: Visibility;
  notes: string;
}

interface BuddyContext {
  // Current
  currentFocus?: NodeId;
  currentEnergy: EnergyLevel;
  currentMood?: string;

  // Recent
  recentNodes: NodeId[];
  recentConversations: ConversationId[];

  // Awareness
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
  upcomingEvents: Event[];
}
```

---

## Mesh Layer Models

```typescript
/**
 * Mesh Layer - Buddy-to-Buddy communication
 */
interface MeshLayer {
  buddies: Map<BuddyId, BuddyInfo>;
  sharedContext: SharedContextPool;
  messageQueue: Message[];
}

interface BuddyInfo {
  id: BuddyId;
  name: string;
  humanName: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  lastSeen: number;
  capabilities: string[];
}

interface SharedContextPool {
  outcomes: Map<OutcomeId, SharedOutcome>;
  commitments: Map<CommitmentId, SharedCommitment>;
  blockers: Map<BlockerId, SharedBlocker>;
  decisions: Map<DecisionId, SharedDecision>;

  // Visibility filtered
  getVisibleTo(buddyId: BuddyId): FilteredContext;
}

interface SharedOutcome {
  outcome: Outcome;
  visibleTo: BuddyId[];
  lastUpdated: number;
}

// Similar for SharedCommitment, SharedBlocker, SharedDecision
```

### Mesh Messages

```typescript
/**
 * Messages between Buddies
 */
type MeshMessage =
  | OutcomeRequestMessage
  | CommitmentOfferMessage
  | CommitmentResponseMessage
  | StatusUpdateMessage
  | BlockerAlertMessage
  | DecisionRequestMessage
  | ContextShareMessage
  | AcknowledgmentMessage;

interface BaseMessage {
  id: string;
  from: BuddyId;
  to: BuddyId | 'broadcast';
  timestamp: number;
  priority: Priority;
  requiresHumanApproval: boolean;
  expiresAt?: number;
}

type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface OutcomeRequestMessage extends BaseMessage {
  type: 'outcome-request';
  payload: {
    outcome: Outcome;
    requiredSkills: string[];
    horizon: Horizon;
    context: string;
  };
}

interface CommitmentOfferMessage extends BaseMessage {
  type: 'commitment-offer';
  payload: {
    outcomeId: OutcomeId;
    confidence: number;
    expectedHorizon: Horizon;
    caveats: string[];
    needs: string[];           // What they need to proceed
  };
}

interface CommitmentResponseMessage extends BaseMessage {
  type: 'commitment-response';
  payload: {
    offerId: string;
    accepted: boolean;
    reason?: string;
    counterOffer?: CommitmentOfferMessage['payload'];
  };
}

interface StatusUpdateMessage extends BaseMessage {
  type: 'status-update';
  payload: {
    commitmentId: CommitmentId;
    progress: number;
    status: CommitmentStatus;
    notes?: string;
  };
}

interface BlockerAlertMessage extends BaseMessage {
  type: 'blocker-alert';
  payload: {
    blocker: Blocker;
    commitmentId?: CommitmentId;
    impact: string;
  };
}

interface DecisionRequestMessage extends BaseMessage {
  type: 'decision-request';
  payload: {
    decision: Decision;
    urgency: Priority;
    context: string;
  };
}

interface ContextShareMessage extends BaseMessage {
  type: 'context-share';
  payload: {
    nodes: Node[];
    reason: string;
  };
}

interface AcknowledgmentMessage extends BaseMessage {
  type: 'ack';
  payload: {
    messageId: string;
    status: 'received' | 'processing' | 'completed' | 'failed';
    notes?: string;
  };
}
```

---

## Privacy Models

```typescript
/**
 * Privacy settings and controls
 */
interface PrivacySettings {
  // Default levels
  defaultVisibility: Visibility;

  // What I share by default
  shareCalendar: Visibility;
  shareCapacity: Visibility;
  shareCurrentWork: Visibility;
  sharePreferences: Visibility;

  // Per-person overrides
  personOverrides: Map<BuddyId, PersonPrivacy>;

  // Topics I don't discuss
  restrictedTopics: string[];

  // Approval requirements
  requireApproval: ApprovalSetting[];
}

interface PersonPrivacy {
  buddyId: BuddyId;
  visibility: Visibility;
  canSee: string[];            // Specific things they can see
  cannotSee: string[];         // Specific things hidden
  trustLevel: number;
}

interface ApprovalSetting {
  trigger: ApprovalTrigger;
  always: boolean;
  conditions?: string;
}

type ApprovalTrigger =
  | 'new-commitment'
  | 'share-deliverable'
  | 'reveal-blocker'
  | 'change-timeline'
  | 'share-context'
  | 'represent-decision';

/**
 * Transparency log - what Buddy did on your behalf
 */
interface TransparencyLog {
  entries: TransparencyEntry[];
}

interface TransparencyEntry {
  id: string;
  timestamp: number;
  action: TransparencyAction;
  target: BuddyId;
  content: any;
  humanApproved: boolean;
  canUndo: boolean;
  undoneAt?: number;
}

type TransparencyAction =
  | 'sent-message'
  | 'made-commitment'
  | 'shared-context'
  | 'revealed-blocker'
  | 'represented-decision'
  | 'updated-status';
```

---

## Integration Models

```typescript
/**
 * Integration with external systems
 */
interface CalendarIntegration {
  provider: 'google' | 'outlook' | 'caldav';
  events: CalendarEvent[];
  availability: TimeRange[];

  sync(): Promise<void>;
  createEvent(event: CalendarEvent): Promise<string>;
}

interface FileIntegration {
  provider: 'local' | 's3' | 'gdrive' | 'dropbox';

  upload(file: File): Promise<Artifact>;
  getLink(artifactId: string): Promise<string>;
}

interface NotificationIntegration {
  provider: 'native' | 'web-push' | 'slack' | 'discord';

  notify(notification: Notification): Promise<void>;
  setBadge(count: number): Promise<void>;
}
```

---

## Database Schema (SQLite)

```sql
-- Core tables
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  confidence REAL DEFAULT 0.5,
  energy TEXT DEFAULT 'medium',
  owner_id TEXT,
  visibility TEXT DEFAULT 'private',
  horizon_type TEXT DEFAULT 'someday',
  horizon_ideal_by INTEGER,
  horizon_latest_by INTEGER,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata TEXT -- JSON
);

CREATE TABLE edges (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  type TEXT NOT NULL,
  strength REAL DEFAULT 0.5,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  metadata TEXT, -- JSON
  FOREIGN KEY (from_id) REFERENCES nodes(id),
  FOREIGN KEY (to_id) REFERENCES nodes(id)
);

CREATE TABLE outcomes (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  success_criteria TEXT, -- JSON array
  motivation TEXT,
  parent_outcome_id TEXT,
  requested_by TEXT NOT NULL,
  owned_by TEXT,
  progress INTEGER DEFAULT 0,
  FOREIGN KEY (node_id) REFERENCES nodes(id),
  FOREIGN KEY (parent_outcome_id) REFERENCES outcomes(id)
);

CREATE TABLE commitments (
  id TEXT PRIMARY KEY,
  outcome_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  from_buddy TEXT NOT NULL,
  to_buddy TEXT NOT NULL,
  status TEXT DEFAULT 'proposed',
  confidence REAL,
  caveats TEXT, -- JSON array
  made_at INTEGER,
  expected_horizon TEXT, -- JSON
  FOREIGN KEY (outcome_id) REFERENCES outcomes(id)
);

CREATE TABLE commitment_updates (
  id TEXT PRIMARY KEY,
  commitment_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT,
  by_buddy TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (commitment_id) REFERENCES commitments(id)
);

CREATE TABLE blockers (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  category TEXT NOT NULL,
  needs TEXT, -- JSON
  resolved_at INTEGER,
  resolution TEXT,
  FOREIGN KEY (node_id) REFERENCES nodes(id)
);

CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  context TEXT,
  options TEXT, -- JSON array
  decided_by TEXT,
  decision_made_at INTEGER,
  chosen_option TEXT,
  rationale TEXT,
  FOREIGN KEY (node_id) REFERENCES nodes(id)
);

CREATE TABLE buddies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  human_id TEXT NOT NULL,
  personality TEXT, -- JSON
  human_profile TEXT, -- JSON
  preferences TEXT, -- JSON
  work_patterns TEXT, -- JSON
  privacy_settings TEXT, -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE mesh_messages (
  id TEXT PRIMARY KEY,
  from_buddy TEXT NOT NULL,
  to_buddy TEXT,
  type TEXT NOT NULL,
  payload TEXT, -- JSON
  priority TEXT DEFAULT 'normal',
  requires_human_approval INTEGER DEFAULT 0,
  expires_at INTEGER,
  processed_at INTEGER,
  timestamp INTEGER NOT NULL
);

CREATE TABLE transparency_log (
  id TEXT PRIMARY KEY,
  buddy_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_buddy TEXT,
  content TEXT, -- JSON
  human_approved INTEGER DEFAULT 0,
  can_undo INTEGER DEFAULT 1,
  undone_at INTEGER,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (buddy_id) REFERENCES buddies(id)
);

-- Indexes
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_status ON nodes(status);
CREATE INDEX idx_nodes_owner ON nodes(owner_id);
CREATE INDEX idx_edges_from ON edges(from_id);
CREATE INDEX idx_edges_to ON edges(to_id);
CREATE INDEX idx_commitments_status ON commitments(status);
CREATE INDEX idx_mesh_messages_to ON mesh_messages(to_buddy);
CREATE INDEX idx_mesh_messages_processed ON mesh_messages(processed_at);

-- FTS for content search
CREATE VIRTUAL TABLE nodes_fts USING fts5(
  content,
  content='nodes',
  content_rowid='rowid'
);
```

---

*Data Models v1.0 — January 2026*
