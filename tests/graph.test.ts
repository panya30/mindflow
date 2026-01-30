/**
 * Mind Graph Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MindGraph } from '../src/graph';

describe('MindGraph', () => {
  let graph: MindGraph;

  beforeEach(() => {
    graph = new MindGraph();
  });

  describe('Node Operations', () => {
    test('should add a node', () => {
      const node = graph.addNode({
        type: 'thought',
        content: 'Test thought',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: ['test'],
      });

      expect(node.id).toBeDefined();
      expect(node.content).toBe('Test thought');
      expect(node.type).toBe('thought');
    });

    test('should get a node by id', () => {
      const node = graph.addNode({
        type: 'outcome',
        content: 'Ship feature X',
        createdBy: 'user',
        status: 'active',
        confidence: 0.8,
        energy: 'high',
        contributors: [],
        horizon: 'soon',
        visibility: 'team',
        tags: [],
      });

      const retrieved = graph.getNode(node.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Ship feature X');
    });

    test('should update a node', () => {
      const node = graph.addNode({
        type: 'thought',
        content: 'Original content',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      const updated = graph.updateNode(node.id, {
        content: 'Updated content',
        status: 'completed',
      });

      expect(updated?.content).toBe('Updated content');
      expect(updated?.status).toBe('completed');
    });

    test('should delete a node', () => {
      const node = graph.addNode({
        type: 'thought',
        content: 'To be deleted',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      const deleted = graph.deleteNode(node.id);
      expect(deleted).toBe(true);
      expect(graph.getNode(node.id)).toBeUndefined();
    });
  });

  describe('Edge Operations', () => {
    test('should connect two nodes', () => {
      const node1 = graph.addNode({
        type: 'outcome',
        content: 'Parent outcome',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      const node2 = graph.addNode({
        type: 'action',
        content: 'Child action',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'low',
        contributors: [],
        horizon: 'now',
        visibility: 'private',
        tags: [],
      });

      const edge = graph.connect(node1.id, node2.id, 'requires', 0.8);

      expect(edge).toBeDefined();
      expect(edge?.from).toBe(node1.id);
      expect(edge?.to).toBe(node2.id);
      expect(edge?.type).toBe('requires');
    });

    test('should get edges from a node', () => {
      const node1 = graph.addNode({
        type: 'outcome',
        content: 'Outcome',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      const node2 = graph.addNode({
        type: 'action',
        content: 'Action 1',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'low',
        contributors: [],
        horizon: 'now',
        visibility: 'private',
        tags: [],
      });

      const node3 = graph.addNode({
        type: 'action',
        content: 'Action 2',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'low',
        contributors: [],
        horizon: 'now',
        visibility: 'private',
        tags: [],
      });

      graph.connect(node1.id, node2.id, 'requires');
      graph.connect(node1.id, node3.id, 'requires');

      const edges = graph.getEdgesFrom(node1.id);
      expect(edges.length).toBe(2);
    });
  });

  describe('Query Operations', () => {
    test('should query nodes by type', () => {
      graph.addNode({
        type: 'thought',
        content: 'Thought 1',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      graph.addNode({
        type: 'thought',
        content: 'Thought 2',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      graph.addNode({
        type: 'outcome',
        content: 'Outcome 1',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      const thoughts = graph.query({ nodeType: 'thought' });
      expect(thoughts.length).toBe(2);
    });

    test('should query nodes by content', () => {
      graph.addNode({
        type: 'thought',
        content: 'Build awesome feature',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      graph.addNode({
        type: 'thought',
        content: 'Fix bug',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      const results = graph.query({ contentContains: 'awesome' });
      expect(results.length).toBe(1);
      expect(results[0].content).toContain('awesome');
    });
  });

  describe('Graph Traversal', () => {
    test('should get context around a node', () => {
      const center = graph.addNode({
        type: 'outcome',
        content: 'Center',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      const related1 = graph.addNode({
        type: 'action',
        content: 'Related 1',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'low',
        contributors: [],
        horizon: 'now',
        visibility: 'private',
        tags: [],
      });

      const related2 = graph.addNode({
        type: 'blocker',
        content: 'Related 2',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'high',
        contributors: [],
        horizon: 'now',
        visibility: 'private',
        tags: [],
      });

      graph.connect(center.id, related1.id, 'requires');
      graph.connect(related2.id, center.id, 'blocks');

      const context = graph.getContext(center.id, 1);
      expect(context.nodes.size).toBe(3);
      expect(context.edges.length).toBe(2);
    });

    test('should find path between nodes', () => {
      const a = graph.addNode({
        type: 'thought',
        content: 'A',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      const b = graph.addNode({
        type: 'thought',
        content: 'B',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      const c = graph.addNode({
        type: 'thought',
        content: 'C',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      graph.connect(a.id, b.id, 'related');
      graph.connect(b.id, c.id, 'related');

      const path = graph.findPath(a.id, c.id);
      expect(path).toEqual([a.id, b.id, c.id]);
    });
  });

  describe('Export/Import', () => {
    test('should export and import graph', () => {
      graph.addNode({
        type: 'thought',
        content: 'Node 1',
        createdBy: 'user',
        status: 'active',
        confidence: 0.5,
        energy: 'medium',
        contributors: [],
        horizon: 'later',
        visibility: 'private',
        tags: [],
      });

      const exported = graph.toJSON();
      expect(exported.nodes.length).toBe(1);

      const newGraph = new MindGraph();
      newGraph.fromJSON(exported);

      expect(newGraph.getAllNodes().length).toBe(1);
      expect(newGraph.getAllNodes()[0].content).toBe('Node 1');
    });
  });
});
