/**
 * Mindflow API Server
 *
 * HTTP API for the Mindflow web interface
 */

import { MindGraph } from '../graph';
import { MindflowDatabase } from '../storage';
import { BuddyManager, BUDDY_PROFILES } from '../buddy';
import { OutcomeManager } from '../outcomes';

export interface ServerConfig {
  port?: number;
  dbPath?: string;
  openaiKey?: string;
}

export class MindflowServer {
  private db: MindflowDatabase;
  private graph: MindGraph;
  private buddyManager: BuddyManager;
  private outcomes: OutcomeManager;
  private port: number;

  constructor(config: ServerConfig = {}) {
    this.port = config.port || 3456;

    // Initialize database
    this.db = new MindflowDatabase({ path: config.dbPath });

    // Load or create graph
    this.graph = this.db.loadGraph();

    // Initialize managers
    this.outcomes = new OutcomeManager(this.db, this.graph);

    // Create buddy manager with all buddies
    this.buddyManager = new BuddyManager(this.graph, this.db, 'robin');
  }

  // Getter for backward compatibility
  private get buddy() {
    return this.buddyManager.getActiveBuddy();
  }

  start(): void {
    const server = Bun.serve({
      port: this.port,
      fetch: async (req) => {
        const url = new URL(req.url);
        const path = url.pathname;
        const method = req.method;

        // CORS headers
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (method === 'OPTIONS') {
          return new Response(null, { headers: corsHeaders });
        }

        try {
          let response: Response;

          // Routes
          if (path === '/health' && method === 'GET') {
            response = this.json({ status: 'ok', time: Date.now() });
          }
          else if (path === '/chat' && method === 'POST') {
            response = await this.handleChat(req);
          }
          else if (path === '/outcomes' && method === 'GET') {
            response = await this.handleGetOutcomes(req);
          }
          else if (path === '/outcomes' && method === 'POST') {
            response = await this.handleCreateOutcome(req);
          }
          else if (path.startsWith('/outcomes/') && method === 'GET') {
            response = await this.handleGetOutcome(req, path);
          }
          else if (path.startsWith('/outcomes/') && method === 'PUT') {
            response = await this.handleUpdateOutcome(req, path);
          }
          else if (path.startsWith('/outcomes/') && method === 'DELETE') {
            response = await this.handleDeleteOutcome(req, path);
          }
          else if (path === '/graph' && method === 'GET') {
            response = await this.handleGetGraph();
          }
          else if (path === '/graph/nodes' && method === 'POST') {
            response = await this.handleCreateNode(req);
          }
          else if (path === '/settings' && method === 'GET') {
            response = await this.handleGetSettings();
          }
          else if (path === '/settings' && method === 'POST') {
            response = await this.handleUpdateSettings(req);
          }
          else if (path === '/stats' && method === 'GET') {
            response = await this.handleGetStats();
          }
          // Action Suggestions
          else if (path.startsWith('/outcomes/') && path.endsWith('/suggestions') && method === 'GET') {
            response = await this.handleGetSuggestions(path);
          }
          // Daily Standup
          else if (path === '/standup' && method === 'GET') {
            response = await this.handleGetStandup();
          }
          else if (path === '/standup' && method === 'POST') {
            response = await this.handleSubmitStandup(req);
          }
          // Progress Insights
          else if (path === '/insights' && method === 'GET') {
            response = await this.handleGetInsights();
          }
          // Quick Capture
          else if (path === '/capture' && method === 'POST') {
            response = await this.handleQuickCapture(req);
          }
          // Outcome Templates
          else if (path === '/templates' && method === 'GET') {
            response = await this.handleGetTemplates();
          }
          else if (path === '/templates/apply' && method === 'POST') {
            response = await this.handleApplyTemplate(req);
          }
          // Buddy Management
          else if (path === '/buddies' && method === 'GET') {
            response = await this.handleGetBuddies();
          }
          else if (path === '/buddies/active' && method === 'GET') {
            response = await this.handleGetActiveBuddy();
          }
          else if (path === '/buddies/active' && method === 'POST') {
            response = await this.handleSetActiveBuddy(req);
          }
          else if (path.startsWith('/buddies/') && path.endsWith('/perspective') && method === 'POST') {
            response = await this.handleGetBuddyPerspective(req, path);
          }
          else if (path === '/buddies/consensus' && method === 'POST') {
            response = await this.handleGetTeamConsensus(req);
          }
          else if (path === '/mesh/messages' && method === 'GET') {
            response = await this.handleGetMeshMessages();
          }
          else if (path === '/mesh/send' && method === 'POST') {
            response = await this.handleSendMeshMessage(req);
          }
          // Team Features
          else if (path === '/team/meeting' && method === 'POST') {
            response = await this.handleTeamMeeting(req);
          }
          else if (path === '/team/delegate' && method === 'POST') {
            response = await this.handleSuggestDelegation(req);
          }
          else if (path === '/team/activity' && method === 'GET') {
            response = await this.handleGetTeamActivity();
          }
          // User Authentication
          else if (path === '/auth/register' && method === 'POST') {
            response = await this.handleRegister(req);
          }
          else if (path === '/auth/login' && method === 'POST') {
            response = await this.handleLogin(req);
          }
          else if (path === '/auth/me' && method === 'GET') {
            response = await this.handleGetCurrentUser(req);
          }
          // User Buddy Assignment
          else if (path === '/users/buddy' && method === 'POST') {
            response = await this.handleAssignBuddy(req);
          }
          else if (path === '/users/buddy' && method === 'GET') {
            response = await this.handleGetUserBuddy(req);
          }
          // Team Management
          else if (path === '/teams' && method === 'POST') {
            response = await this.handleCreateTeam(req);
          }
          else if (path === '/teams' && method === 'GET') {
            response = await this.handleGetUserTeams(req);
          }
          else if (path.startsWith('/teams/') && path.endsWith('/members') && method === 'GET') {
            response = await this.handleGetTeamMembers(req, path);
          }
          else if (path.startsWith('/teams/') && path.endsWith('/members') && method === 'POST') {
            response = await this.handleAddTeamMember(req, path);
          }
          // All Users (for team view)
          else if (path === '/users' && method === 'GET') {
            response = await this.handleGetAllUsers();
          }
          // Buddy Messages
          else if (path === '/buddy-messages' && method === 'GET') {
            response = await this.handleGetBuddyMessages(req);
          }
          else if (path === '/buddy-messages' && method === 'POST') {
            response = await this.handleSendBuddyMessage(req);
          }
          else {
            response = this.json({ error: 'Not found' }, 404);
          }

          // Add CORS headers to response
          const newHeaders = new Headers(response.headers);
          Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
          return new Response(response.body, {
            status: response.status,
            headers: newHeaders,
          });
        } catch (error) {
          console.error('Server error:', error);
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      },
    });

    console.log(`🧠 Mindflow server running at http://localhost:${this.port}`);
  }

  // ============================================================================
  // Route Handlers
  // ============================================================================

  private async handleChat(req: Request): Promise<Response> {
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return this.json({ error: 'Message required' }, 400);
    }

    const response = await this.buddyManager.chat(message);
    return this.json(response);
  }

