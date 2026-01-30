/**
 * Mindflow Database
 *
 * SQLite-based persistent storage for Mind Graph and Buddy state.
 */

import { Database } from 'bun:sqlite';
import type { Node, Edge, Outcome, Commitment, ChatMessage, ChatSession, AIBuddyConfig } from '../types';
import { MindGraph } from '../graph';

export interface DatabaseConfig {
  path?: string;
}

export class MindflowDatabase {
  private db: Database;

  constructor(config?: DatabaseConfig) {
    const dbPath = config?.path || './mindflow.db';
    this.db = new Database(dbPath);
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA foreign_keys = ON');
    this.initialize();
  }

  // ============================================================================
  // Schema
  // ============================================================================

  private initialize(): void {
    // Nodes table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        confidence REAL DEFAULT 0.5,
        energy TEXT DEFAULT 'medium',
        owner TEXT,
        contributors TEXT DEFAULT '[]',
        horizon TEXT DEFAULT 'later',
        visibility TEXT DEFAULT 'private',
        tags TEXT DEFAULT '[]'
      )
    `);

    // Edges table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY,
        from_node TEXT NOT NULL,
        to_node TEXT NOT NULL,
        type TEXT NOT NULL,
        strength REAL DEFAULT 0.5,
        created_at INTEGER NOT NULL,
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (from_node) REFERENCES nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (to_node) REFERENCES nodes(id) ON DELETE CASCADE
      )
    `);

    // Outcomes table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS outcomes (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        success_criteria TEXT DEFAULT '[]',
        parent_outcome TEXT,
        motivation TEXT,
        requested_by TEXT NOT NULL,
        owned_by TEXT,
        contributors TEXT DEFAULT '[]',
        horizon TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        suggested_actions TEXT DEFAULT '[]',
        status TEXT DEFAULT 'exploring',
        progress INTEGER DEFAULT 0,
        confidence REAL DEFAULT 0.5,
        blockers TEXT DEFAULT '[]'
      )
    `);

    // Commitments table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS commitments (
        id TEXT PRIMARY KEY,
        outcome_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        from_buddy TEXT NOT NULL,
        to_buddy TEXT NOT NULL,
        made_at INTEGER NOT NULL,
        expected_by TEXT DEFAULT '{}',
        confidence REAL DEFAULT 0.5,
        caveats TEXT DEFAULT '[]',
        status TEXT DEFAULT 'proposed',
        updates TEXT DEFAULT '[]',
        FOREIGN KEY (outcome_id) REFERENCES outcomes(id)
      )
    `);

    // Buddy config table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS buddy_config (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        human_id TEXT NOT NULL,
        human_name TEXT NOT NULL,
        personality TEXT DEFAULT '{}',
        work_patterns TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Chat sessions table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        buddy_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Chat messages table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      )
    `);

    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        email TEXT,
        avatar_emoji TEXT DEFAULT '👤',
        buddy_id TEXT,
        created_at INTEGER NOT NULL,
        last_login INTEGER,
        settings TEXT DEFAULT '{}'
      )
    `);

    // User buddy assignments - each user has their own buddy instance
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_buddies (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        buddy_profile_id TEXT NOT NULL,
        custom_name TEXT,
        custom_tagline TEXT,
        relationship_level INTEGER DEFAULT 1,
        interaction_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_interaction INTEGER,
        memories TEXT DEFAULT '[]',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Team/workspace for collaboration
    this.db.run(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        settings TEXT DEFAULT '{}',
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Team membership
    this.db.run(`
      CREATE TABLE IF NOT EXISTS team_members (
        team_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at INTEGER NOT NULL,
        PRIMARY KEY (team_id, user_id),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Shared outcomes - link outcomes to teams
    this.db.run(`
      CREATE TABLE IF NOT EXISTS outcome_sharing (
        id TEXT PRIMARY KEY,
        outcome_id TEXT NOT NULL,
        team_id TEXT,
        user_id TEXT,
        shared_at INTEGER NOT NULL,
        shared_by TEXT NOT NULL,
        permissions TEXT DEFAULT 'view',
        FOREIGN KEY (outcome_id) REFERENCES outcomes(id) ON DELETE CASCADE
      )
    `);

    // Buddy messages - for buddy-to-buddy communication
    this.db.run(`
      CREATE TABLE IF NOT EXISTS buddy_messages (
        id TEXT PRIMARY KEY,
        from_user_id TEXT NOT NULL,
        from_buddy_id TEXT NOT NULL,
        to_user_id TEXT NOT NULL,
        to_buddy_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        content TEXT NOT NULL,
        outcome_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        read_at INTEGER,
        FOREIGN KEY (from_user_id) REFERENCES users(id),
        FOREIGN KEY (to_user_id) REFERENCES users(id)
      )
    `);

    // Create indexes
    this.db.run('CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_nodes_owner ON nodes(owner)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_node)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_node)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_outcomes_status ON outcomes(status)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_user_buddies_user ON user_buddies(user_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_buddy_messages_to ON buddy_messages(to_user_id)');

    // Full-text search
    this.db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
        id,
        content,
        tags,
        content='nodes',
        content_rowid='rowid'
      )
    `);

    // Triggers for FTS sync
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
        INSERT INTO nodes_fts(id, content, tags) VALUES (new.id, new.content, new.tags);
      END
    `);

    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
        INSERT INTO nodes_fts(nodes_fts, id, content, tags) VALUES('delete', old.id, old.content, old.tags);
      END
    `);

    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
        INSERT INTO nodes_fts(nodes_fts, id, content, tags) VALUES('delete', old.id, old.content, old.tags);
        INSERT INTO nodes_fts(id, content, tags) VALUES (new.id, new.content, new.tags);
      END
    `);
  }

  // ============================================================================
  // Node Operations
  // ============================================================================

  saveNode(node: Node): void {
    this.db.run(`
      INSERT OR REPLACE INTO nodes (
        id, type, content, created_by, created_at, updated_at,
        status, confidence, energy, owner, contributors, horizon, visibility, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      node.id,
      node.type,
      node.content,
      node.createdBy,
      node.createdAt,
      node.updatedAt,
      node.status,
      node.confidence,
      node.energy,
      node.owner || null,
      JSON.stringify(node.contributors),
      node.horizon,
      node.visibility,
      JSON.stringify(node.tags)
    ]);
  }

  getNode(id: string): Node | null {
    const row = this.db.query('SELECT * FROM nodes WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.rowToNode(row);
  }

  getAllNodes(): Node[] {
    const rows = this.db.query('SELECT * FROM nodes').all() as any[];
    return rows.map(row => this.rowToNode(row));
  }

  deleteNode(id: string): void {
    this.db.run('DELETE FROM nodes WHERE id = ?', [id]);
  }

  searchNodes(query: string, limit: number = 20): Node[] {
    const rows = this.db.query(`
      SELECT n.* FROM nodes n
      JOIN nodes_fts fts ON n.id = fts.id
      WHERE nodes_fts MATCH ?
      LIMIT ?
    `).all(query, limit) as any[];
    return rows.map(row => this.rowToNode(row));
  }

  private rowToNode(row: any): Node {
    return {
      id: row.id,
      type: row.type,
      content: row.content,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      confidence: row.confidence,
      energy: row.energy,
      owner: row.owner,
      contributors: JSON.parse(row.contributors || '[]'),
      horizon: row.horizon,
      visibility: row.visibility,
      tags: JSON.parse(row.tags || '[]'),
    };
  }

  // ============================================================================
  // Edge Operations
  // ============================================================================

  saveEdge(edge: Edge): void {
    this.db.run(`
      INSERT OR REPLACE INTO edges (
        id, from_node, to_node, type, strength, created_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      edge.id,
      edge.from,
      edge.to,
      edge.type,
      edge.strength,
      edge.createdAt,
      JSON.stringify(edge.metadata || {})
    ]);
  }

  getEdge(id: string): Edge | null {
    const row = this.db.query('SELECT * FROM edges WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.rowToEdge(row);
  }

  getAllEdges(): Edge[] {
    const rows = this.db.query('SELECT * FROM edges').all() as any[];
    return rows.map(row => this.rowToEdge(row));
  }

  deleteEdge(id: string): void {
    this.db.run('DELETE FROM edges WHERE id = ?', [id]);
  }

  private rowToEdge(row: any): Edge {
    return {
      id: row.id,
      from: row.from_node,
      to: row.to_node,
      type: row.type,
      strength: row.strength,
      createdAt: row.created_at,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  // ============================================================================
  // Outcome Operations
  // ============================================================================

  saveOutcome(outcome: Outcome): void {
    this.db.run(`
      INSERT OR REPLACE INTO outcomes (
        id, description, success_criteria, parent_outcome, motivation,
        requested_by, owned_by, contributors, horizon, created_at,
        completed_at, suggested_actions, status, progress, confidence, blockers
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      outcome.id,
      outcome.description,
      JSON.stringify(outcome.successCriteria),
      outcome.parentOutcome || null,
      outcome.motivation,
      outcome.requestedBy,
      outcome.ownedBy || null,
      JSON.stringify(outcome.contributors),
      JSON.stringify(outcome.horizon),
      outcome.createdAt,
      outcome.completedAt || null,
      JSON.stringify(outcome.suggestedActions),
      outcome.status,
      outcome.progress,
      outcome.confidence,
      JSON.stringify(outcome.blockers)
    ]);
  }

  getOutcome(id: string): Outcome | null {
    const row = this.db.query('SELECT * FROM outcomes WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.rowToOutcome(row);
  }

  getAllOutcomes(): Outcome[] {
    const rows = this.db.query('SELECT * FROM outcomes ORDER BY created_at DESC').all() as any[];
    return rows.map(row => this.rowToOutcome(row));
  }

  getOutcomesByStatus(status: string): Outcome[] {
    const rows = this.db.query('SELECT * FROM outcomes WHERE status = ? ORDER BY created_at DESC').all(status) as any[];
    return rows.map(row => this.rowToOutcome(row));
  }

  deleteOutcome(id: string): void {
    this.db.run('DELETE FROM outcomes WHERE id = ?', [id]);
  }

  private rowToOutcome(row: any): Outcome {
    return {
      id: row.id,
      description: row.description,
      successCriteria: JSON.parse(row.success_criteria || '[]'),
      parentOutcome: row.parent_outcome,
      motivation: row.motivation,
      requestedBy: row.requested_by,
      ownedBy: row.owned_by,
      contributors: JSON.parse(row.contributors || '[]'),
      horizon: JSON.parse(row.horizon || '{}'),
      createdAt: row.created_at,
      completedAt: row.completed_at,
      suggestedActions: JSON.parse(row.suggested_actions || '[]'),
      status: row.status,
      progress: row.progress,
      confidence: row.confidence,
      blockers: JSON.parse(row.blockers || '[]'),
    };
  }

  // ============================================================================
  // Chat Operations
  // ============================================================================

  createChatSession(buddyId: string): ChatSession {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    this.db.run(`
      INSERT INTO chat_sessions (id, buddy_id, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `, [id, buddyId, now, now]);

    return {
      id,
      buddyId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  addChatMessage(sessionId: string, message: Omit<ChatMessage, 'id'>): ChatMessage {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.db.run(`
      INSERT INTO chat_messages (id, session_id, role, content, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id,
      sessionId,
      message.role,
      message.content,
      message.timestamp,
      JSON.stringify(message.metadata || {})
    ]);

    // Update session timestamp
    this.db.run('UPDATE chat_sessions SET updated_at = ? WHERE id = ?', [Date.now(), sessionId]);

    return { id, ...message };
  }

  getChatSession(id: string): ChatSession | null {
    const session = this.db.query('SELECT * FROM chat_sessions WHERE id = ?').get(id) as any;
    if (!session) return null;

    const messages = this.db.query(`
      SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC
    `).all(id) as any[];

    return {
      id: session.id,
      buddyId: session.buddy_id,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        metadata: JSON.parse(m.metadata || '{}'),
      })),
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    };
  }

  getRecentSessions(buddyId: string, limit: number = 10): ChatSession[] {
    const sessions = this.db.query(`
      SELECT * FROM chat_sessions WHERE buddy_id = ? ORDER BY updated_at DESC LIMIT ?
    `).all(buddyId, limit) as any[];

    return sessions.map(s => this.getChatSession(s.id)!).filter(Boolean);
  }

  // ============================================================================
  // Buddy Config Operations
  // ============================================================================

  saveBuddyConfig(config: AIBuddyConfig): void {
    const now = Date.now();
    const existing = this.getBuddyConfig(config.id);

    this.db.run(`
      INSERT OR REPLACE INTO buddy_config (
        id, name, human_id, human_name, personality, work_patterns, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      config.id,
      config.name,
      config.humanId,
      config.humanName,
      JSON.stringify(config.personality),
      JSON.stringify(config.workPatterns),
      existing?.createdAt || now,
      now
    ]);
  }

  getBuddyConfig(id: string): (AIBuddyConfig & { createdAt: number; updatedAt: number }) | null {
    const row = this.db.query('SELECT * FROM buddy_config WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      humanId: row.human_id,
      humanName: row.human_name,
      personality: JSON.parse(row.personality || '{}'),
      workPatterns: JSON.parse(row.work_patterns || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================================================
  // Graph Sync
  // ============================================================================

  /**
   * Save entire graph to database
   */
  saveGraph(graph: MindGraph): void {
    const data = graph.toJSON();

    this.db.transaction(() => {
      // Clear existing
      this.db.run('DELETE FROM edges');
      this.db.run('DELETE FROM nodes');

      // Insert nodes
      data.nodes.forEach(node => this.saveNode(node));

      // Insert edges
      data.edges.forEach(edge => this.saveEdge(edge));
    })();
  }

  /**
   * Load graph from database
   */
  loadGraph(): MindGraph {
    const graph = new MindGraph();

    const nodes = this.getAllNodes();
    const edges = this.getAllEdges();

    graph.fromJSON({ nodes, edges });

    return graph;
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  createUser(user: {
    username: string;
    passwordHash: string;
    displayName: string;
    email?: string;
    avatarEmoji?: string;
  }): { id: string; username: string; displayName: string } {
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    this.db.run(`
      INSERT INTO users (id, username, password_hash, display_name, email, avatar_emoji, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, user.username, user.passwordHash, user.displayName, user.email || null, user.avatarEmoji || '👤', now]);

    return { id, username: user.username, displayName: user.displayName };
  }

  getUserByUsername(username: string): any | null {
    return this.db.query('SELECT * FROM users WHERE username = ?').get(username) as any;
  }

  getUserById(id: string): any | null {
    return this.db.query('SELECT * FROM users WHERE id = ?').get(id) as any;
  }

  updateUserLastLogin(userId: string): void {
    this.db.run('UPDATE users SET last_login = ? WHERE id = ?', [Date.now(), userId]);
  }

  getAllUsers(): any[] {
    return this.db.query('SELECT id, username, display_name, avatar_emoji, buddy_id, created_at, last_login FROM users').all() as any[];
  }

  // ============================================================================
  // User Buddy Operations
  // ============================================================================

  assignBuddyToUser(userId: string, buddyProfileId: string, customName?: string): { id: string } {
    const id = `ub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    // Remove existing buddy assignment
    this.db.run('DELETE FROM user_buddies WHERE user_id = ?', [userId]);

    this.db.run(`
      INSERT INTO user_buddies (id, user_id, buddy_profile_id, custom_name, created_at, last_interaction)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, userId, buddyProfileId, customName || null, now, now]);

    // Update user's buddy_id
    this.db.run('UPDATE users SET buddy_id = ? WHERE id = ?', [buddyProfileId, userId]);

    return { id };
  }

  getUserBuddy(userId: string): any | null {
    return this.db.query('SELECT * FROM user_buddies WHERE user_id = ?').get(userId) as any;
  }

  updateUserBuddyInteraction(userId: string): void {
    this.db.run(`
      UPDATE user_buddies
      SET interaction_count = interaction_count + 1, last_interaction = ?
      WHERE user_id = ?
    `, [Date.now(), userId]);
  }

  addBuddyMemory(userId: string, memory: string): void {
    const buddy = this.getUserBuddy(userId);
    if (!buddy) return;

    const memories = JSON.parse(buddy.memories || '[]');
    memories.push({ content: memory, timestamp: Date.now() });

    // Keep only last 100 memories
    const trimmedMemories = memories.slice(-100);

    this.db.run('UPDATE user_buddies SET memories = ? WHERE user_id = ?', [JSON.stringify(trimmedMemories), userId]);
  }

  // ============================================================================
  // Team Operations
  // ============================================================================

  createTeam(team: { name: string; description?: string; createdBy: string }): { id: string } {
    const id = `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    this.db.run(`
      INSERT INTO teams (id, name, description, created_by, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [id, team.name, team.description || null, team.createdBy, now]);

    // Add creator as admin
    this.db.run(`
      INSERT INTO team_members (team_id, user_id, role, joined_at)
      VALUES (?, ?, 'admin', ?)
    `, [id, team.createdBy, now]);

    return { id };
  }

  addTeamMember(teamId: string, userId: string, role: string = 'member'): void {
    this.db.run(`
      INSERT OR REPLACE INTO team_members (team_id, user_id, role, joined_at)
      VALUES (?, ?, ?, ?)
    `, [teamId, userId, role, Date.now()]);
  }

  getTeamMembers(teamId: string): any[] {
    return this.db.query(`
      SELECT u.id, u.username, u.display_name, u.avatar_emoji, u.buddy_id, tm.role, tm.joined_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
    `).all(teamId) as any[];
  }

  getUserTeams(userId: string): any[] {
    return this.db.query(`
      SELECT t.*, tm.role
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ?
    `).all(userId) as any[];
  }

  // ============================================================================
  // Buddy-to-Buddy Messaging
  // ============================================================================

  sendBuddyMessage(message: {
    fromUserId: string;
    fromBuddyId: string;
    toUserId: string;
    toBuddyId: string;
    messageType: string;
    content: string;
    outcomeId?: string;
  }): { id: string } {
    const id = `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.db.run(`
      INSERT INTO buddy_messages (id, from_user_id, from_buddy_id, to_user_id, to_buddy_id, message_type, content, outcome_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, message.fromUserId, message.fromBuddyId, message.toUserId, message.toBuddyId, message.messageType, message.content, message.outcomeId || null, Date.now()]);

    return { id };
  }

  getBuddyMessagesForUser(userId: string, limit: number = 50): any[] {
    return this.db.query(`
      SELECT * FROM buddy_messages
      WHERE to_user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit) as any[];
  }

  getUnreadBuddyMessages(userId: string): any[] {
    return this.db.query(`
      SELECT * FROM buddy_messages
      WHERE to_user_id = ? AND read_at IS NULL
      ORDER BY created_at DESC
    `).all(userId) as any[];
  }

  markBuddyMessageRead(messageId: string): void {
    this.db.run('UPDATE buddy_messages SET read_at = ? WHERE id = ?', [Date.now(), messageId]);
  }

  // ============================================================================
  // Outcome Sharing
  // ============================================================================

  shareOutcome(outcomeId: string, sharedBy: string, targetUserId?: string, teamId?: string, permissions: string = 'view'): void {
    const id = `share_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.db.run(`
      INSERT INTO outcome_sharing (id, outcome_id, team_id, user_id, shared_at, shared_by, permissions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, outcomeId, teamId || null, targetUserId || null, Date.now(), sharedBy, permissions]);
  }

  getSharedOutcomesForUser(userId: string): Outcome[] {
    const rows = this.db.query(`
      SELECT DISTINCT o.* FROM outcomes o
      JOIN outcome_sharing os ON o.id = os.outcome_id
      LEFT JOIN team_members tm ON os.team_id = tm.team_id
      WHERE os.user_id = ? OR tm.user_id = ?
      ORDER BY o.created_at DESC
    `).all(userId, userId) as any[];

    return rows.map(row => this.rowToOutcome(row));
  }

  // ============================================================================
  // Utility
  // ============================================================================

  close(): void {
    this.db.close();
  }

  getStats(): { nodes: number; edges: number; outcomes: number; sessions: number } {
    const nodes = (this.db.query('SELECT COUNT(*) as count FROM nodes').get() as any).count;
    const edges = (this.db.query('SELECT COUNT(*) as count FROM edges').get() as any).count;
    const outcomes = (this.db.query('SELECT COUNT(*) as count FROM outcomes').get() as any).count;
    const sessions = (this.db.query('SELECT COUNT(*) as count FROM chat_sessions').get() as any).count;

    return { nodes, edges, outcomes, sessions };
  }
}

export default MindflowDatabase;
