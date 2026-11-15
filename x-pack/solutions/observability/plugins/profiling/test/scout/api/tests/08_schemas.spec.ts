/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, SamlAuth } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { apiTest } from '../../common/fixtures';
import {
  esArchiversPath,
  internalApiHeaders,
  PROFILING_OTEL_TEST_DATES,
  PROFILING_OTEL_TEST_HOST_ID,
  profilingApiEndpoints,
} from '../../common/fixtures/constants';

// Time ranges of the Universal Profiling (ECS) and OTel test data, which do not overlap
const ECS_TIME_RANGE = {
  timeFrom: new Date('2023-03-17T01:00:00.000Z').getTime(),
  timeTo: new Date('2023-03-17T01:00:30.000Z').getTime(),
};
const OTEL_TIME_RANGE = {
  timeFrom: new Date(PROFILING_OTEL_TEST_DATES.rangeFrom).getTime(),
  timeTo: new Date(PROFILING_OTEL_TEST_DATES.rangeTo).getTime(),
};

const getSchemas = async (
  apiClient: ApiClientFixture,
  samlAuth: SamlAuth,
  query: { timeFrom: number; timeTo: number; kuery?: string }
) => {
  const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
  const searchParams = new URLSearchParams({
    timeFrom: String(query.timeFrom),
    timeTo: String(query.timeTo),
    kuery: query.kuery ?? '',
  });

  return apiClient.get(`${profilingApiEndpoints.schemas}?${searchParams}`, {
    headers: { ...cookieHeader, ...internalApiHeaders },
    responseType: 'json',
  });
};

apiTest.describe('Profiling schemas API', { tag: tags.stateful.classic }, () => {
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

  apiTest('reports the schemas with data in the time range', async ({ apiClient, samlAuth }) => {
    const cases = [
      { timeRange: ECS_TIME_RANGE, schemas: [ProfilingSchema.ECS] },
      { timeRange: OTEL_TIME_RANGE, schemas: [ProfilingSchema.OTEL] },
      {
        timeRange: { timeFrom: ECS_TIME_RANGE.timeFrom, timeTo: OTEL_TIME_RANGE.timeTo },
        schemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
      },
      {
        timeRange: {
          timeFrom: new Date('2022-01-01T00:00:00.000Z').getTime(),
          timeTo: new Date('2022-01-01T00:15:00.000Z').getTime(),
        },
        schemas: [],
      },
    ];

    for (const { timeRange, schemas } of cases) {
      const response = await getSchemas(apiClient, samlAuth, timeRange);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ schemas });
    }
  });

  apiTest(
    'only reports the schemas with data matching the query',
    async ({ apiClient, samlAuth }) => {
      const matchingResponse = await getSchemas(apiClient, samlAuth, {
        ...OTEL_TIME_RANGE,
        kuery: `host.id: "${PROFILING_OTEL_TEST_HOST_ID}"`,
      });
      expect(matchingResponse).toHaveStatusCode(200);
      expect(matchingResponse.body).toStrictEqual({ schemas: [ProfilingSchema.OTEL] });

      const notMatchingResponse = await getSchemas(apiClient, samlAuth, {
        ...OTEL_TIME_RANGE,
        kuery: 'host.id: "unknown-host"',
      });
      expect(notMatchingResponse).toHaveStatusCode(200);
      expect(notMatchingResponse.body).toStrictEqual({ schemas: [] });
    }
  );
});
