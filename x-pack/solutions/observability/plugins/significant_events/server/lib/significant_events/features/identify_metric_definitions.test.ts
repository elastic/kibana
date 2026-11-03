/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { AnalysisTarget } from '@kbn/nightshift-ai';
import { hasSameFingerprint, metricDefinitionFeatureId } from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import {
  identifyMetricDefinitions,
  toMetricDefinitionFeatures,
  type MetricsInfoRow,
} from './identify_metric_definitions';

const START = Date.parse('2026-01-01T00:00:00.000Z');
const END = Date.parse('2026-01-02T00:00:00.000Z');
const VIEW = '$.nightshift.sources.default.metrics';
const STREAM = 'metrics-system-prod';

const target: AnalysisTarget = {
  id: 'metrics-source',
  name: 'System metrics',
  sources: [VIEW],
  samplingSource: VIEW,
};

const columns = [
  'metric_name',
  'data_stream',
  'unit',
  'metric_type',
  'field_type',
  'dimension_fields',
] as const;

const metricsResponse = (rows: MetricsInfoRow[]) => ({
  columns: columns.map((name) => ({ name })),
  values: rows.map((row) => columns.map((name) => row[name] ?? null)),
});

const countResponse = (fields: string[]) => ({
  columns: fields.map((_, index) => ({ name: `m${index}` })),
  values: [fields.map((field) => (field.startsWith('live') ? 4 : 0))],
});

