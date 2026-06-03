/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import type { InfraBackendLibs } from '../infra_types';
import { getInfraMetricsClient } from './get_infra_metrics_client';
import type { InfraPluginRequestHandlerContext } from '../../types';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';

const withExcludedDataTiers = (tiers: DataTier[]) => ({
  uiSettings: {
    client: {
      get: () => Promise.resolve(tiers),
    },
  },
});

const mockedInfra = { getMetricsIndices: () => Promise.resolve(['*.indices']) };

// Asserts the final `query` shape passed to `callWithRequest('search', …)`.
// The client only wraps the caller's query in an extra `bool` when there is
// an excluded-tier filter to apply; otherwise the query is passed through
// untouched (no redundant Lucene rewrite layer).
const infraMetricsTestHarness =
  (
    tiers: DataTier[],
    input: QueryDslQueryContainer | undefined,
    expectedQuery: QueryDslQueryContainer | undefined
  ) =>
  async () => {
    const callWithRequest = jest.fn().mockResolvedValue({});
    const mockedCore = withExcludedDataTiers(tiers);

    const context = {
      infra: Promise.resolve(mockedInfra),
      core: Promise.resolve(mockedCore),
    } as unknown as InfraPluginRequestHandlerContext;

    const client = await getInfraMetricsClient({
      libs: { framework: { callWithRequest } } as unknown as InfraBackendLibs,
      context,
      request: {} as unknown as KibanaRequest,
    });

    await client.search({
      query: input,
      size: 1,
      track_total_hits: false,
    });

    expect(callWithRequest).toBeCalledWith(
      context,
      'search',
      {
        size: 1,
        track_total_hits: false,
        ignore_unavailable: true,
        index: ['*.indices'],
        query: expectedQuery,
      },
      {}
    );
  };

describe('getInfraMetricsClient', () => {
  describe('search', () => {
    it(
      'passes the query through untouched when there are no excluded data tiers and no query',
      infraMetricsTestHarness([], undefined, undefined)
    );

    it(
      'passes the input query through untouched when there are no excluded data tiers',
      infraMetricsTestHarness(
        [],
        { exists: { field: 'a-field' } },
        { exists: { field: 'a-field' } }
      )
    );

    it(
      'wraps the query in a bool and includes excluded data tiers in the filter',
      infraMetricsTestHarness(['data_frozen'], undefined, {
        bool: {
          filter: [
            {
              bool: {
                must_not: [
                  {
                    terms: {
                      _tier: ['data_frozen'],
                    },
                  },
                ],
              },
            },
          ],
          must: [undefined],
        },
      })
    );

    it(
      'merges the provided query into must alongside the excluded data tier filter',
      infraMetricsTestHarness(
        ['data_frozen'],
        { exists: { field: 'a-field' } },
        {
          bool: {
            filter: [
              {
                bool: {
                  must_not: [
                    {
                      terms: {
                        _tier: ['data_frozen'],
                      },
                    },
                  ],
                },
              },
            ],
            must: [{ exists: { field: 'a-field' } }],
          },
        }
      )
    );
  });
});
