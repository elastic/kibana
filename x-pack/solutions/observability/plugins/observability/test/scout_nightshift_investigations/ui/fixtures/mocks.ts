/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

export const mockInvestigationApi = async (page: ScoutPage) => {
  await page.route('**/internal/significant_events/availability', async (route) => {
    await route.fulfill({ status: 200, json: { available: true } });
  });
  await page.route('**/internal/nightshift/investigations/availability', async (route) => {
    await route.fulfill({ status: 200, json: { available: true } });
  });
  await page.route('**/internal/nightshift/investigations/_severity_counts?*', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        severity_counts: {
          '80-critical': 0,
          '60-high': 0,
          '40-medium': 0,
          '20-low': 0,
        },
      },
    });
  });
  await page.route('**/internal/nightshift/investigations?*', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        results: [
          {
            investigation_id: 'investigation-1',
            status: 'completed',
            created_at: '2026-09-15T12:00:00.000Z',
            completed_at: '2026-09-15T12:05:00.000Z',
            subject: { type: 'alert', id: 'alert-1' },
            summary: 'Completed alert investigation',
          },
        ],
        page: 1,
        size: 20,
        total: 1,
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
  await page.route(
    (url) =>
      url.pathname.includes('/internal/nightshift/investigations/') &&
      !url.pathname.endsWith('/availability') &&
      !url.pathname.endsWith('/_severity_counts'),
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            investigation_id: 'investigation-1',
            status: 'completed',
            created_at: '2026-09-15T12:00:00.000Z',
            completed_at: '2026-09-15T12:05:00.000Z',
            subject: { type: 'alert', id: 'alert-1', summary: 'Completed alert investigation' },
            summary: 'Completed alert investigation',
          },
        });
        return;
      }
      await route.fallback();
    }
  );
};
