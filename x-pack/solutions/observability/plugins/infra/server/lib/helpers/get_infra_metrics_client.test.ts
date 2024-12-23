/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { DataTier } from '@kbn/observability-shared-plugin/common';
import { InfraBackendLibs } from '../infra_types';
import { getInfraMetricsClient } from './get_infra_metrics_client';
import { InfraPluginRequestHandlerContext } from '../../types';
import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';

const withExcludedDataTiers = (tiers: DataTier[]) => ({
  uiSettings: {
    client: {
      get: () => Promise.resolve(tiers),
    },
  },
});

const mockedInfra = { getMetricsIndices: () => Promise.resolve(['*.indices']) };

const infraMetricsTestHarness =
  (tiers: DataTier[], input: QueryDslQueryContainer | undefined, output: QueryDslQueryContainer) =>
  async () => {
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
      body: {
        query: input,
        size: 1,
        track_total_hits: false,
      },
    });

    expect(callWithRequest).toBeCalledWith(
      context,
      'search',
      {
        body: {
          query: output,
          size: 1,
          track_total_hits: false,
        },
        ignore_unavailable: true,
        index: ['*.indices'],
      },
      {}
    );
  };

describe('getInfraMetricsClient', () => {
  it(
    'defines an empty must_not query if given no data tiers to filter by',
    infraMetricsTestHarness([], undefined, { bool: { must_not: [] } })
  );

  it(
    'includes excluded data tiers in the request filter by default',
    infraMetricsTestHarness(['data_frozen'], undefined, {
      bool: {
        must_not: [
          {
            terms: {
              _tier: ['data_frozen'],
            },
          },
        ],
      },
    })
  );

  it(
    'merges provided filters with the excluded data tier filter',
    infraMetricsTestHarness(
      ['data_frozen'],
      {
        bool: {
          must_not: {
            exists: {
              field: 'a-field',
            },
          },
        },
      },
      {
        bool: {
          must_not: [
            {
              exists: {
                field: 'a-field',
              },
            },
            {
              terms: {
                _tier: ['data_frozen'],
              },
            },
          ],
        },
      }
    )
  );

  it(
    'merges other query params with the excluded data tiers filter',
    infraMetricsTestHarness(
      ['data_frozen'],
      {
        bool: {
          must: {
            exists: {
              field: 'a-field',
            },
          },
        },
      },
      {
        bool: {
          must: {
            exists: {
              field: 'a-field',
            },
          },
          must_not: [
            {
              terms: {
                _tier: ['data_frozen'],
              },
            },
          ],
        },
      }
    )
  );
});
