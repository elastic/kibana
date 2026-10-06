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
  profilingApiEndpoints,
} from '../../common/fixtures/constants';

// Only OTel profiling data exists in this time range
const OTEL_TIME_RANGE = {
  timeFrom: String(new Date(PROFILING_OTEL_TEST_DATES.rangeFrom).getTime()),
  timeTo: String(new Date(PROFILING_OTEL_TEST_DATES.rangeTo).getTime()),
};

const get = async (
  apiClient: ApiClientFixture,
  samlAuth: SamlAuth,
  endpoint: string,
  query: Record<string, string>
) => {
  const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

  return apiClient.get(`${endpoint}?${new URLSearchParams({ kuery: '', ...query })}`, {
    headers: { ...cookieHeader, ...internalApiHeaders },
    responseType: 'json',
  });
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
});
