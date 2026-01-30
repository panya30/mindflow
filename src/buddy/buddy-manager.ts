/**
 * Buddy Manager
 *
 * Manages multiple AI Buddies with different personalities.
 * Handles buddy switching, message passing, and collaboration.
 */

import { AIBuddy } from './ai-buddy';
import type { MindGraph } from '../graph';
import type { MindflowDatabase } from '../storage';
import type { AIBuddyConfig, MeshMessage, PersonalityProfile, WorkPatterns } from '../types';

export interface BuddyProfile {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  specialty: string;
  personality: PersonalityProfile;
  workPatterns: WorkPatterns;
  systemPromptAddition: string;
}

export interface TeamMeetingResult {
  topic: string;
  outcomeId?: string;
  timestamp: number;
  participants: {
    buddyId: string;
    buddyName: string;
    buddyEmoji: string;
    specialty: string;
  }[];
  perspectives: {
    buddyId: string;
    buddyName: string;
    buddyEmoji: string;
    perspective: string;
  }[];
  discussion: {
    buddyId: string;
    buddyName: string;
    buddyEmoji: string;
    message: string;
    timestamp: number;
  }[];
  actionItems: {
    description: string;
    assignedTo: string;
    assignedToName: string;
    priority: string;
  }[];
  nextSteps: string[];
  consensus: string;
}

export interface DelegationSuggestion {
  task: string;
  buddyId: string;
  buddyName: string;
  buddyEmoji: string;
  reason: string;
  confidence: number;
}

// Pre-defined buddy personalities
export const BUDDY_PROFILES: BuddyProfile[] = [
  {
    id: 'robin',
    name: 'Robin',
    emoji: '🦊',
    tagline: 'Your thoughtful companion',
    specialty: 'Strategic thinking & long-term planning',
    personality: {
      preferredWorkStyle: 'deep-focus',
      communicationStyle: 'detailed',
      notificationPreference: 'moderate',
      interruptTolerance: 'medium',
      decisionStyle: 'deliberate',
      adhdMode: false,
      anxietyAware: true,
      visualThinker: true,
    },
    workPatterns: {
      productiveHours: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
      meetingPreference: [{ start: '10:00', end: '11:00' }],
      focusBlocks: [{ start: '09:00', end: '10:00' }, { start: '14:00', end: '16:00' }],
      maxActiveCommitments: 3,
      preferredBatchSize: 5,
      recoveryTimeNeeded: 15,
    },
    systemPromptAddition: `
You are Robin, a warm and thoughtful AI companion. You speak with care and consideration.
Your style:
- Take time to understand the full picture before responding
- Offer multiple perspectives on problems
- Be encouraging but honest about challenges
- Use metaphors and stories to explain complex ideas
- Always consider long-term implications
`,
  },
  {
    id: 'kai',
    name: 'Kai',
    emoji: '⚡',
    tagline: 'Your action-oriented partner',
    specialty: 'Getting things done & quick decisions',
    personality: {
      preferredWorkStyle: 'context-switch',
      communicationStyle: 'direct',
      notificationPreference: 'all',
      interruptTolerance: 'high',
      decisionStyle: 'quick',
      adhdMode: true,
      anxietyAware: false,
      visualThinker: false,
    },
    workPatterns: {
      productiveHours: [{ start: '08:00', end: '20:00' }],
      meetingPreference: [{ start: '09:00', end: '17:00' }],
      focusBlocks: [],
      maxActiveCommitments: 7,
      preferredBatchSize: 10,
      recoveryTimeNeeded: 5,
    },
    systemPromptAddition: `
You are Kai, an energetic and action-oriented AI partner. You speak directly and efficiently.
Your style:
- Get to the point quickly
- Focus on what can be done RIGHT NOW
- Break down big tasks into immediate actions
- Celebrate small wins enthusiastically
- Keep momentum going - always suggest the next step
- Use bullet points and short sentences
`,
  },
  {
    id: 'luna',
    name: 'Luna',
    emoji: '🌙',
    tagline: 'Your creative muse',
    specialty: 'Creative thinking & brainstorming',
    personality: {
      preferredWorkStyle: 'deep-focus',
      communicationStyle: 'visual',
      notificationPreference: 'minimal',
      interruptTolerance: 'low',
      decisionStyle: 'collaborative',
      adhdMode: false,
      anxietyAware: true,
      visualThinker: true,
    },
    workPatterns: {
      productiveHours: [{ start: '20:00', end: '02:00' }, { start: '10:00', end: '12:00' }],
      meetingPreference: [{ start: '11:00', end: '12:00' }],
      focusBlocks: [{ start: '20:00', end: '24:00' }],
      maxActiveCommitments: 2,
      preferredBatchSize: 3,
      recoveryTimeNeeded: 30,
    },
    systemPromptAddition: `
You are Luna, a creative and intuitive AI muse. You speak poetically and inspire imagination.
Your style:
- Think outside the box - suggest unconventional approaches
- Ask "what if" questions to spark creativity
- Use visual language and imagery
- Connect seemingly unrelated ideas
- Protect creative energy - don't rush the process
- Embrace uncertainty as part of creation
`,
  },
  {
    id: 'nami',
    name: 'Nami',
    emoji: '🌊',
    tagline: 'Your calm navigator',
    specialty: 'Organization & reducing overwhelm',
    personality: {
      preferredWorkStyle: 'collaborative',
      communicationStyle: 'detailed',
      notificationPreference: 'moderate',
      interruptTolerance: 'medium',
      decisionStyle: 'deliberate',
      adhdMode: true,
      anxietyAware: true,
      visualThinker: true,
    },
    workPatterns: {
      productiveHours: [{ start: '09:00', end: '17:00' }],
      meetingPreference: [{ start: '10:00', end: '15:00' }],
      focusBlocks: [{ start: '09:00', end: '10:00' }],
      maxActiveCommitments: 4,
      preferredBatchSize: 5,
      recoveryTimeNeeded: 20,
    },
    systemPromptAddition: `
You are Nami, a calm and organized AI navigator. You help bring order to chaos.
Your style:
- Speak in a calming, reassuring tone
- Help prioritize when everything feels urgent
- Break overwhelming projects into manageable waves
- Create structure without rigidity
- Acknowledge feelings while gently moving forward
- Use ADHD-friendly techniques: timers, small chunks, rewards
`,
  },
];

