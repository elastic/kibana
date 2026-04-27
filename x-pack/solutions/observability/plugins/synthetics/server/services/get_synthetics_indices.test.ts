/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_INDEX_PATTERN } from '../../common/constants';
import { getSyntheticsIndices } from './get_synthetics_indices';

const buildEsClientMock = (remoteInfo: Record<string, { connected: boolean }> = {}) => ({
  cluster: {
    remoteInfo: jest.fn().mockResolvedValue(remoteInfo),
  },
});

describe('getSyntheticsIndices (server)', () => {
  it('returns only the local index when no clusters are selected and useAll is false', async () => {
    const esClient = buildEsClientMock();

    const result = await getSyntheticsIndices(esClient as any, {
      useAllRemoteClusters: false,
      selectedRemoteClusters: [],
    });

    expect(result).toEqual({ indices: SYNTHETICS_INDEX_PATTERN });
    expect(esClient.cluster.remoteInfo).not.toHaveBeenCalled();
  });

  it('returns local + wildcard remote when useAllRemoteClusters is true', async () => {
    const esClient = buildEsClientMock();

    const result = await getSyntheticsIndices(esClient as any, {
      useAllRemoteClusters: true,
      selectedRemoteClusters: [],
    });

    expect(result).toEqual({
      indices: `${SYNTHETICS_INDEX_PATTERN},*:${SYNTHETICS_INDEX_PATTERN}`,
    });
    expect(esClient.cluster.remoteInfo).not.toHaveBeenCalled();
  });

  it('calls cluster.remoteInfo and includes only connected selected clusters', async () => {
    const esClient = buildEsClientMock({
      'cluster-a': { connected: true },
      'cluster-b': { connected: false },
      'cluster-c': { connected: true },
    });

    const result = await getSyntheticsIndices(esClient as any, {
      useAllRemoteClusters: false,
      selectedRemoteClusters: ['cluster-a', 'cluster-b'],
    });

    expect(esClient.cluster.remoteInfo).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      indices: `${SYNTHETICS_INDEX_PATTERN},cluster-a:${SYNTHETICS_INDEX_PATTERN}`,
    });
  });

  it('returns only local index when all selected clusters are disconnected', async () => {
    const esClient = buildEsClientMock({
      'cluster-x': { connected: false },
    });

    const result = await getSyntheticsIndices(esClient as any, {
      useAllRemoteClusters: false,
      selectedRemoteClusters: ['cluster-x'],
    });

    expect(result).toEqual({ indices: SYNTHETICS_INDEX_PATTERN });
  });

  it('excludes clusters not in the selected list', async () => {
    const esClient = buildEsClientMock({
      'cluster-a': { connected: true },
      'cluster-b': { connected: true },
    });

    const result = await getSyntheticsIndices(esClient as any, {
      useAllRemoteClusters: false,
      selectedRemoteClusters: ['cluster-b'],
    });

    expect(result).toEqual({
      indices: `${SYNTHETICS_INDEX_PATTERN},cluster-b:${SYNTHETICS_INDEX_PATTERN}`,
    });
  });
});
