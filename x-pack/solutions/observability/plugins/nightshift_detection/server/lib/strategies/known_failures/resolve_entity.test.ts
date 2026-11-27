/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import { resolveEntity } from './resolve_entity';

const createService = ({ id, name }: { id: string; name?: string }): Feature => ({
  id,
  uuid: `uuid-${id}`,
  source_id: 'source-1',
  type: 'entity',
  subtype: 'service',
  title: `Service ${id}`,
  description: '',
  confidence: 90,
  properties: name ? { name } : {},
});

const resolve = (featureIds: string[], features: Feature[]) =>
  resolveEntity({
    knowledgeIndicator: {
      source_id: 'source-1',
      query: { features: featureIds.map((id) => ({ id })) },
    },
    features,
  });

describe('resolveEntity', () => {
  it('names the one service the knowledge indicator is linked to', () => {
    expect(
      resolve(['checkout'], [createService({ id: 'checkout', name: 'checkout-api' })])
    ).toEqual({
      type: 'service',
      name: 'checkout-api',
    });
  });

  it('falls back to the feature title when the service has no name', () => {
    expect(resolve(['checkout'], [createService({ id: 'checkout' })])).toEqual({
      type: 'service',
      name: 'Service checkout',
    });
  });

  it('names the source when no service, or more than one, is linked', () => {
    const source = { type: 'source', name: 'source-1' };

    expect(resolve([], [createService({ id: 'checkout', name: 'checkout-api' })])).toEqual(source);
    expect(
      resolve(
        ['checkout', 'cart'],
        [createService({ id: 'checkout', name: 'a' }), createService({ id: 'cart', name: 'b' })]
      )
    ).toEqual(source);
  });

  it('ignores a feature of the same id in another source', () => {
    expect(
      resolve(
        ['checkout'],
        [
          createService({ id: 'checkout', name: 'checkout-api' }),
          { ...createService({ id: 'checkout', name: 'other' }), source_id: 'source-2' },
        ]
      )
    ).toEqual({ type: 'service', name: 'checkout-api' });
  });

  // The aggregate feature stands for every service of the source, so it names none of them.
  it('ignores the aggregate services feature of the source', () => {
    expect(
      resolve(
        ['services:source-1', 'checkout'],
        [
          createService({ id: 'services:source-1' }),
          createService({ id: 'checkout', name: 'checkout-api' }),
        ]
      )
    ).toEqual({ type: 'service', name: 'checkout-api' });
  });
});
