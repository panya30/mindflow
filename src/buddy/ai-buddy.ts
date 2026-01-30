/**
 * AI Buddy
 *
 * Your personal AI that knows you deeply.
 * Not a task manager - a thinking partner.
 */

import OpenAI from 'openai';
import type {
  AIBuddyConfig,
  PersonalityProfile,
  WorkPatterns,
  HumanContext,
  ChatMessage,
  Outcome,
  Node,
} from '../types';
import type { MindGraph } from '../graph';
import type { MindflowDatabase } from '../storage';

export interface BuddyState {
  config: AIBuddyConfig;
  currentSessionId: string | null;
  humanContext: HumanContext;
  activeOutcomes: Outcome[];
  recentNodes: Node[];
}

export interface BuddyResponse {
  message: string;
  intent: 'chat' | 'capture' | 'clarify' | 'suggest' | 'commit' | 'update';
  suggestedActions?: string[];
  capturedOutcome?: Partial<Outcome>;
  capturedNode?: Partial<Node>;
  metadata?: Record<string, any>;
}

export class AIBuddy {
  private client: OpenAI;
  private config: AIBuddyConfig;
  private graph: MindGraph;
  private db: MindflowDatabase;
  private state: BuddyState;

  constructor(
    config: AIBuddyConfig,
    graph: MindGraph,
    db: MindflowDatabase,
    apiKey?: string
  ) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    this.config = config;
    this.graph = graph;
    this.db = db;

    this.state = {
      config,
      currentSessionId: null,
      humanContext: this.getDefaultHumanContext(),
      activeOutcomes: [],
      recentNodes: [],
    };

