/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

export const mockInvestigationApi = async (
  page: ScoutPage,
  { includeCompletedInvestigation = false }: { includeCompletedInvestigation?: boolean } = {}
) => {
  await page.route('**/internal/significant_events/availability', async (route) => {
    await route.fulfill({ status: 200, json: { available: true } });
  });
  await page.route('**/internal/nightshift/investigations/availability', async (route) => {
    await route.fulfill({ status: 200, json: { available: true } });
  });
  // The shared investigations list (agenticInvestigations) that the alert actions read by subject.
  await page.route('**/internal/investigations/investigations?*', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        results: includeCompletedInvestigation
          ? [
              {
                id: 'investigation-1',
                title: 'Completed alert investigation',
                created_at: '2026-09-15T12:00:00.000Z',
                updated_at: '2026-09-15T12:05:00.000Z',
                agent_id: 'nightshift.investigation',
                metadata: { status: 'open', summary: 'Completed alert investigation' },
                in_progress: false,
                subjects: [
                  { type: 'alert', id: 'alert-1', created_at: '2026-09-15T12:00:00.000Z' },
                ],
              },
            ]
          : [],
        pagination: { total: includeCompletedInvestigation ? 1 : 0, page: 1, per_page: 10 },
      },
    });
  });
  await page.route(
    (url) =>
      url.pathname.endsWith('/internal/nightshift/investigations') && url.searchParams.size === 0,
    async (route) => {
      await route.fulfill({ status: 200, json: { investigation_id: 'investigation-1' } });
    }
  );
};
