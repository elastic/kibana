/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventContextAggregations } from './event_context';
import { EMPTY_EDGE_CONTEXT, edgeContextSummary, toEdgeContext } from './event_context';

describe('event context summarization', () => {
  it('returns an empty context for missing aggregations', () => {
    expect(toEdgeContext(undefined)).toEqual(EMPTY_EDGE_CONTEXT);
  });

  it('folds category aggregations into activities ordered by event count', () => {
    const aggregations: EventContextAggregations = {
      network_targets: {
        buckets: [
          {
            key: '10.20.10.11:445',
            doc_count: 12,
            earliest: { value_as_string: '2026-07-10T00:00:00.000Z' },
            latest: { value_as_string: '2026-07-11T00:00:00.000Z' },
          },
        ],
      },
      auth_targets: { buckets: [{ key: 'jump-box-01', doc_count: 5 }] },
      process_targets: { buckets: [] },
    };

    const context = toEdgeContext(aggregations);

    expect(context.totalEvents).toBe(17);
    expect(context.activities.map((activity) => activity.kind)).toEqual([
      'network',
      'authentication',
    ]);
    expect(context.dominant).toMatchObject({
      kind: 'network',
      count: 12,
      detail: '10.20.10.11:445',
    });
    expect(context.dominant?.lastSeen).toBe('2026-07-11T00:00:00.000Z');
  });

  it('sums multiple buckets within a category and keeps the top detail', () => {
    const context = toEdgeContext({
      network_targets: {
        buckets: [
          { key: '10.0.6.10:4444', doc_count: 8 },
          { key: '185.220.101.5:443', doc_count: 3 },
        ],
      },
    });

    expect(context.dominant).toMatchObject({
      kind: 'network',
      count: 11,
      detail: '10.0.6.10:4444',
    });
  });

  describe('edgeContextSummary', () => {
    it('prefers a real activity phrase when context is present', () => {
      const context = toEdgeContext({
        auth_targets: { buckets: [{ key: 'jump-box-01', doc_count: 5 }] },
      });
      expect(edgeContextSummary(context, 4)).toBe('authenticated to (5 logons)');
    });

    it('builds a network phrase with the concrete destination and flow count', () => {
      const context = toEdgeContext({
        network_targets: { buckets: [{ key: '10.20.10.11:445', doc_count: 12 }] },
      });
      expect(edgeContextSummary(context, 4)).toBe('connected to 10.20.10.11:445 (12 flows)');
    });

    it('names a spawned process', () => {
      const context = toEdgeContext({
        process_targets: { buckets: [{ key: 'powershell.exe', doc_count: 1 }] },
      });
      expect(edgeContextSummary(context, 9)).toBe('spawned process powershell.exe (1 event)');
    });

    it('falls back to the shared-alert summary when there is no event context', () => {
      expect(edgeContextSummary(EMPTY_EDGE_CONTEXT, 1)).toBe('1 shared alert');
      expect(edgeContextSummary(EMPTY_EDGE_CONTEXT, 7)).toBe('7 shared alerts');
    });
  });
});
