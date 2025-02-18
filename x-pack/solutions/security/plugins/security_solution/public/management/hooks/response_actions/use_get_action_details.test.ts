/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useGetActionDetails } from './use_get_action_details';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { ACTION_DETAILS_ROUTE } from '../../../../common/endpoint/constants';
import { useQuery as _useQuery } from '@tanstack/react-query';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useGetActionDetails hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetActionDetails>,
    ReturnType<typeof useGetActionDetails>
  >;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderReactQueryHook = testContext.renderReactQueryHook as typeof renderReactQueryHook;
    http = testContext.coreStart.http;

    apiMocks = responseActionsHttpMocks(http);
  });

  it('should call the proper API', async () => {
    await renderReactQueryHook(() => useGetActionDetails('123'));

    expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledWith({
      version: '2023-10-31',
      path: resolvePathVariables(ACTION_DETAILS_ROUTE, { action_id: '123' }),
    });
  });

  it('should call api with `undefined` for action id if it was not defined on input', async () => {
    await renderReactQueryHook(() => useGetActionDetails(''));

    expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledWith({
      version: '2023-10-31',
      path: resolvePathVariables(ACTION_DETAILS_ROUTE, { action_id: 'undefined' }),
    });
  });

  it('should allow custom options to be used', async () => {
    await renderReactQueryHook(
      () => useGetActionDetails('123', { queryKey: ['1', '2'], enabled: false }),
      false
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['1', '2'],
        enabled: false,
      })
    );
  });
});
