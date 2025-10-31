/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortNodes } from './sort_nodes';
import type { SnapshotNode } from '../../../../../common/http_api/snapshot_api';

const hostNodes: SnapshotNode[] = [
  {
    name: 'host-1',
    path: [{ value: 'host-1', label: 'host-1' }],
    metrics: [
      {
        name: 'cpu',
        value: 0.5,
        max: 1.5,
        avg: 0.7,
      },
    ],
  },
  {
    name: 'host-2',
    path: [{ value: 'host-2', label: 'host-2' }],
    metrics: [
      {
        name: 'cpu',
        value: 0.7,
        max: 1.5,
        avg: 0.8,
      },
    ],
  },
  {
    name: 'host-3',
    path: [{ value: 'host-3', label: 'host-3' }],
    metrics: [
      {
        name: 'cpu',
        value: 0.9,
        max: 1.5,
        avg: 1.0,
      },
    ],
  },
  {
    name: 'host-4',
    path: [{ value: 'host-4', label: 'host-4' }],
    metrics: [
      {
        name: 'cpu',
        value: 0.3,
        max: 1.5,
        avg: 0.5,
      },
    ],
  },
  {
    name: 'host-5',
    path: [{ value: 'host-5', label: 'host-5' }],
    metrics: [
      {
        name: 'cpu',
        value: 0.1,
        max: 1.5,
        avg: 0.3,
      },
    ],
  },
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
