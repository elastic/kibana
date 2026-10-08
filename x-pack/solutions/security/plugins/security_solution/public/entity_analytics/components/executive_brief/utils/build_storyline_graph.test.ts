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
});
