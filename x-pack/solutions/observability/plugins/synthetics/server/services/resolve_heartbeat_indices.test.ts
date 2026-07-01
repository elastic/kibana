/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { SYNTHETICS_INDEX_PATTERN } from '../../common/constants';
import { DefaultSyntheticsMultiSpaceSettingsRepository } from './synthetics_multi_space_settings_repository';
import * as getSyntheticsIndicesModule from './get_synthetics_indices';
import { resolveHeartbeatIndices } from './resolve_heartbeat_indices';
import type { SyntheticsServerSetup } from '../types';

const buildServer = ({
  ccsEnabled = true,
  isElasticsearchServerless = false,
  cacheGet = jest.fn(),
  warn = jest.fn(),
}: {
  ccsEnabled?: boolean;
  isElasticsearchServerless?: boolean;
  cacheGet?: jest.Mock;
  warn?: jest.Mock;
} = {}) =>
  ({
    isElasticsearchServerless,
    config: { experimental: { ccs: { enabled: ccsEnabled } } },
    syntheticsIndicesCache: { get: cacheGet, invalidate: jest.fn() },
    logger: { warn, error: jest.fn(), debug: jest.fn(), info: jest.fn() },
  } as unknown as SyntheticsServerSetup);

describe('resolveHeartbeatIndices', () => {
  const esClient = {} as ElasticsearchClient;
  const savedObjectsClient = savedObjectsClientMock.create();
  const spaceId = 'default';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the local pattern without touching the cache when CCS is disabled', async () => {
    const cacheGet = jest.fn();
    const server = buildServer({ ccsEnabled: false, cacheGet });

    const indices = await resolveHeartbeatIndices({
      server,
      spaceId,
      savedObjectsClient,
      esClient,
    });

    expect(indices).toBe(SYNTHETICS_INDEX_PATTERN);
    expect(cacheGet).not.toHaveBeenCalled();
  });

  it('returns the local pattern when running on serverless even if the flag is set', async () => {
    const cacheGet = jest.fn();
    const server = buildServer({ isElasticsearchServerless: true, cacheGet });

    const indices = await resolveHeartbeatIndices({
      server,
      spaceId,
      savedObjectsClient,
      esClient,
    });

    expect(indices).toBe(SYNTHETICS_INDEX_PATTERN);
    expect(cacheGet).not.toHaveBeenCalled();
  });

  it('returns the cached value when the cache hits', async () => {
    const cacheGet = jest.fn().mockResolvedValue('synthetics-*,cluster-a:synthetics-*');
    const server = buildServer({ cacheGet });

    const indices = await resolveHeartbeatIndices({
      server,
      spaceId,
      savedObjectsClient,
      esClient,
    });

    expect(indices).toBe('synthetics-*,cluster-a:synthetics-*');
    expect(cacheGet).toHaveBeenCalledTimes(1);
    expect(cacheGet).toHaveBeenCalledWith(spaceId, expect.any(Function));
  });

  it('resolves via the repository and getSyntheticsIndices on a cache miss', async () => {
    const repoSpy = jest
      .spyOn(DefaultSyntheticsMultiSpaceSettingsRepository.prototype, 'get')
      .mockResolvedValue({
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['cluster-a'],
        spaces: ['default'],
      });
    const getIndicesSpy = jest
      .spyOn(getSyntheticsIndicesModule, 'getSyntheticsIndices')
      .mockResolvedValue({ indices: 'synthetics-*,*:synthetics-*' });

    const cacheGet = jest.fn().mockImplementation(async (_key, resolver) => resolver());
    const server = buildServer({ cacheGet });

    const indices = await resolveHeartbeatIndices({
      server,
      spaceId,
      savedObjectsClient,
      esClient,
    });

    expect(indices).toBe('synthetics-*,*:synthetics-*');
    expect(repoSpy).toHaveBeenCalledTimes(1);
    expect(getIndicesSpy).toHaveBeenCalledWith(esClient, {
      useAllRemoteClusters: true,
      selectedRemoteClusters: ['cluster-a'],
    });
  });

  it('passes the default settings shape when the repository returns nullish CCS attributes', async () => {
    jest
      .spyOn(DefaultSyntheticsMultiSpaceSettingsRepository.prototype, 'get')
      .mockResolvedValue({ spaces: ['default'] } as any);
    const getIndicesSpy = jest
      .spyOn(getSyntheticsIndicesModule, 'getSyntheticsIndices')
      .mockResolvedValue({ indices: SYNTHETICS_INDEX_PATTERN });

    const cacheGet = jest.fn().mockImplementation(async (_key, resolver) => resolver());
    const server = buildServer({ cacheGet });

    await resolveHeartbeatIndices({ server, spaceId, savedObjectsClient, esClient });

    expect(getIndicesSpy).toHaveBeenCalledWith(esClient, {
      useAllRemoteClusters: false,
      selectedRemoteClusters: [],
    });
  });

  it('falls back to the local pattern and logs a warning when the cache resolver throws', async () => {
    const warn = jest.fn();
    const cacheGet = jest.fn().mockRejectedValue(new Error('elasticsearch unavailable'));
    const server = buildServer({ cacheGet, warn });

    const indices = await resolveHeartbeatIndices({
      server,
      spaceId,
      savedObjectsClient,
      esClient,
    });

    expect(indices).toBe(SYNTHETICS_INDEX_PATTERN);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('elasticsearch unavailable');
  });
});
