/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import { buildImpactedServiceChips } from './impacted_services_chips';

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_id: 'evt-1',
  status: 'active',
  source_ids: ['service-a'],
  title: 'Event',
  summary: 'Summary',
  severity: 'medium',
  confidence: 0.9,
  ...overrides,
});

const entityEntry = (featureId: string, name: string, sourceId = 'logs.checkout') => ({
  type: 'entity' as const,
  subtype: 'service',
  feature_id: featureId,
  name,
  source_id: sourceId,
});

describe('impacted_services_chips', () => {
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
});
