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
  /** Whether some sizes are missing because the user can't monitor their indices. */
  missingPrivileges: boolean;
}

/** One request's sizes, by index. */
type SizesRequest = (indices: string[]) => Promise<Array<[string, IndexSize]>>;

const statsSizes =
  (esClient: ElasticsearchClient, signal: AbortSignal): SizesRequest =>
  async (indices) => {
    const response = await esClient.indices.stats(
      {
        index: indices,
        metric: ['docs', 'store'],
        filter_path: ['indices.*.primaries.docs.count', 'indices.*.primaries.store.size_in_bytes'],
      },
      { signal }
    );
    return Object.entries(response.indices ?? {}).map(([index, { primaries }]) => [
      index,
      { bytes: primaries?.store?.size_in_bytes ?? 0, docs: primaries?.docs?.count ?? 0 },
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

// A backing index deleted since the search, e.g. by its lifecycle, fails its request.
const isNotFound = (error: unknown) => isResponseError(error) && error.statusCode === 404;

/**
 * The stored size and document count of each index's primaries: from `_metering/stats` on
 * serverless, which only the Kibana system user may call on the user's behalf, and from the index
 * stats elsewhere, which need the `monitor` index privilege. Remote indices are left out, as
 * neither API reads them.
 */
export const getIndexSizes = async ({
  esClient,
  meteringClient,
  isServerless,
  indices,
  signal,
}: {
  /** The current user's client, for the index stats. */
  esClient: ElasticsearchClient;
  /** The client for `_metering/stats`: the internal user, with the user's credentials. */
  meteringClient: ElasticsearchClient;
  isServerless: boolean;
  indices: Iterable<string>;
  signal: AbortSignal;
}): Promise<IndexSizes> => {
  const local = [...new Set(indices)].filter((index) => !index.includes(':'));
  const request = isServerless
    ? meteringSizes(meteringClient, signal)
    : statsSizes(esClient, signal);

  let missingPrivileges = false;
  const responses = await Promise.all(
    chunk(local, INDICES_PER_REQUEST).map(async (names) => {
      try {
        return await request(names);
      } catch (error) {
        if (isForbidden(error)) {
          missingPrivileges = true;
          return [];
        }
        if (isNotFound(error)) {
          return [];
        }
        throw error;
      }
    })
  );

  return { sizes: new Map(responses.flat()), missingPrivileges };
};
