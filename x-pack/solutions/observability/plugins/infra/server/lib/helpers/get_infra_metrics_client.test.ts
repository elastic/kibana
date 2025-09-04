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

const infraMetricsTestHarness =
  (tiers: DataTier[], input: QueryDslQueryContainer | undefined, expectedBool: any) => async () => {
    const callWithRequest = jest.fn();
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
        query: {
          bool: expectedBool,
        },
      },
      {}
    );
  };

describe('getInfraMetricsClient', () => {
  it(
    'defines an empty bool query if given no data tiers to filter by and no query',
    infraMetricsTestHarness([], undefined, {
      filter: undefined,
      must: [undefined],
    })
  );

  it(
    'includes excluded data tiers in the request filter by default',
    infraMetricsTestHarness(['data_frozen'], undefined, {
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
    })
  );

  it(
    'puts the input query in must if no excluded data tiers',
    infraMetricsTestHarness(
      [],
      { exists: { field: 'a-field' } },
      {
        must: [{ exists: { field: 'a-field' } }],
      }
    )
  );

  it(
    'merges provided filters with the excluded data tier filter',
    infraMetricsTestHarness(
      ['data_frozen'],
      { exists: { field: 'a-field' } },
      {
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
      }
    )
  );
});
