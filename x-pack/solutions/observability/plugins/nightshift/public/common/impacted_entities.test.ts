/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, SignificantEvent } from '@kbn/significant-events-schema';
import {
  getImpactedEntities,
  getImpactedEntityKey,
  getImpactedEntityStreamNames,
} from './impacted_entities';

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
  feature_id: 'feat-checkout',
  name: 'checkout-api',
  stream_name: 'logs.checkout',
};

describe('getImpactedEntities', () => {
  it('resolves entity entries backed by a service knowledge indicator', () => {
    const feature = mockFeature();

    expect(getImpactedEntities(mockEvent({ blast_radius: [entityEntry] }), [feature])).toEqual([
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

    expect(getImpactedEntities(mockEvent({ blast_radius: [entityEntry] }), [feature])).toHaveLength(
      1
    );
  });

  it('drops infrastructure and dependency entries', () => {
    const event = mockEvent({
      blast_radius: [
        {
          type: 'infrastructure',
          feature_id: 'feat-nodes',
          title: 'Wolfi Linux nodes',
          stream_name: 'logs.checkout',
        },
        {
          type: 'dependency',
          feature_id: 'feat-edge',
          source: 'checkout-api',
          target: 'payments-api',
          stream_name: 'logs.checkout',
        },
      ],
    });
    const features = [
      mockFeature({ uuid: 'feat-nodes', subtype: 'service' }),
      mockFeature({ uuid: 'feat-edge', subtype: 'service' }),
    ];

    expect(getImpactedEntities(event, features)).toEqual([]);
  });

  it('drops entities whose knowledge indicator is not a service', () => {
    const feature = mockFeature({ subtype: 'database' });

    expect(getImpactedEntities(mockEvent({ blast_radius: [entityEntry] }), [feature])).toEqual([]);
  });

  it('drops entities whose feature_id resolves to nothing', () => {
    expect(getImpactedEntities(mockEvent({ blast_radius: [entityEntry] }), [])).toEqual([]);
  });

  it('never falls back to a stream name when there is no blast radius', () => {
    expect(getImpactedEntities(mockEvent(), [mockFeature()])).toEqual([]);
  });

  it('deduplicates repeated entries', () => {
    const event = mockEvent({ blast_radius: [entityEntry, { ...entityEntry }] });

    expect(getImpactedEntities(event, [mockFeature()])).toHaveLength(1);
  });
});

describe('getImpactedEntityStreamNames', () => {
  it('collects distinct streams from entity entries only', () => {
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
            feature_id: 'feat-nodes',
            title: 'Wolfi Linux nodes',
            stream_name: 'logs.infra',
          },
        ],
      }),
      mockEvent(),
    ];

    expect(getImpactedEntityStreamNames(events)).toEqual(['logs.checkout', 'logging-eis']);
  });
});

describe('getImpactedEntityKey', () => {
  it('separates entries that share a feature but name different entities', () => {
    expect(getImpactedEntityKey(entityEntry)).not.toBe(
      getImpactedEntityKey({ ...entityEntry, name: 'checkout-worker' })
    );
  });
});
