/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getUpdatesEntitiesDataStreamName } from '../asset_manager/updates_data_stream';
import { discoverPerTypeSourceIndices } from './discover_per_type_source_indices';

const NAMESPACE = 'default';
const ALERTS_INDEX = '.alerts-security.alerts-default';

interface ResolvePartial {
  indices?: Array<{ name: string }>;
  aliases?: Array<{ name: string; indices: string | string[] }>;
  data_streams?: Array<{ name: string; backing_indices: string | string[] }>;
}

const buildEsClient = (resolve: ResolvePartial, fieldCaps: unknown): ElasticsearchClient =>
  ({
    indices: {
      resolveIndex: jest.fn().mockResolvedValue({
        indices: resolve.indices ?? [],
        aliases: resolve.aliases ?? [],
        data_streams: resolve.data_streams ?? [],
      }),
    },
    fieldCaps: jest.fn().mockResolvedValue(fieldCaps),
  } as unknown as ElasticsearchClient);

describe('discoverPerTypeSourceIndices', () => {
  const logger = loggerMock.create();

  beforeEach(() => jest.clearAllMocks());

  it('qualifies a logs data stream by its clean name when a backing index carries a keyword identity field', async () => {
    const dataStream = 'logs-okta.system-default';
    const backingIndex = '.ds-logs-okta.system-default-2024.01.01-000001';
    const esClient = buildEsClient(
      { data_streams: [{ name: dataStream, backing_indices: [backingIndex] }] },
      {
        indices: [backingIndex],
        fields: {
          'user.email': { keyword: { type: 'keyword', indices: [backingIndex] } },
        },
      }
    );

    const { sources, provenance } = await discoverPerTypeSourceIndices({
      esClient,
      namespace: NAMESPACE,
      logger,
    });

    // The clean data stream name, never the churning `.ds-…` backing index.
    expect(sources.user).toEqual([dataStream]);
    expect(sources.host).toEqual([]);
    expect(provenance).toContainEqual({
      entityType: 'user',
      sourceName: dataStream,
      matchedFields: ['user.email'],
    });
  });

  it('scopes both ES calls to `logs-*` + the alerts index and pushes the keyword type gate into field_caps', async () => {
    const esClient = buildEsClient({}, { indices: [], fields: {} });

    await discoverPerTypeSourceIndices({ esClient, namespace: NAMESPACE, logger });

    expect(esClient.indices.resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({ name: `logs-*,${ALERTS_INDEX}` })
    );
    expect(esClient.fieldCaps).toHaveBeenCalledWith(
      expect.objectContaining({ index: ['logs-*', ALERTS_INDEX], types: ['keyword'] })
    );
  });

  it('falls back to all matched indices when a field has uniform keyword caps (no per-field indices)', async () => {
    const dataStream = 'logs-system.auth-default';
    const backingIndex = '.ds-logs-system.auth-default-2024.01.01-000001';
    const esClient = buildEsClient(
      { data_streams: [{ name: dataStream, backing_indices: [backingIndex] }] },
      {
        indices: [backingIndex],
        // No `indices` on the cap → uniform across all matched indices.
        fields: { 'host.name': { keyword: { type: 'keyword' } } },
      }
    );

    const { sources } = await discoverPerTypeSourceIndices({
      esClient,
      namespace: NAMESPACE,
      logger,
    });

    expect(sources.host).toEqual([dataStream]);
  });

  it('includes the alerts alias as a source, mapping its hidden backing index back to the alias name', async () => {
    const alertsBackingIndex = '.internal.alerts-security.alerts-default-000001';
    const esClient = buildEsClient(
      { aliases: [{ name: ALERTS_INDEX, indices: [alertsBackingIndex] }] },
      {
        indices: [alertsBackingIndex],
        fields: { 'user.name': { keyword: { type: 'keyword', indices: [alertsBackingIndex] } } },
      }
    );

    const { sources } = await discoverPerTypeSourceIndices({
      esClient,
      namespace: NAMESPACE,
      logger,
    });

    expect(sources.user).toEqual([ALERTS_INDEX]);
  });

  it('excludes the entity store updates data stream even if it carries identity fields', async () => {
    const updatesDataStream = getUpdatesEntitiesDataStreamName(NAMESPACE);
    const updatesBackingIndex = `.ds-${updatesDataStream}-2024.01.01-000001`;
    const esClient = buildEsClient(
      { data_streams: [{ name: updatesDataStream, backing_indices: [updatesBackingIndex] }] },
      {
        indices: [updatesBackingIndex],
        fields: { 'user.name': { keyword: { type: 'keyword', indices: [updatesBackingIndex] } } },
      }
    );

    const { sources, provenance } = await discoverPerTypeSourceIndices({
      esClient,
      namespace: NAMESPACE,
      logger,
    });

    expect(sources.user).toEqual([]);
    expect(provenance).toEqual([]);
  });

  it('qualifies a single source for multiple entity types', async () => {
    const dataStream = 'logs-endpoint.events-default';
    const backingIndex = '.ds-logs-endpoint.events-default-2024.01.01-000001';
    const esClient = buildEsClient(
      { data_streams: [{ name: dataStream, backing_indices: [backingIndex] }] },
      {
        indices: [backingIndex],
        fields: {
          'user.name': { keyword: { type: 'keyword', indices: [backingIndex] } },
          'host.name': { keyword: { type: 'keyword', indices: [backingIndex] } },
        },
      }
    );

    const { sources } = await discoverPerTypeSourceIndices({
      esClient,
      namespace: NAMESPACE,
      logger,
    });

    expect(sources.user).toEqual([dataStream]);
    expect(sources.host).toEqual([dataStream]);
    expect(sources.service).toEqual([]);
  });

  it('returns empty sources (and logs a warning) when Elasticsearch fails', async () => {
    const esClient = {
      indices: { resolveIndex: jest.fn().mockRejectedValue(new Error('cluster down')) },
      fieldCaps: jest.fn().mockRejectedValue(new Error('cluster down')),
    } as unknown as ElasticsearchClient;

    const { sources, provenance } = await discoverPerTypeSourceIndices({
      esClient,
      namespace: NAMESPACE,
      logger,
    });

    expect(sources).toEqual({ user: [], host: [], service: [], generic: [] });
    expect(provenance).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });
});
