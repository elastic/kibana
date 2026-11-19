/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportResult, estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { resolveIndexPatterns } from './resolve_index_patterns';

describe('resolveIndexPatterns', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  const fields = {
    '@timestamp': { date: { type: 'date' }, unmapped: { type: 'unmapped', indices: ['index2'] } },
  } as unknown as estypes.FieldCapsResponse['fields'];

  const mockFieldCaps = (indices: string | string[]) => {
    esClient.fieldCaps.mockResolvedValue({
      body: { indices, fields },
    } as unknown as TransportResult<estypes.FieldCapsResponse>);
  };

  const resolve = (indexPatterns: string[], runtimeMappings?: estypes.MappingRuntimeFields) =>
    resolveIndexPatterns({ esClient, indexPatterns, fields: ['@timestamp'], runtimeMappings });

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    mockFieldCaps(['index1', 'index2']);
  });

  it('resolves all index patterns with one request and returns the matched indices and fields', async () => {
    const result = await resolve(['packetbeat-*', 'filebeat-*']);

    expect(result).toEqual({ matchedIndices: ['index1', 'index2'], fields });
    expect(esClient.fieldCaps).toHaveBeenCalledTimes(1);
    expect(esClient.fieldCaps).toHaveBeenCalledWith(
      {
        index: ['packetbeat-*', 'filebeat-*'],
        fields: ['@timestamp'],
        include_unmapped: true,
        runtime_mappings: undefined,
        ignore_unavailable: true,
        allow_no_indices: true,
        expand_wildcards: 'open',
      },
      { meta: true }
    );
  });

  it('sends the index patterns in the given order, including the excluding ones', async () => {
    const indexPatterns = ['-filebeat-*', 'filebeat-*', 'logs-*', '-logs-excluded-*', 'metrics-*'];

    await resolve(indexPatterns);

    expect(esClient.fieldCaps).toHaveBeenCalledWith(
      expect.objectContaining({ index: indexPatterns }),
      expect.anything()
    );
  });

  it('sends the runtime mappings', async () => {
    const runtimeMappings = { 'event.ingested': { type: 'date' as const } };

    await resolve(['packetbeat-*'], runtimeMappings);

    expect(esClient.fieldCaps).toHaveBeenCalledWith(
      expect.objectContaining({ runtime_mappings: runtimeMappings }),
      expect.anything()
    );
  });

  it('returns a single matched index as a list', async () => {
    mockFieldCaps('index1');

    const result = await resolve(['packetbeat-*']);

    expect(result.matchedIndices).toEqual(['index1']);
  });

  it('returns no matched indices when nothing matches', async () => {
    esClient.fieldCaps.mockResolvedValue({
      body: { indices: [], fields: {} },
    } as unknown as TransportResult<estypes.FieldCapsResponse>);

    const result = await resolve(['missing-*']);

    expect(result).toEqual({ matchedIndices: [], fields: {} });
  });

  it.each([
    ['no index patterns', []],
    ['only excluding index patterns', ['-filebeat-*', ' -logs-*']],
  ])('sends no request for %s', async (_, indexPatterns) => {
    const result = await resolve(indexPatterns);

    expect(result).toEqual({ matchedIndices: [], fields: {} });
    expect(esClient.fieldCaps).not.toHaveBeenCalled();
  });

  it.each([
    ['a blocked index', 'cluster_block_exception'],
    ['a closed index', 'index_closed_exception'],
    ['an unknown remote cluster', 'no_such_remote_cluster_exception'],
  ])('does not hide the error of %s', async (_, errorType) => {
    esClient.fieldCaps.mockRejectedValue(new Error(errorType));

    await expect(resolve(['packetbeat-*', 'blocked-*'])).rejects.toThrow(errorType);
  });
});
