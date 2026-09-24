/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useFetchLegacyMitreQuery } from './use_fetch_bundled_mitre_query';

// Minimal stubs that satisfy MitreTactic / MitreTechnique / MitreSubTechnique shapes.
// The dynamic import is resolved synchronously by Jest so no async delay occurs.
jest.mock('../../../../common/detection_engine/mitre/mitre_tactics_techniques', () => ({
  tactics: [
    {
      id: 'TA0001',
      name: 'Initial Access',
      reference: 'https://attack.mitre.org/tactics/TA0001/',
      value: 'initialAccess',
      label: 'Initial Access',
    },
  ],
  techniques: [
    {
      id: 'T1190',
      name: 'Exploit Public-Facing Application',
      reference: 'https://attack.mitre.org/techniques/T1190/',
      value: 'exploitPublicFacingApplication',
      label: 'Exploit Public-Facing Application',
      tactics: ['initial-access'],
    },
  ],
  subtechniques: [
    {
      id: 'T1078.001',
      name: 'Default Accounts',
      reference: 'https://attack.mitre.org/techniques/T1078/001/',
      value: 'defaultAccounts',
      label: 'Default Accounts',
      tactics: ['initial-access'],
      techniqueId: 'T1078',
    },
  ],
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'TestQueryClientWrapper';
  return Wrapper;
};

describe('useFetchLegacyMitreQuery', () => {
  it('returns all three populated buckets when types is undefined', async () => {
    const { result } = renderHook(() => useFetchLegacyMitreQuery(undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.tactics).toHaveLength(1);
    expect(result.current.data?.techniques).toHaveLength(1);
    expect(result.current.data?.subtechniques).toHaveLength(1);
  });

  it('returns all three populated buckets when types is an empty array', async () => {
    const { result } = renderHook(() => useFetchLegacyMitreQuery([]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // [] means "all types" — identical to undefined. The empty array must not be treated
    // as a filter that yields zero results, which would be the opposite of the managed path.
    expect(result.current.data?.tactics).toHaveLength(1);
    expect(result.current.data?.techniques).toHaveLength(1);
    expect(result.current.data?.subtechniques).toHaveLength(1);
  });

  it('filters to only tactics when types is ["tactic"]', async () => {
    const { result } = renderHook(() => useFetchLegacyMitreQuery(['tactic']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.tactics).toHaveLength(1);
    expect(result.current.data?.techniques).toHaveLength(0);
    expect(result.current.data?.subtechniques).toHaveLength(0);
  });

  it('filters to only techniques and subtechniques when types is ["technique", "subtechnique"]', async () => {
    const { result } = renderHook(() => useFetchLegacyMitreQuery(['technique', 'subtechnique']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.tactics).toHaveLength(0);
    expect(result.current.data?.techniques).toHaveLength(1);
    expect(result.current.data?.subtechniques).toHaveLength(1);
  });
});
