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

const loaded = (features: Feature[]): PromiseSettledResult<Feature[]> => ({
  status: 'fulfilled',
  value: features,
});

const unreachable = (reason: Error): PromiseSettledResult<Feature[]> => ({
  status: 'rejected',
  reason,
});

describe('collectStreamFeatures', () => {
  it('reports no failures when every stream resolves', () => {
    const checkout = mockFeature('checkout-api', 'logs.checkout');
    const payments = mockFeature('payments-api', 'logs.payments');

    expect(
      collectStreamFeatures(
        ['logs.checkout', 'logs.payments'],
        [loaded([checkout]), loaded([payments])]
      )
    ).toEqual({ features: [checkout, payments], failedStreamNames: [] });
  });

  // The whole point of the partial state: a short list must not pass for a complete one.
  it('keeps the features that resolved and names the streams that did not', () => {
    const checkout = mockFeature('checkout-api', 'logs.checkout');

    expect(
      collectStreamFeatures(
        ['logs.checkout', 'logs.payments', 'logs.orders'],
        [loaded([checkout]), unreachable(new Error('gateway timeout')), loaded([])]
      )
    ).toEqual({ features: [checkout], failedStreamNames: ['logs.payments'] });
  });

  it('throws the first reason when every stream fails', () => {
    const firstFailure = new Error('gateway timeout');

    expect(() =>
      collectStreamFeatures(
        ['logs.checkout', 'logs.payments'],
        [unreachable(firstFailure), unreachable(new Error('connection refused'))]
      )
    ).toThrow(firstFailure);
  });

  it('returns nothing rather than throwing when there are no streams to load', () => {
    expect(collectStreamFeatures([], [])).toEqual({ features: [], failedStreamNames: [] });
  });
});
