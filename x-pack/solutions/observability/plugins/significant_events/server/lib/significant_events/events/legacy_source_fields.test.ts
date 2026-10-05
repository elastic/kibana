/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import { storedEventSchema } from './data_stream';
import { readLegacySourceFields } from './legacy_source_fields';

const baseEvent = {
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_uuid: 'event-1',
  event_id: 'agent-event-1',
  status: 'open',
  title: 'Test event',
  summary: 'Test summary',
  severity: '40-medium',
  confidence: 0.8,
};

const toLegacyEvent = (fields: Record<string, unknown>): SignificantEvent =>
  ({ ...baseEvent, ...fields } as unknown as SignificantEvent);

describe('readLegacySourceFields', () => {
  it('reads stream_names and nested stream_name under the source keys', () => {
    const event = readLegacySourceFields(
      toLegacyEvent({
        stream_names: ['source-a'],
        signals: [
          {
            type: 'detection',
            stream_name: 'source-a',
            description: 'Found: x Impact: y',
            verdict: 'not_checked',
            metadata: {
              detection_id: 'd1',
              rule_name: 'rule',
              rule_uuid: 'r1',
              change_point_type: 'spike',
              p_value: 0.01,
            },
          },
        ],
        causal_features: [{ feature_id: 'f1', name: 'svc', stream_name: 'source-a' }],
        blast_radius: [{ type: 'entity', feature_id: 'f2', name: 'db', stream_name: 'source-b' }],
      })
    );

    expect(event.source_ids).toEqual(['source-a']);
    expect(event.signals?.[0]).toMatchObject({ source_id: 'source-a' });
    expect(event.signals?.[0]).not.toHaveProperty('stream_name');
    expect(event.causal_features?.[0]).toMatchObject({ source_id: 'source-a' });
    expect(event.blast_radius?.[0]).toMatchObject({ source_id: 'source-b' });
    expect(event).not.toHaveProperty('stream_names');
  });

  it('produces a document the stored event schema accepts', () => {
    const event = readLegacySourceFields(
      toLegacyEvent({
        stream_names: ['source-a'],
        signals: [
          {
            type: 'detection',
            stream_name: 'source-a',
            description: 'Found: x Impact: y',
            verdict: 'not_checked',
            metadata: {
              detection_id: 'd1',
              rule_name: 'rule',
              rule_uuid: 'r1',
              change_point_type: 'spike',
              p_value: 0.01,
            },
          },
        ],
        blast_radius: [{ type: 'entity', feature_id: 'f2', name: 'db', stream_name: 'source-a' }],
      })
    );

    expect(storedEventSchema.safeParse(event).success).toBe(true);
  });

  it('prefers source ids already present over legacy ones', () => {
    const event = readLegacySourceFields(
      toLegacyEvent({
        source_ids: ['source-new'],
        stream_names: ['source-old'],
        causal_features: [
          { feature_id: 'f1', name: 'svc', source_id: 'source-new', stream_name: 'source-old' },
        ],
      })
    );

    expect(event.source_ids).toEqual(['source-new']);
    expect(event.causal_features?.[0].source_id).toBe('source-new');
  });

  it('defaults a missing source list to empty and leaves absent collections absent', () => {
    const event = readLegacySourceFields(toLegacyEvent({}));

    expect(event.source_ids).toEqual([]);
    expect(event).not.toHaveProperty('signals');
    expect(event).not.toHaveProperty('causal_features');
    expect(event).not.toHaveProperty('blast_radius');
  });

  it('keeps causal features without a source untouched', () => {
    const event = readLegacySourceFields(
      toLegacyEvent({
        source_ids: ['source-a'],
        causal_features: [{ feature_id: 'f1', name: 'svc' }],
      })
    );

    expect(event.causal_features).toEqual([{ feature_id: 'f1', name: 'svc' }]);
  });
});
