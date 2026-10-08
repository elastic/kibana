/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BlastRadiusEntry, CausalFeature } from '@kbn/significant-events-schema';
import { computeTopologyBreadth, computeTopologyFanOut, hasCascadePath } from './topology_breadth';

const causalFeature = (featureId: string): CausalFeature => ({
  feature_id: featureId,
  name: featureId,
  stream_name: 'logs.test',
});

const blastRadiusEntity = (featureId: string): BlastRadiusEntry => ({
  type: 'entity',
  feature_id: featureId,
  name: featureId,
  stream_name: 'logs.test',
});

const dependencyEntry = (featureId: string, source = 'gateway'): BlastRadiusEntry => ({
  type: 'dependency',
  feature_id: featureId,
  source,
  target: featureId,
  stream_name: 'logs.test',
});

describe('computeTopologyBreadth', () => {
  it('returns 0 for no topology', () => {
    expect(computeTopologyBreadth(undefined, undefined)).toBe(0);
    expect(computeTopologyBreadth([], [])).toBe(0);
  });

  it('counts causal features and blast-radius entries', () => {
    expect(computeTopologyBreadth([causalFeature('a')], [])).toBe(1);
    expect(computeTopologyBreadth([], [blastRadiusEntity('a')])).toBe(1);
    expect(computeTopologyBreadth([causalFeature('a')], [blastRadiusEntity('b')])).toBe(2);
  });

  it('dedupes by feature_id across causal_features and blast_radius', () => {
    expect(computeTopologyBreadth([causalFeature('a')], [blastRadiusEntity('a')])).toBe(1);
  });

  it('counts dependency edges as topology entities too', () => {
    expect(
      computeTopologyBreadth([causalFeature('a')], [dependencyEntry('db'), blastRadiusEntity('c')])
    ).toBe(3);
  });
});

describe('computeTopologyFanOut', () => {
  it('returns 0 for no blast_radius', () => {
    expect(computeTopologyFanOut(undefined)).toBe(0);
    expect(computeTopologyFanOut([])).toBe(0);
  });

  it('counts only dependency edges, never entity rows', () => {
    expect(computeTopologyFanOut([blastRadiusEntity('a'), blastRadiusEntity('b')])).toBe(0);
  });

  it('dedupes edges by feature_id within a source', () => {
    expect(computeTopologyFanOut([dependencyEntry('db'), dependencyEntry('db')])).toBe(1);
  });

  it('counts distinct edges from the same source', () => {
    expect(
      computeTopologyFanOut([
        dependencyEntry('db'),
        dependencyEntry('cache'),
        blastRadiusEntity('a'),
      ])
    ).toBe(2);
  });

  it('does not combine unrelated source groups', () => {
    expect(
      computeTopologyFanOut([
        dependencyEntry('postgres', 'orders-api'),
        dependencyEntry('redis', 'search'),
      ])
    ).toBe(1);
  });
});

describe('hasCascadePath', () => {
  it('is false for no blast_radius', () => {
    expect(hasCascadePath(undefined)).toBe(false);
    expect(hasCascadePath([])).toBe(false);
  });

  it('is false when blast_radius has only entity/infrastructure rows', () => {
    expect(hasCascadePath([blastRadiusEntity('a')])).toBe(false);
  });

  it('is false for a single dependency edge', () => {
    expect(hasCascadePath([dependencyEntry('checkout')])).toBe(false);
    expect(hasCascadePath([blastRadiusEntity('a'), dependencyEntry('checkout')])).toBe(false);
  });

  it('is true when a source fans out to multiple dependency edges', () => {
    expect(hasCascadePath([dependencyEntry('db'), dependencyEntry('cache')])).toBe(true);
  });

  it('is false for dependency edges from unrelated sources', () => {
    expect(
      hasCascadePath([
        dependencyEntry('postgres', 'orders-api'),
        dependencyEntry('redis', 'search'),
      ])
    ).toBe(false);
  });
});