  private async handleGetOutcomes(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const horizon = url.searchParams.get('horizon') as any;
    const status = url.searchParams.get('status');

    const filter: any = {};
    if (horizon) filter.horizon = horizon;
    if (status) filter.status = [status];

    const outcomes = this.outcomes.list(filter);
    return this.json(outcomes);
  }

  private async handleCreateOutcome(req: Request): Promise<Response> {
    const body = await req.json();
    const { description, motivation, horizon, successCriteria } = body;

    if (!description) {
      return this.json({ error: 'Description required' }, 400);
    }

    const outcome = this.outcomes.create({
      description,
      motivation: motivation || 'No motivation provided',
      requestedBy: 'default',
      horizon,
      successCriteria,
    });

    return this.json(outcome, 201);
  }

  private async handleGetOutcome(req: Request, path: string): Promise<Response> {
    const id = path.split('/')[2];
    const outcome = this.outcomes.get(id);

    if (!outcome) {
      return this.json({ error: 'Outcome not found' }, 404);
    }

    return this.json(outcome);
  }

  private async handleUpdateOutcome(req: Request, path: string): Promise<Response> {
    const id = path.split('/')[2];
    const body = await req.json();

    const outcome = this.outcomes.update(id, body);

    if (!outcome) {
      return this.json({ error: 'Outcome not found' }, 404);
    }

    return this.json(outcome);
  }

  private async handleDeleteOutcome(req: Request, path: string): Promise<Response> {
    const id = path.split('/')[2];
    const deleted = this.outcomes.delete(id);

    if (!deleted) {
      return this.json({ error: 'Outcome not found' }, 404);
    }

    return this.json({ success: true });
  }

  private async handleGetGraph(): Promise<Response> {
    const data = this.graph.toJSON();
    return this.json(data);
  }

  private async handleCreateNode(req: Request): Promise<Response> {
    const body = await req.json();
    const { type, content, tags } = body;

    if (!type || !content) {
      return this.json({ error: 'Type and content required' }, 400);
    }

    const node = this.graph.addNode({
      type,
      content,
      createdBy: 'default',
      status: 'active',
      confidence: 0.5,
      energy: 'medium',
      contributors: [],
      horizon: 'later',
      visibility: 'private',
      tags: tags || [],
    });

    this.db.saveNode(node);
    return this.json(node, 201);
  }