    // Load saved config if exists
    this.loadState();
  }

  // ============================================================================
  // Core Chat Interface
  // ============================================================================

  /**
   * Process a message from the human
   */
  async chat(message: string): Promise<BuddyResponse> {
    // Ensure we have a session
    if (!this.state.currentSessionId) {
      this.startSession();
    }

    // Save human message
    this.db.addChatMessage(this.state.currentSessionId!, {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });

    // Check if API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const fallbackResponse: BuddyResponse = {
        message: `I heard you say: "${message}"\n\nTo enable full AI responses, please set your OPENAI_API_KEY environment variable and restart the server.\n\nIn the meantime, you can still:\n• Create outcomes using the Outcomes tab\n• View your mind graph\n• Adjust your settings`,
        intent: 'chat',
        suggestedActions: ['Set up API key', 'Create an outcome', 'Explore the app'],
      };

      this.db.addChatMessage(this.state.currentSessionId!, {
        role: 'buddy',
        content: fallbackResponse.message,
        timestamp: Date.now(),
        metadata: { intent: 'chat', noApiKey: true },
      });

      return fallbackResponse;
    }

    try {
      // Build context for Claude
      const systemPrompt = this.buildSystemPrompt();
      const conversationHistory = this.getConversationHistory();

      // Call OpenAI
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message },
        ],
      });

      // Parse response
      const buddyResponse = this.parseResponse(response);

      // Save buddy message
      this.db.addChatMessage(this.state.currentSessionId!, {
        role: 'buddy',
        content: buddyResponse.message,
        timestamp: Date.now(),
        metadata: {
          intent: buddyResponse.intent,
          actionTaken: buddyResponse.suggestedActions?.[0],
        },
      });

      // Handle any captured items
      if (buddyResponse.capturedOutcome) {
        await this.captureOutcome(buddyResponse.capturedOutcome);
      }
      if (buddyResponse.capturedNode) {
        await this.captureNode(buddyResponse.capturedNode);
      }

      return buddyResponse;
    } catch (error) {
      console.error('AI chat error:', error);

      const errorResponse: BuddyResponse = {
        message: `I'm having trouble connecting to the AI service. Please check:\n\n1. Your OPENAI_API_KEY is valid\n2. You have internet connection\n3. The API service is available\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
        intent: 'chat',
        suggestedActions: ['Check API key', 'Try again'],
      };

      this.db.addChatMessage(this.state.currentSessionId!, {
        role: 'buddy',
        content: errorResponse.message,
        timestamp: Date.now(),
        metadata: { intent: 'chat', error: true },
      });

      return errorResponse;
    }
  }

  /**
   * Quick capture a thought without full conversation
   */
  async quickCapture(thought: string): Promise<Node> {
    const node = this.graph.addNode({
      type: 'thought',
      content: thought,
      createdBy: this.config.humanId,
      status: 'active',
      confidence: 0.5,
      energy: 'low',
      contributors: [],
      horizon: 'later',
      visibility: 'private',
      tags: [],
    });

    this.db.saveNode(node);
    return node;
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  startSession(): string {
    const session = this.db.createChatSession(this.config.id);
    this.state.currentSessionId = session.id;
    this.refreshContext();
    return session.id;
  }

  endSession(): void {
    this.state.currentSessionId = null;
  }

  // ============================================================================
  // Context Management
  // ============================================================================

  updateHumanContext(context: Partial<HumanContext>): void {
    this.state.humanContext = {
      ...this.state.humanContext,
      ...context,
      currentTime: Date.now(),
    };
  }

  refreshContext(): void {
    // Load active outcomes
    this.state.activeOutcomes = this.db.getOutcomesByStatus('in-progress');

    // Load recent nodes
    const allNodes = this.graph.getAllNodes();
    this.state.recentNodes = allNodes
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20);
  }

  // ============================================================================
  // Outcome Operations
  // ============================================================================

  async suggestActions(outcomeId: string): Promise<string[]> {
    const outcome = this.db.getOutcome(outcomeId);
    if (!outcome) return [];

    // Get related context from graph
    const relatedNodes = this.graph.query({
      tags: [outcomeId],
    });

    const prompt = `Given this outcome:
"${outcome.description}"

With success criteria:
${outcome.successCriteria.map(c => `- ${c.description} (${c.met ? 'done' : 'pending'})`).join('\n')}

Current progress: ${outcome.progress}%
Blockers: ${outcome.blockers.join(', ') || 'none'}

Related context:
${relatedNodes.map(n => `- [${n.type}] ${n.content}`).join('\n')}

Suggest 3-5 concrete next actions to move this forward.
Format as JSON array of strings.`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    try {
      const text = response.choices[0]?.message?.content || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback to simple parsing
    }

    return [];
  }

  // ============================================================================
  // Personality & Work Patterns
  // ============================================================================

  getPersonality(): PersonalityProfile {
    return this.config.personality;
  }

  updatePersonality(updates: Partial<PersonalityProfile>): void {
    this.config.personality = {
      ...this.config.personality,
      ...updates,
    };
    this.db.saveBuddyConfig(this.config);
  }

  getWorkPatterns(): WorkPatterns {
    return this.config.workPatterns;
  }

  updateWorkPatterns(updates: Partial<WorkPatterns>): void {
    this.config.workPatterns = {
      ...this.config.workPatterns,
      ...updates,
    };
    this.db.saveBuddyConfig(this.config);
  }

  /**
   * Check if now is a good time to work based on patterns
   */
  isProductiveTime(): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return this.config.workPatterns.productiveHours.some(range =>
      currentTime >= range.start && currentTime <= range.end
    );
  }

  /**
   * Estimate energy level based on time and patterns
   */
  estimateEnergy(): 'low' | 'medium' | 'high' {
    const now = new Date();
    const hour = now.getHours();

    // Simple heuristic - can be personalized
    if (hour >= 9 && hour <= 11) return 'high';
    if (hour >= 14 && hour <= 16) return 'medium';
    if (hour >= 20) return 'low';
    return 'medium';
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildSystemPrompt(): string {
    const { personality, humanName } = this.config;

    let styleGuide = '';
    switch (personality.communicationStyle) {
      case 'direct':
        styleGuide = 'Be concise and to the point. Skip pleasantries.';
        break;
      case 'detailed':
        styleGuide = 'Provide thorough explanations and context.';
        break;
      case 'visual':
        styleGuide = 'Use bullet points, lists, and structured formatting.';
        break;
    }

    const adhdSupport = personality.adhdMode
      ? `ADHD Mode: Help maintain focus. Break things into smaller chunks.
         Celebrate small wins. Avoid overwhelming with too many options.`
      : '';

    const anxietySupport = personality.anxietyAware
      ? `Anxiety-aware: Be reassuring. Avoid creating urgency unless necessary.
         Frame challenges as manageable. Validate feelings.`
      : '';

    return `You are an AI Buddy for ${humanName}. You're not a task manager - you're a thinking partner.

Your role:
- Help capture and clarify outcomes (not tasks)
- Understand context and connections
- Suggest actions based on energy and time
- Remember what matters to ${humanName}

Communication style: ${styleGuide}

${adhdSupport}
${anxietySupport}

Current context:
- Time: ${new Date().toLocaleTimeString()}
- Estimated energy: ${this.estimateEnergy()}
- Active outcomes: ${this.state.activeOutcomes.length}
- Recent activity: ${this.state.humanContext.recentActivity.slice(0, 3).join(', ') || 'none'}

When responding, always include a JSON block at the end with:
{
  "intent": "chat|capture|clarify|suggest|commit|update",
  "suggestedActions": ["action1", "action2"],
  "capturedOutcome": { ... } // if capturing a new outcome
  "capturedNode": { ... } // if capturing a thought/decision/etc
}`;
  }

  private getConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    if (!this.state.currentSessionId) return [];

    const session = this.db.getChatSession(this.state.currentSessionId);
    if (!session) return [];

    return session.messages.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }));
  }

  private parseResponse(response: OpenAI.Chat.Completions.ChatCompletion): BuddyResponse {
    const text = response.choices[0]?.message?.content || '';

    // Try to extract JSON block
    const jsonMatch = text.match(/\{[\s\S]*"intent"[\s\S]*\}/);
    let metadata: Partial<BuddyResponse> = {};

    if (jsonMatch) {
      try {
        metadata = JSON.parse(jsonMatch[0]);
      } catch {
        // Continue without metadata
      }
    }

    // Remove JSON from visible message
    let cleanMessage = text
      .replace(/\{[\s\S]*"intent"[\s\S]*\}/, '')  // Remove JSON with intent
      .replace(/```json\s*```/g, '')              // Remove empty json code blocks
      .replace(/```json[\s\S]*?```/g, '')         // Remove any json code blocks
      .replace(/```\s*```/g, '')                  // Remove empty code blocks
      .trim();

    return {
      message: cleanMessage || text,
      intent: metadata.intent || 'chat',
      suggestedActions: metadata.suggestedActions,
      capturedOutcome: metadata.capturedOutcome,
      capturedNode: metadata.capturedNode,
      metadata: {},
    };
  }

  private async captureOutcome(partial: Partial<Outcome>): Promise<void> {
    const outcome: Outcome = {
      id: `outcome_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      description: partial.description || '',
      successCriteria: partial.successCriteria || [],
      motivation: partial.motivation || '',
      requestedBy: this.config.humanId,
      ownedBy: partial.ownedBy,
      contributors: partial.contributors || [],
      horizon: partial.horizon || { type: 'later' },
      createdAt: Date.now(),
      suggestedActions: partial.suggestedActions || [],
      status: 'exploring',
      progress: 0,
      confidence: partial.confidence || 0.5,
      blockers: [],
    };

    this.db.saveOutcome(outcome);
    this.state.activeOutcomes.push(outcome);
  }

  private async captureNode(partial: Partial<Node>): Promise<void> {
    const node = this.graph.addNode({
      type: partial.type || 'thought',
      content: partial.content || '',
      createdBy: this.config.humanId,
      status: partial.status || 'active',
      confidence: partial.confidence || 0.5,
      energy: partial.energy || 'medium',
      owner: partial.owner,
      contributors: partial.contributors || [],
      horizon: partial.horizon || 'later',
      visibility: partial.visibility || 'private',
      tags: partial.tags || [],
    });

    this.db.saveNode(node);
  }

  private loadState(): void {
    const savedConfig = this.db.getBuddyConfig(this.config.id);
    if (savedConfig) {
      this.config = {
        ...this.config,
        personality: savedConfig.personality,
        workPatterns: savedConfig.workPatterns,
      };
    }
  }

  private getDefaultHumanContext(): HumanContext {
    return {
      currentTime: Date.now(),
      estimatedEnergy: this.estimateEnergy(),
      recentActivity: [],
      upcomingCommitments: [],
    };
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  static createDefault(
    humanId: string,
    humanName: string,
    graph: MindGraph,
    db: MindflowDatabase
  ): AIBuddy {
    const config: AIBuddyConfig = {
      id: `buddy_${humanId}`,
      name: 'Buddy',
      humanId,
      humanName,
      personality: {
        preferredWorkStyle: 'context-switch',
        communicationStyle: 'direct',
        notificationPreference: 'moderate',
        interruptTolerance: 'medium',
        decisionStyle: 'quick',
        adhdMode: false,
        anxietyAware: false,
        visualThinker: false,
      },
      workPatterns: {
        productiveHours: [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '18:00' },
        ],
        meetingPreference: [
          { start: '10:00', end: '11:00' },
          { start: '15:00', end: '16:00' },
        ],
        focusBlocks: [
          { start: '09:00', end: '10:00' },
          { start: '14:00', end: '15:00' },
        ],
        maxActiveCommitments: 3,
        preferredBatchSize: 5,
        recoveryTimeNeeded: 15,
      },
    };

    return new AIBuddy(config, graph, db);
  }
}

export default AIBuddy;
