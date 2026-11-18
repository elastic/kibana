/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, COMMON_HEADERS, setNightshiftEnabled, TICK_PATH } from '../fixtures';

interface TickResponse {
  run_id: string;
  status: 'completed' | 'busy' | 'unavailable';
  strategies: unknown[];
}

/** The workflow `_enable` installs ticks every minute and can hold the space for a moment. */
const MAX_TICK_ATTEMPTS = 5;

/** Ticks until no other run holds the space, so a tick of the engine's own workflow can't fail it. */
const tickUntilRun = async (apiClient: ApiClientFixture, cookieHeader: Record<string, string>) => {
  for (let attempt = 1; ; attempt++) {
    const response = await apiClient.post<TickResponse>(TICK_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: {},
      responseType: 'json',
    });
    if (response.body?.status !== 'busy' || attempt === MAX_TICK_ATTEMPTS) {
      return response;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
};

// The busy case is covered by the run loop and run lock unit tests: a test can't hold the run lock,
// because Elasticsearch refuses writes to the lock manager's restricted index from any user but
// Kibana's own, and two real ticks collide only by chance while no strategy is bound.
apiTest.describe(
  'POST /internal/nightshift/detection/_tick',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, apiServices, config }) => {
      // The engine answers 404 while nightshift.enabled is off; overrides only work locally.
      if (!config.isCloud) {
        await setNightshiftEnabled(apiServices, true);
      }
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    });

    apiTest.afterAll(async ({ apiServices, config }) => {
      if (!config.isCloud) {
        await setNightshiftEnabled(apiServices, null);
      }
    });

    apiTest('runs a tick in a set-up space', async ({ apiClient }) => {
      const response = await tickUntilRun(apiClient, cookieHeader);

      expect(response).toHaveStatusCode(200);
      expect(response.body.status).toBe('completed');
      expect(typeof response.body.run_id).toBe('string');
      // Phase 1 binds no strategy, so nothing is due.
      expect(response.body.strategies).toStrictEqual([]);
    });
  }
);
