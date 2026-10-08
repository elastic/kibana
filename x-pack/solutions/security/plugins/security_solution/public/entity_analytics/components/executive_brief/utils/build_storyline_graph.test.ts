/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  FIXTURE_SNAPSHOT,
  EUID,
} from '../../../../../common/entity_analytics/executive_brief/__fixtures__/snapshot';
import type { BriefSnapshot } from '../../../../../common/entity_analytics/executive_brief/types';
import realJob from '../__fixtures__/real_job.json';
import { buildStorylineGraph } from './build_storyline_graph';

describe('buildStorylineGraph', () => {
  const story1 = FIXTURE_SNAPSHOT.storylines.storylines[0];

  it('emits entity nodes with names and a relationship connector per edge', () => {
    const { nodes, edges } = buildStorylineGraph(story1, FIXTURE_SNAPSHOT);

    const entityNodes = nodes.filter(({ shape }) => shape !== 'relationship');
    expect(entityNodes.map(({ id }) => id)).toEqual(expect.arrayContaining(story1.entityEuids));
    expect(entityNodes.find(({ id }) => id === EUID.rodriguez)?.label).toBe('a.rodriguez');
    const connectors = nodes.filter(({ shape }) => shape === 'relationship');
    expect(connectors.length).toBeGreaterThan(0);
    expect(edges).toHaveLength(connectors.length * 2);
  });

  it('only references nodes that exist and never emits duplicates', () => {
    const { nodes, edges } = buildStorylineGraph(story1, FIXTURE_SNAPSHOT);
    const ids = nodes.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    edges.forEach(({ source, target }) => {
      expect(ids).toContain(source);
      expect(ids).toContain(target);
    });
  });

  describe('with the real S1 edge set (bidirectional and parallel edges)', () => {
    const snapshot = realJob.snapshot as unknown as BriefSnapshot;
    const real = snapshot.storylines.storylines[0];

    const hasCycle = (nodeIds: string[], edgeList: Array<{ source: string; target: string }>) => {
      const adjacency = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
      edgeList.forEach(({ source, target }) => adjacency.get(source)?.push(target));
      const state = new Map<string, 'visiting' | 'done'>();
      const visit = (id: string): boolean => {
        if (state.get(id) === 'visiting') return true;
        if (state.get(id) === 'done') return false;
        state.set(id, 'visiting');
        const cyclic = (adjacency.get(id) ?? []).some(visit);
        state.set(id, 'done');
        return cyclic;
      };
      return nodeIds.some(visit);
    };

    it('produces an acyclic graph with one connector per entity pair', () => {
      const { nodes, edges } = buildStorylineGraph(real, snapshot);
      expect(
        hasCycle(
          nodes.map(({ id }) => id),
          edges
        )
      ).toBe(false);
      const connectors = nodes.filter(({ shape }) => shape === 'relationship');
      const pairs = new Set(real.edges.map(({ from, to }) => [from, to].sort().join('|')));
      expect(connectors.length).toBeLessThanOrEqual(pairs.size);
      expect(edges).toHaveLength(connectors.length * 2);
    });

    it('lists the collapsed edge verbs in the connector label', () => {
      const { nodes } = buildStorylineGraph(real, snapshot);
      const labels = nodes
        .filter(({ shape }) => shape === 'relationship')
        .map(({ label }) => label);
      expect(labels.some((label) => label?.includes(' / '))).toBe(true);
    });
  });
});
