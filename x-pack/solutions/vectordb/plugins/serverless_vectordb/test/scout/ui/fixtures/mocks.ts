/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { DEPLOYMENT_STATS_API_PATH } from './constants';

interface NewIndexDetails {
  indexName: string;
  createdAt: number;
  documentsCount: number;
  sizeInBytes: number;
}

interface DeploymentStats {
  indicesCount: number | null;
  documentsCount: number | null;
  vectorCount: number | null;
  storeSizeBytes: number | null;
  dashboardsCount: number | null;
  apiKeysCount: number | null;
  expiringApiKeysCount: number | null;
  newIndex: NewIndexDetails | null;
}

/**
 * Stats for a project nobody has ingested into yet, which is what puts the home page in its
 * "get started" state.
 */
const EMPTY_DEPLOYMENT_STATS: DeploymentStats = {
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
 * Pins the home page stats to a known payload. The real counts depend on whatever else the
 * project contains, so the tiles and the banner's empty/populated states can only be asserted
 * against a fixed response.
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
