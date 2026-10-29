/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import type { CreateExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { coreMock } from '@kbn/core/public/mocks';
import { ReactQueryClientProvider } from '../../common/containers/query_client/query_client_provider';

// Effective budget is min(Jest test timeout, renderQuery's waitFor timeout); keep Jest well
// above the waitFor timeout so a mocked render starved under CI parallel load has headroom.
jest.setTimeout(30000);

export const getFakeListId: () => string = () => 'FAKE_LIST_ID';
export const getFakeListDefinition: () => CreateExceptionListSchema = () => ({
  name: 'FAKE_LIST_NAME',
  namespace_type: 'agnostic',
  description: 'FAKE_LIST_DESCRIPTION',
  list_id: getFakeListId(),
  type: 'endpoint',
});

export const getFakeHttpService = () => {
  const fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
  const fakeHttpServices = fakeCoreStart.http as jest.Mocked<HttpSetup>;
  fakeHttpServices.post.mockClear();
  fakeHttpServices.get.mockClear();
  fakeHttpServices.put.mockClear();
  fakeHttpServices.delete.mockClear();

  return fakeHttpServices;
};

export const renderQuery = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hook: () => any,
  waitForHook: 'isSuccess' | 'isLoading' | 'isError' = 'isSuccess'
) => {
  const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
    <ReactQueryClientProvider>{children}</ReactQueryClientProvider>
  );
  const { result: resultHook } = renderHook(() => hook(), {
    wrapper,
  });
  await waitFor(() => expect(resultHook.current[waitForHook]).toBeTruthy(), { timeout: 10000 });
  return resultHook.current;
};

export const renderMutation = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hook: () => any
) => {
  const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
    <ReactQueryClientProvider>{children}</ReactQueryClientProvider>
  );
  const { result: resultHook } = renderHook(() => hook(), {
    wrapper,
  });
  return resultHook.current;
};

export const renderWrappedHook = renderMutation;
