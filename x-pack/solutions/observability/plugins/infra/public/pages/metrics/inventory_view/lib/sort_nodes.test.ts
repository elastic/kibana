/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortNodes } from './sort_nodes';
import type { SnapshotNode } from '../../../../../common/http_api/snapshot_api';

const createMockNode = (name: string, value: number): SnapshotNode => ({
  name,
  path: [{ value: name, label: name }],
  metrics: [
    {
      name: 'cpu',
      value,
      avg: value,
      max: value,
    },
  ],
});

const hostNodes: SnapshotNode[] = [
  createMockNode('host-1', 0.5),
  createMockNode('host-2', 0.7),
  createMockNode('host-3', 0.9),
  createMockNode('host-4', 0.3),
  createMockNode('host-5', 0.1),
];

describe('sortNodes', () => {
  describe('sort by value descending', () => {
    it('should sort nodes by value in descending order', () => {
      const sortedNodes = sortNodes({ by: 'value', direction: 'desc' }, hostNodes);
      const nodeNames = sortedNodes.map((node) => node.name);

      expect(nodeNames).toEqual(['host-3', 'host-2', 'host-1', 'host-4', 'host-5']);

      const nodeValues = sortedNodes.map((node) => node.metrics[0].value);

      expect(nodeValues).toEqual([0.9, 0.7, 0.5, 0.3, 0.1]);
    });
  });

  describe('sort by value ascending', () => {
    it('should sort nodes by value in ascending order', () => {
      const sortedNodes = sortNodes({ by: 'value', direction: 'asc' }, hostNodes);
      const nodeNames = sortedNodes.map((node) => node.name);

      expect(nodeNames).toEqual(['host-5', 'host-4', 'host-1', 'host-2', 'host-3']);

      const nodeValues = sortedNodes.map((node) => node.metrics[0].value);

      expect(nodeValues).toEqual([0.1, 0.3, 0.5, 0.7, 0.9]);
    });
  });

  describe('sort by name', () => {
    it('should sort by name ascending', () => {
      const sortedNodes = sortNodes({ by: 'name', direction: 'asc' }, hostNodes);
      const nodeNames = sortedNodes.map((node) => node.name);

      expect(nodeNames).toEqual(['host-1', 'host-2', 'host-3', 'host-4', 'host-5']);
    });

    it('should sort by name descending', () => {
      const sortedNodes = sortNodes({ by: 'name', direction: 'desc' }, hostNodes);
      const nodeNames = sortedNodes.map((node) => node.name);

      expect(nodeNames).toEqual(['host-5', 'host-4', 'host-3', 'host-2', 'host-1']);
    });
  });
});
