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
  it('resolves entity entries backed by a service knowledge indicator', () => {
    const feature = mockFeature();

    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [feature])).toEqual([
      {
        key: 'entity:feat-checkout:checkout-api',
        name: 'checkout-api',
        streamName: 'logs.checkout',
        feature,
      },
    ]);
  });

  it('matches a feature by its id when the entry does not reference the uuid', () => {
    const feature = mockFeature({ uuid: 'some-other-uuid', id: 'feat-checkout' });

    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [feature])).toHaveLength(
      1
    );
  });

  it('prefers a uuid match over another feature that reuses the same value as its id', () => {
    const byId = mockFeature({ uuid: 'unrelated-uuid', id: 'feat-checkout', title: 'By id' });
    const byUuid = mockFeature({ uuid: 'feat-checkout', id: 'unrelated-id', title: 'By uuid' });

    expect(
      getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [byId, byUuid])[0].feature
    ).toBe(byUuid);
  });

  // `Feature.subtype` is an unconstrained string written by a model, so casing is not guaranteed.
  it('accepts a service subtype regardless of casing', () => {
    const feature = mockFeature({ subtype: 'Service' });

    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [feature])).toHaveLength(
      1
    );
  });

  // A row's `type` is the agent's per-event wording; the knowledge indicator decides what the thing
  // it points at actually is.
  it('resolves an infrastructure entry whose knowledge indicator is a service', () => {
    const event = mockEvent({
      blast_radius: [
        {
          type: 'infrastructure',
          subtype: 'infrastructure',
          feature_id: 'feat-ingress',
          title: 'Ingress controller',
          stream_name: 'logs.checkout',
        },
      ],
    });
    const feature = mockFeature({ uuid: 'feat-ingress' });

    expect(getImpactedServices(event, [feature])).toEqual([
      {
        key: 'infrastructure:feat-ingress:Ingress controller',
        name: 'Ingress controller',
        streamName: 'logs.checkout',
        feature,
      },
    ]);
  });

  it('names an infrastructure entry from its title, then the indicator title, then its id', () => {
    const named = (feature: Feature, title?: string) =>
      getImpactedServices(
        mockEvent({
          blast_radius: [
            {
              type: 'infrastructure',
              subtype: 'infrastructure',
              feature_id: 'feat-checkout',
              stream_name: 'logs.checkout',
              title,
            },
          ],
        }),
        [feature]
      )[0].name;

    expect(named(mockFeature(), 'Ingress controller')).toBe('Ingress controller');
    expect(named(mockFeature())).toBe('Checkout API');
    expect(named(mockFeature({ title: undefined }))).toBe('checkout-api');
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

    expect(getImpactedServices(event, [mockFeature({ uuid: 'feat-edge' })])).toEqual([]);
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

    expect(
      getImpactedServices(event, [mockFeature({ uuid: 'feat-nodes', subtype: 'infrastructure' })])
    ).toEqual([]);
  });

  it('drops entities whose knowledge indicator is not a service', () => {
    const feature = mockFeature({ subtype: 'database' });

    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [feature])).toEqual([]);
  });

  it('drops entities whose knowledge indicator has no subtype', () => {
    const feature = mockFeature({ subtype: undefined });

    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [feature])).toEqual([]);
  });

  it('drops entities whose feature_id resolves to nothing', () => {
    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [])).toEqual([]);
  });

  it('never falls back to a stream name when there is no blast radius', () => {
    expect(getImpactedServices(mockEvent(), [mockFeature()])).toEqual([]);
  });

  it('deduplicates repeated entries', () => {
    const event = mockEvent({ blast_radius: [entityEntry, { ...entityEntry }] });

    expect(getImpactedServices(event, [mockFeature()])).toHaveLength(1);
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
            subtype: 'infrastructure',
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
      }),
      mockEvent(),
    ];

    expect(getImpactedServiceStreamNames(events)).toEqual([
      'logs.checkout',
      'logging-eis',
      'logs.infra',
    ]);
  });
});

describe('getImpactedServiceKey', () => {
  it('separates entries that share a feature but name different services', () => {
    expect(getImpactedServiceKey(entityEntry, 'checkout-api')).not.toBe(
      getImpactedServiceKey(entityEntry, 'checkout-worker')
    );
  });

  // `getBlastRadiusEbtDetail` reads this prefix to derive the privacy-safe analytics category.
  it('keeps the entry type as the leading key segment', () => {
    expect(getImpactedServiceKey(entityEntry, 'checkout-api')).toMatch(/^entity:/);
  });
});
