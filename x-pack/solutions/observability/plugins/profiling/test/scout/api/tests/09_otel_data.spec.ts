/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, SamlAuth } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { BaseFlameGraph, TopNFunctions } from '@kbn/profiling-utils';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { apiTest } from '../../common/fixtures';
import {
  esArchiversPath,
  internalApiHeaders,
  PROFILING_OTEL_TEST_DATES,
  PROFILING_OTEL_TEST_HOST_ID,
  PROFILING_OTEL_TEST_KUERY,
  profilingApiEndpoints,
} from '../../common/fixtures/constants';

// Only OTel profiling data exists in this time range
const OTEL_TIME_RANGE = {
  timeFrom: String(new Date(PROFILING_OTEL_TEST_DATES.rangeFrom).getTime()),
  timeTo: String(new Date(PROFILING_OTEL_TEST_DATES.rangeTo).getTime()),
};

// The topN routes take the time range in seconds
const OTEL_TIME_RANGE_IN_SECONDS = {
  timeFrom: String(new Date(PROFILING_OTEL_TEST_DATES.rangeFrom).getTime() / 1000),
  timeTo: String(new Date(PROFILING_OTEL_TEST_DATES.rangeTo).getTime() / 1000),
};

// The OTel test data has 44 events in its time range, with 43 different stacktraces
const OTEL_EVENTS_COUNT = 44;
const OTEL_STACKTRACES_COUNT = 43;

// Samples of the OTel test data in each Stacktraces grouping, one per event
const OTEL_SAMPLES_BY_GROUPING = [
  {
    grouping: 'containers',
    endpoint: profilingApiEndpoints.topNContainers,
    samplesByCategory: { checkout: 33, recommendation: 11 },
  },
  {
    grouping: 'deployments',
    endpoint: profilingApiEndpoints.topNDeployments,
    samplesByCategory: {
      'checkout-5d8f7c9b4-x2kqp': 33,
      'recommendation-6c7b9d8f5-m4zjl': 11,
    },
  },
  {
    grouping: 'executables',
    endpoint: profilingApiEndpoints.topNExecutables,
    samplesByCategory: { java: 33, python3: 11 },
  },
  {
    grouping: 'hosts',
    endpoint: profilingApiEndpoints.topNHosts,
    samplesByCategory: { [PROFILING_OTEL_TEST_HOST_ID]: 44 },
  },
  {
    grouping: 'threads',
    endpoint: profilingApiEndpoints.topNThreads,
    samplesByCategory: {
      '497295213074376': 33,
      '599103450330106': 3,
      '105167004320218': 1,
      '111571015508996': 1,
      '231306382266776': 1,
      '239239240528656': 1,
      '336544854664378': 1,
      '41422267885458': 1,
      '507517422226861': 1,
      '542231923413871': 1,
    },
  },
] as const;

// Subset of the plugin's `TopNResponse`, which the Scout tsconfig does not reference
interface TopNResponse {
  TotalCount: number;
  TopN: Array<{ Category: string; Count: number | null }>;
  Metadata: Record<string, unknown[]>;
}

const getSamplesByCategory = ({ TopN }: TopNResponse) =>
  TopN.reduce<Record<string, number>>(
    (samplesByCategory, { Category, Count }) => ({
      ...samplesByCategory,
      [Category]: (samplesByCategory[Category] ?? 0) + (Count ?? 0),
    }),
    {}
  );

const get = async (
  apiClient: ApiClientFixture,
  samlAuth: SamlAuth,
  endpoint: string,
  query: Record<string, string>
) => {
  const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

  // Only this test data's events, so other OTel data in its time range does not change the results
  return apiClient.get(
    `${endpoint}?${new URLSearchParams({ kuery: PROFILING_OTEL_TEST_KUERY, ...query })}`,
    {
      headers: { ...cookieHeader, ...internalApiHeaders },
      responseType: 'json',
    }
  );
};

