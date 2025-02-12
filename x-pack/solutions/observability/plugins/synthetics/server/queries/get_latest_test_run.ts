/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Ping } from '../../common/runtime_types';
import { SyntheticsEsClient } from '../lib';
import { getRangeFilter, SUMMARY_FILTER } from '../../common/constants/client_defaults';

export async function getLatestTestRun<F>({
  syntheticsEsClient,
  monitorId,
  locationLabel,
  from = 'now-1d',
  to = 'now',
}: {
  syntheticsEsClient: SyntheticsEsClient;
  monitorId: string;
  locationLabel?: string;
  from?: string;
  to?: string;
}): Promise<Ping | undefined> {
  const response = await syntheticsEsClient.search({
    body: {
      query: {
        bool: {
          filter: [
            SUMMARY_FILTER,
            getRangeFilter({ from, to }),
            { term: { 'monitor.id': monitorId } },
            ...(locationLabel ? [{ term: { 'observer.geo.name': locationLabel } }] : []),
          ] as QueryDslQueryContainer[],
        },
      },
      sort: [{ '@timestamp': { order: 'desc' } }],
    },
  });

  return response.body.hits.hits[0]?._source as Ping | undefined;
}
