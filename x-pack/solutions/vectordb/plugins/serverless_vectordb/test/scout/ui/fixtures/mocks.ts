/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const DEPLOYMENT_STATS_ROUTE = '**/internal/serverless_vectordb/deployment_stats';

export interface MockDeploymentStats {
  indicesCount: number | null;
  storeSizeBytes: number | null;
  vectorDocsCount: number | null;
  dashboardsCount: number | null;
}

export const EMPTY_DEPLOYMENT_STATS: MockDeploymentStats = {
  indicesCount: 0,
  storeSizeBytes: 0,
  vectorDocsCount: 0,
  dashboardsCount: 0,
};

export const POPULATED_DEPLOYMENT_STATS: MockDeploymentStats = {
  indicesCount: 3,
  storeSizeBytes: 123456789,
  vectorDocsCount: 42000,
  dashboardsCount: 2,
};

/**
 * Mocks `GET /internal/serverless_vectordb/deployment_stats` so home page tests can
 * deterministically exercise both banner states: `hasData` is derived from
 * `vectorDocsCount`/`indicesCount` in `HomePage` (`public/home/home_page.tsx`).
 */
export async function mockDeploymentStats(page: ScoutPage, stats: MockDeploymentStats) {
  await page.route(DEPLOYMENT_STATS_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stats),
    });
  });
}

export async function unmockDeploymentStats(page: ScoutPage) {
  await page.unroute(DEPLOYMENT_STATS_ROUTE);
}
