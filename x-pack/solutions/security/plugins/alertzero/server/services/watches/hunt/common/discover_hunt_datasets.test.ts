/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  MAX_NAMESPACE_PATTERNS_PER_DATASET,
  discoverHuntDatasets,
  parseDataStreamName,
} from './discover_hunt_datasets';

const UNIVERSE = ['logs-*'];

const resolveIndexMock = jest.fn();
const esClient = {
  indices: { resolveIndex: resolveIndexMock },
} as unknown as ElasticsearchClient;

// Only `data_streams[].name` is read.
const mockDataStreams = (names: string[]) => {
  resolveIndexMock.mockResolvedValue({
    indices: [],
    aliases: [],
    data_streams: names.map((name) => ({
      name,
      backing_indices: [`.ds-${name}-2026.09.01-000001`],
      timestamp_field: '@timestamp',
    })),
  });
};

describe('parseDataStreamName', () => {
  it('splits a three-part name', () => {
    expect(parseDataStreamName('logs-okta.system-default')).toEqual({
      type: 'logs',
      dataset: 'okta.system',
      namespace: 'default',
    });
  });

  it('keeps dots and underscores inside the dataset', () => {
    expect(parseDataStreamName('logs-cisco_asa.log-default')).toEqual({
      type: 'logs',
      dataset: 'cisco_asa.log',
      namespace: 'default',
    });
  });

  it('takes the segment after the last dash as namespace, so a dashed namespace leaks into the dataset', () => {
    // Known limitation: `prod-eu` cannot be told apart from a dashed dataset.
    expect(parseDataStreamName('logs-cisco_asa.log-prod-eu')).toEqual({
      type: 'logs',
      dataset: 'cisco_asa.log-prod',
      namespace: 'eu',
    });
  });

  it('returns undefined for names with fewer than two dashes', () => {
    expect(parseDataStreamName('logs-okta')).toBeUndefined();
    expect(parseDataStreamName('logs')).toBeUndefined();
    expect(parseDataStreamName('')).toBeUndefined();
  });

  it('returns undefined when any segment is empty', () => {
    expect(parseDataStreamName('logs--default')).toBeUndefined();
    expect(parseDataStreamName('-okta.system-default')).toBeUndefined();
    expect(parseDataStreamName('logs-okta.system-')).toBeUndefined();
  });
});

