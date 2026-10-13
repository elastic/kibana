/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { featureIdentificationOutputSchema } from './feature_identification_output';

const validFeature = {
  id: 'checkout-service',
  type: 'entity' as const,
  subtype: 'service',
  description: 'Checkout service',
  title: 'Checkout service',
  properties: { name: 'checkout-service' },
  confidence: 90,
  evidence: ['service.name=checkout-service'],
  evidence_doc_ids: ['doc-1'],
  tags: ['service'],
  filter: { field: 'service.name', eq: 'checkout-service' },
};

describe('featureIdentificationOutputSchema', () => {
  it('accepts valid output', () => {
    expect(
      featureIdentificationOutputSchema.safeParse({
        features: [validFeature],
        ignored_features: [],
      }).success
    ).toBe(true);
  });

  it('emits a reference-free JSON schema', () => {
    expect(JSON.stringify(z.toJSONSchema(featureIdentificationOutputSchema))).not.toContain('$ref');
  });

  it.each([
    ['an unsupported feature type', { type: 'unsupported' }],
    ['an out-of-range confidence', { confidence: 101 }],
    ['empty properties', { properties: {} }],
    [
      'a nested filter',
      { filter: { and: [{ field: 'service.name', eq: 'checkout-service', extra: true }] } },
    ],
  ])('rejects %s', (_, override) => {
    expect(
      featureIdentificationOutputSchema.safeParse({
        features: [{ ...validFeature, ...override }],
      }).success
    ).toBe(false);
  });
});