  private async handleGetSettings(): Promise<Response> {
    const config = this.db.getBuddyConfig(this.buddy.getPersonality() ? 'buddy_default' : 'default');
    return this.json(config || {});
  }

  private async handleUpdateSettings(req: Request): Promise<Response> {
    const body = await req.json();
    const { buddyName, humanName, commStyle, workStyle, adhdMode, anxietyMode, maxCommitments } = body;

    // Update buddy personality
    if (commStyle || adhdMode !== undefined || anxietyMode !== undefined) {
      this.buddy.updatePersonality({
        communicationStyle: commStyle,
        adhdMode: adhdMode,
        anxietyAware: anxietyMode,
      });
    }

    // Update work patterns
    if (maxCommitments !== undefined) {
      this.buddy.updateWorkPatterns({
        maxActiveCommitments: maxCommitments,
      });
    }

    return this.json({ success: true });
  }

  private async handleGetStats(): Promise<Response> {
    const dbStats = this.db.getStats();
    const graphStats = this.graph.getStats();

    return this.json({
      ...dbStats,
      graph: graphStats,
    });
  }

  // ============================================================================
  // Smart Action Suggestions
  // ============================================================================

  private async handleGetSuggestions(path: string): Promise<Response> {
    const parts = path.split('/');
    const outcomeId = parts[2];

    try {
      const suggestions = await this.buddy.suggestActions(outcomeId);
      return this.json({ suggestions });
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return this.json({ suggestions: [], error: 'Failed to generate suggestions' });
    }
  }

  // ============================================================================
  // Daily Standup
  // ============================================================================

  private async handleGetStandup(): Promise<Response> {
    // Get recent activity and outcomes for standup context
    const activeOutcomes = this.db.getOutcomesByStatus('in-progress');
    const blockedOutcomes = this.db.getOutcomesByStatus('blocked');
    const recentOutcomes = this.outcomes.list({}).slice(0, 10);

    // Get yesterday's activity from chat history
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    return this.json({
      activeOutcomes: activeOutcomes.length,
      blockedOutcomes: blockedOutcomes.length,
      outcomes: recentOutcomes,
      blocked: blockedOutcomes,
      prompt: this.generateStandupPrompt(activeOutcomes, blockedOutcomes),
    });
  }

  private generateStandupPrompt(active: any[], blocked: any[]): string {
    const prompts = [
      "Good morning! Let's do a quick standup.",
      `You have ${active.length} active outcome${active.length !== 1 ? 's' : ''}.`,
    ];

    if (blocked.length > 0) {
      prompts.push(`⚠️ ${blocked.length} outcome${blocked.length !== 1 ? 's are' : ' is'} blocked.`);
    }

    prompts.push("\n**What did you accomplish yesterday?**");
    prompts.push("**What are you working on today?**");
    prompts.push("**Any blockers or concerns?**");

    return prompts.join('\n');
  }

  private async handleSubmitStandup(req: Request): Promise<Response> {
    const body = await req.json();
    const { yesterday, today, blockers } = body;

    // Process standup with AI
    const standupMessage = `
**Daily Standup Summary**

**Yesterday:** ${yesterday || 'Nothing reported'}

**Today:** ${today || 'Nothing planned'}

**Blockers:** ${blockers || 'None'}

Please acknowledge this standup and provide any suggestions or encouragement.
    `.trim();

    const response = await this.buddy.chat(standupMessage);

    // Save standup as a node for tracking
    const standupNode = this.graph.addNode({
      type: 'context',
      content: `Standup: ${new Date().toLocaleDateString()} - Yesterday: ${yesterday}, Today: ${today}, Blockers: ${blockers}`,
      createdBy: 'default',
      status: 'active',
      confidence: 1,
      energy: 'medium',
      contributors: [],
      horizon: 'now',
      visibility: 'private',
      tags: ['standup', 'daily'],
    });
    this.db.saveNode(standupNode);

    return this.json({
      message: response.message,
      standupId: standupNode.id,
    });
  }

  // ============================================================================
  // Progress Insights
  // ============================================================================

  private async handleGetInsights(): Promise<Response> {
    const allOutcomes = this.outcomes.list({});
    const nodes = this.graph.getAllNodes();

    // Calculate insights
    const insights = {
      // Outcome stats
      totalOutcomes: allOutcomes.length,
      byStatus: this.groupBy(allOutcomes, 'status'),
      byHorizon: this.groupByHorizon(allOutcomes),

      // Completion rate
      achieved: allOutcomes.filter(o => o.status === 'achieved').length,
      abandoned: allOutcomes.filter(o => o.status === 'abandoned').length,
      completionRate: this.calculateCompletionRate(allOutcomes),

      // Blockers analysis
      currentBlockers: allOutcomes.filter(o => o.status === 'blocked').map(o => ({
        id: o.id,
        description: o.description,
        blockers: o.blockers,
      })),

      // Progress distribution
      progressDistribution: this.calculateProgressDistribution(allOutcomes),

      // Activity patterns
      nodesByType: this.groupBy(nodes, 'type'),
      recentActivity: nodes
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 10)
        .map(n => ({
          type: n.type,
          content: n.content.slice(0, 100),
          updatedAt: n.updatedAt,
        })),

      // Suggestions based on analysis
      suggestions: this.generateInsightSuggestions(allOutcomes),
    };

