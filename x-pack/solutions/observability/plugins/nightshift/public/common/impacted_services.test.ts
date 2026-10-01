/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, SignificantEvent } from '@kbn/significant-events-schema';
import {
  getImpactedServiceKey,
  getImpactedServiceStreamNames,
  getImpactedServices,
  resolveImpactedServices,
} from './impacted_services';

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-07-10T12:00:00Z',
  event_id: 'evt-001',
  event_uuid: 'evt-uuid-001',
  status: 'open',
  stream_names: ['logs.web-frontend'],
  title: 'Test event',
  summary: 'Summary',
  severity: '60-high',
  confidence: 0.9,
  ...overrides,
});

const mockFeature = (overrides: Partial<Feature> = {}): Feature => ({
  uuid: 'feat-checkout',
  id: 'checkout-api',
  stream_name: 'logs.checkout',
  type: 'entity',
  subtype: 'service',
  title: 'Checkout API',
  description: 'Checkout service entity',
  properties: { 'service.name': 'checkout-api' },
  confidence: 82,
  ...overrides,
});

const entityEntry = {
  type: 'entity' as const,
  subtype: 'service',
  feature_id: 'feat-checkout',
  name: 'checkout-api',
  stream_name: 'logs.checkout',
};

describe('getImpactedServices', () => {
  it('returns service entities from the blast radius', () => {
    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }))).toEqual([
      {
        key: 'entity:checkout-api',
        name: 'checkout-api',
      },
    ]);
  });

  it('matches a feature by its id when the entry does not reference the uuid', () => {
    const feature = mockFeature({ uuid: 'some-other-uuid', id: 'feat-checkout' });

    expect(
      resolveImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [feature])
    ).toHaveLength(1);
  });

  it('prefers a uuid match over another feature that reuses the same value as its id', () => {
    const byId = mockFeature({ uuid: 'unrelated-uuid', id: 'feat-checkout', title: 'By id' });
    const byUuid = mockFeature({ uuid: 'feat-checkout', id: 'unrelated-id', title: 'By uuid' });

    expect(
      resolveImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [byId, byUuid])[0].feature
    ).toBe(byUuid);
  });

  it('accepts a service subtype regardless of casing', () => {
    const entry = { ...entityEntry, subtype: 'Service' };

    expect(getImpactedServices(mockEvent({ blast_radius: [entry] }))).toHaveLength(1);
  });

  it('drops infrastructure entries even when their subtype is service', () => {
    const event = mockEvent({
      blast_radius: [
        {
          type: 'infrastructure',
          subtype: 'service',
          feature_id: 'feat-ingress',
          title: 'Ingress controller',
          stream_name: 'logs.checkout',
        },
      ],
    });
    expect(getImpactedServices(event)).toEqual([]);
  });

  // A dependency row names an edge — `source` → `target` behind one `feature_id` — so there is no
  // single subject to render.
  it('drops dependency entries', () => {
    const event = mockEvent({
      blast_radius: [
        {
          type: 'dependency',
          subtype: 'http',
          feature_id: 'feat-edge',
          source: 'checkout-api',
          target: 'payments-api',
          stream_name: 'logs.checkout',
        },
      ],
    });

    expect(getImpactedServices(event)).toEqual([]);
  });

  it('drops an infrastructure entry whose knowledge indicator is not a service', () => {
    const event = mockEvent({
      blast_radius: [
        {
          type: 'infrastructure',
          subtype: 'infrastructure',
          feature_id: 'feat-nodes',
          title: 'Wolfi Linux nodes',
          stream_name: 'logs.checkout',
        },
      ],
    });

    expect(getImpactedServices(event)).toEqual([]);
  });

  it('drops entities whose topology subtype is not service', () => {
    const entry = { ...entityEntry, subtype: 'database' };

    expect(getImpactedServices(mockEvent({ blast_radius: [entry] }))).toEqual([]);
  });

  it('drops entities whose topology reference has no subtype', () => {
    const { subtype, ...entry } = entityEntry;

    expect(subtype).toBe('service');
    expect(getImpactedServices(mockEvent({ blast_radius: [entry] }))).toEqual([]);
  });

  it('returns direct services but does not resolve a missing knowledge indicator', () => {
    const event = mockEvent({ blast_radius: [entityEntry] });

    expect(getImpactedServices(event)).toHaveLength(1);
    expect(resolveImpactedServices(event, [])).toEqual([]);
  });

  it('resolves a duplicate service when its first reference is missing', () => {
    const feature = mockFeature({ uuid: 'feat-resolved' });
    const event = mockEvent({
      blast_radius: [entityEntry],
      causal_features: [
        {
          feature_id: 'feat-resolved',
          type: 'entity',
          subtype: 'service',
          name: 'Checkout-API',
          stream_name: 'logs.checkout',
        },
      ],
    });

    expect(resolveImpactedServices(event, [feature])[0].feature).toBe(feature);
  });

  it('never falls back to a stream name when there is no blast radius', () => {
    expect(getImpactedServices(mockEvent())).toEqual([]);
  });

  it('merges causal features and deduplicates service names case-insensitively', () => {
    const event = mockEvent({
      blast_radius: [entityEntry],
      causal_features: [
        {
          feature_id: 'other-checkout',
          type: 'entity',
          subtype: 'service',
          name: 'Checkout-API',
          stream_name: 'logs.other-checkout',
        },
        {
          feature_id: 'payments',
          type: 'entity',
          subtype: 'service',
          name: 'payments-api',
        },
      ],
    });

    expect(getImpactedServices(event).map(({ name }) => name)).toEqual([
      'checkout-api',
      'payments-api',
    ]);
  });
});

describe('getImpactedServiceStreamNames', () => {
  it('collects distinct streams from every entry that can name a service', () => {
    const events = [
      mockEvent({ blast_radius: [entityEntry] }),
      mockEvent({
        blast_radius: [
          {
            ...entityEntry,
            feature_id: 'feat-eis',
            name: 'eis-gateway',
            stream_name: 'logging-eis',
          },
          {
            type: 'infrastructure',
            subtype: 'service',
            feature_id: 'feat-nodes',
            title: 'Wolfi Linux nodes',
            stream_name: 'logs.infra',
          },
          {
            type: 'dependency',
            subtype: 'http',
            feature_id: 'feat-edge',
            source: 'checkout-api',
            target: 'payments-api',
            stream_name: 'logs.edges',
          },
        ],
        causal_features: [
          {
            feature_id: 'feat-payments',
            type: 'entity',
            subtype: 'service',
            name: 'payments-api',
            stream_name: 'logs.payments',
          },
        ],
      }),
      mockEvent(),
    ];

    expect(getImpactedServiceStreamNames(events)).toEqual([
      'logs.checkout',
      'logging-eis',
      'logs.payments',
    ]);
  });
});

describe('getImpactedServiceKey', () => {
  it('separates differently named services', () => {
    expect(getImpactedServiceKey('checkout-api')).not.toBe(
      getImpactedServiceKey('checkout-worker')
    );
  });

  it('keeps the entry type as the leading key segment', () => {
    expect(getImpactedServiceKey('checkout-api')).toMatch(/^entity:/);
  });
});
