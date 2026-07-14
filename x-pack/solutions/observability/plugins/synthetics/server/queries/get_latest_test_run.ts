/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Ping } from '../../common/runtime_types';
import type { SyntheticsEsClient } from '../lib';
import { getSyntheticsCcsIndex } from '../../common/get_synthetics_indices';
import { getRangeFilter, SUMMARY_FILTER } from '../../common/constants/client_defaults';

export async function getLatestTestRun<F>({
  syntheticsEsClient,
  monitorId,
  locationLabel,
  locationId,
  from = 'now-1d',
  to = 'now',
  remoteName,
}: {
  syntheticsEsClient: SyntheticsEsClient;
  monitorId: string;
  locationLabel?: string;
  locationId?: string;
  from?: string;
  to?: string;
  remoteName?: string;
}): Promise<Ping | undefined> {
  const response = await syntheticsEsClient.search({
    // For a remote monitor, scope to that cluster's index only. Passing the client's
    // (possibly multi-cluster) heartbeatIndices here would only prefix the first
    // sub-pattern and let a trailing `*:synthetics-*` fan back out to every remote.
    index: remoteName ? getSyntheticsCcsIndex(remoteName) : syntheticsEsClient.heartbeatIndices,
    query: {
      bool: {
        filter: [
          SUMMARY_FILTER,
          getRangeFilter({ from, to }),
          { term: { 'monitor.id': monitorId } },
          ...(locationLabel ? [{ term: { 'observer.geo.name': locationLabel } }] : []),
          ...(locationId ? [{ term: { 'observer.name': locationId } }] : []),
        ] as QueryDslQueryContainer[],
      },
    },
    sort: [{ '@timestamp': { order: 'desc' } }],
  });

  return response.body.hits.hits[0]?._source as Ping | undefined;
}
