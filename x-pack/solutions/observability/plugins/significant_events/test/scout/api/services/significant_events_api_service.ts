/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as delay } from 'timers/promises';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import type { KbnClient, ScoutLogger } from '@kbn/scout-oblt';
import { measurePerformanceAsync } from '@kbn/scout-oblt';
import { COMMON_API_HEADERS } from '../fixtures/constants';

// Matches global.setup.ts: a runtime flag override takes ~10s to reach every Cloud node.
const RESUME_PROPAGATION_TIMEOUT_MS = 30_000;
const RESUME_RETRY_INTERVAL_MS = 1_000;

export interface SignificantEventsTestApiService {
  runSignificantEventsDiscovery: () => Promise<{ executionId: string }>;
  cancelSignificantEventsDiscovery: () => Promise<{ executionId: string | null }>;
  getSignificantEventsDiscoveryStatus: () => Promise<{
    status: string;
    executionId: string | null;
  }>;
  enableSignificantEvents: () => Promise<void>;
  disableSignificantEvents: () => Promise<void>;
  resumeSignificantEvents: (params?: { spaceId?: string }) => Promise<void>;
}

export function getSignificantEventsTestApiService({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
}): SignificantEventsTestApiService {
  // Suites should rely on global.setup.ts / global.teardown.ts for the default availability
  // override. These helpers are only for intentional mid-test toggles (e.g. asserting a 403 when
  // the flag is off) — do not wrap an entire describe in enable/disable, since that races with
  // sibling suites if Playwright ever runs with workers > 1.
  const setAvailability = async (enabled: boolean) => {
    await kbnClient.request({
      path: '/internal/core/_settings',
      method: 'PUT',
      headers: COMMON_API_HEADERS,
      body: {
        'feature_flags.overrides': {
          [NIGHTSHIFT_ENABLED_FLAG]: enabled,
        },
      },
    });
  };

  return {
    async enableSignificantEvents() {
      await measurePerformanceAsync(
        log,
        'significantEventsTestApi.enableSignificantEvents',
        async () => {
          await setAvailability(true);
        }
      );
    },

    async disableSignificantEvents() {
      await measurePerformanceAsync(
        log,
        'significantEventsTestApi.disableSignificantEvents',
        async () => {
          await setAvailability(false);
        }
      );
    },

    // Turning the flag off pauses Significant Events in every space and turning it back on does
    // not resume, so suites that flip the flag resume here to leave the space running.
    // Resume is gated by the flag, so it retries while a just-enabled override is still
    // propagating to every Cloud node.
    async resumeSignificantEvents({ spaceId }: { spaceId?: string } = {}) {
      await measurePerformanceAsync(
        log,
        'significantEventsTestApi.resumeSignificantEvents',
        async () => {
          const deadline = Date.now() + RESUME_PROPAGATION_TIMEOUT_MS;
          while (true) {
            const { status } = await kbnClient.request({
              method: 'POST',
              path: `${
                spaceId ? `/s/${spaceId}` : ''
              }/internal/significant_events/maintenance/_resume`,
              headers: COMMON_API_HEADERS,
              // A space that no longer exists answers 404 and has nothing to resume.
              ignoreErrors: [403, 404],
            });
            if (status !== 403) {
              return;
            }
            if (Date.now() >= deadline) {
              throw new Error(
                `Resume still rejected (403) ${RESUME_PROPAGATION_TIMEOUT_MS}ms after enabling the flag`
              );
            }
            await delay(RESUME_RETRY_INTERVAL_MS);
          }
        }
      );
    },

    async runSignificantEventsDiscovery() {
      return measurePerformanceAsync(
        log,
        'significantEventsTestApi.runSignificantEventsDiscovery',
        async () => {
          const response = await kbnClient.request({
            method: 'POST',
            path: '/internal/streams/significant_events/discovery/_execute',
            body: { action: 'trigger' },
          });
          return response.data as { executionId: string };
        }
      );
    },

    async cancelSignificantEventsDiscovery() {
      return measurePerformanceAsync(
        log,
        'significantEventsTestApi.cancelSignificantEventsDiscovery',
        async () => {
          const response = await kbnClient.request({
            method: 'POST',
            path: '/internal/streams/significant_events/discovery/_execute',
            body: { action: 'cancel' },
          });
          return response.data as { executionId: string | null };
        }
      );
    },

    async getSignificantEventsDiscoveryStatus() {
      return measurePerformanceAsync(
        log,
        'significantEventsTestApi.getSignificantEventsDiscoveryStatus',
        async () => {
          const response = await kbnClient.request({
            method: 'GET',
            path: '/internal/streams/significant_events/discovery/_status',
          });
          return response.data as { status: string; executionId: string | null };
        }
      );
    },
  };
}
