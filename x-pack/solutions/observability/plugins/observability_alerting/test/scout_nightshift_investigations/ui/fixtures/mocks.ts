/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

/** A shared investigations list response (`GET /internal/investigations/investigations`). */
export const investigationsList = (inProgress?: boolean, subjectId = 'alert-1') => ({
  results:
    inProgress === undefined
      ? []
      : [
          {
            id: 'investigation-1',
            title: 'Investigation',
            title_pending: false,
            created_at: '2026-09-15T12:00:00.000Z',
            updated_at: '2026-09-15T12:05:00.000Z',
            agent_id: 'nightshift.investigation',
            metadata: { status: 'open' },
            in_progress: inProgress,
            subjects: [{ type: 'alert', id: subjectId, created_at: '2026-09-15T12:00:00.000Z' }],
          },
        ],
  pagination: { total: inProgress === undefined ? 0 : 1, page: 1, per_page: 10 },
});

export const isInvestigationsList = (url: URL) =>
  url.pathname.endsWith('/internal/investigations/investigations') && url.searchParams.size > 0;

export const mockNightshiftApis = async (
  page: ScoutPage,
  subjectId: string,
  { available = true, inProgress }: { available?: boolean; inProgress?: boolean } = {}
) => {
  await page.route(
    (url: URL) => url.pathname.endsWith('/internal/nightshift/investigations/availability'),
    async (route) => {
      await route.fulfill({ status: 200, json: { available } });
    }
  );
  await page.route(isInvestigationsList, async (route) => {
    await route.fulfill({ status: 200, json: investigationsList(inProgress, subjectId) });
  });
  await page.route(
    (url: URL) =>
      url.pathname.endsWith('/internal/nightshift/investigations') && url.searchParams.size === 0,
    async (route) => {
      await route.fulfill({ status: 200, json: { investigation_id: 'investigation-1' } });
    }
  );
};

export const holdInvestigationStart = async (page: ScoutPage): Promise<() => void> => {
  let releaseStart = () => {};
  const held = new Promise<void>((resolve) => {
    releaseStart = resolve;
  });
  await page.route(
    (url) =>
      url.pathname.endsWith('/internal/nightshift/investigations') && url.searchParams.size === 0,
    async (route) => {
      await held;
      await route.fulfill({ status: 200, json: { investigation_id: 'investigation-1' } });
    }
  );
  return releaseStart;
};
