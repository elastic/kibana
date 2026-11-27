/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { IndexSize } from './estimate';

/** Indices per stats request, so their names keep the URL short. */
const INDICES_PER_REQUEST = 50;

interface MeteringStatsResponse {
  indices?: Array<{ name: string; num_docs?: number; size_in_bytes?: number }>;
}

export interface IndexSizes {
  sizes: Map<string, IndexSize>;
  /**
   * Whether some local indices have no size: the user can't monitor them (or, rarely, they were
   * deleted since the search).
   */
  missingPrivileges: boolean;
  /** Whether some indices were remote, which neither stats API reads, so they have no size. */
  skippedRemoteIndices: boolean;
}

/** One request's sizes, by index. */
type SizesRequest = (indices: string[]) => Promise<Array<[string, IndexSize]>>;

/**
 * Each name as a wildcard, which Elasticsearch resolves to the matching indices the user may
 * monitor, so one index they can't, or one deleted since the search, leaves out only itself
 * instead of failing the whole request. Backing indices are hidden, hence `hidden`.
 */
const statsSizes =
  (esClient: ElasticsearchClient, signal: AbortSignal): SizesRequest =>
  async (indices) => {
    const response = await esClient.indices.stats(
      {
        index: indices.map((index) => `${index}*`),
        expand_wildcards: ['open', 'hidden'],
        metric: ['docs', 'store'],
        filter_path: [
          'indices.*.primaries.docs.count',
          'indices.*.primaries.store.size_in_bytes',
          'indices.*.primaries.store.total_data_set_size_in_bytes',
        ],
      },
      { signal }
    );
    return Object.entries(response.indices ?? {}).map(([index, { primaries }]) => [
      index,
      {
        // The data set size counts a searchable snapshot's data, which the local size doesn't.
        bytes:
          primaries?.store?.total_data_set_size_in_bytes ?? primaries?.store?.size_in_bytes ?? 0,
        docs: primaries?.docs?.count ?? 0,
      },
    ]);
  };

const meteringSizes =
  (esClient: ElasticsearchClient, signal: AbortSignal): SizesRequest =>
  async (indices) => {
    const response = await esClient.transport.request<MeteringStatsResponse>(
      { method: 'GET', path: `/_metering/stats/${indices.map(encodeURIComponent).join(',')}` },
      { signal }
    );
    return (response.indices ?? []).map(
      ({ name, num_docs: docs = 0, size_in_bytes: bytes = 0 }) => [name, { bytes, docs }]
    );
  };

const isForbidden = (error: unknown) => isResponseError(error) && error.statusCode === 403;

/**
 * The stored size and document count of each index's primaries: from `_metering/stats` on
 * serverless, which only the Kibana system user may call on the user's behalf, and from the index
 * stats elsewhere, which need the `monitor` index privilege. Remote indices are left out, as
 * neither API reads them.
 */
export const getIndexSizes = async ({
  esClient,
  getMeteringClient,
  isServerless,
  indices,
  signal,
}: {
  /** The current user's client, for the index stats. */
  esClient: ElasticsearchClient;
  /** The client for `_metering/stats`, only read on serverless. */
  getMeteringClient: () => ElasticsearchClient;
  isServerless: boolean;
  indices: Iterable<string>;
  signal: AbortSignal;
}): Promise<IndexSizes> => {
  const unique = [...new Set(indices)];
  const local = unique.filter((index) => !index.includes(':'));
  const request = isServerless
    ? meteringSizes(getMeteringClient(), signal)
    : statsSizes(esClient, signal);

  const responses = await Promise.all(
    chunk(local, INDICES_PER_REQUEST).map(async (names) => {
      try {
        return await request(names);
      } catch (error) {
        // Serverless names its indices explicitly, so one it can't read fails the request.
        if (isForbidden(error)) {
          return [];
        }
        throw error;
      }
    })
  );

  // A wildcard can match more than the index it was made from; keep only the requested ones.
  const requested = new Set(local);
  const sizes = new Map(responses.flat().filter(([index]) => requested.has(index)));
  return {
    sizes,
    missingPrivileges: local.some((index) => !sizes.has(index)),
    skippedRemoteIndices: local.length < unique.length,
  };
};
