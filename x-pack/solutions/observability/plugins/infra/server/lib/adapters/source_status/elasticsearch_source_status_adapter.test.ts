/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraElasticsearchSourceStatusAdapter } from './elasticsearch_source_status_adapter';
import { NoSuchRemoteClusterError } from '../../sources/errors';
import type { KibanaFramework } from '../framework/kibana_framework_adapter';
import type { InfraPluginRequestHandlerContext } from '../../../types';

describe('InfraElasticsearchSourceStatusAdapter', () => {
  const createRequestContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: {
            // No data tiers excluded by default.
            get: jest.fn().mockResolvedValue([]),
          },
        },
      }),
    } as unknown as InfraPluginRequestHandlerContext);

  const createFramework = (callWithRequest: jest.Mock) =>
    ({
      callWithRequest,
    } as unknown as KibanaFramework);

  /** A valid _resolve/cluster response with matching indices on the local cluster. */
  const makeResolveResponse = (matchingIndices: boolean) => ({
    '(local)': {
      connected: true,
      skip_unavailable: false,
      matching_indices: matchingIndices,
    },
  });

  describe('hasIndices — primary path (_resolve/cluster)', () => {
    it('returns true when at least one cluster reports matching_indices', async () => {
      const callWithRequest = jest.fn().mockResolvedValue(makeResolveResponse(true));
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      const result = await adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*');

      expect(result).toBe(true);
    });

    it('returns false when no cluster reports matching_indices', async () => {
      const callWithRequest = jest.fn().mockResolvedValue(makeResolveResponse(false));
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      const result = await adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*');

      expect(result).toBe(false);
    });

    it('returns true when any cluster in a multi-cluster response has matching_indices', async () => {
      const callWithRequest = jest.fn().mockResolvedValue({
        '(local)': { connected: true, skip_unavailable: false, matching_indices: false },
        remote1: { connected: true, skip_unavailable: true, matching_indices: true },
      });
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      const result = await adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*');

      expect(result).toBe(true);
    });

    it('calls indices.resolveCluster with both a server-side timeout and a transport requestTimeout', async () => {
      const callWithRequest = jest.fn().mockResolvedValue(makeResolveResponse(true));
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      await adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*');

      const [, endpoint, params] = callWithRequest.mock.calls[0];
      expect(endpoint).toBe('indices.resolveCluster');
      // Server-side per-remote timeout so a slow remote is reported as
      // not-connected rather than failing the whole call.
      expect(params).toEqual(expect.objectContaining({ timeout: expect.any(String) }));
      // Transport-level backstop so the Kibana → ES connection cannot hang.
      expect(params).toEqual(expect.objectContaining({ requestTimeout: expect.any(String) }));
    });

    it('forwards the KibanaRequest for abort-on-disconnect wiring', async () => {
      const callWithRequest = jest.fn().mockResolvedValue(makeResolveResponse(true));
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));
      const fakeRequest = { method: 'get' } as any;

      await adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*', fakeRequest);

      // The 4th argument to callWithRequest is the KibanaRequest, which wires up
      // subscribeToAborted$ so a client disconnect cancels the ES call.
      const [, , , requestArg] = callWithRequest.mock.calls[0];
      expect(requestArg).toBe(fakeRequest);
    });

    it('returns false when both _resolve/cluster and the fallback search 404', async () => {
      const notFoundError = Object.assign(new Error('index_not_found_exception'), {
        statusCode: 404,
      });
      const callWithRequest = jest.fn().mockRejectedValue(notFoundError);
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      const result = await adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*');

      expect(result).toBe(false);
    });

    it('throws NoSuchRemoteClusterError when _resolve/cluster surfaces no_such_remote_cluster_exception', async () => {
      const remoteErr = Object.assign(
        new Error('no_such_remote_cluster_exception: [remote1] is missing'),
        { status: 500 }
      );
      const callWithRequest = jest.fn().mockRejectedValue(remoteErr);
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      await expect(
        adapter.hasIndices(createRequestContext(), 'remote1:metrics-*')
      ).rejects.toBeInstanceOf(NoSuchRemoteClusterError);
    });

    it('propagates an error only when the fallback search also fails', async () => {
      const unexpectedError = new Error('cluster unhealthy');
      const callWithRequest = jest.fn().mockRejectedValue(unexpectedError);
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      await expect(
        adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*')
      ).rejects.toThrow('cluster unhealthy');
      expect(callWithRequest).toHaveBeenCalledTimes(2);
    });

    it('falls back to _search rather than reporting "no indices" on an unexpected error', async () => {
      // Regression guard: composeSourceStatus turns a throw into
      // `metricIndicesExist: false`, which renders an onboarding screen. An
      // unusable `_resolve/cluster` must never produce that on a cluster that
      // does have indices.
      const unexpectedError = Object.assign(new Error('cluster_block_exception'), {
        statusCode: 503,
      });
      const callWithRequest = jest
        .fn()
        .mockRejectedValueOnce(unexpectedError)
        .mockResolvedValueOnce({ _shards: { total: 7 }, hits: { total: { value: 0 } } });
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      await expect(
        adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*')
      ).resolves.toBe(true);
    });
  });

  describe('hasIndices — inconclusive _resolve/cluster entries (HTTP 200)', () => {
    /**
     * `_resolve/cluster` answers 200 with a per-cluster `error` and no
     * `matching_indices` when a remote is unreachable, or omits matches the
     * caller cannot see without `view_index_metadata`. Shape verified against
     * a live remote.
     */
    const unreachableRemote = {
      dead: {
        connected: false,
        skip_unavailable: true,
        error: 'Request timed out before receiving a response from the remote cluster',
      },
    };

    it('falls back to _search when the only cluster entry is an error', async () => {
      const callWithRequest = jest
        .fn()
        .mockResolvedValueOnce(unreachableRemote)
        .mockResolvedValueOnce({ _shards: { total: 5 }, hits: { total: { value: 0 } } });
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      const result = await adapter.hasIndices(createRequestContext(), 'dead:metrics-*');

      expect(result).toBe(true);
      expect(callWithRequest).toHaveBeenCalledTimes(2);
      expect(callWithRequest.mock.calls[1][1]).toBe('search');
    });

    it('falls back when a remote reports a security error alongside a non-matching local', async () => {
      const callWithRequest = jest
        .fn()
        .mockResolvedValueOnce({
          '(local)': { connected: true, skip_unavailable: false, matching_indices: false },
          remote1: { connected: true, skip_unavailable: false, error: 'security_exception' },
        })
        .mockResolvedValueOnce({ _shards: { total: 2 }, hits: { total: { value: 0 } } });
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      await expect(
        adapter.hasIndices(createRequestContext(), 'metrics-*,remote1:metrics-*')
      ).resolves.toBe(true);
      expect(callWithRequest).toHaveBeenCalledTimes(2);
    });

    it('does NOT fall back when every cluster definitively reports no match', async () => {
      // Guards the perf win: a conclusive negative must not pay for a second
      // shard-fanning probe.
      const callWithRequest = jest.fn().mockResolvedValue(makeResolveResponse(false));
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      const result = await adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*');

      expect(result).toBe(false);
      expect(callWithRequest).toHaveBeenCalledTimes(1);
    });

    it('short-circuits on a positive match even when another cluster errored', async () => {
      const callWithRequest = jest.fn().mockResolvedValue({
        oblt: { connected: true, skip_unavailable: true, matching_indices: true },
        ...unreachableRemote,
      });
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      const result = await adapter.hasIndices(
        createRequestContext(),
        'oblt:metrics-*,dead:metrics-*'
      );

      expect(result).toBe(true);
      expect(callWithRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasIndices — serverless', () => {
    // `_resolve/cluster` is not exposed in serverless Elasticsearch; calling it
    // there answers `api_not_available_exception`.
    const apiNotAvailable = Object.assign(new Error('api_not_available_exception'), {
      statusCode: 410,
    });

    it('skips _resolve/cluster entirely and probes with _search', async () => {
      const callWithRequest = jest
        .fn()
        .mockResolvedValue({ _shards: { total: 4 }, hits: { total: { value: 0 } } });
      const adapter = new InfraElasticsearchSourceStatusAdapter(
        createFramework(callWithRequest),
        true
      );

      const result = await adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*');

      expect(result).toBe(true);
      expect(callWithRequest).toHaveBeenCalledTimes(1);
      const [, endpoint] = callWithRequest.mock.calls[0];
      expect(endpoint).toBe('search');
    });

    it('still reports indices when a stateful build hits api_not_available_exception', async () => {
      const callWithRequest = jest
        .fn()
        .mockRejectedValueOnce(apiNotAvailable)
        .mockResolvedValueOnce({ _shards: { total: 4 }, hits: { total: { value: 0 } } });
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      await expect(
        adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*')
      ).resolves.toBe(true);
    });
  });

  describe('hasIndices — privilege fallback (403 → search)', () => {
    it('falls back to _search when _resolve/cluster returns 403 (read-only user)', async () => {
      const forbidden = Object.assign(new Error('security_exception'), { status: 403 });
      // First call: resolveCluster → 403. Second call: search → has shards.
      const callWithRequest = jest
        .fn()
        .mockRejectedValueOnce(forbidden)
        .mockResolvedValueOnce({ _shards: { total: 3 }, hits: { total: { value: 0 } } });
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      const result = await adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*');

      expect(result).toBe(true);
      expect(callWithRequest).toHaveBeenCalledTimes(2);
      const [, firstEndpoint] = callWithRequest.mock.calls[0];
      const [, secondEndpoint] = callWithRequest.mock.calls[1];
      expect(firstEndpoint).toBe('indices.resolveCluster');
      expect(secondEndpoint).toBe('search');
    });

    it('returns false via fallback search when no shards match', async () => {
      const forbidden = Object.assign(new Error('security_exception'), { status: 403 });
      const callWithRequest = jest
        .fn()
        .mockRejectedValueOnce(forbidden)
        .mockResolvedValueOnce({ _shards: { total: 0 }, hits: { total: { value: 0 } } });
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      const result = await adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*');

      expect(result).toBe(false);
    });

    it('propagates NoSuchRemoteClusterError through the fallback search', async () => {
      const forbidden = Object.assign(new Error('security_exception'), { status: 403 });
      const remoteErr = Object.assign(
        new Error('no_such_remote_cluster_exception: [remote1] is missing'),
        { status: 500 }
      );
      const callWithRequest = jest
        .fn()
        .mockRejectedValueOnce(forbidden)
        .mockRejectedValueOnce(remoteErr);
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      await expect(
        adapter.hasIndices(createRequestContext(), 'remote1:metrics-*')
      ).rejects.toBeInstanceOf(NoSuchRemoteClusterError);
    });

    it('fallback search also bounds the call with requestTimeout', async () => {
      const forbidden = Object.assign(new Error('security_exception'), { status: 403 });
      const callWithRequest = jest
        .fn()
        .mockRejectedValueOnce(forbidden)
        .mockResolvedValueOnce({ _shards: { total: 1 }, hits: { total: { value: 0 } } });
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      await adapter.hasIndices(createRequestContext(), 'metrics-*,metricbeat-*');

      const [, , searchParams] = callWithRequest.mock.calls[1];
      expect(searchParams).toEqual(expect.objectContaining({ requestTimeout: expect.any(String) }));
    });
  });
});
