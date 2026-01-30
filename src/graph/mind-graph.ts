/**
 * Mind Graph
 *
 * Everything is a Node, everything connects.
 * The core data structure of Mindflow.
 */

import type { Node, Edge, NodeType, EdgeType, NodeStatus, Horizon } from '../types';

export interface GraphPattern {
  nodeType?: NodeType;
  status?: NodeStatus;
  horizon?: Horizon;
  owner?: string;
  tags?: string[];
  contentContains?: string;
}

export interface Subgraph {
  nodes: Map<string, Node>;
  edges: Edge[];
}

export class MindGraph {
  private nodes: Map<string, Node> = new Map();
  private edges: Map<string, Edge> = new Map();

  // Indexes for fast lookup
  private nodesByType: Map<NodeType, Set<string>> = new Map();
  private nodesByOwner: Map<string, Set<string>> = new Map();
  private edgesByFrom: Map<string, Set<string>> = new Map();
  private edgesByTo: Map<string, Set<string>> = new Map();

  constructor() {
    // Initialize type indexes
    const nodeTypes: NodeType[] = ['thought', 'outcome', 'action', 'person', 'artifact', 'decision', 'blocker', 'context'];
    nodeTypes.forEach(t => this.nodesByType.set(t, new Set()));
  }

  // ============================================================================
  // Node Operations
  // ============================================================================

  /**
   * Add a node to the graph
   */
  addNode(node: Omit<Node, 'id' | 'createdAt' | 'updatedAt'>): Node {
    const id = this.generateId('node');
    const now = Date.now();

    const fullNode: Node = {
      ...node,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.nodes.set(id, fullNode);

    // Update indexes
    this.nodesByType.get(node.type)?.add(id);
    if (node.owner) {
      if (!this.nodesByOwner.has(node.owner)) {
        this.nodesByOwner.set(node.owner, new Set());
      }
      this.nodesByOwner.get(node.owner)?.add(id);
    }

    return fullNode;
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * Update a node
   */
  updateNode(id: string, updates: Partial<Omit<Node, 'id' | 'createdAt'>>): Node | undefined {
    const node = this.nodes.get(id);
    if (!node) return undefined;

    // Handle owner change
    if (updates.owner !== undefined && updates.owner !== node.owner) {
      if (node.owner) {
        this.nodesByOwner.get(node.owner)?.delete(id);
      }
      if (updates.owner) {
        if (!this.nodesByOwner.has(updates.owner)) {
          this.nodesByOwner.set(updates.owner, new Set());
        }
        this.nodesByOwner.get(updates.owner)?.add(id);
      }
    }

    // Handle type change
    if (updates.type !== undefined && updates.type !== node.type) {
      this.nodesByType.get(node.type)?.delete(id);
      this.nodesByType.get(updates.type)?.add(id);
    }

    const updatedNode: Node = {
      ...node,
      ...updates,
      updatedAt: Date.now(),
    };

    this.nodes.set(id, updatedNode);
    return updatedNode;
  }

  /**
   * Delete a node and its edges
   */
  deleteNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove from indexes
    this.nodesByType.get(node.type)?.delete(id);
    if (node.owner) {
      this.nodesByOwner.get(node.owner)?.delete(id);
    }

    // Remove connected edges
    const connectedEdges = [
      ...(this.edgesByFrom.get(id) || []),
      ...(this.edgesByTo.get(id) || []),
    ];
    connectedEdges.forEach(edgeId => this.deleteEdge(edgeId));

    this.nodes.delete(id);
    return true;
  }

  // ============================================================================
  // Edge Operations
  // ============================================================================

  /**
   * Connect two nodes
   */
  connect(from: string, to: string, type: EdgeType, strength: number = 0.5, metadata?: Record<string, any>): Edge | undefined {
    // Validate nodes exist
    if (!this.nodes.has(from) || !this.nodes.has(to)) {
      return undefined;
    }

    const id = this.generateId('edge');
    const edge: Edge = {
      id,
      from,
      to,
      type,
      strength,
      createdAt: Date.now(),
      metadata,
    };

    this.edges.set(id, edge);

    // Update indexes
    if (!this.edgesByFrom.has(from)) {
      this.edgesByFrom.set(from, new Set());
    }
    this.edgesByFrom.get(from)?.add(id);

    if (!this.edgesByTo.has(to)) {
      this.edgesByTo.set(to, new Set());
    }
    this.edgesByTo.get(to)?.add(id);

    return edge;
  }

  /**
   * Get an edge by ID
   */
  getEdge(id: string): Edge | undefined {
    return this.edges.get(id);
  }

  /**
   * Delete an edge
   */
  deleteEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;

    this.edgesByFrom.get(edge.from)?.delete(id);
    this.edgesByTo.get(edge.to)?.delete(id);
    this.edges.delete(id);

    return true;
  }

