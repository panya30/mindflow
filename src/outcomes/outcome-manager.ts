/**
 * Outcome Manager
 *
 * Outcomes over Tasks.
 * Focus on "what success looks like" not "what to do".
 */

import type {
  Outcome,
  OutcomeStatus,
  Criterion,
  HorizonInfo,
  Horizon,
  Commitment,
  CommitmentStatus,
} from '../types';
import type { MindflowDatabase } from '../storage';
import type { MindGraph } from '../graph';

export interface OutcomeFilter {
  status?: OutcomeStatus[];
  ownedBy?: string;
  horizon?: Horizon;
  hasBlockers?: boolean;
}

export interface OutcomeProgress {
  outcomeId: string;
  progress: number;
  criteriaProgress: { id: string; description: string; met: boolean }[];
  estimatedCompletion?: string;
  blockers: string[];
}

export class OutcomeManager {
  private db: MindflowDatabase;
  private graph: MindGraph;

  constructor(db: MindflowDatabase, graph: MindGraph) {
    this.db = db;
    this.graph = graph;
  }

  // ============================================================================
  // Outcome CRUD
  // ============================================================================

  /**
   * Create a new outcome
   */
  create(params: {
    description: string;
    motivation: string;
    requestedBy: string;
    successCriteria?: string[];
    parentOutcome?: string;
    horizon?: Horizon;
  }): Outcome {
    const id = `outcome_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const outcome: Outcome = {
      id,
      description: params.description,
      motivation: params.motivation,
      requestedBy: params.requestedBy,
      successCriteria: (params.successCriteria || []).map((desc, i) => ({
        id: `criterion_${id}_${i}`,
        description: desc,
        met: false,
      })),
      parentOutcome: params.parentOutcome,
      contributors: [],
      horizon: {
        type: params.horizon || 'later',
      },
      createdAt: Date.now(),
      suggestedActions: [],
      status: 'exploring',
      progress: 0,
      confidence: 0.5,
      blockers: [],
    };

    this.db.saveOutcome(outcome);

    // Create node in graph
    this.graph.addNode({
      type: 'outcome',
      content: params.description,
      createdBy: params.requestedBy,
      status: 'active',
      confidence: 0.5,
      energy: 'medium',
      contributors: [],
      horizon: params.horizon || 'later',
      visibility: 'private',
      tags: [id],
    });

    return outcome;
  }

  /**
   * Get outcome by ID
   */
  get(id: string): Outcome | null {
    return this.db.getOutcome(id);
  }

  /**
   * Get all outcomes with optional filter
   */
  list(filter?: OutcomeFilter): Outcome[] {
    let outcomes = this.db.getAllOutcomes();

    if (filter) {
      if (filter.status && filter.status.length > 0) {
        outcomes = outcomes.filter(o => filter.status!.includes(o.status));
      }
      if (filter.ownedBy) {
        outcomes = outcomes.filter(o => o.ownedBy === filter.ownedBy);
      }
      if (filter.horizon) {
        outcomes = outcomes.filter(o => o.horizon.type === filter.horizon);
      }
      if (filter.hasBlockers !== undefined) {
        outcomes = outcomes.filter(o =>
          filter.hasBlockers ? o.blockers.length > 0 : o.blockers.length === 0
        );
      }
    }

    return outcomes;
  }

  /**
   * Update an outcome
   */
  update(id: string, updates: Partial<Omit<Outcome, 'id' | 'createdAt'>>): Outcome | null {
    const outcome = this.db.getOutcome(id);
    if (!outcome) return null;

    const updated: Outcome = {
      ...outcome,
      ...updates,
    };

    this.db.saveOutcome(updated);
    return updated;
  }

  /**
   * Delete an outcome
   */
  delete(id: string): boolean {
    const outcome = this.db.getOutcome(id);
    if (!outcome) return false;

    this.db.deleteOutcome(id);

    // Also remove from graph
    const nodes = this.graph.query({ tags: [id] });
    nodes.forEach(n => this.graph.deleteNode(n.id));

    return true;
  }

  // ============================================================================
  // Status Management
  // ============================================================================

  /**
   * Transition outcome to new status
   */
  transition(id: string, newStatus: OutcomeStatus, notes?: string): Outcome | null {
    const outcome = this.db.getOutcome(id);
    if (!outcome) return null;

    // Validate transition
    if (!this.isValidTransition(outcome.status, newStatus)) {
      throw new Error(`Invalid transition: ${outcome.status} -> ${newStatus}`);
    }

    const updates: Partial<Outcome> = {
      status: newStatus,
    };

    // Handle special transitions
    if (newStatus === 'achieved') {
      updates.completedAt = Date.now();
      updates.progress = 100;
    }

    return this.update(id, updates);
  }

  /**
   * Check if status transition is valid
   */
  private isValidTransition(from: OutcomeStatus, to: OutcomeStatus): boolean {
    const validTransitions: Record<OutcomeStatus, OutcomeStatus[]> = {
      'exploring': ['committed', 'abandoned'],
      'committed': ['in-progress', 'blocked', 'abandoned'],
      'in-progress': ['blocked', 'review', 'abandoned'],
      'blocked': ['in-progress', 'abandoned'],
      'review': ['achieved', 'in-progress'],
      'achieved': [], // Terminal state
      'abandoned': ['exploring'], // Can be revived
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Own an outcome
   */
  own(id: string, ownerId: string): Outcome | null {
    const outcome = this.get(id);
    if (!outcome) return null;

    // Auto-transition to committed if exploring
    const newStatus = outcome.status === 'exploring' ? 'committed' : outcome.status;

    return this.update(id, {
      ownedBy: ownerId,
      status: newStatus,
    });
  }

  // ============================================================================
  // Criteria Management
  // ============================================================================

  /**
   * Add success criterion
   */
  addCriterion(outcomeId: string, description: string): Criterion | null {
    const outcome = this.get(outcomeId);
    if (!outcome) return null;

    const criterion: Criterion = {
      id: `criterion_${outcomeId}_${Date.now()}`,
      description,
      met: false,
    };

    outcome.successCriteria.push(criterion);
    this.recalculateProgress(outcome);
    this.db.saveOutcome(outcome);

    return criterion;
  }

  /**
   * Mark criterion as met
   */
  meetCriterion(outcomeId: string, criterionId: string): Outcome | null {
    const outcome = this.get(outcomeId);
    if (!outcome) return null;

    const criterion = outcome.successCriteria.find(c => c.id === criterionId);
    if (!criterion) return null;

    criterion.met = true;
    this.recalculateProgress(outcome);
    this.db.saveOutcome(outcome);

    // Check if all criteria met
    if (outcome.successCriteria.every(c => c.met)) {
      return this.transition(outcomeId, 'review');
    }

    return outcome;
  }

  /**
   * Recalculate progress based on criteria
   */
  private recalculateProgress(outcome: Outcome): void {
    if (outcome.successCriteria.length === 0) {
      return;
    }

    const met = outcome.successCriteria.filter(c => c.met).length;
    outcome.progress = Math.round((met / outcome.successCriteria.length) * 100);
  }

  // ============================================================================
  // Blocker Management
  // ============================================================================

  /**
   * Add a blocker
   */
  addBlocker(outcomeId: string, blocker: string): Outcome | null {
    const outcome = this.get(outcomeId);
    if (!outcome) return null;

    if (!outcome.blockers.includes(blocker)) {
      outcome.blockers.push(blocker);

      // Also create blocker node
      const blockerNode = this.graph.addNode({
        type: 'blocker',
        content: blocker,
        createdBy: outcome.requestedBy,
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'now',
        visibility: 'private',
        tags: [outcomeId],
      });

      // Find outcome node and connect
      const outcomeNodes = this.graph.query({ tags: [outcomeId], nodeType: 'outcome' });
      if (outcomeNodes.length > 0) {
        this.graph.connect(blockerNode.id, outcomeNodes[0].id, 'blocks');
      }

      // Auto-transition to blocked
      if (outcome.status === 'in-progress') {
        outcome.status = 'blocked';
      }

      this.db.saveOutcome(outcome);
    }

    return outcome;
  }

  /**
   * Resolve a blocker
   */
  resolveBlocker(outcomeId: string, blocker: string): Outcome | null {
    const outcome = this.get(outcomeId);
    if (!outcome) return null;

    outcome.blockers = outcome.blockers.filter(b => b !== blocker);

    // If no more blockers and was blocked, transition back to in-progress
    if (outcome.blockers.length === 0 && outcome.status === 'blocked') {
      outcome.status = 'in-progress';
    }

    this.db.saveOutcome(outcome);
    return outcome;
  }

  // ============================================================================
  // Hierarchy
  // ============================================================================

  /**
   * Get child outcomes
   */
  getChildren(parentId: string): Outcome[] {
    return this.list().filter(o => o.parentOutcome === parentId);
  }

  /**
   * Get outcome tree
   */
  getTree(rootId: string): OutcomeTree {
    const outcome = this.get(rootId);
    if (!outcome) throw new Error(`Outcome not found: ${rootId}`);

    return {
      outcome,
      children: this.getChildren(rootId).map(child => this.getTree(child.id)),
    };
  }

  /**
   * Break down outcome into sub-outcomes
   */
  breakdown(parentId: string, subOutcomes: { description: string; motivation?: string }[]): Outcome[] {
    const parent = this.get(parentId);
    if (!parent) throw new Error(`Outcome not found: ${parentId}`);

    return subOutcomes.map(sub => {
      return this.create({
        description: sub.description,
        motivation: sub.motivation || `Part of: ${parent.description}`,
        requestedBy: parent.requestedBy,
        parentOutcome: parentId,
        horizon: parent.horizon.type,
      });
    });
  }

  // ============================================================================
  // Progress & Analytics
  // ============================================================================

  /**
   * Get detailed progress for an outcome
   */
  getProgress(outcomeId: string): OutcomeProgress | null {
    const outcome = this.get(outcomeId);
    if (!outcome) return null;

    return {
      outcomeId,
      progress: outcome.progress,
      criteriaProgress: outcome.successCriteria.map(c => ({
        id: c.id,
        description: c.description,
        met: c.met,
      })),
      blockers: outcome.blockers,
    };
  }

  /**
   * Get outcomes due in horizon
   */
  getDue(horizon: Horizon): Outcome[] {
    return this.list({
      horizon,
      status: ['committed', 'in-progress'],
    });
  }

  /**
   * Get blocked outcomes
   */
  getBlocked(): Outcome[] {
    return this.list({
      status: ['blocked'],
    });
  }
}

export interface OutcomeTree {
  outcome: Outcome;
  children: OutcomeTree[];
}

export default OutcomeManager;