const fieldsInCountQuery = (query: string): string[] =>
  [...query.matchAll(/m\d+ = COUNT\(`([^`]*)`\)/g)].map((match) => match[1]);

describe('toMetricDefinitionFeatures', () => {
  const row: MetricsInfoRow = {
    metric_name: 'system.cpu.utilization',
    data_stream: ['metrics-system-prod', 'metrics-system-staging'],
    unit: 'percent',
    metric_type: 'gauge',
    field_type: 'double',
    dimension_fields: ['host.name', '_metric_names_hash', 'temporality', 'labels._source'],
  };

  it('splits one row into a feature per data stream and drops internal dimensions', () => {
    const [prod, staging] = toMetricDefinitionFeatures(row);

    expect(prod.id).toBe(
      metricDefinitionFeatureId('metrics-system-prod', 'system.cpu.utilization')
    );
    expect(staging.id).toBe(
      metricDefinitionFeatureId('metrics-system-staging', 'system.cpu.utilization')
    );
    expect(prod.properties).toEqual({
      metric_name: 'system.cpu.utilization',
      data_stream: 'metrics-system-prod',
      unit: 'percent',
      metric_type: 'gauge',
      field_type: 'double',
      dimension_fields: ['host.name'],
    });
    expect(staging.properties.data_stream).toBe('metrics-system-staging');
    expect(hasSameFingerprint(prod, staging)).toBe(false);
  });

  it('stores a detection or rca label and ignores any other label', () => {
    const id = metricDefinitionFeatureId(STREAM, 'system.cpu.utilization');
    const [labeled] = toMetricDefinitionFeatures(
      { ...row, data_stream: STREAM },
      new Map([[id, 'detection']])
    );
    const [unlabeled] = toMetricDefinitionFeatures({ ...row, data_stream: STREAM }, new Map());

    expect(labeled.properties.usage).toBe('detection');
    expect(unlabeled.properties).not.toHaveProperty('usage');
  });

  it('drops a row that has no metric name or no data stream', () => {
    expect(toMetricDefinitionFeatures({ metric_name: 'system.cpu.utilization' })).toEqual([]);
    expect(toMetricDefinitionFeatures({ data_stream: STREAM })).toEqual([]);
  });
});

describe('identifyMetricDefinitions', () => {
  const logger = { warn: jest.fn() } as unknown as Logger;
  const getSettings = jest.fn();
  const esqlQuery = jest.fn();
  const bulk = jest.fn().mockResolvedValue({ applied: 1, skipped: 0 });
  const output = jest.fn();
  const esClient = {
    indices: { getSettings },
    esql: { query: esqlQuery },
  } as unknown as ElasticsearchClient;
  const kiClient = {
    bulk,
    getDefaultExpiresAt: () => '2026-02-01T00:00:00.000Z',
  } as unknown as KnowledgeIndicatorClient;
  const inferenceClient = { output } as unknown as BoundInferenceClient;

  const row = (metricName: string, dataStream = STREAM): MetricsInfoRow => ({
    metric_name: metricName,
    data_stream: dataStream,
    unit: 'percent',
    metric_type: 'gauge',
    field_type: 'double',
    dimension_fields: ['host.name'],
  });

  const identify = (overrides: Partial<Parameters<typeof identifyMetricDefinitions>[0]> = {}) =>
    identifyMetricDefinitions({
      target,
      sourceId: 'metrics-source',
      indexPatterns: [STREAM],
      start: START,
      end: END,
      esClient,
      kiClient,
      inferenceClient,
      logger,
      pageSize: 2,
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    getSettings.mockResolvedValue({
      [STREAM]: { settings: { index: { mode: 'time_series' } } },
    });
    output.mockImplementation(async ({ input }: { input: string }) => ({
      output: {
        metrics: [...input.matchAll(/^id: (.+)$/gm)].map((match) => ({
          id: match[1],
          usage: 'detection',
        })),
      },
    }));
    esqlQuery.mockImplementation(async ({ query }: { query: string }) => {
      if (query.includes('METRICS_INFO')) {
        return metricsResponse([]);
      }
      return countResponse(fieldsInCountQuery(query));
    });
  });

  it('does not call METRICS_INFO when the source has no time series indices', async () => {
    getSettings.mockResolvedValue({
      'logs-otel': { settings: { index: { mode: 'standard' } } },
    });

    await expect(identify({ indexPatterns: ['logs-otel'] })).resolves.toEqual({
      features: [],
      errors: [],
    });

    expect(esqlQuery).not.toHaveBeenCalled();
    expect(output).not.toHaveBeenCalled();
    expect(bulk).not.toHaveBeenCalled();
  });

  it('pages past a full page of metrics that have no documents and stores the live one', async () => {
    let infoCalls = 0;
    esqlQuery.mockImplementation(async ({ query }: { query: string }) => {
      if (!query.includes('METRICS_INFO')) {
        return countResponse(fieldsInCountQuery(query));
      }
      infoCalls += 1;
      expect(query).toContain(VIEW);
      expect(query).toContain('METRICS_INFO');
      expect(query).toMatch(/LIMIT 2/);
      if (infoCalls === 1) {
        return metricsResponse([row('empty.a'), row('empty.b')]);
      }
      if (infoCalls === 2) {
        expect(query).not.toContain('empty.a');
        expect(query).toContain('empty.b');
        return metricsResponse([row('live.c'), row('empty.d')]);
      }
      return metricsResponse([]);
    });

    const result = await identify();

    expect(result.errors).toEqual([]);
    expect(result.features.map((feature) => feature.id)).toEqual([
      metricDefinitionFeatureId(STREAM, 'live.c'),
    ]);
    expect(result.features[0].properties.usage).toBe('detection');
    expect(output).toHaveBeenCalledTimes(1);
    expect(bulk).toHaveBeenCalledTimes(1);
    const metricsInfoQueries = esqlQuery.mock.calls
      .map(([request]) => request.query as string)
      .filter((query) => query.includes('METRICS_INFO'));
    expect(metricsInfoQueries).toHaveLength(3);
  });

  it('requests another page when the last page is full and stops on a short page', async () => {
    const queries: string[] = [];
    esqlQuery.mockImplementation(async ({ query }: { query: string }) => {
      queries.push(query);
      if (!query.includes('METRICS_INFO')) {
        return countResponse(fieldsInCountQuery(query));
      }
      const infoQueries = queries.filter((candidate) => candidate.includes('METRICS_INFO'));
      if (infoQueries.length === 1) {
        return metricsResponse([row('live.a'), row('live.b')]);
      }
      return metricsResponse([]);
    });

    const result = await identify();

    expect(result.features).toHaveLength(2);
    expect(queries.filter((query) => query.includes('METRICS_INFO'))).toHaveLength(2);

    queries.length = 0;
    esqlQuery.mockImplementation(async ({ query }: { query: string }) => {
      queries.push(query);
      if (query.includes('METRICS_INFO')) {
        return metricsResponse([row('live.c')]);
      }
      return countResponse(fieldsInCountQuery(query));
    });

    await identify();

    expect(queries.filter((query) => query.includes('METRICS_INFO'))).toHaveLength(1);
  });

  it('treats a metric with documents only outside the run window as empty', async () => {
    esqlQuery.mockImplementation(async ({ query }: { query: string }) => {
      if (query.includes('METRICS_INFO')) {
        return metricsResponse([row('live.c')]);
      }
      const inWindow =
        query.includes('2026-01-01T00:00:00.000Z') && query.includes('2026-01-02T00:00:00.000Z');
      return { columns: [{ name: 'm0' }], values: [[inWindow ? 0 : 5]] };
    });

    const result = await identify();

    expect(result.features).toEqual([]);
    expect(output).not.toHaveBeenCalled();
    expect(bulk).not.toHaveBeenCalled();
  });

  it('does not classify a page whose metrics have no documents', async () => {
    esqlQuery.mockImplementation(async ({ query }: { query: string }) => {
      if (query.includes('METRICS_INFO')) {
        return metricsResponse([row('empty.a'), row('empty.b')]);
      }
      return countResponse(fieldsInCountQuery(query));
    });

    const result = await identify();

    expect(result.features).toEqual([]);
    expect(output).not.toHaveBeenCalled();
  });

  it('keeps features written on earlier pages when a later METRICS_INFO query fails', async () => {
    let infoCalls = 0;
    esqlQuery.mockImplementation(async ({ query }: { query: string }) => {
      if (!query.includes('METRICS_INFO')) {
        return countResponse(fieldsInCountQuery(query));
      }
      infoCalls += 1;
      if (infoCalls === 1) {
        return metricsResponse([row('live.c')]);
      }
      throw new Error('search failed');
    });

    const result = await identify({ pageSize: 1 });

    expect(result.features.map((feature) => feature.properties.metric_name)).toEqual(['live.c']);
    expect(result.errors).toEqual([{ feature: 'metric_definition', error: 'search failed' }]);
    expect(bulk).toHaveBeenCalledTimes(1);
  });

  it('passes metric name, type, unit, and dimensions to inference and stores detection or rca', async () => {
    esqlQuery.mockImplementation(async ({ query }: { query: string }) => {
      if (query.includes('METRICS_INFO')) {
        return metricsResponse([row('system.cpu.utilization')]);
      }
      return { columns: [{ name: 'm0' }], values: [[2]] };
    });
    output.mockResolvedValue({
      output: {
        metrics: [
          {
            id: metricDefinitionFeatureId(STREAM, 'system.cpu.utilization'),
            usage: 'rca',
          },
        ],
      },
    });

    const result = await identify();

    const [{ input }] = output.mock.calls[0];
    expect(input).toEqual(expect.stringContaining('system.cpu.utilization'));
    expect(input).toEqual(expect.stringContaining('gauge'));
    expect(input).toEqual(expect.stringContaining('percent'));
    expect(input).toEqual(expect.stringContaining('host.name'));
    expect(result.features[0].properties.usage).toBe('rca');
  });

  it('stores the definition without a usage when the label is unusable or inference fails', async () => {
    esqlQuery.mockImplementation(async ({ query }: { query: string }) => {
      if (query.includes('METRICS_INFO')) {
        return metricsResponse([row('system.cpu.utilization')]);
      }
      return { columns: [{ name: 'm0' }], values: [[2]] };
    });
    output.mockResolvedValue({
      output: {
        metrics: [
          {
            id: metricDefinitionFeatureId(STREAM, 'system.cpu.utilization'),
            usage: 'symptom',
          },
        ],
      },
    });

    const unlabeled = await identify();
    expect(unlabeled.features[0].properties).not.toHaveProperty('usage');
    expect(unlabeled.errors).toEqual([]);

    output.mockResolvedValue({ output: { metrics: [] } });
    const skipped = await identify();
    expect(skipped.features[0].properties).not.toHaveProperty('usage');

    output.mockRejectedValue(new Error('model down'));
    const failed = await identify();
    expect(failed.features[0].properties).not.toHaveProperty('usage');
    expect(failed.errors).toEqual([{ feature: 'metric_definition', error: 'model down' }]);
    expect(bulk).toHaveBeenCalledTimes(3);
  });

  it('stores unlabeled definitions when no inference client is configured', async () => {
    esqlQuery.mockImplementation(async ({ query }: { query: string }) => {
      if (query.includes('METRICS_INFO')) {
        return metricsResponse([row('system.cpu.utilization')]);
      }
      return { columns: [{ name: 'm0' }], values: [[2]] };
    });

    const result = await identify({ inferenceClient: undefined });

    expect(result.features[0].properties).not.toHaveProperty('usage');
    expect(output).not.toHaveBeenCalled();
  });
});