  /**
   * Get edges from a node
   */
  getEdgesFrom(nodeId: string): Edge[] {
    const edgeIds = this.edgesByFrom.get(nodeId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map(id => this.edges.get(id)!).filter(Boolean);
  }

  /**
   * Get edges to a node
   */
  getEdgesTo(nodeId: string): Edge[] {
    const edgeIds = this.edgesByTo.get(nodeId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map(id => this.edges.get(id)!).filter(Boolean);
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Query nodes by pattern
   */
  query(pattern: GraphPattern): Node[] {
    let results: Node[] = [];

    // Start with type filter if specified (most selective)
    if (pattern.nodeType) {
      const ids = this.nodesByType.get(pattern.nodeType);
      if (ids) {
        results = Array.from(ids).map(id => this.nodes.get(id)!).filter(Boolean);
      }
    } else if (pattern.owner) {
      const ids = this.nodesByOwner.get(pattern.owner);
      if (ids) {
        results = Array.from(ids).map(id => this.nodes.get(id)!).filter(Boolean);
      }
    } else {
      results = Array.from(this.nodes.values());
    }

    // Apply additional filters
    if (pattern.status) {
      results = results.filter(n => n.status === pattern.status);
    }

    if (pattern.horizon) {
      results = results.filter(n => n.horizon === pattern.horizon);
    }

    if (pattern.owner && !pattern.nodeType) {
      results = results.filter(n => n.owner === pattern.owner);
    }

    if (pattern.tags && pattern.tags.length > 0) {
      results = results.filter(n =>
        pattern.tags!.some(tag => n.tags.includes(tag))
      );
    }

    if (pattern.contentContains) {
      const searchLower = pattern.contentContains.toLowerCase();
      results = results.filter(n =>
        n.content.toLowerCase().includes(searchLower)
      );
    }

    return results;
  }

  /**
   * Get context subgraph around a node
   */
  getContext(nodeId: string, depth: number = 2): Subgraph {
    const subgraph: Subgraph = {
      nodes: new Map(),
      edges: [],
    };

    const visited = new Set<string>();
    const queue: { id: string; currentDepth: number }[] = [{ id: nodeId, currentDepth: 0 }];

    while (queue.length > 0) {
      const { id, currentDepth } = queue.shift()!;

      if (visited.has(id) || currentDepth > depth) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (node) {
        subgraph.nodes.set(id, node);
      }

      if (currentDepth < depth) {
        // Add outgoing edges and their targets
        const outEdges = this.getEdgesFrom(id);
        outEdges.forEach(edge => {
          if (!visited.has(edge.to)) {
            subgraph.edges.push(edge);
            queue.push({ id: edge.to, currentDepth: currentDepth + 1 });
          }
        });

        // Add incoming edges and their sources
        const inEdges = this.getEdgesTo(id);
        inEdges.forEach(edge => {
          if (!visited.has(edge.from)) {
            subgraph.edges.push(edge);
            queue.push({ id: edge.from, currentDepth: currentDepth + 1 });
          }
        });
      }
    }

    return subgraph;
  }

  /**
   * Find path between two nodes
   */
  findPath(fromId: string, toId: string): string[] | null {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      return null;
    }

    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;

      if (id === toId) {
        return path;
      }

      if (visited.has(id)) continue;
      visited.add(id);

      const edges = this.getEdgesFrom(id);
      for (const edge of edges) {
        if (!visited.has(edge.to)) {
          queue.push({ id: edge.to, path: [...path, edge.to] });
        }
      }
    }

    return null;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get all nodes
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges
   */
  getAllEdges(): Edge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get stats
   */
  getStats(): { nodeCount: number; edgeCount: number; nodesByType: Record<string, number> } {
    const nodesByType: Record<string, number> = {};
    this.nodesByType.forEach((ids, type) => {
      nodesByType[type] = ids.size;
    });

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      nodesByType,
    };
  }

  /**
   * Export graph to JSON
   */
  toJSON(): { nodes: Node[]; edges: Edge[] } {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
    };
  }

  /**
   * Import graph from JSON
   */
  fromJSON(data: { nodes: Node[]; edges: Edge[] }): void {
    // Clear existing data
    this.nodes.clear();
    this.edges.clear();
    this.nodesByType.forEach(set => set.clear());
    this.nodesByOwner.clear();
    this.edgesByFrom.clear();
    this.edgesByTo.clear();

    // Import nodes
    data.nodes.forEach(node => {
      this.nodes.set(node.id, node);
      this.nodesByType.get(node.type)?.add(node.id);
      if (node.owner) {
        if (!this.nodesByOwner.has(node.owner)) {
          this.nodesByOwner.set(node.owner, new Set());
        }
        this.nodesByOwner.get(node.owner)?.add(node.id);
      }
    });

    // Import edges
    data.edges.forEach(edge => {
      this.edges.set(edge.id, edge);
      if (!this.edgesByFrom.has(edge.from)) {
        this.edgesByFrom.set(edge.from, new Set());
      }
      this.edgesByFrom.get(edge.from)?.add(edge.id);
      if (!this.edgesByTo.has(edge.to)) {
        this.edgesByTo.set(edge.to, new Set());
      }
      this.edgesByTo.get(edge.to)?.add(edge.id);
    });
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export default MindGraph;
