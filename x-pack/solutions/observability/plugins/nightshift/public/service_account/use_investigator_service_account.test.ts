/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNightshiftSetUp } from './use_investigator_service_account';

const status = (overrides: Record<string, unknown> = {}) => ({
  serviceAccountsEnabled: true,
  canModifyBoundWorkflows: true,
  serviceAccountId: 'kibana/nightshift_agent',
  role: 'nightshift_agent',
  bound: true,
  serviceAccounts: [
    {
      kind: 'agent' as const,
      name: 'nightshift_agent',
      id: 'kibana/nightshift_agent',
      role: 'nightshift_agent',
    },
    {
      kind: 'automations' as const,
      name: 'nightshift_automations',
      id: 'kibana/nightshift_automations',
      role: 'nightshift_automations',
    },
  ],
  boundWorkflows: [],
  workflowId: 'system-nightshift-investigation-bound-default',
  installed: true,
  enabled: true,
  ...overrides,
});

describe('isNightshiftSetUp', () => {
  it('is set up once the bound investigation is installed and enabled', () => {
    expect(isNightshiftSetUp(status())).toBe(true);
  });

  it.each([
    ['service accounts are turned off', status({ serviceAccountsEnabled: false })],
    ['the bound investigation is missing', status({ installed: false })],
    ['the bound investigation is disabled', status({ enabled: false })],
    ['the entry point is bound to another account', status({ bound: false })],
    ['there is no status yet', undefined],
  ])('is not set up when %s', (_, serviceAccountStatus) => {
    expect(isNightshiftSetUp(serviceAccountStatus)).toBe(false);
  });
});
