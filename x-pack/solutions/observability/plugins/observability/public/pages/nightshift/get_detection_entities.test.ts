/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, LifecycleDetection, SignificantEvent } from '@kbn/significant-events-schema';
import {
  enrichEntityFeature,
  getDetectionEntities,
  resolveEntityFeature,
} from './get_detection_entities';

const mockDetection = (overrides: Partial<LifecycleDetection> = {}): LifecycleDetection => ({
  detection_id: 'det-1',
  rule_name: 'latency-p95-spike',
  rule_uuid: 'rule-1',
  stream_name: 'logs.web-frontend',
  change_point_type: 'spike',
  '@timestamp': '2026-07-10T12:00:00Z',
  ...overrides,
});

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
  uuid: 'feature-uuid-1',
  id: 'web-frontend',
  stream_name: 'logs.web-frontend',
  type: 'entity',
  subtype: 'service',
  title: 'web-frontend',
  description: 'Frontend service entity',
  properties: { 'service.name': 'web-frontend' },
  confidence: 82,
  evidence: ['service.name = web-frontend'],
  ...overrides,
});

describe('getDetectionEntities', () => {
  it('prefers causal features matched to stream knowledge indicators', () => {
    const feature = mockFeature();
    const entities = getDetectionEntities(
      mockEvent({
        causal_features: [
          {
            feature_id: feature.uuid,
            name: 'web-frontend',
            stream_name: 'logs.web-frontend',
          },
        ],
      }),
      mockDetection(),
      [feature]
    );

    expect(entities).toHaveLength(1);
    expect(entities[0]).toMatchObject({
      key: feature.uuid,
      label: 'web-frontend',
      feature,
    });
  });

  it('falls back to entity-type stream features when causal features are absent', () => {
    const feature = mockFeature();
    const entities = getDetectionEntities(mockEvent(), mockDetection(), [
      feature,
      mockFeature({ uuid: 'other', type: 'schema', title: 'schema feature' }),
    ]);

    expect(entities).toHaveLength(1);
    expect(entities[0].feature).toEqual(feature);
  });

  it('falls back to the detection stream name when no features are available', () => {
    const entities = getDetectionEntities(mockEvent(), mockDetection(), []);

    expect(entities).toEqual([
      {
        key: 'logs.web-frontend',
        label: 'logs.web-frontend',
        streamName: 'logs.web-frontend',
        isStreamFallback: true,
      },
    ]);
  });

  it('caps entity-type stream features when causal features are absent', () => {
    const features = Array.from({ length: 5 }, (_, index) =>
      mockFeature({ uuid: `feature-${index}`, id: `entity-${index}`, title: `entity-${index}` })
    );
    const entities = getDetectionEntities(mockEvent(), mockDetection(), features);

    expect(entities).toHaveLength(3);
  });
});

describe('resolveEntityFeature', () => {
  it('returns the attached feature when present', () => {
    const feature = mockFeature();
    expect(
      resolveEntityFeature({
        key: feature.uuid,
        label: feature.title!,
        streamName: feature.stream_name,
        feature,
      })
    ).toEqual(feature);
  });

  it('synthesizes a minimal feature for stream-only entities', () => {
    expect(
      resolveEntityFeature({
        key: 'logs.web-frontend',
        label: 'logs.web-frontend',
        streamName: 'logs.web-frontend',
      })
    ).toMatchObject({
      uuid: 'logs.web-frontend',
      stream_name: 'logs.web-frontend',
      type: 'entity',
      title: 'logs.web-frontend',
    });
  });
});

describe('enrichEntityFeature', () => {
  it('borrows the detection signal for stream-only entity pills', () => {
    const entity = {
      key: 'metrics.kafka-cluster',
      label: 'metrics.kafka-cluster',
      streamName: 'metrics.kafka-cluster',
    };
    const enriched = enrichEntityFeature(entity, resolveEntityFeature(entity), {
      type: 'detection',
      stream_name: 'metrics.kafka-cluster',
      description: 'Consumer lag grew to 2.4M messages on order-processors.',
      evidence: {
        esql_query: 'FROM metrics.kafka-cluster | LIMIT 10',
        result: 'found',
      },
      metadata: {
        detection_id: 'det-9',
        rule_uuid: 'rule-9',
        rule_name: 'consumer-lag-growth',
        change_point_type: 'trend_change',
        p_value: 0.01,
      },
    });

    expect(enriched.description).toContain('Consumer lag grew');
    expect(enriched.evidence).toEqual([
      'stream_name = metrics.kafka-cluster',
      'FROM metrics.kafka-cluster | LIMIT 10',
    ]);
  });

  it('leaves knowledge-indicator features unchanged', () => {
    const feature = mockFeature();
    const entity = {
      key: feature.uuid,
      label: feature.title!,
      streamName: feature.stream_name,
      feature,
    };

    expect(enrichEntityFeature(entity, feature)).toEqual(feature);
  });
});
