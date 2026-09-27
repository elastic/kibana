/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { listSearchSources } from '@kbn/agent-builder-genai-utils';
import {
  HUNT_DISCOVERY_PATTERN,
  discoverHuntDatasets,
  parseDataStreamName,
} from './discover_hunt_datasets';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  listSearchSources: jest.fn(),
}));

const listSearchSourcesMock = listSearchSources as jest.MockedFunction<typeof listSearchSources>;

const esClient = {} as ElasticsearchClient;

type ListSourcesResponse = Awaited<ReturnType<typeof listSearchSources>>;

// Only `data_streams[].name` is read; the enum `type` tag is irrelevant here.
const mockDataStreams = (names: string[]) => {
  listSearchSourcesMock.mockResolvedValue({
    indices: [],
    aliases: [],
    datasets: [],
    data_streams: names.map((name) => ({
      type: 'data_stream',
      name,
      indices: [`.ds-${name}-000001`],
      timestamp_field: '@timestamp',
    })),
  } as unknown as ListSourcesResponse);
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
    listSearchSourcesMock.mockReset();
  });

  it('returns one entry per dataset with vendor and index pattern', async () => {
    mockDataStreams(['logs-okta.system-default']);

    await expect(discoverHuntDatasets({ esClient })).resolves.toEqual([
      {
        index_pattern: 'logs-okta.system-*',
        dataset: 'okta.system',
        vendor: 'okta',
        data_streams: ['logs-okta.system-default'],
      },
    ]);
  });

  it('uses the whole dataset as vendor when it has no dot', async () => {
    mockDataStreams(['logs-cisco_asa-default']);

    const [entry] = await discoverHuntDatasets({ esClient });
    expect(entry.vendor).toBe('cisco_asa');
    expect(entry.dataset).toBe('cisco_asa');
  });

  it('dedupes across namespaces and collects every data stream name', async () => {
    mockDataStreams([
      'logs-aws.cloudtrail-default',
      'logs-aws.cloudtrail-prod',
      'logs-aws.cloudtrail-default',
    ]);

    await expect(discoverHuntDatasets({ esClient })).resolves.toEqual([
      {
        index_pattern: 'logs-aws.cloudtrail-*',
        dataset: 'aws.cloudtrail',
        vendor: 'aws',
        data_streams: ['logs-aws.cloudtrail-default', 'logs-aws.cloudtrail-prod'],
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

    const result = await discoverHuntDatasets({ esClient });
    expect(result.map((entry) => entry.dataset)).toEqual(['okta.system']);
  });

  it('skips names that are not data stream names', async () => {
    mockDataStreams(['logs-okta', 'logs-okta.system-default']);

    const result = await discoverHuntDatasets({ esClient });
    expect(result.map((entry) => entry.index_pattern)).toEqual(['logs-okta.system-*']);
  });

  it('sorts by index pattern', async () => {
    mockDataStreams([
      'logs-okta.system-default',
      'logs-aws.cloudtrail-default',
      'logs-fortinet.fortigate-default',
    ]);

    const result = await discoverHuntDatasets({ esClient });
    expect(result.map((entry) => entry.index_pattern)).toEqual([
      'logs-aws.cloudtrail-*',
      'logs-fortinet.fortigate-*',
      'logs-okta.system-*',
    ]);
  });

  it('passes the default pattern and discovery options to listSearchSources', async () => {
    mockDataStreams([]);

    await discoverHuntDatasets({ esClient });

    expect(listSearchSourcesMock).toHaveBeenCalledTimes(1);
    expect(listSearchSourcesMock).toHaveBeenCalledWith({
      esClient,
      pattern: HUNT_DISCOVERY_PATTERN,
      perTypeLimit: 500,
      includeHidden: false,
    });
  });

  it('passes a custom pattern through to listSearchSources', async () => {
    mockDataStreams([]);

    await discoverHuntDatasets({ esClient, pattern: 'logs-okta.*' });

    expect(listSearchSourcesMock).toHaveBeenCalledWith(
      expect.objectContaining({ pattern: 'logs-okta.*' })
    );
  });

  it('returns an empty list when nothing matches', async () => {
    mockDataStreams([]);

    await expect(discoverHuntDatasets({ esClient })).resolves.toEqual([]);
  });

  it('logs a warning and rethrows when listSearchSources fails', async () => {
    const logger = loggerMock.create();
    const error = new Error('cluster unavailable');
    listSearchSourcesMock.mockRejectedValue(error);

    await expect(discoverHuntDatasets({ esClient, logger })).rejects.toBe(error);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
  });

  it('rethrows without a logger', async () => {
    const error = new Error('boom');
    listSearchSourcesMock.mockRejectedValue(error);

    await expect(discoverHuntDatasets({ esClient })).rejects.toBe(error);
  });
});
