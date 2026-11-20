/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicatorFeature } from '@kbn/significant-events-plugin/server';
import { resolveEntity } from './resolve_entity';

const createService = (id: string, name?: string): KnowledgeIndicatorFeature => ({
  id,
  source_id: 'source-1',
  type: 'entity',
  subtype: 'service',
  title: `Service ${id}`,
  properties: name ? { name } : {},
});

const resolve = (featureIds: string[], features: KnowledgeIndicatorFeature[]) =>
  resolveEntity({
    knowledgeIndicator: { source_id: 'source-1', feature_ids: featureIds },
    features,
  });

describe('resolveEntity', () => {
  it('names the one service the knowledge indicator is linked to', () => {
    expect(resolve(['checkout'], [createService('checkout', 'checkout-api')])).toEqual({
      type: 'service',
      name: 'checkout-api',
    });
  });

  it('falls back to the feature title when the service has no name', () => {
    expect(resolve(['checkout'], [createService('checkout')])).toEqual({
      type: 'service',
      name: 'Service checkout',
    });
  });

  it('names the source when no service, or more than one, is linked', () => {
    const source = { type: 'source', name: 'source-1' };

    expect(resolve([], [createService('checkout', 'checkout-api')])).toEqual(source);
    expect(
      resolve(['checkout', 'cart'], [createService('checkout', 'a'), createService('cart', 'b')])
    ).toEqual(source);
  });

  // The aggregate feature stands for every service of the source, so it names none of them.
  it('ignores the aggregate services feature of the source', () => {
    expect(
      resolve(
        ['services:source-1', 'checkout'],
        [createService('services:source-1'), createService('checkout', 'checkout-api')]
      )
    ).toEqual({ type: 'service', name: 'checkout-api' });
  });
});
