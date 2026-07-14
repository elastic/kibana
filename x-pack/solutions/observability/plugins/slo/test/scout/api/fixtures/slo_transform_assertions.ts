/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { pollUntilTrue } from './slo_poll';

const TRANSFORM_HEADERS_BASE = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

type TransformStatsResponse = Awaited<ReturnType<Client['transform']['getTransformStats']>>;

export interface SloTransformAssertions {
  assertNotFound(transformId: string): Promise<void>;
  assertExist(transformId: string): Promise<Record<string, unknown>>;
  assertTransformIsStarted(transformId: string): Promise<TransformStatsResponse>;
  assertTransformIsStopped(transformId: string): Promise<TransformStatsResponse>;
}

export function createSloTransformAssertions(
  apiClient: ApiClientFixture,
  esClient: Client,
  getAdminCookieHeader: () => Promise<Record<string, string>>
): SloTransformAssertions {
  return {
    async assertNotFound(transformId: string) {
      await pollUntilTrue(
        async () => {
          const cookie = await getAdminCookieHeader();
          const res = await apiClient.get(`internal/transform/transforms/${transformId}`, {
            headers: { ...TRANSFORM_HEADERS_BASE, ...cookie },
            responseType: 'json',
          });
          return res.statusCode === 404;
        },
        {
          timeoutMs: 90_000,
          intervalMs: 4000,
          label: `Wait for transform ${transformId} to be deleted`,
        }
      );
    },

    async assertExist(transformId: string) {
      let lastBody: Record<string, unknown> = {};
      await pollUntilTrue(
        async () => {
          const cookie = await getAdminCookieHeader();
          const res = await apiClient.get(`internal/transform/transforms/${transformId}`, {
            headers: { ...TRANSFORM_HEADERS_BASE, ...cookie },
            responseType: 'json',
          });
          if (res.statusCode !== 200) {
            return false;
          }
          const body = res.body as { transforms?: unknown[] };
          if (!body.transforms?.length) {
            return false;
          }
          lastBody = res.body as Record<string, unknown>;
          return true;
        },
        {
          timeoutMs: 90_000,
          intervalMs: 4000,
          label: `Wait for transform ${transformId} to exist`,
        }
      );
      return lastBody;
    },

    async assertTransformIsStarted(transformId: string) {
      let last: TransformStatsResponse | undefined;
      await pollUntilTrue(
        async () => {
          const response = await esClient.transform.getTransformStats({
            transform_id: transformId,
          });
          if (response.transforms[0]?.state !== 'started') {
            return false;
          }
          last = response;
          return true;
        },
        {
          timeoutMs: 150_000,
          intervalMs: 4000,
          label: `Wait for transform ${transformId} to be started`,
        }
      );
      return last!;
    },

    async assertTransformIsStopped(transformId: string) {
      let last: TransformStatsResponse | undefined;
      await pollUntilTrue(
        async () => {
          const response = await esClient.transform.getTransformStats({
            transform_id: transformId,
          });
          if (response.transforms[0]?.state !== 'stopped') {
            return false;
          }
          last = response;
          return true;
        },
        {
          timeoutMs: 150_000,
          intervalMs: 4000,
          label: `Wait for transform ${transformId} to be stopped`,
        }
      );
      return last!;
    },
  };
}
