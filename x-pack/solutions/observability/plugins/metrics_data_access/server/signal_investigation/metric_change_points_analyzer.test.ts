/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_EXTENSION_ID } from '@kbn/core/server';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import { type ChangePoint, getMetricChangePoints } from '@kbn/signals-server';
import type { SignalAnalyzerDeps } from '@kbn/signal-investigation-contract';
import {
  buildHostKql,
  createMetricChangePointsAnalyzer,
  mapMetricChangePointBuckets,
  metricChangePointsApplicability,
  selectMetricDescriptors,
} from './metric_change_points_analyzer';

jest.mock('@kbn/signals-server', () => ({
  ...jest.requireActual('@kbn/signals-server'),
  getMetricChangePoints: jest.fn(),
}));

const getMetricChangePointsMock = getMetricChangePoints as jest.MockedFunction<
  typeof getMetricChangePoints
>;

const seed = (overrides: Partial<InvestigationSeed> = {}): InvestigationSeed => ({
  origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'apm.threshold' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
  filters: [],
  entities: { 'service.name': 'checkout', 'host.name': 'web-1' },
  ...overrides,
});

const bucket = (
  hostName: string,
  type: ChangePoint['changes']['type'],
  pValue?: number
): ChangePoint => ({
  key: hostName,
  summary: type,
  changes: {
    type,
    p_value: pValue,
    time: '2026-11-02T11:15:00.000Z',
  },
});

describe('metricChangePointsApplicability', () => {
  it('requires a host in entities or hosts and rejects ES|QL', () => {
    expect(
      metricChangePointsApplicability(seed({ entities: { 'service.name': 'checkout' } })).applicable
    ).toBe(false);
    expect(
      metricChangePointsApplicability(
        seed({ entities: { 'service.name': 'checkout' }, hosts: ['web-1', 'web-2'] })
      ).applicable
    ).toBe(true);
    expect(
      metricChangePointsApplicability(seed({ query: { esql: 'FROM metrics-*' } })).applicable
    ).toBe(false);
  });
});

describe('buildHostKql and selectMetricDescriptors', () => {
  it('builds a KQL disjunction across resolved hosts and includes a custom seed metric', () => {
    expect(buildHostKql(['web-1', 'web-2'])).toBe('host.name : "web-1" or host.name : "web-2"');
    const descriptors = selectMetricDescriptors(
      seed({ metric: { operationType: 'p95', field: 'system.load.1' } })
    );
    expect(descriptors.map((item) => item.field)).toEqual([
      'system.cpu.total.norm.pct',
      'system.memory.actual.used.pct',
      'system.load.1',
    ]);
  });
});

describe('mapMetricChangePointBuckets', () => {
  const cpuMetric = {
    field: 'system.cpu.total.norm.pct',
    type: 'avg' as const,
    label: 'CPU usage',
  };

  it('maps stationary buckets to no_change and indeterminable-only buckets to indeterminable', () => {
    expect(
      mapMetricChangePointBuckets({
        items: [{ metric: cpuMetric, bucket: bucket('web-1', 'stationary') }],
        seed: seed(),
        hosts: ['web-1'],
      }).status
    ).toBe('no_change');
    expect(
      mapMetricChangePointBuckets({
        items: [{ metric: cpuMetric, bucket: bucket('web-1', 'indeterminable') }],
        seed: seed(),
        hosts: ['web-1'],
      }).status
    ).toBe('indeterminable');
  });

  it('turns a significant bucket into a host lead with Asset Details locator params', () => {
    const result = mapMetricChangePointBuckets({
      items: [{ metric: cpuMetric, bucket: bucket('web-1', 'spike', 0.002) }],
      seed: seed({ dataViewId: 'metrics-view' }),
      hosts: ['web-1'],
    });

    expect(result.status).toBe('found');
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0]).toMatchObject({
      analyzerId: 'metric_change_points',
      summary: 'CPU usage spike on web-1',
      relevance: 'Host web-1 for service checkout',
      ranking: {
        signal: 'strong',
        timing: 'during',
        relationship: 'host',
      },
      locatorParams: {
        hostName: 'web-1',
        metricField: 'system.cpu.total.norm.pct',
        rangeFrom: '2026-11-02T11:00:00.000Z',
        rangeTo: '2026-11-02T12:00:00.000Z',
        dataViewId: 'metrics-view',
      },
    });
  });
});

describe('createMetricChangePointsAnalyzer', () => {
  const esClient = { asCurrentUser: {} };
  const savedObjectsClient = { id: 'space-scoped' };
  const getClient = jest.fn(() => savedObjectsClient);
  const deps = {
    request: {},
    context: {
      core: Promise.resolve({
        savedObjects: { client: { id: 'user-scoped' }, getClient },
        elasticsearch: { client: esClient },
      }),
    },
  } as unknown as SignalAnalyzerDeps;

  const getMetricIndices = jest.fn(async () => 'metrics-*,metricbeat-*');
  const analyzer = createMetricChangePointsAnalyzer({
    client: { getMetricIndices },
  });

  beforeEach(() => {
    getMetricChangePointsMock.mockReset();
    getMetricChangePointsMock.mockResolvedValue([]);
    getMetricIndices.mockClear();
    getClient.mockClear();
  });

  it('queries metricsDataAccess indices grouped by host.name and forwards the abort signal', async () => {
    const controller = new AbortController();
    await analyzer.run(
      seed({ entities: { 'service.name': 'checkout' }, hosts: ['web-1', 'web-2'] }),
      deps,
      controller.signal
    );

    expect(getClient).toHaveBeenCalledWith({ excludedExtensions: [SECURITY_EXTENSION_ID] });
    expect(getMetricIndices).toHaveBeenCalledWith({ savedObjectsClient });
    expect(getMetricChangePointsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'metrics-*,metricbeat-*',
        kqlFilter: 'host.name : "web-1" or host.name : "web-2"',
        groupBy: ['host.name'],
        esClient,
        signal: controller.signal,
      })
    );
  });
});
