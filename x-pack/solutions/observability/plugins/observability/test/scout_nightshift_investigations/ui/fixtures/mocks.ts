/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import type { InvestigatorServiceAccountStatus } from '@kbn/nightshift-investigations-plugin/common';

/** A space set up with the Nightshift agent service account, which the app requires to render. */
const SET_UP_SERVICE_ACCOUNT_STATUS: InvestigatorServiceAccountStatus = {
  serviceAccountsEnabled: true,
  canModifyBoundWorkflows: true,
  serviceAccountId: 'kibana/nightshift_agent',
  role: 'nightshift_agent',
  workflowId: 'nightshift-investigation',
  installed: true,
  enabled: true,
  bound: true,
  // Every account the route reports; the Settings page reads the agent's first.
  serviceAccounts: [
    {
      kind: 'agent',
      name: 'nightshift_agent',
      id: 'kibana/nightshift_agent',
      role: 'nightshift_agent',
    },
    {
      kind: 'automations',
      name: 'nightshift_automations',
      id: 'kibana/nightshift_automations',
      role: 'nightshift_automations',
    },
  ],
  boundWorkflows: [],
};

export const mockInvestigationApi = async (
  page: ScoutPage,
  {
    includeCompletedInvestigation = false,
    includeRunningInvestigation = false,
  }: { includeCompletedInvestigation?: boolean; includeRunningInvestigation?: boolean } = {}
) => {
  const includeInvestigation = includeCompletedInvestigation || includeRunningInvestigation;
  await page.route('**/internal/significant_events/availability', async (route) => {
    await route.fulfill({ status: 200, json: { available: true } });
  });
  await page.route('**/internal/nightshift/investigations/availability', async (route) => {
    await route.fulfill({ status: 200, json: { available: true } });
  });
  await page.route('**/internal/nightshift/investigations/service_account', async (route) => {
    await route.fulfill({ status: 200, json: SET_UP_SERVICE_ACCOUNT_STATUS });
  });
  // The shared investigations list (agenticInvestigations) that the alert actions read by subject.
  await page.route('**/internal/investigations/investigations?*', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        results: includeInvestigation
          ? [
              {
                id: 'investigation-1',
                title: 'Completed alert investigation',
                title_pending: false,
                created_at: '2026-09-15T12:00:00.000Z',
                updated_at: '2026-09-15T12:05:00.000Z',
                agent_id: 'nightshift.investigation',
                metadata: { status: 'open', summary: 'Completed alert investigation' },
                in_progress: includeRunningInvestigation,
                subjects: [
                  { type: 'alert', id: 'alert-1', created_at: '2026-09-15T12:00:00.000Z' },
                ],
              },
            ]
          : [],
        pagination: { total: includeInvestigation ? 1 : 0, page: 1, per_page: 10 },
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
