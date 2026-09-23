/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

export const mockInvestigationApi = async (page: ScoutPage) => {
  await page.route('**/internal/nightshift/investigations/availability', async (route) => {
    await route.fulfill({ status: 200, json: { available: true } });
  });
  await page.route('**/internal/nightshift/investigations?*', async (route) => {
    await route.fulfill({ status: 200, json: { results: [], page: 1, size: 1, total: 0 } });
  });
  await page.route('**/internal/nightshift/investigations', async (route) => {
    await route.fulfill({ status: 200, json: { investigation_id: 'investigation-1' } });
  });
};