apiTest.describe('Profiling data APIs by schema', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ profilingHelper, profilingSetup }) => {
    const status = await profilingSetup.checkStatus();

    if (!status.has_setup) {
      await profilingHelper.installPolicies();
      await profilingSetup.setupResources();
    }

    if (!status.has_data) {
      await profilingSetup.loadData(esArchiversPath);
    }

    await profilingHelper.loadOtelData();
  });

  apiTest('queries the flamegraph of the requested schema', async ({ apiClient, samlAuth }) => {
    const otelResponse = await get(apiClient, samlAuth, profilingApiEndpoints.flamechart, {
      ...OTEL_TIME_RANGE,
      schema: ProfilingSchema.OTEL,
    });
    expect(otelResponse).toHaveStatusCode(200);
    const otelFlamegraph = otelResponse.body as BaseFlameGraph;
    expect(otelFlamegraph.TotalSamples).toBeGreaterThan(0);
    expect(otelFlamegraph.Size).toBeGreaterThan(1);

    const ecsResponse = await get(apiClient, samlAuth, profilingApiEndpoints.flamechart, {
      ...OTEL_TIME_RANGE,
      schema: ProfilingSchema.ECS,
    });
    expect(ecsResponse).toHaveStatusCode(200);
    expect((ecsResponse.body as BaseFlameGraph).TotalSamples).toBe(0);
  });

  apiTest('queries the functions of the requested schema', async ({ apiClient, samlAuth }) => {
    const query = { ...OTEL_TIME_RANGE, startIndex: '0', endIndex: '10' };

    const otelResponse = await get(apiClient, samlAuth, profilingApiEndpoints.topNFunctions, {
      ...query,
      schema: ProfilingSchema.OTEL,
    });
    expect(otelResponse).toHaveStatusCode(200);
    expect((otelResponse.body as TopNFunctions).TopN.length).toBeGreaterThan(0);

    const ecsResponse = await get(apiClient, samlAuth, profilingApiEndpoints.topNFunctions, {
      ...query,
      schema: ProfilingSchema.ECS,
    });
    expect(ecsResponse).toHaveStatusCode(200);
    expect((ecsResponse.body as TopNFunctions).TopN).toHaveLength(0);
  });

  apiTest('queries the stacktraces of the requested schema', async ({ apiClient, samlAuth }) => {
    const otelResponse = await get(apiClient, samlAuth, profilingApiEndpoints.topNHosts, {
      ...OTEL_TIME_RANGE_IN_SECONDS,
      schema: ProfilingSchema.OTEL,
    });
    expect(otelResponse).toHaveStatusCode(200);
    expect((otelResponse.body as TopNResponse).TotalCount).toBe(OTEL_EVENTS_COUNT);

    const ecsResponse = await get(apiClient, samlAuth, profilingApiEndpoints.topNHosts, {
      ...OTEL_TIME_RANGE_IN_SECONDS,
      schema: ProfilingSchema.ECS,
    });
    expect(ecsResponse).toHaveStatusCode(200);
    expect((ecsResponse.body as TopNResponse).TotalCount).toBe(0);
  });

  for (const { grouping, endpoint, samplesByCategory } of OTEL_SAMPLES_BY_GROUPING) {
    apiTest(`groups the OTel stacktraces by ${grouping}`, async ({ apiClient, samlAuth }) => {
      const response = await get(apiClient, samlAuth, endpoint, {
        ...OTEL_TIME_RANGE_IN_SECONDS,
        schema: ProfilingSchema.OTEL,
      });
      expect(response).toHaveStatusCode(200);
      expect(getSamplesByCategory(response.body as TopNResponse)).toStrictEqual(samplesByCategory);
    });
  }

  apiTest('looks up the frames of the OTel stacktraces', async ({ apiClient, samlAuth }) => {
    const response = await get(apiClient, samlAuth, profilingApiEndpoints.topNTraces, {
      ...OTEL_TIME_RANGE_IN_SECONDS,
      schema: ProfilingSchema.OTEL,
    });
    expect(response).toHaveStatusCode(200);
    const { Metadata: metadata } = response.body as TopNResponse;
    expect(Object.keys(metadata)).toHaveLength(OTEL_STACKTRACES_COUNT);
    expect(Object.values(metadata).every((frames) => frames.length > 0)).toBe(true);
  });
});
