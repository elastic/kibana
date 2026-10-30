/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import type { InvestigatorServiceAccountStatus } from '@kbn/nightshift-investigations-plugin/common';

export { test } from '@kbn/scout-oblt';

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

/**
 * Reports the space as set up, so the app renders instead of its "Enable Elastic Nightshift" step.
 * Setting it up for real needs service accounts, which these navigation tests do not exercise.
 */
export const mockNightshiftSetUp = async (page: ScoutPage): Promise<void> => {
  await page.route('**/internal/nightshift/investigations/service_account', async (route) => {
    await route.fulfill({ status: 200, json: SET_UP_SERVICE_ACCOUNT_STATUS });
  });
};
