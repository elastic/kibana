/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../hooks/use_kibana';
import { useSetUpNightshiftServiceAccount } from './use_investigator_service_account';

jest.mock('../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const investigationsFetch = jest.fn();
const httpGet = jest.fn();
const create = jest.fn();
const addError = jest.fn();

const notFound = Object.assign(new Error('Not Found'), {
  name: 'HttpFetchError',
  request: {},
  response: { status: 404 },
});

const renderSetUp = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSetUpNightshiftServiceAccount(), { wrapper });
};

describe('useSetUpNightshiftServiceAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    investigationsFetch.mockResolvedValue({ bound: true });
    mockUseKibana.mockReturnValue({
      services: {
        isServerless: true,
        http: { get: httpGet },
        security: { serviceAccounts: { create } },
        notifications: { toasts: { addError } },
        nightshiftInvestigations: { investigationsClient: { fetch: investigationsFetch } },
      },
    });
  });

  it('finds or creates the accounts, then sets the space up with the ids the backend assigned', async () => {
    httpGet.mockImplementation(async (url: string) =>
      url === '/internal/security/service_account'
        ? {
            serviceAccounts: [
              { id: 'uiam-agent-1', name: 'nightshift_agent', enabled: true, assumable: true },
            ],
          }
        : { name: '_nightshift_automations' }
    );
    create.mockResolvedValue({ id: 'uiam-automations-2' });
    const { result } = renderSetUp();

    act(() => result.current.mutate());

    await waitFor(() => expect(investigationsFetch).toHaveBeenCalled());
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'nightshift_automations',
        roles: ['_nightshift_automations'],
      })
    );
    expect(investigationsFetch).toHaveBeenCalledWith(
      'POST /internal/nightshift/investigations/service_account/_enable',
      {
        signal: null,
        params: {
          body: {
            serviceAccountIds: { agent: 'uiam-agent-1', automations: 'uiam-automations-2' },
          },
        },
      }
    );
  });

  it('explains a missing predefined role and does not set the space up', async () => {
    httpGet.mockImplementation(async (url: string) => {
      if (url === '/internal/security/service_account') return { serviceAccounts: [] };
      throw notFound;
    });
    const { result } = renderSetUp();

    act(() => result.current.mutate());

    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(addError.mock.calls[0][0].message).toContain('_nightshift_agent');
    expect(create).not.toHaveBeenCalled();
    expect(investigationsFetch).not.toHaveBeenCalled();
  });
});
