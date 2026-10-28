/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import {
  useDecisionTree,
  useDecisionTreeVersion,
  useDecisionTreeVersions,
} from './use_decision_trees';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const httpGetMock = jest.fn();
const symptom = 'checkout/high?latency#1';
const encodedSymptom = 'checkout%2Fhigh%3Flatency%231';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  httpGetMock.mockResolvedValue({});
  mockUseKibana.mockReturnValue({
    services: { http: { get: httpGetMock } },
  } as unknown as ReturnType<typeof useKibana>);
});

it('encodes the symptom in the tree detail path', async () => {
  renderHook(() => useDecisionTree(symptom), { wrapper: createWrapper() });

  await waitFor(() => expect(httpGetMock).toHaveBeenCalled());
  expect(httpGetMock.mock.calls[0][0]).toBe(
    `/internal/nightshift/decision_trees/${encodedSymptom}`
  );
});

it('encodes the symptom in the versions list path', async () => {
  renderHook(() => useDecisionTreeVersions(symptom), { wrapper: createWrapper() });

  await waitFor(() => expect(httpGetMock).toHaveBeenCalled());
  expect(httpGetMock.mock.calls[0][0]).toBe(
    `/internal/nightshift/decision_trees/${encodedSymptom}/versions`
  );
});

it('encodes the symptom in an individual version path', async () => {
  renderHook(() => useDecisionTreeVersion(symptom, 7), { wrapper: createWrapper() });

  await waitFor(() => expect(httpGetMock).toHaveBeenCalled());
  expect(httpGetMock.mock.calls[0][0]).toBe(
    `/internal/nightshift/decision_trees/${encodedSymptom}/versions/7`
  );
});