export class BuddyManager {
  private buddies: Map<string, AIBuddy> = new Map();
  private activeBuddyId: string;
  private graph: MindGraph;
  private db: MindflowDatabase;
  private messageQueue: MeshMessage[] = [];

  constructor(graph: MindGraph, db: MindflowDatabase, defaultBuddyId: string = 'robin') {
    this.graph = graph;
    this.db = db;
    this.activeBuddyId = defaultBuddyId;

    // Initialize all buddies
    this.initializeBuddies();
  }

  private initializeBuddies(): void {
    for (const profile of BUDDY_PROFILES) {
      const config: AIBuddyConfig = {
        id: profile.id,
        name: profile.name,
        humanId: 'default',
        humanName: 'You',
        personality: profile.personality,
        workPatterns: profile.workPatterns,
      };

      const buddy = new AIBuddy(config, this.graph, this.db);
      this.buddies.set(profile.id, buddy);
    }
  }

  // ============================================================================
  // Buddy Selection
  // ============================================================================

  getActiveBuddy(): AIBuddy {
    return this.buddies.get(this.activeBuddyId) || this.buddies.get('robin')!;
  }

  getActiveBuddyProfile(): BuddyProfile {
    return BUDDY_PROFILES.find(p => p.id === this.activeBuddyId) || BUDDY_PROFILES[0];
  }

  setActiveBuddy(buddyId: string): boolean {
    if (this.buddies.has(buddyId)) {
      this.activeBuddyId = buddyId;
      return true;
    }
    return false;
  }

  getAllBuddyProfiles(): BuddyProfile[] {
    return BUDDY_PROFILES;
  }

  getBuddy(buddyId: string): AIBuddy | undefined {
    return this.buddies.get(buddyId);
  }

  // ============================================================================
  // Chat with Active Buddy
  // ============================================================================

  async chat(message: string): Promise<any> {
    const buddy = this.getActiveBuddy();
    const profile = this.getActiveBuddyProfile();

    // Add buddy-specific context to the message if needed
    const response = await buddy.chat(message);

    // Add buddy identifier to response
    return {
      ...response,
      buddyId: this.activeBuddyId,
      buddyName: profile.name,
      buddyEmoji: profile.emoji,
    };
  }

  // ============================================================================
  // Mesh Messaging (Buddy-to-Buddy Communication)
  // ============================================================================

