/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Ping } from '../../common/runtime_types';
import type { SyntheticsEsClient } from '../lib';
import { getRangeFilter, SUMMARY_FILTER } from '../../common/constants/client_defaults';
import { SYNTHETICS_INDEX_PATTERN } from '../../common/constants';

export async function getLatestTestRun<F>({
  syntheticsEsClient,
  monitorId,
  locationLabel,
  locationId,
  remoteName,
  from = 'now-1d',
  to = 'now',
}: {
  syntheticsEsClient: SyntheticsEsClient;
  monitorId: string;
  locationLabel?: string;
  locationId?: string;
  remoteName?: string;
  from?: string;
  to?: string;
}): Promise<Ping | undefined> {
  // For remote monitors (especially project monitors), the monitorId passed from
  // the detail page URL may be the `config_id` (a UUID), not the `monitor.id`
  // field in ping docs (e.g. "project-name-monitor-name"). To handle both cases,
  // query with a `should` clause that matches either field.
  const monitorFilter: QueryDslQueryContainer = {
    bool: {
      should: [{ term: { 'monitor.id': monitorId } }, { term: { config_id: monitorId } }],
      minimum_should_match: 1,
    },
  };

  const response = await syntheticsEsClient.search({
    // For remote monitors, target the remote cluster's synthetics indices via
    // CCS syntax. Without this, the query falls back to the local
    // `synthetics-*` default and returns nothing (or unrelated stale local
    // docs from the now-1w/now-30d fallback path), which leaves the monitor
    // detail header (Status, Location, Last run) and the Summary embeddables
    // empty.
    ...(remoteName ? { index: `${remoteName}:${SYNTHETICS_INDEX_PATTERN}` } : {}),
    query: {
      bool: {
        filter: [
          SUMMARY_FILTER,
          getRangeFilter({ from, to }),
          monitorFilter,
          ...(locationLabel ? [{ term: { 'observer.geo.name': locationLabel } }] : []),
          ...(locationId ? [{ term: { 'observer.name': locationId } }] : []),
        ] as QueryDslQueryContainer[],
      },
    },
    sort: [{ '@timestamp': { order: 'desc' } }],
  });

  return response.body.hits.hits[0]?._source as Ping | undefined;
}
