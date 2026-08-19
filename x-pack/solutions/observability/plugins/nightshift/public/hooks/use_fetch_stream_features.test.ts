/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import { collectStreamFeatures } from './use_fetch_stream_features';

const mockFeature = (id: string, streamName: string): Feature => ({
  uuid: `uuid-${id}`,
  id,
  stream_name: streamName,
  type: 'entity',
  subtype: 'service',
  title: id,
  description: `${id} service entity`,
  properties: { 'service.name': id },
  confidence: 80,
});

describe('collectStreamFeatures', () => {
  // Silent failure: an unreachable stream must not blank out the services of the reachable ones,
  // and must not surface an error either.
  it('keeps the features of the streams that answered and ignores the ones that did not', () => {
    const checkout = mockFeature('checkout-api', 'logs.checkout');

    expect(
      collectStreamFeatures([
        { status: 'fulfilled', value: [checkout] },
        { status: 'rejected', reason: new Error('gateway timeout') },
      ])
    ).toEqual([checkout]);
  });

  it('returns nothing when every stream fails', () => {
    expect(
      collectStreamFeatures([
        { status: 'rejected', reason: new Error('gateway timeout') },
        { status: 'rejected', reason: new Error('connection refused') },
      ])
    ).toEqual([]);
  });
});