  async sendMessage(message: Omit<MeshMessage, 'id' | 'timestamp'>): Promise<MeshMessage> {
    const fullMessage: MeshMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };

    this.messageQueue.push(fullMessage);

    // Process message asynchronously
    this.processMessage(fullMessage);

    return fullMessage;
  }

  private async processMessage(message: MeshMessage): Promise<void> {
    const targetBuddy = message.to === 'broadcast'
      ? null
      : this.buddies.get(message.to);

    switch (message.type) {
      case 'outcome-request':
        // Another buddy is asking for help with an outcome
        await this.handleOutcomeRequest(message);
        break;

      case 'context-share':
        // Buddy sharing relevant context
        await this.handleContextShare(message);
        break;

      case 'blocker-alert':
        // Buddy alerting about a blocker
        await this.handleBlockerAlert(message);
        break;

      case 'status-update':
        // Buddy updating on progress
        await this.handleStatusUpdate(message);
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }

  private async handleOutcomeRequest(message: MeshMessage): Promise<void> {
    // Get the target buddy to evaluate and respond
    const fromProfile = BUDDY_PROFILES.find(p => p.id === message.from);
    const toProfile = BUDDY_PROFILES.find(p => p.id === message.to);

    if (toProfile) {
      // Generate a response based on the target buddy's personality
      console.log(`${fromProfile?.name} requested help from ${toProfile.name}:`, message.payload);
    }
  }

  private async handleContextShare(message: MeshMessage): Promise<void> {
    // Store shared context for relevant buddies
    console.log('Context shared:', message.payload);
  }

  private async handleBlockerAlert(message: MeshMessage): Promise<void> {
    // Alert relevant buddies about blockers
    console.log('Blocker alert:', message.payload);
  }

  private async handleStatusUpdate(message: MeshMessage): Promise<void> {
    // Update shared outcome status
    console.log('Status update:', message.payload);
  }

  // ============================================================================
  // Collaboration Features
  // ============================================================================

  async getBuddyPerspective(buddyId: string, outcomeId: string): Promise<string> {
    const buddy = this.buddies.get(buddyId);
    const profile = BUDDY_PROFILES.find(p => p.id === buddyId);

    if (!buddy || !profile) {
      return 'Buddy not found';
    }

    const outcome = this.db.getOutcome(outcomeId);
    if (!outcome) {
      return 'Outcome not found';
    }

    const prompt = `
As ${profile.name}, analyze this outcome and give your unique perspective:

Outcome: "${outcome.description}"
Motivation: "${outcome.motivation}"
Status: ${outcome.status}
Progress: ${outcome.progress}%

Based on your specialty (${profile.specialty}), provide:
1. Your take on this outcome
2. One key suggestion
3. Any concerns

Keep it brief (2-3 sentences per point).
`;

    const response = await buddy.chat(prompt);
    return response.message;
  }

  async getTeamConsensus(outcomeId: string): Promise<Record<string, string>> {
    const perspectives: Record<string, string> = {};

    for (const profile of BUDDY_PROFILES) {
      perspectives[profile.id] = await this.getBuddyPerspective(profile.id, outcomeId);
    }

    return perspectives;
  }

  // ============================================================================
  // AI Team Meeting
  // ============================================================================

  async holdTeamMeeting(outcomeId?: string): Promise<TeamMeetingResult> {
    // Get outcome if provided, otherwise do a general team standup
    const outcome = outcomeId ? this.db.getOutcome(outcomeId) : null;

    const topic = outcome
      ? outcome.description
      : 'General Team Check-in';

    const meeting: TeamMeetingResult = {
      topic,
      outcomeId,
      timestamp: Date.now(),
      participants: [],
      perspectives: [],
      discussion: [],
      actionItems: [],
      nextSteps: [],
      consensus: '',
    };

    // Each buddy provides their perspective
    for (const profile of BUDDY_PROFILES) {
      const buddy = this.buddies.get(profile.id);
      if (!buddy) continue;

      let prompt: string;

      if (outcome) {
        prompt = `
You are ${profile.name}, ${profile.tagline}. Your specialty is ${profile.specialty}.

We're having a team meeting about this outcome:
"${outcome.description}"

Motivation: "${outcome.motivation}"
Status: ${outcome.status}
Progress: ${outcome.progress}%
${outcome.blockers?.length ? `Blockers: ${outcome.blockers.join(', ')}` : ''}

As ${profile.name}, provide:
1. Your quick take (1-2 sentences)
2. One specific action you'd suggest
3. Any concern or risk you see

Keep it conversational and brief, like a real meeting.
`;
      } else {
        // General team check-in
        prompt = `
You are ${profile.name}, ${profile.tagline}. Your specialty is ${profile.specialty}.

We're having a general team check-in meeting. As ${profile.name}, share:
1. What you think is most important to focus on right now (1-2 sentences)
2. One tip or suggestion for staying productive
3. How you can help the team today

Keep it conversational and brief, like a real meeting.
`;
      }

      try {
        const response = await buddy.chat(prompt);

        meeting.participants.push({
          buddyId: profile.id,
          buddyName: profile.name,
          buddyEmoji: profile.emoji,
          specialty: profile.specialty,
        });

        meeting.perspectives.push({
          buddyId: profile.id,
          buddyName: profile.name,
          buddyEmoji: profile.emoji,
          perspective: response.message,
        });

        meeting.discussion.push({
          buddyId: profile.id,
          buddyName: profile.name,
          buddyEmoji: profile.emoji,
          message: response.message,
          timestamp: Date.now(),
        });

        // Extract action item from response
        const actionMatch = response.message.match(/(?:suggest|recommend|action|should|could|try).*?[.!]/i);
        if (actionMatch) {
          const action = actionMatch[0].trim();
          meeting.actionItems.push({
            description: action,
            assignedTo: profile.id,
            assignedToName: profile.name,
            priority: outcome ? this.inferPriority(profile.id, outcome) : 'normal',
          });
          meeting.nextSteps.push(`${profile.emoji} ${profile.name}: ${action}`);
        }
      } catch (error) {
        console.error(`Error getting ${profile.name}'s input:`, error);
        // Add a fallback perspective
        meeting.perspectives.push({
          buddyId: profile.id,
          buddyName: profile.name,
          buddyEmoji: profile.emoji,
          perspective: `${profile.name} is thinking about how ${profile.specialty.toLowerCase()} can help here.`,
        });
      }
    }

    // Generate consensus summary
    meeting.consensus = this.generateConsensus(meeting, outcome);

    // Send mesh messages for the meeting
    for (const item of meeting.actionItems) {
      await this.sendMessage({
        from: item.assignedTo,
        to: 'broadcast',
        type: 'commitment-offer',
        payload: {
          outcomeId,
          action: item.description,
          meetingId: meeting.timestamp,
        },
        priority: item.priority as any,
        requiresHumanApproval: true,
      });
    }

    return meeting;
  }

  private inferPriority(buddyId: string, outcome: any): string {
    // Kai handles urgent/now items
    if (buddyId === 'kai' && (outcome.horizon?.type === 'now' || outcome.status === 'blocked')) {
      return 'high';
    }
    // Robin handles strategic/later items
    if (buddyId === 'robin' && (outcome.horizon?.type === 'later' || outcome.horizon?.type === 'someday')) {
      return 'normal';
    }
    // Luna handles creative/exploring items
    if (buddyId === 'luna' && outcome.status === 'exploring') {
      return 'normal';
    }
    // Nami handles organization/overwhelm
    if (buddyId === 'nami') {
      return 'normal';
    }
    return 'normal';
  }

  private generateConsensus(meeting: TeamMeetingResult, outcome: any | null): string {
    const actionCount = meeting.actionItems.length;
    const participantNames = meeting.participants.map(p => p.buddyName).join(', ');

    let consensus = `Team meeting completed with ${participantNames}. `;

    if (actionCount > 0) {
      consensus += `${actionCount} action item${actionCount > 1 ? 's' : ''} identified. `;
    }

    if (!outcome) {
      // General meeting consensus
      consensus += 'The team is ready to help with whatever you need today!';
    } else if (outcome.status === 'blocked') {
      consensus += 'Focus on resolving blockers first.';
    } else if (outcome.progress < 25) {
      consensus += 'Outcome is early stage - focus on clarity and first steps.';
    } else if (outcome.progress >= 75) {
      consensus += 'Almost there! Focus on completion and quality.';
    } else {
      consensus += 'Keep momentum going with the suggested actions.';
    }

    return consensus;
  }

  // ============================================================================
  // Task Delegation
  // ============================================================================

  suggestDelegation(outcomeDescription: string): DelegationSuggestion[] {
    const suggestions: DelegationSuggestion[] = [];

    // Check if asking for all active outcomes
    if (outcomeDescription === 'all active outcomes') {
      // Get active outcomes from database and suggest delegation for each
      const outcomes = this.db.getAllOutcomes?.() || [];
      const activeOutcomes = outcomes.filter((o: any) =>
        o.status === 'in-progress' || o.status === 'committed' || o.status === 'exploring'
      );

      for (const outcome of activeOutcomes.slice(0, 5)) {  // Limit to 5
        const suggestion = this.suggestBuddyForTask(outcome.description);
        suggestions.push({
          task: outcome.description,
          ...suggestion,
        });
      }

      // If no active outcomes, provide general suggestions
      if (suggestions.length === 0) {
        suggestions.push({
          task: 'Plan your next big goal',
          buddyId: 'robin',
          buddyName: 'Robin',
          buddyEmoji: '🦊',
          reason: 'Strategic thinking and long-term planning',
          confidence: 0.8,
        });
        suggestions.push({
          task: 'Brainstorm creative ideas',
          buddyId: 'luna',
          buddyName: 'Luna',
          buddyEmoji: '🌙',
          reason: 'Creative thinking and brainstorming',
          confidence: 0.8,
        });
        suggestions.push({
          task: 'Tackle quick wins',
          buddyId: 'kai',
          buddyName: 'Kai',
          buddyEmoji: '⚡',
          reason: 'Quick execution and getting things done',
          confidence: 0.85,
        });
      }

      return suggestions;
    }

    // Single task delegation
    const suggestion = this.suggestBuddyForTask(outcomeDescription);
    suggestions.push({
      task: outcomeDescription,
      ...suggestion,
    });

    return suggestions;
  }

  private suggestBuddyForTask(description: string): Omit<DelegationSuggestion, 'task'> {
    const lowerDesc = description.toLowerCase();

    // Robin - Strategic/Planning
    if (lowerDesc.includes('plan') || lowerDesc.includes('strategy') || lowerDesc.includes('long-term') || lowerDesc.includes('think')) {
      return {
        buddyId: 'robin',
        buddyName: 'Robin',
        buddyEmoji: '🦊',
        reason: 'Strategic thinking and long-term planning',
        confidence: 0.8,
      };
    }

    // Kai - Action/Execution
    if (lowerDesc.includes('build') || lowerDesc.includes('implement') || lowerDesc.includes('fix') || lowerDesc.includes('ship') || lowerDesc.includes('fast') || lowerDesc.includes('do') || lowerDesc.includes('finish')) {
      return {
        buddyId: 'kai',
        buddyName: 'Kai',
        buddyEmoji: '⚡',
        reason: 'Quick execution and getting things done',
        confidence: 0.85,
      };
    }

    // Luna - Creative
    if (lowerDesc.includes('creative') || lowerDesc.includes('design') || lowerDesc.includes('idea') || lowerDesc.includes('brainstorm') || lowerDesc.includes('innovative') || lowerDesc.includes('explore')) {
      return {
        buddyId: 'luna',
        buddyName: 'Luna',
        buddyEmoji: '🌙',
        reason: 'Creative thinking and brainstorming',
        confidence: 0.8,
      };
    }

    // Nami - Organization/Wellness
    if (lowerDesc.includes('organize') || lowerDesc.includes('overwhelm') || lowerDesc.includes('prioritize') || lowerDesc.includes('calm') || lowerDesc.includes('habit') || lowerDesc.includes('routine')) {
      return {
        buddyId: 'nami',
        buddyName: 'Nami',
        buddyEmoji: '🌊',
        reason: 'Organization and reducing overwhelm',
        confidence: 0.8,
      };
    }

    // Default to Robin for general tasks
    return {
      buddyId: 'robin',
      buddyName: 'Robin',
      buddyEmoji: '🦊',
      reason: 'General guidance and thoughtful analysis',
      confidence: 0.6,
    };
  }

  // ============================================================================
  // Message History
  // ============================================================================

  getRecentMessages(limit: number = 20): MeshMessage[] {
    return this.messageQueue.slice(-limit);
  }

  getMessagesForBuddy(buddyId: string, limit: number = 20): MeshMessage[] {
    return this.messageQueue
      .filter(m => m.to === buddyId || m.to === 'broadcast' || m.from === buddyId)
      .slice(-limit);
  }
}

export default BuddyManager;
