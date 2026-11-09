/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import type { Feature } from '@kbn/significant-events-schema';
import { withViewedInstance } from './with_viewed_instance';

const makeFeature = (overrides: Partial<Feature>): Feature => ({
  id: 'redis',
  uuid: 'a:redis',
  source_id: 'a',
  type: 'technology',
  description: 'from a',
  properties: {},
  confidence: 90,
  ...overrides,
});

const representative = makeFeature({});
const other = makeFeature({
  uuid: 'b:redis',
  source_id: 'b',
  description: 'from b',
  confidence: 40,
});

const indicator: KnowledgeIndicator = {
  kind: 'feature',
  feature: { ...representative, sources: ['a', 'b'], instances: [representative, other] },
};

describe('withViewedInstance', () => {
  it('swaps the top-level fields for the chosen instance and keeps the fold', () => {
    const viewed = withViewedInstance(indicator, 'b:redis');

    expect(viewed).toEqual({
      kind: 'feature',
      feature: { ...other, sources: ['a', 'b'], instances: [representative, other] },
    });
  });

  it('returns the indicator unchanged for the representative, an unknown uuid or no uuid', () => {
    expect(withViewedInstance(indicator, 'a:redis')).toBe(indicator);
    expect(withViewedInstance(indicator, 'stale-uuid')).toBe(indicator);
    expect(withViewedInstance(indicator, undefined)).toBe(indicator);
  });
});
