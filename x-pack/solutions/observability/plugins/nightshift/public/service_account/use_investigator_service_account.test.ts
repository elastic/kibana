/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../hooks/use_kibana';
import {
  isNightshiftSetUp,
  useSetUpNightshiftServiceAccount,
} from './use_investigator_service_account';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('@kbn/nightshift-investigations-plugin/common', () => ({
  ...jest.requireActual('@kbn/nightshift-investigations-plugin/common'),
  ensureNightshiftServiceAccounts: jest
    .fn()
    .mockResolvedValue({ agent: 'kibana/nightshift_agent', automations: 'kibana/auto' }),
}));

const mockUseKibana = useKibana as jest.Mock;

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

describe('useSetUpNightshiftServiceAccount', () => {
  it('binds the space to its service accounts and installs the agent in one step', async () => {
    const fetch = jest.fn().mockResolvedValue(status());
    const addSuccess = jest.fn();
    mockUseKibana.mockReturnValue({
      services: {
        notifications: { toasts: { addSuccess, addError: jest.fn() } },
        nightshiftInvestigations: { investigationsClient: { fetch } },
        http: {},
        security: { serviceAccounts: {} },
        isServerless: false,
      },
    });
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useSetUpNightshiftServiceAccount(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    });

    result.current.mutate();

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      'POST /internal/nightshift/investigations/service_account/_enable',
      'POST /internal/nightshift/onboarding/enable',
    ]);
    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({ title: 'Elastic Nightshift enabled' })
    );
  });
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
