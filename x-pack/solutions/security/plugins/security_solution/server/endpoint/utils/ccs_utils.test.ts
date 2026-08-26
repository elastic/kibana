/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { hasConnectedRemoteClusters, prefixIndexPatternsWithCcs } from './ccs_utils';

describe('hasConnectedRemoteClusters', () => {
  const mockEsClient = (remoteInfo: Record<string, { connected: boolean }>): ElasticsearchClient =>
    ({
      cluster: {
        remoteInfo: jest.fn().mockResolvedValue(remoteInfo),
      },
    } as unknown as ElasticsearchClient);

  it('returns true when at least one remote cluster is connected', async () => {
    const esClient = mockEsClient({
      cluster_a: { connected: true },
      cluster_b: { connected: false },
    });
    expect(await hasConnectedRemoteClusters(esClient)).toBe(true);
  });

  it('returns false when no remote clusters are connected', async () => {
    const esClient = mockEsClient({ cluster_a: { connected: false } });
    expect(await hasConnectedRemoteClusters(esClient)).toBe(false);
  });

  it('returns false when there are no remote clusters', async () => {
    const esClient = mockEsClient({});
    expect(await hasConnectedRemoteClusters(esClient)).toBe(false);
  });

  it('rejects when remoteInfo throws (caller decides how to handle the failure)', async () => {
    const esClient = {
      cluster: { remoteInfo: jest.fn().mockRejectedValue(new Error('permission denied')) },
    } as unknown as ElasticsearchClient;
    await expect(hasConnectedRemoteClusters(esClient)).rejects.toThrow('permission denied');
  });
});

describe('prefixIndexPatternsWithCcs', () => {
  it('returns the original pattern unchanged when ccsEnabled is false', () => {
    expect(prefixIndexPatternsWithCcs('metrics-endpoint.metadata-*', false)).toBe(
      'metrics-endpoint.metadata-*'
    );
  });

  it('appends *: prefixed patterns when ccsEnabled is true', () => {
    expect(prefixIndexPatternsWithCcs('metrics-endpoint.metadata-*', true)).toBe(
      'metrics-endpoint.metadata-*,*:metrics-endpoint.metadata-*'
    );
  });

  it('handles comma-separated patterns', () => {
    expect(
      prefixIndexPatternsWithCcs(
        'metrics-endpoint.metadata-default,metrics-endpoint.metadata-ns1',
        true
      )
    ).toBe(
      'metrics-endpoint.metadata-default,metrics-endpoint.metadata-ns1,*:metrics-endpoint.metadata-default,*:metrics-endpoint.metadata-ns1'
    );
  });
});
