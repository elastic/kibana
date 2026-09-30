/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-security';
import {
  AGENT_STATUS_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  UNISOLATE_HOST_ROUTE_V2,
} from '../../../../../../common/endpoint/constants';
import type { ResponseActionApiResponse } from '../../../../../../common/endpoint/types';

// `Request` and `Route` are not re-exported by `@kbn/scout-security` today, and the security
// solution ESLint config forbids importing them from `playwright` / `@playwright/test` directly.
// Deriving them from `ScoutPage` keeps the mock strongly typed without needing a temporary
// eslint-disable or reaching around the boundary.
type ScoutRoute = Parameters<Parameters<ScoutPage['route']>[1]>[0];
type ScoutRequest = Awaited<ReturnType<ScoutPage['waitForRequest']>>;

/**
 * Controls the mocked HTTP surface that the alert-flyout Isolate/Release flow depends on when the
 * spec runs without a real SentinelOne tenant. The mock replaces three endpoints:
 *
 *  1. `GET  /internal/api/endpoint/agent_status` — drives only the take-action menu label
 *     ("Isolate host" vs. "Release host"); toggle with `markIsolated()` / `markReleased()`.
 *  2. `POST /api/endpoint/action/isolate`         — returns a synthetic `ResponseActionApiResponse`
 *     with `action` set, which is what `useHostIsolation` uses to flip `isIsolated → true` and
 *     render `hostIsolateSuccessMessage`. Awaitable via `waitForIsolateCall()`.
 *  3. `POST /api/endpoint/action/unisolate`       — same shape for the release direction.
 *
 * The Cypress spec this replaces polled a real SentinelOne agent for up to 10 minutes; the mock
 * lets us assert the entire flow deterministically in under one second.
 */
export interface SentinelOneIsolationMock {
  waitForIsolateCall: () => Promise<ScoutRequest>;
  waitForReleaseCall: () => Promise<ScoutRequest>;
  markIsolated: () => void;
  markReleased: () => void;
  /**
   * Waits for the next `useGetAgentStatus` poll to observe the current `isolated` state.
   * `useGetAgentStatus` uses React Query with `refetchInterval: 10000ms`, so a mock state flip
   * only takes effect once the next poll fires. Use this after `markIsolated()` / `markReleased()`
   * before reopening the take-action menu.
   */
  waitForAgentStatusPollReflecting: (isolated: boolean) => Promise<void>;
}

interface InstallSentinelOneIsolationMockParams {
  agentId: string;
}

// Route patterns match at every Kibana basePath / space prefix.
const ISOLATE_ROUTE_PATTERN = `**${ISOLATE_HOST_ROUTE_V2}`;
const UNISOLATE_ROUTE_PATTERN = `**${UNISOLATE_HOST_ROUTE_V2}`;
const AGENT_STATUS_ROUTE_PATTERN = `**${AGENT_STATUS_ROUTE}**`;

// The shape shipped by the security_solution production HTTP mocks
// (`response_actions_http_mocks.ts:109`). Typed against the production contract so a change to
// `ResponseActionApiResponse` surfaces here as a compile error, not silently as a runtime drift.
const buildActionResponse = (actionId: string): ResponseActionApiResponse => ({
  action: actionId,
  // `data` is `EndpointActionData<TParameters, TOutputContent>` — the alert-flyout flow only reads
  // its presence + `id`, and the production mock at `response_actions_http_mocks.ts:110` returns
  // the same minimal shape. Cast keeps us honest about that scope.
  data: { id: actionId } as ResponseActionApiResponse['data'],
});

export const installSentinelOneIsolationMock = async (
  page: ScoutPage,
  { agentId }: InstallSentinelOneIsolationMockParams
): Promise<SentinelOneIsolationMock> => {
  let isolated = false;

  await page.route(AGENT_STATUS_ROUTE_PATTERN, (route: ScoutRoute) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          [agentId]: {
            found: true,
            isolated,
            status: 'healthy',
            agentType: 'sentinel_one',
            lastSeen: new Date().toISOString(),
            pendingActions: {},
          },
        },
      }),
    })
  );

  await page.route(ISOLATE_ROUTE_PATTERN, (route: ScoutRoute) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildActionResponse('scout-isolate-action-id')),
    })
  );

  await page.route(UNISOLATE_ROUTE_PATTERN, (route: ScoutRoute) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildActionResponse('scout-unisolate-action-id')),
    })
  );

  return {
    waitForIsolateCall: () =>
      page.waitForRequest(
        (request) => request.method() === 'POST' && request.url().endsWith(ISOLATE_HOST_ROUTE_V2)
      ),
    waitForReleaseCall: () =>
      page.waitForRequest(
        (request) => request.method() === 'POST' && request.url().endsWith(UNISOLATE_HOST_ROUTE_V2)
      ),
    markIsolated: () => {
      isolated = true;
    },
    markReleased: () => {
      isolated = false;
    },
    waitForAgentStatusPollReflecting: async (expected: boolean) => {
      // Ignore the current in-flight response — wait for a fresh poll where the mocked
      // `isolated` value matches `expected`, giving React Query time to re-render the menu.
      await page.waitForResponse(async (response) => {
        if (!response.url().includes(AGENT_STATUS_ROUTE)) return false;
        try {
          const body = (await response.json()) as {
            data?: Record<string, { isolated?: boolean }>;
          };
          return body?.data?.[agentId]?.isolated === expected;
        } catch {
          return false;
        }
      });
    },
  };
};
