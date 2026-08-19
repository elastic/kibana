/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, SignificantEvent } from '@kbn/significant-events-schema';
import {
  buildBlastRadiusChips,
  eventHasBlastRadiusChip,
  filterEventsByBlastRadiusChip,
} from './blast_radius_chips';

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

const serviceFeature = (uuid: string, title: string, streamName = 'logs.checkout'): Feature => ({
  uuid,
  id: uuid,
  stream_name: streamName,
  type: 'entity',
  subtype: 'service',
  title,
  description: '',
  properties: {},
  confidence: 90,
});

const entityEntry = (featureId: string, name: string, streamName = 'logs.checkout') => ({
  type: 'entity' as const,
  feature_id: featureId,
  name,
  stream_name: streamName,
});

const causalFeature = (featureId: string, name: string, streamName = 'logs.checkout') => ({
  feature_id: featureId,
  name,
  stream_name: streamName,
});

describe('blast_radius_chips', () => {
  it('builds chips from the impacted services of need-action events', () => {
    const chips = buildBlastRadiusChips(
      [mockEvent({ blast_radius: [entityEntry('feat-1', 'checkout-api')] })],
      { features: [serviceFeature('feat-1', 'checkout-api')] }
    );

    expect(chips).toEqual([{ count: 1, key: 'checkout-api', name: 'checkout-api' }]);
  });

  it('builds chips from causal features as well as blast radius entities', () => {
    const chips = buildBlastRadiusChips(
      [
        mockEvent({
          blast_radius: [entityEntry('feat-1', 'checkout-api')],
          causal_features: [causalFeature('feat-2', 'payments-api')],
        }),
      ],
      {
        features: [
          serviceFeature('feat-1', 'checkout-api'),
          serviceFeature('feat-2', 'payments-api'),
        ],
      }
    );

    expect(chips.map(({ name }) => name)).toEqual(['checkout-api', 'payments-api']);
  });

  it('renders no chips when nothing resolves to a service', () => {
    const events = [
      mockEvent({ stream_names: ['service-a', 'service-b'] }),
      mockEvent({ event_id: '2', blast_radius: [entityEntry('feat-missing', 'ghost')] }),
    ];

    expect(buildBlastRadiusChips(events, { features: [] })).toEqual([]);
  });

  it('sorts chips by event count descending, then by name', () => {
    const features = [
      serviceFeature('feat-popular', 'popular'),
      serviceFeature('feat-rare', 'rare'),
    ];
    const chips = buildBlastRadiusChips(
      [
        mockEvent({ event_id: '1', blast_radius: [entityEntry('feat-rare', 'rare')] }),
        mockEvent({
          event_id: '2',
          blast_radius: [entityEntry('feat-popular', 'popular'), entityEntry('feat-rare', 'rare')],
        }),
        mockEvent({ event_id: '3', blast_radius: [entityEntry('feat-popular', 'popular')] }),
      ],
      { features }
    );

    expect(chips.map(({ name }) => name)).toEqual(['popular', 'rare']);
    expect(chips[0].count).toBe(2);
  });

  it('counts an event once even when it repeats the same service', () => {
    const chips = buildBlastRadiusChips(
      [
        mockEvent({
          blast_radius: [
            entityEntry('feat-1', 'checkout-api'),
            entityEntry('feat-1', 'checkout-api'),
          ],
        }),
      ],
      { features: [serviceFeature('feat-1', 'checkout-api')] }
    );

    expect(chips).toEqual([{ count: 1, key: 'checkout-api', name: 'checkout-api' }]);
  });

  it('counts an event once when both of its arrays name the same service', () => {
    const chips = buildBlastRadiusChips(
      [
        mockEvent({
          blast_radius: [entityEntry('feat-1', 'checkout-api')],
          causal_features: [causalFeature('feat-1', 'checkout-api')],
        }),
      ],
      { features: [serviceFeature('feat-1', 'checkout-api')] }
    );

    expect(chips).toEqual([{ count: 1, key: 'checkout-api', name: 'checkout-api' }]);
  });

  it('filters events by chip key', () => {
    const features = [serviceFeature('f1', 'checkout-api')];
    const events = [
      mockEvent({ event_id: '1', blast_radius: [entityEntry('f1', 'checkout-api')] }),
      mockEvent({ event_id: '2', stream_names: ['other-service'] }),
    ];

    expect(filterEventsByBlastRadiusChip(events, 'checkout-api', { features })).toHaveLength(1);
    expect(eventHasBlastRadiusChip(events[1], 'other-service', { features })).toBe(false);
  });
});
