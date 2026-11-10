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

const detection = {
  serviceAccountsEnabled: true,
  canSetUp: true,
  role: 'nightshift_detection',
  serviceAccountId: 'kibana/nightshift_detection',
};

describe('isNightshiftSetUp', () => {
  it('is set up once the bound investigation is installed and enabled and detection is bound', () => {
    expect(isNightshiftSetUp({ investigator: status(), detection })).toBe(true);
  });

  it.each([
    ['service accounts are turned off', { serviceAccountsEnabled: false }],
    ['the bound investigation is missing', { installed: false, enabled: null }],
    ['the bound investigation is disabled', { enabled: false }],
    ['the entry point is bound to another account', { bound: false }],
  ])('is not set up when %s', (_, overrides) => {
    expect(isNightshiftSetUp({ investigator: status(overrides), detection })).toBe(false);
  });

  // A space set up before the detection account existed has a bound investigator only, and its
  // detection engine refuses every run until the prompt sets the account up.
  it('is not set up when the detection engine has no account', () => {
    expect(
      isNightshiftSetUp({
        investigator: status(),
        detection: { ...detection, serviceAccountId: null },
      })
    ).toBe(false);
  });

  it('is not set up without a status', () => {
    expect(isNightshiftSetUp({ investigator: undefined, detection: undefined })).toBe(false);
  });
});
