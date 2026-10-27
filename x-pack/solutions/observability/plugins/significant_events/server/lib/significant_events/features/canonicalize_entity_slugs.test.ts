/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFeature } from '@kbn/significant-events-schema';
import { canonicalizeEntitySlugs, slugify } from './canonicalize_entity_slugs';

const entity = (
  filter?: BaseFeature['filter'],
  overrides: Partial<BaseFeature> = {}
): BaseFeature => ({
  id: 'checkout-service-api',
  type: 'entity',
  description: 'desc',
  properties: {},
  confidence: 80,
  filter,
  ...overrides,
});

const canonicalId = (feature: BaseFeature) => canonicalizeEntitySlugs([feature]).features[0].id;

describe('canonicalizeEntitySlugs', () => {
  it('derives the slug from a single service.name equality', () => {
    const result = canonicalizeEntitySlugs([entity({ field: 'service.name', eq: 'Checkout API' })]);

    expect(result.features[0].id).toBe('checkout-api');
    expect(result.canonicalSlugs).toEqual(new Set(['checkout-api']));
  });

  it('derives the slug from a conjunction holding exactly one identity equality', () => {
    expect(
      canonicalId(
        entity({
          and: [
            { field: 'resource.attributes.service.name', eq: 'checkout_api' },
            { field: 'k8s.namespace.name', eq: 'prod' },
          ],
        })
      )
    ).toBe('checkout-api');
  });

  it.each([
    ['a disjunction', { or: [{ field: 'service.name', eq: 'checkout' }] }],
    [
      'two identity equalities',
      {
        and: [
          { field: 'service.name', eq: 'checkout' },
          { field: 'resource.attributes.service.name', eq: 'cart' },
        ],
      },
    ],
    ['a non-identity field', { field: 'host.name', eq: 'checkout' }],
  ])('leaves the id untouched for %s', (_, filter) => {
    expect(canonicalId(entity(filter as BaseFeature['filter']))).toBe('checkout-service-api');
  });

  it('leaves non-entity features untouched', () => {
    const result = canonicalizeEntitySlugs([
      entity({ field: 'service.name', eq: 'checkout' }, { type: 'technology', id: 'redis' }),
    ]);

    expect(result.features[0].id).toBe('redis');
    expect(result.canonicalSlugs.size).toBe(0);
  });
});

describe('slugify', () => {
  it('collapses separators and trims dashes', () => {
    expect(slugify('--Cart.Service--')).toBe('cart-service');
  });
});
