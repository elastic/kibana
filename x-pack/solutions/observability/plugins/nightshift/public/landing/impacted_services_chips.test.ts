/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import {
  buildImpactedServiceChips,
  eventHasImpactedServiceChip,
  filterEventsByImpactedServiceChip,
} from './impacted_services_chips';

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_id: 'evt-1',
  event_uuid: 'evt-uuid-1',
  status: 'open',
  stream_names: ['service-a'],
  title: 'Event',
  summary: 'Summary',
  severity: '40-medium',
  confidence: 0.9,
  ...overrides,
});

const entityEntry = (featureId: string, name: string, streamName = 'logs.checkout') => ({
  type: 'entity' as const,
  subtype: 'service',
  feature_id: featureId,
  name,
  stream_name: streamName,
});

describe('impacted_services_chips', () => {
  it('builds chips from the impacted services of need-action events', () => {
    const chips = buildImpactedServiceChips([
      mockEvent({ blast_radius: [entityEntry('feat-1', 'checkout-api')] }),
    ]);

    expect(chips).toEqual([{ count: 1, key: 'entity:checkout-api', name: 'checkout-api' }]);
  });

  it('renders no chips when no topology entry is a service entity', () => {
    const events = [
      mockEvent({ stream_names: ['service-a', 'service-b'] }),
      mockEvent({
        event_id: '2',
        blast_radius: [{ ...entityEntry('feat-database', 'orders-db'), subtype: 'database' }],
      }),
    ];

    expect(buildImpactedServiceChips(events)).toEqual([]);
  });

  it('sorts chips by event count descending, then by name', () => {
    const chips = buildImpactedServiceChips([
      mockEvent({ event_id: '1', blast_radius: [entityEntry('feat-rare', 'rare')] }),
      mockEvent({
        event_id: '2',
        blast_radius: [entityEntry('feat-popular', 'popular'), entityEntry('feat-rare', 'rare')],
      }),
      mockEvent({ event_id: '3', blast_radius: [entityEntry('feat-popular', 'popular')] }),
    ]);

    expect(chips.map(({ name }) => name)).toEqual(['popular', 'rare']);
    expect(chips[0].count).toBe(2);
  });

  it('counts an event once even when it repeats the same service', () => {
    const chips = buildImpactedServiceChips([
      mockEvent({
        blast_radius: [
          entityEntry('feat-1', 'checkout-api'),
          entityEntry('feat-1', 'checkout-api'),
        ],
      }),
    ]);

    expect(chips).toEqual([{ count: 1, key: 'entity:checkout-api', name: 'checkout-api' }]);
  });

  it('counts an event once when both topology arrays name the same service', () => {
    const chips = buildImpactedServiceChips([
      mockEvent({
        blast_radius: [entityEntry('feat-1', 'checkout-api')],
        causal_features: [
          {
            feature_id: 'feat-2',
            type: 'entity',
            subtype: 'service',
            name: 'Checkout-API',
            stream_name: 'logs.checkout',
          },
        ],
      }),
    ]);

    expect(chips).toEqual([{ count: 1, key: 'entity:checkout-api', name: 'checkout-api' }]);
  });

  it('filters events by chip key', () => {
    const events = [
      mockEvent({ event_id: '1', blast_radius: [entityEntry('f1', 'checkout-api')] }),
      mockEvent({ event_id: '2', stream_names: ['other-service'] }),
    ];

    expect(filterEventsByImpactedServiceChip(events, 'entity:checkout-api')).toHaveLength(1);
    expect(eventHasImpactedServiceChip(events[1], 'other-service')).toBe(false);
  });
});
