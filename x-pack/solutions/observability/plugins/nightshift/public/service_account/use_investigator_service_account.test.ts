/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNightshiftSetUp } from './use_investigator_service_account';

const status = (overrides: Record<string, unknown> = {}) => ({
  serviceAccountsEnabled: true,
  serviceAccountId: 'kibana/nightshift-agent-default',
  role: 'nightshift_agent_default',
  bound: true,
  serviceAccounts: [
    {
      kind: 'agent' as const,
      id: 'kibana/nightshift-agent-default',
      role: 'nightshift_agent_default',
    },
    { kind: 'relay' as const, id: 'kibana/relay-default', role: 'nightshift_agent_default' },
  ],
  boundWorkflows: [],
  workflowId: 'system-nightshift-investigation-bound-default',
  installed: true,
  enabled: true,
  slackThreadInstalled: true,
  ...overrides,
});

describe('isNightshiftSetUp', () => {
  it('is set up once the bound investigation is installed and enabled', () => {
    expect(isNightshiftSetUp(status())).toBe(true);
  });

  it.each([
    ['service accounts are turned off', { serviceAccountsEnabled: false }],
    ['the bound investigation is missing', { installed: false, enabled: null }],
    ['the bound investigation is disabled', { enabled: false }],
    ['the entry point is bound to another account', { bound: false }],
  ])('is not set up when %s', (_, overrides) => {
    expect(isNightshiftSetUp(status(overrides))).toBe(false);
  });

  it('is not set up without a status', () => {
    expect(isNightshiftSetUp(undefined)).toBe(false);
  });
});