    return this.json(insights);
  }

  private groupBy(items: any[], key: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = item[key] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private groupByHorizon(outcomes: any[]): Record<string, number> {
    return outcomes.reduce((acc, o) => {
      const horizon = o.horizon?.type || o.horizon || 'unknown';
      acc[horizon] = (acc[horizon] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateCompletionRate(outcomes: any[]): number {
    const completed = outcomes.filter(o => o.status === 'achieved').length;
    const total = outcomes.filter(o => ['achieved', 'abandoned'].includes(o.status)).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  private calculateProgressDistribution(outcomes: any[]): Record<string, number> {
    const distribution = { '0-25': 0, '26-50': 0, '51-75': 0, '76-99': 0, '100': 0 };
    outcomes.forEach(o => {
      const p = o.progress || 0;
      if (p === 100) distribution['100']++;
      else if (p >= 76) distribution['76-99']++;
      else if (p >= 51) distribution['51-75']++;
      else if (p >= 26) distribution['26-50']++;
      else distribution['0-25']++;
    });
    return distribution;
  }

  private generateInsightSuggestions(outcomes: any[]): string[] {
    const suggestions: string[] = [];

    const blocked = outcomes.filter(o => o.status === 'blocked');
    if (blocked.length > 0) {
      suggestions.push(`🚧 You have ${blocked.length} blocked outcome(s). Consider addressing blockers first.`);
    }

    const stale = outcomes.filter(o => {
      const daysSinceUpdate = (Date.now() - o.updatedAt) / (1000 * 60 * 60 * 24);
      return o.status === 'in-progress' && daysSinceUpdate > 7;
    });
    if (stale.length > 0) {
      suggestions.push(`📅 ${stale.length} outcome(s) haven't been updated in over a week.`);
    }

    const nowCount = outcomes.filter(o => (o.horizon?.type || o.horizon) === 'now' && o.status !== 'achieved').length;
    if (nowCount > 5) {
      suggestions.push(`⚡ You have ${nowCount} "Now" priorities. Consider moving some to "Soon".`);
    }

    const exploring = outcomes.filter(o => o.status === 'exploring').length;
    if (exploring > 3) {
      suggestions.push(`💭 ${exploring} outcomes are still in "Exploring". Commit to or abandon some.`);
    }

    if (suggestions.length === 0) {
      suggestions.push(`✨ Looking good! Keep up the momentum.`);
    }

    return suggestions;
  }

  // ============================================================================
  // Quick Capture
  // ============================================================================

  private async handleQuickCapture(req: Request): Promise<Response> {
    const body = await req.json();
    const { text, type = 'auto' } = body;

    if (!text || !text.trim()) {
      return this.json({ error: 'Text is required' }, 400);
    }

    // Use AI to classify and process the capture
    const classificationPrompt = `
Analyze this quick capture and classify it:
"${text}"

Respond with JSON only:
{
  "type": "thought" | "outcome" | "action" | "blocker" | "decision",
  "processed": "cleaned up version of the text",
  "suggestedHorizon": "now" | "soon" | "later" | "someday",
  "tags": ["tag1", "tag2"]
}
`;

    let classification = {
      type: type === 'auto' ? 'thought' : type,
      processed: text.trim(),
      suggestedHorizon: 'later',
      tags: [] as string[],
    };

    // Try AI classification if available
    try {
      const response = await this.buddy.chat(classificationPrompt);
      const jsonMatch = response.message.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        classification = { ...classification, ...parsed };
      }
    } catch (e) {
      // Use defaults if AI fails
    }

    // Create the appropriate node/outcome
    if (classification.type === 'outcome') {
      const outcome = this.outcomes.create({
        description: classification.processed,
        motivation: 'Quick captured',
        requestedBy: 'default',
        horizon: classification.suggestedHorizon,
        successCriteria: [],
      });
      return this.json({
        success: true,
        type: 'outcome',
        item: outcome,
        classification
      });
    } else {
      const node = this.graph.addNode({
        type: classification.type as any,
        content: classification.processed,
        createdBy: 'default',
        status: 'active',
        confidence: 0.7,
        energy: 'medium',
        contributors: [],
        horizon: classification.suggestedHorizon as any,
        visibility: 'private',
        tags: classification.tags,
      });
      this.db.saveNode(node);
      return this.json({
        success: true,
        type: classification.type,
        item: node,
        classification
      });
    }
  }

  // ============================================================================
  // Outcome Templates
  // ============================================================================

  private async handleGetTemplates(): Promise<Response> {
    const templates = [
      {
        id: 'project-launch',
        name: 'Project Launch',
        icon: '🚀',
        description: 'Launch a new project or product',
        fields: {
          description: 'Launch [project name]',
          motivation: 'To [achieve goal] by [deadline context]',
          horizon: 'soon',
          successCriteria: [
            'Core features complete and tested',
            'Documentation ready',
            'Stakeholders signed off',
            'Deployment successful',
          ],
        },
      },
      {
        id: 'learning-goal',
        name: 'Learning Goal',
        icon: '📚',
        description: 'Learn a new skill or technology',
        fields: {
          description: 'Learn [skill/technology]',
          motivation: 'To improve my ability to [use case]',
          horizon: 'later',
          successCriteria: [
            'Complete introductory course/tutorial',
            'Build a practice project',
            'Apply to real work',
          ],
        },
      },
      {
        id: 'habit-building',
        name: 'Habit Building',
        icon: '🔄',
        description: 'Build a new positive habit',
        fields: {
          description: 'Build habit of [habit]',
          motivation: 'To improve my [area of life]',
          horizon: 'later',
          successCriteria: [
            'Define specific trigger and routine',
            'Track for 7 consecutive days',
            'Track for 21 consecutive days',
            'Track for 66 days (habit formed)',
          ],
        },
      },
      {
        id: 'bug-fix',
        name: 'Bug Fix',
        icon: '🐛',
        description: 'Fix a bug or issue',
        fields: {
          description: 'Fix: [bug description]',
          motivation: 'To resolve [impact on users/system]',
          horizon: 'now',
          successCriteria: [
            'Root cause identified',
            'Fix implemented',
            'Tests added/updated',
            'Verified in staging',
            'Deployed to production',
          ],
        },
      },
      {
        id: 'feature-development',
        name: 'Feature Development',
        icon: '✨',
        description: 'Build a new feature',
        fields: {
          description: 'Build [feature name]',
          motivation: 'To enable users to [capability]',
          horizon: 'soon',
          successCriteria: [
            'Requirements defined',
            'Design approved',
            'Implementation complete',
            'Tests passing',
            'Code reviewed',
            'Documentation updated',
          ],
        },
      },
      {
        id: 'research',
        name: 'Research & Discovery',
        icon: '🔍',
        description: 'Research a topic or explore options',
        fields: {
          description: 'Research [topic]',
          motivation: 'To make informed decision about [decision]',
          horizon: 'soon',
          successCriteria: [
            'Key questions defined',
            'Sources identified and reviewed',
            'Findings documented',
            'Recommendation made',
          ],
        },
      },
      {
        id: 'health-goal',
        name: 'Health Goal',
        icon: '💪',
        description: 'Achieve a health or fitness goal',
        fields: {
          description: 'Achieve [health goal]',
          motivation: 'To improve my [health aspect]',
          horizon: 'later',
          successCriteria: [
            'Baseline measured',
            'Plan created',
            'Weekly check-ins',
            'Target achieved',
          ],
        },
      },
      {
        id: 'creative-project',
        name: 'Creative Project',
        icon: '🎨',
        description: 'Complete a creative endeavor',
        fields: {
          description: 'Create [creative work]',
          motivation: 'To express [idea/emotion] through [medium]',
          horizon: 'someday',
          successCriteria: [
            'Concept defined',
            'First draft/prototype complete',
            'Feedback gathered',
            'Final version complete',
            'Shared/published',
          ],
        },
      },
    ];

    return this.json({ templates });
  }

  private async handleApplyTemplate(req: Request): Promise<Response> {
    const body = await req.json();
    const { templateId, customizations } = body;

    const templatesResponse = await this.handleGetTemplates();
    const templatesData = await templatesResponse.json();
    const template = templatesData.templates.find((t: any) => t.id === templateId);

    if (!template) {
      return this.json({ error: 'Template not found' }, 404);
    }

    // Merge template with customizations
    const outcomeData = {
      description: customizations?.description || template.fields.description,
      motivation: customizations?.motivation || template.fields.motivation,
      horizon: customizations?.horizon || template.fields.horizon,
      successCriteria: customizations?.successCriteria || template.fields.successCriteria,
    };

    const outcome = this.outcomes.create({
      ...outcomeData,
      requestedBy: 'default',
    });

    return this.json({ success: true, outcome });
  }

  // ============================================================================
  // Buddy Management
  // ============================================================================

  private async handleGetBuddies(): Promise<Response> {
    const profiles = this.buddyManager.getAllBuddyProfiles();
    const activeId = this.buddyManager.getActiveBuddyProfile().id;

    return this.json({
      buddies: profiles.map(p => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        tagline: p.tagline,
        specialty: p.specialty,
        isActive: p.id === activeId,
      })),
      activeId,
    });
  }

  private async handleGetActiveBuddy(): Promise<Response> {
    const profile = this.buddyManager.getActiveBuddyProfile();
    return this.json({
      id: profile.id,
      name: profile.name,
      emoji: profile.emoji,
      tagline: profile.tagline,
      specialty: profile.specialty,
    });
  }

  private async handleSetActiveBuddy(req: Request): Promise<Response> {
    const body = await req.json();
    const { buddyId } = body;

    if (!buddyId) {
      return this.json({ error: 'buddyId required' }, 400);
    }

    const success = this.buddyManager.setActiveBuddy(buddyId);

    if (!success) {
      return this.json({ error: 'Buddy not found' }, 404);
    }

    const profile = this.buddyManager.getActiveBuddyProfile();
    return this.json({
      success: true,
      buddy: {
        id: profile.id,
        name: profile.name,
        emoji: profile.emoji,
        tagline: profile.tagline,
        specialty: profile.specialty,
      },
    });
  }

  private async handleGetBuddyPerspective(req: Request, path: string): Promise<Response> {
    const parts = path.split('/');
    const buddyId = parts[2];
    const body = await req.json();
    const { outcomeId } = body;

    if (!outcomeId) {
      return this.json({ error: 'outcomeId required' }, 400);
    }

    try {
      const perspective = await this.buddyManager.getBuddyPerspective(buddyId, outcomeId);
      const profile = BUDDY_PROFILES.find(p => p.id === buddyId);

      return this.json({
        buddyId,
        buddyName: profile?.name || buddyId,
        buddyEmoji: profile?.emoji || '🤖',
        perspective,
      });
    } catch (error) {
      return this.json({ error: 'Failed to get perspective' }, 500);
    }
  }

  private async handleGetTeamConsensus(req: Request): Promise<Response> {
    const body = await req.json();
    const { outcomeId } = body;

    if (!outcomeId) {
      return this.json({ error: 'outcomeId required' }, 400);
    }

    try {
      const consensus = await this.buddyManager.getTeamConsensus(outcomeId);
      const perspectives = BUDDY_PROFILES.map(p => ({
        buddyId: p.id,
        buddyName: p.name,
        buddyEmoji: p.emoji,
        specialty: p.specialty,
        perspective: consensus[p.id],
      }));

      return this.json({ outcomeId, perspectives });
    } catch (error) {
      return this.json({ error: 'Failed to get consensus' }, 500);
    }
  }

  private async handleGetMeshMessages(): Promise<Response> {
    const messages = this.buddyManager.getRecentMessages(50);
    return this.json({ messages });
  }

  private async handleSendMeshMessage(req: Request): Promise<Response> {
    const body = await req.json();
    const { from, to, type, payload, priority, requiresHumanApproval } = body;

    if (!from || !to || !type || !payload) {
      return this.json({ error: 'from, to, type, and payload are required' }, 400);
    }

    const message = await this.buddyManager.sendMessage({
      from,
      to,
      type,
      payload,
      priority: priority || 'normal',
      requiresHumanApproval: requiresHumanApproval || false,
    });

    return this.json({ success: true, message });
  }

  // ============================================================================
  // Team Features
  // ============================================================================

  private async handleTeamMeeting(req: Request): Promise<Response> {
    const body = await req.json();
    const { outcomeId } = body;

    try {
      // Allow team meetings without a specific outcome
      const meeting = await this.buddyManager.holdTeamMeeting(outcomeId);
      return this.json({
        success: true,
        topic: meeting.topic,
        perspectives: meeting.perspectives,
        consensus: meeting.consensus,
        nextSteps: meeting.nextSteps,
      });
    } catch (error) {
      console.error('Team meeting error:', error);
      return this.json({ success: false, error: 'Failed to hold team meeting' }, 500);
    }
  }

  private async handleSuggestDelegation(req: Request): Promise<Response> {
    const body = await req.json();
    const { description } = body;

    // If no description provided, get delegation for all active outcomes
    const suggestions = this.buddyManager.suggestDelegation(description || 'all active outcomes');
    return this.json({ suggestions });
  }

  private async handleGetTeamActivity(): Promise<Response> {
    const messages = this.buddyManager.getRecentMessages(50);

    // Format messages for display
    const activities = messages.map(m => {
      const fromBuddy = BUDDY_PROFILES.find(p => p.id === m.from);

      return {
        id: m.id,
        buddyName: fromBuddy?.name || m.from,
        buddyEmoji: fromBuddy?.emoji || '🤖',
        action: m.payload?.content || m.type || 'Activity',
        timestamp: m.timestamp,
      };
    });

    return this.json({ activities });
  }

  // ============================================================================
  // User Authentication
  // ============================================================================

  private async handleRegister(req: Request): Promise<Response> {
    const body = await req.json();
    const { username, password, displayName, email, avatarEmoji, buddyId } = body;

    if (!username || !password || !displayName) {
      return this.json({ error: 'Username, password, and display name are required' }, 400);
    }

    // Check if username exists
    const existing = this.db.getUserByUsername(username);
    if (existing) {
      return this.json({ error: 'Username already exists' }, 400);
    }

    // Simple password hash (in production, use bcrypt)
    const passwordHash = await this.hashPassword(password);

    try {
      const user = this.db.createUser({
        username,
        passwordHash,
        displayName,
        email,
        avatarEmoji,
      });

      // Assign buddy if provided
      let buddyProfile = null;
      if (buddyId) {
        this.db.assignBuddyToUser(user.id, buddyId);
        buddyProfile = BUDDY_PROFILES.find(p => p.id === buddyId);
      }

      return this.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarEmoji: avatarEmoji || '👤',
          buddyId,
          buddyName: buddyProfile?.name,
          buddyEmoji: buddyProfile?.emoji,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      return this.json({ error: 'Failed to create user' }, 500);
    }
  }

  private async handleLogin(req: Request): Promise<Response> {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return this.json({ error: 'Username and password are required' }, 400);
    }

    const user = this.db.getUserByUsername(username);
    if (!user) {
      return this.json({ error: 'Invalid username or password' }, 401);
    }

    // Verify password
    const isValid = await this.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return this.json({ error: 'Invalid username or password' }, 401);
    }

    // Update last login
    this.db.updateUserLastLogin(user.id);

    // Get user's buddy
    const userBuddy = this.db.getUserBuddy(user.id);
    const buddyProfile = userBuddy ? BUDDY_PROFILES.find(p => p.id === userBuddy.buddy_profile_id) : null;

    return this.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarEmoji: user.avatar_emoji,
        buddyId: userBuddy?.buddy_profile_id,
        buddyName: buddyProfile?.name,
        buddyEmoji: buddyProfile?.emoji,
      },
    });
  }

  private async handleGetCurrentUser(req: Request): Promise<Response> {
    // In a real app, this would verify a session token
    // For now, we'll use a userId header
    const userId = req.headers.get('X-User-Id');

    if (!userId) {
      return this.json({ error: 'Not authenticated' }, 401);
    }

    const user = this.db.getUserById(userId);
    if (!user) {
      return this.json({ error: 'User not found' }, 404);
    }

    const userBuddy = this.db.getUserBuddy(user.id);
    const buddyProfile = userBuddy ? BUDDY_PROFILES.find(p => p.id === userBuddy.buddy_profile_id) : null;

    return this.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarEmoji: user.avatar_emoji,
      buddyId: userBuddy?.buddy_profile_id,
      buddyName: buddyProfile?.name,
      buddyEmoji: buddyProfile?.emoji,
      teams: this.db.getUserTeams(user.id),
    });
  }

  // ============================================================================
  // User Buddy Assignment
  // ============================================================================

  private async handleAssignBuddy(req: Request): Promise<Response> {
    const body = await req.json();
    const { userId, buddyId, customName } = body;

    if (!userId || !buddyId) {
      return this.json({ error: 'userId and buddyId are required' }, 400);
    }

    // Verify buddy profile exists
    const buddyProfile = BUDDY_PROFILES.find(p => p.id === buddyId);
    if (!buddyProfile) {
      return this.json({ error: 'Invalid buddy profile' }, 400);
    }

    try {
      this.db.assignBuddyToUser(userId, buddyId, customName);

      return this.json({
        success: true,
        buddy: {
          id: buddyProfile.id,
          name: customName || buddyProfile.name,
          emoji: buddyProfile.emoji,
          tagline: buddyProfile.tagline,
          specialty: buddyProfile.specialty,
        },
      });
    } catch (error) {
      console.error('Buddy assignment error:', error);
      return this.json({ error: 'Failed to assign buddy' }, 500);
    }
  }

  private async handleGetUserBuddy(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || req.headers.get('X-User-Id');

    if (!userId) {
      return this.json({ error: 'userId is required' }, 400);
    }

    const userBuddy = this.db.getUserBuddy(userId);
    if (!userBuddy) {
      return this.json({ buddy: null });
    }

    const buddyProfile = BUDDY_PROFILES.find(p => p.id === userBuddy.buddy_profile_id);

    return this.json({
      buddy: {
        id: buddyProfile?.id,
        name: userBuddy.custom_name || buddyProfile?.name,
        emoji: buddyProfile?.emoji,
        tagline: buddyProfile?.tagline,
        specialty: buddyProfile?.specialty,
        relationshipLevel: userBuddy.relationship_level,
        interactionCount: userBuddy.interaction_count,
      },
    });
  }

  // ============================================================================
  // Team Management
  // ============================================================================

  private async handleCreateTeam(req: Request): Promise<Response> {
    const body = await req.json();
    const { name, description, createdBy } = body;

    if (!name || !createdBy) {
      return this.json({ error: 'name and createdBy are required' }, 400);
    }

    try {
      const team = this.db.createTeam({ name, description, createdBy });
      return this.json({ success: true, team });
    } catch (error) {
      console.error('Create team error:', error);
      return this.json({ error: 'Failed to create team' }, 500);
    }
  }

  private async handleGetUserTeams(req: Request): Promise<Response> {
    const userId = req.headers.get('X-User-Id');

    if (!userId) {
      return this.json({ error: 'Not authenticated' }, 401);
    }

    const teams = this.db.getUserTeams(userId);
    return this.json({ teams });
  }

  private async handleGetTeamMembers(req: Request, path: string): Promise<Response> {
    const teamId = path.split('/')[2];

    const members = this.db.getTeamMembers(teamId);

    // Add buddy info for each member
    const membersWithBuddies = members.map(m => {
      const buddyProfile = BUDDY_PROFILES.find(p => p.id === m.buddy_id);
      return {
        ...m,
        buddyName: buddyProfile?.name,
        buddyEmoji: buddyProfile?.emoji,
      };
    });

    return this.json({ members: membersWithBuddies });
  }

  private async handleAddTeamMember(req: Request, path: string): Promise<Response> {
    const teamId = path.split('/')[2];
    const body = await req.json();
    const { userId, role } = body;

    if (!userId) {
      return this.json({ error: 'userId is required' }, 400);
    }

    try {
      this.db.addTeamMember(teamId, userId, role || 'member');
      return this.json({ success: true });
    } catch (error) {
      console.error('Add team member error:', error);
      return this.json({ error: 'Failed to add team member' }, 500);
    }
  }

  // ============================================================================
  // All Users
  // ============================================================================

  private async handleGetAllUsers(): Promise<Response> {
    const users = this.db.getAllUsers();

    // Add buddy info for each user
    const usersWithBuddies = users.map(u => {
      const buddyProfile = BUDDY_PROFILES.find(p => p.id === u.buddy_id);
      return {
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarEmoji: u.avatar_emoji,
        buddyId: u.buddy_id,
        buddyName: buddyProfile?.name,
        buddyEmoji: buddyProfile?.emoji,
      };
    });

    return this.json({ users: usersWithBuddies });
  }

  // ============================================================================
  // Buddy Messages
  // ============================================================================

  private async handleGetBuddyMessages(req: Request): Promise<Response> {
    const userId = req.headers.get('X-User-Id');

    if (!userId) {
      return this.json({ error: 'Not authenticated' }, 401);
    }

    const messages = this.db.getBuddyMessagesForUser(userId);

    // Format messages with buddy info
    const formattedMessages = messages.map(m => {
      const fromBuddy = BUDDY_PROFILES.find(p => p.id === m.from_buddy_id);
      return {
        id: m.id,
        fromBuddyName: fromBuddy?.name,
        fromBuddyEmoji: fromBuddy?.emoji,
        messageType: m.message_type,
        content: m.content,
        outcomeId: m.outcome_id,
        createdAt: m.created_at,
        readAt: m.read_at,
      };
    });

    return this.json({ messages: formattedMessages });
  }

  private async handleSendBuddyMessage(req: Request): Promise<Response> {
    const body = await req.json();
    const { fromUserId, fromBuddyId, toUserId, toBuddyId, messageType, content, outcomeId } = body;

    if (!fromUserId || !fromBuddyId || !toUserId || !toBuddyId || !content) {
      return this.json({ error: 'Missing required fields' }, 400);
    }

    try {
      const message = this.db.sendBuddyMessage({
        fromUserId,
        fromBuddyId,
        toUserId,
        toBuddyId,
        messageType: messageType || 'message',
        content,
        outcomeId,
      });

      return this.json({ success: true, message });
    } catch (error) {
      console.error('Send buddy message error:', error);
      return this.json({ error: 'Failed to send message' }, 500);
    }
  }

  // ============================================================================
  // Password Helpers
  // ============================================================================

  private async hashPassword(password: string): Promise<string> {
    // Simple hash for demo - in production use bcrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'mindflow_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const inputHash = await this.hashPassword(password);
    return inputHash === hash;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private json(data: any, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// CLI entry point
if (import.meta.main) {
  const server = new MindflowServer({
    port: parseInt(process.env.PORT || '3456', 10),
    dbPath: process.env.DB_PATH || './mindflow.db',
    openaiKey: process.env.OPENAI_API_KEY,
  });

  server.start();
}

export default MindflowServer;
