/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, QueryWithOccurrences } from '@kbn/significant-events-schema';
import { aggregateOccurrences, buildDetectionModel, positionDetectionEntities } from './model';

const feature = (id: string, stream: string, extra: Partial<Feature> = {}): Feature => ({
  id,
  uuid: `${stream}:${id}`,
  stream_name: stream,
  type: 'entity',
  subtype: 'service',
  title: id,
  description: '',
  confidence: 90,
  properties: { name: id },
  ...extra,
});
const dependency = (
  source: string,
  target: string,
  stream: string,
  extra: Partial<Feature> = {}
): Feature =>
  feature(`${source}-${target}`, stream, {
    type: 'dependency',
    properties: { source, target },
    ...extra,
  });
const query = (id: string, stream: string, counts: number[] = [1, 2]): QueryWithOccurrences => ({
  id,
  title: id,
  description: '',
  stream_name: stream,
  type: 'match',
  esql: { query: `FROM ${stream}` },
  rule_backed: true,
  rule_uuid: id,
  change_points: { type: {} },
  occurrences: counts.map((count, index) => ({
    date: `2026-10-01T17:${index === 0 ? '00' : '05'}:00.000Z`,
    count,
  })),
});

describe('Detection topology from existing knowledge', () => {
  it('deduplicates referenced entities and draws only explicit KI relationships', () => {
    const model = buildDetectionModel(
      [
        feature('edge', 'logs-edge.demo', {
          properties: { name: 'edge', service_namespace: 'demo' },
        }),
        feature('worker', 'logs-worker.demo', {
          properties: { name: 'worker', service_namespace: 'demo' },
        }),
        feature('worker', 'logs-edge.demo'),
        dependency('edge', 'worker', 'logs-edge.demo'),
        feature('free-text', 'logs-edge.demo', {
          type: 'log_patterns',
          description: 'worker depends on a made-up database',
        }),
      ],
      [query('edge-errors', 'logs-edge.demo')],
      [],
      []
    );
    expect(model.entities).toHaveLength(2);
    expect(model.relationships).toHaveLength(1);
    const edge = model.entities.find((entity) => entity.name === 'edge');
    const worker = model.entities.find((entity) => entity.name === 'worker');
    expect(model.relationships[0]).toMatchObject({ source: edge?.id, target: worker?.id });
    expect(worker?.streams).toEqual(['logs-worker.demo']);
    expect(worker?.queries).toHaveLength(0);
    expect(edge?.queries).toHaveLength(1);
  });

  it('retains multiple evidence records for the same directed relationship', () => {
    const model = buildDetectionModel(
      [
        feature('api', 'logs-api.demo'),
        feature('db', 'logs-db.demo'),
        dependency('api', 'db', 'logs-api.demo'),
        dependency('api', 'db', 'logs-db.demo'),
      ],
      [],
      [],
      []
    );
    expect(model.relationships).toHaveLength(1);
    expect(model.relationships[0].features).toHaveLength(2);
  });

  it('omits excluded knowledge and unresolved endpoints instead of inventing nodes', () => {
    const model = buildDetectionModel(
      [
        feature('api', 'logs-api.demo'),
        feature('db', 'logs-db.demo', { excluded: true }),
        dependency('api', 'db', 'logs-api.demo'),
        dependency('api', 'unknown', 'logs-api.demo'),
        dependency('api', 'api', 'logs-api.demo', { excluded: true }),
      ],
      [],
      [],
      []
    );
    expect(model.entities.map((entity) => entity.name)).toEqual(['api']);
    expect(model.relationships).toEqual([]);
    expect(model.unresolvedRelationships).toBe(2);
  });

  it('keeps same-named entities in different namespaces distinct', () => {
    const model = buildDetectionModel(
      [
        feature('api', 'logs-api.prod', { properties: { name: 'api', service_namespace: 'prod' } }),
        feature('api', 'logs-api.test', { properties: { name: 'api', service_namespace: 'test' } }),
        feature('db', 'logs-db.prod', { properties: { name: 'db', service_namespace: 'prod' } }),
        dependency('api', 'db', 'logs-api.prod'),
        dependency('api', 'db', 'logs-other.demo'),
      ],
      [],
      [],
      []
    );
    expect(model.entities).toHaveLength(3);
    expect(model.relationships).toHaveLength(1);
    expect(model.unresolvedRelationships).toBe(1);
    expect(model.relationships[0].source).toBe(
      model.entities.find((entity) => entity.namespace === 'prod' && entity.name === 'api')?.id
    );
  });

  it('does not turn rule matches into detections or events', () => {
    const model = buildDetectionModel(
      [feature('api', 'logs-api.demo')],
      [query('errors', 'logs-api.demo', [100, 250])],
      [],
      []
    );
    expect(model.entities[0].queries).toHaveLength(1);
    expect(model.entities[0].detections).toHaveLength(0);
    expect(model.entities[0].events).toHaveLength(0);
  });

  it('lays out cycles and disconnected entities with finite positions', () => {
    const model = buildDetectionModel(
      [
        feature('a', 'logs-a.demo'),
        feature('b', 'logs-b.demo'),
        feature('c', 'logs-c.demo'),
        dependency('a', 'b', 'logs-a.demo'),
        dependency('b', 'a', 'logs-b.demo'),
      ],
      [],
      [],
      []
    );
    const layout = positionDetectionEntities(model);
    expect(layout.nodes).toHaveLength(3);
    expect(layout.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(
      true
    );
    expect(new Set(layout.nodes.map((node) => `${node.x},${node.y}`)).size).toBe(3);
  });

  it('aggregates real occurrence buckets without smoothing or adding activity', () => {
    const series = aggregateOccurrences([
      query('a', 'logs-a.demo', [2, 0]),
      query('b', 'logs-b.demo', [3, 1]),
    ]);
    expect(series).toEqual([
      { x: Date.parse('2026-10-01T17:00:00.000Z'), y: 5 },
      { x: Date.parse('2026-10-01T17:05:00.000Z'), y: 1 },
    ]);
    expect(aggregateOccurrences([])).toEqual([]);
  });
});
