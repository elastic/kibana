/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-search';

const DEPLOYMENT_STATS_API_PATH = '/internal/elasticsearch_home/deployment_stats';

interface DeploymentStats {
  dataPanelAccess: { showPanel: boolean; showDocuments: boolean; showTotalSize: boolean };
  indicesCount: number | null;
  documentsCount: number | null;
  vectorCount: number | null;
  storeSizeBytes: number | null;
  dashboardsCount: number | null;
  apiKeysCount: number | null;
  expiringApiKeysCount: number | null;
  newIndex: null;
}

const EMPTY_DEPLOYMENT_STATS: DeploymentStats = {
  dataPanelAccess: { showPanel: true, showDocuments: true, showTotalSize: true },
  indicesCount: 0,
  documentsCount: 0,
  vectorCount: 0,
  storeSizeBytes: 0,
  dashboardsCount: 0,
  apiKeysCount: 0,
  expiringApiKeysCount: 0,
  newIndex: null,
};

/**
 * Pins the home page stats to a known payload. Parallel suites create indices in the same
 * deployment, so the banner's empty/populated states can only be asserted against a fixed response.
 */
export const mockDeploymentStats = async (
  page: ScoutPage,
  stats: Partial<DeploymentStats> = {}
) => {
  await page.route(`**${DEPLOYMENT_STATS_API_PATH}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...EMPTY_DEPLOYMENT_STATS, ...stats }),
    })
  );
};