describe('discoverHuntDatasets', () => {
  beforeEach(() => {
    resolveIndexMock.mockReset();
  });

  it('returns one entry per dataset with vendor and index pattern', async () => {
    mockDataStreams(['logs-okta.system-default']);

    await expect(discoverHuntDatasets({ esClient, patterns: UNIVERSE })).resolves.toEqual([
      {
        index_pattern: 'logs-okta.system-*',
        dataset: 'okta.system',
        vendor: 'okta',
        data_streams: ['logs-okta.system-default'],
        search_patterns: ['logs-okta.system-*'],
      },
    ]);
  });

  it('stops the vendor token at a dash, so a dashed namespace that leaked into the dataset cannot hide the vendor', async () => {
    mockDataStreams(['logs-okta-prod-eu', 'logs-okta-prod-us']);
    const [okta] = await discoverHuntDatasets({ esClient, patterns: UNIVERSE });
    expect(okta.dataset).toBe('okta-prod');
    expect(okta.vendor).toBe('okta');
  });

  it('searches its own namespaces when a sibling dataset extends the name with a dash', async () => {
    mockDataStreams([
      'logs-windows-default',
      'logs-windows-prod',
      'logs-windows-defender-default',
      'logs-okta.system-default',
    ]);
    const datasets = await discoverHuntDatasets({ esClient, patterns: UNIVERSE });
    const byDataset = new Map(datasets.map((d) => [d.dataset, d]));

    // `logs-windows-*` would swallow `logs-windows-defender-*`, so windows searches per namespace.
    expect(byDataset.get('windows')?.search_patterns).toEqual([
      'logs-windows-default*',
      'logs-windows-prod*',
    ]);
    // The sibling and an unrelated dataset keep the plain pattern.
    expect(byDataset.get('windows-defender')?.search_patterns).toEqual(['logs-windows-defender-*']);
    expect(byDataset.get('okta.system')?.search_patterns).toEqual(['logs-okta.system-*']);
  });

  it('uses the whole dataset as vendor when it has no dot', async () => {
    mockDataStreams(['logs-cisco_asa-default']);

    const [entry] = await discoverHuntDatasets({ esClient, patterns: UNIVERSE });
    expect(entry.vendor).toBe('cisco_asa');
    expect(entry.dataset).toBe('cisco_asa');
  });

  it('dedupes across namespaces and collects every data stream name', async () => {
    mockDataStreams([
      'logs-aws.cloudtrail-default',
      'logs-aws.cloudtrail-prod',
      'logs-aws.cloudtrail-default',
    ]);

    await expect(discoverHuntDatasets({ esClient, patterns: UNIVERSE })).resolves.toEqual([
      {
        index_pattern: 'logs-aws.cloudtrail-*',
        dataset: 'aws.cloudtrail',
        vendor: 'aws',
        data_streams: ['logs-aws.cloudtrail-default', 'logs-aws.cloudtrail-prod'],
        search_patterns: ['logs-aws.cloudtrail-*'],
      },
    ]);
  });

  it('drops agent-internal datasets', async () => {
    mockDataStreams([
      'logs-elastic_agent-default',
      'logs-elastic_agent.filebeat-default',
      'logs-fleet_server.output_health-default',
      'logs-okta.system-default',
    ]);

    const result = await discoverHuntDatasets({ esClient, patterns: UNIVERSE });
    expect(result.map((entry) => entry.dataset)).toEqual(['okta.system']);
  });

  it('skips names that are not data stream names', async () => {
    mockDataStreams(['logs-okta', 'logs-okta.system-default']);

    const result = await discoverHuntDatasets({ esClient, patterns: UNIVERSE });
    expect(result.map((entry) => entry.index_pattern)).toEqual(['logs-okta.system-*']);
  });

  it('sorts by index pattern', async () => {
    mockDataStreams([
      'logs-okta.system-default',
      'logs-aws.cloudtrail-default',
      'logs-fortinet.fortigate-default',
    ]);

    const result = await discoverHuntDatasets({ esClient, patterns: UNIVERSE });
    expect(result.map((entry) => entry.index_pattern)).toEqual([
      'logs-aws.cloudtrail-*',
      'logs-fortinet.fortigate-*',
      'logs-okta.system-*',
    ]);
  });

  it('resolves the patterns against open, non-hidden targets with no result cap', async () => {
    mockDataStreams([]);
    await discoverHuntDatasets({ esClient, patterns: UNIVERSE });
    expect(resolveIndexMock).toHaveBeenCalledTimes(1);
    expect(resolveIndexMock).toHaveBeenCalledWith({
      name: ['logs-*'],
      allow_no_indices: true,
      expand_wildcards: ['open'],
    });
  });

  it('passes a pattern list through with its exclusions', async () => {
    mockDataStreams([]);
    const patterns = ['logs-*', 'filebeat-*', '-*elastic-cloud-logs-*'];
    await discoverHuntDatasets({ esClient, patterns });
    expect(resolveIndexMock).toHaveBeenCalledWith(expect.objectContaining({ name: patterns }));
  });

  it('makes no call when handed the resolve response for the same patterns', async () => {
    const resolved = {
      data_streams: [{ name: 'logs-okta.system-default' }, { name: '.logs-hidden.system-default' }],
    };

    const datasets = await discoverHuntDatasets({ esClient, patterns: UNIVERSE, resolved });

    expect(resolveIndexMock).not.toHaveBeenCalled();
    expect(datasets.map((d) => d.dataset)).toEqual(['okta.system']);
  });

  it('drops hidden, dot-prefixed data streams', async () => {
    mockDataStreams(['.logs-hidden.system-default', 'logs-okta.system-default']);
    const datasets = await discoverHuntDatasets({ esClient, patterns: UNIVERSE });
    expect(datasets.map((d) => d.dataset)).toEqual(['okta.system']);
  });

  it('returns an empty list when nothing matches', async () => {
    mockDataStreams([]);

    await expect(discoverHuntDatasets({ esClient, patterns: UNIVERSE })).resolves.toEqual([]);
  });

  it('falls back to the plain pattern when a dataset has too many namespaces to isolate stream by stream', async () => {
    const logger = loggerMock.create();
    const namespaces = Array.from(
      { length: MAX_NAMESPACE_PATTERNS_PER_DATASET + 1 },
      (_, i) => `ns${i}`
    );
    mockDataStreams([
      ...namespaces.map((ns) => `logs-windows-${ns}`),
      'logs-windows-defender-default',
    ]);

    const datasets = await discoverHuntDatasets({ esClient, patterns: UNIVERSE, logger });
    const windows = datasets.find((d) => d.dataset === 'windows');

    // The scope's targets travel in the request path; hundreds of per-namespace patterns
    // would not fit, so the plain pattern wins and the over-match is logged instead.
    expect(windows?.search_patterns).toEqual(['logs-windows-*']);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('namespaces exceed the 16 per-namespace patterns')
    );
  });

  it('warns when a sibling dataset extends a full stream name, since no wildcard can isolate it', async () => {
    const logger = loggerMock.create();
    mockDataStreams(['logs-windows-default', 'logs-windows-default-prod']);

    const datasets = await discoverHuntDatasets({ esClient, patterns: UNIVERSE, logger });
    const windows = datasets.find((d) => d.dataset === 'windows');

    // Best available pattern is kept; the overlap is surfaced rather than hidden.
    expect(windows?.search_patterns).toEqual(['logs-windows-default*']);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'cannot isolate logs-windows-default* from sibling dataset(s) windows-default'
      )
    );
  });

  it('logs a warning and rethrows when the resolve call fails', async () => {
    const logger = loggerMock.create();
    const error = new Error('cluster unavailable');
    resolveIndexMock.mockRejectedValue(error);

    await expect(discoverHuntDatasets({ esClient, patterns: UNIVERSE, logger })).rejects.toBe(
      error
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
  });

  it('rethrows without a logger', async () => {
    const error = new Error('boom');
    resolveIndexMock.mockRejectedValue(error);

    await expect(discoverHuntDatasets({ esClient, patterns: UNIVERSE })).rejects.toBe(error);
  });
});
