/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import { collectSourceFeatures } from './use_fetch_source_features';

const mockFeature = (id: string, sourceId: string): Feature => ({
  uuid: `uuid-${id}`,
  id,
  source_id: sourceId,
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

describe('collectSourceFeatures', () => {
  it('reports no failures when every source resolves', () => {
    const checkout = mockFeature('checkout-api', 'logs.checkout');
    const payments = mockFeature('payments-api', 'logs.payments');

    expect(
      collectSourceFeatures(
        ['logs.checkout', 'logs.payments'],
        [loaded([checkout]), loaded([payments])]
      )
    ).toEqual({ features: [checkout, payments], failedSourceIds: [] });
  });

  // The whole point of the partial state: a short list must not pass for a complete one.
  it('keeps the features that resolved and names the sources that did not', () => {
    const checkout = mockFeature('checkout-api', 'logs.checkout');

    expect(
      collectSourceFeatures(
        ['logs.checkout', 'logs.payments', 'logs.orders'],
        [loaded([checkout]), unreachable(new Error('gateway timeout')), loaded([])]
      )
    ).toEqual({ features: [checkout], failedSourceIds: ['logs.payments'] });
  });

  it('throws the first reason when every source fails', () => {
    const firstFailure = new Error('gateway timeout');

    expect(() =>
      collectSourceFeatures(
        ['logs.checkout', 'logs.payments'],
        [unreachable(firstFailure), unreachable(new Error('connection refused'))]
      )
    ).toThrow(firstFailure);
  });

  it('returns nothing rather than throwing when there are no sources to load', () => {
    expect(collectSourceFeatures([], [])).toEqual({ features: [], failedSourceIds: [] });
  });
});
