/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetEndpointScriptsList } from './use_get_scripts_list';
import { useQuery as _useQuery } from '@kbn/react-query';
import { scriptsLibraryHttpMocks } from '../../mocks/scripts_library_http_mocks';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
  type ReactQueryHookRenderer,
} from '../../../common/mock/endpoint';
import { SCRIPTS_LIBRARY_ROUTE } from '../../../../common/endpoint/constants';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@kbn/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@kbn/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useGetEndpointScriptsList hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetEndpointScriptsList>,
    ReturnType<typeof useGetEndpointScriptsList>
  >;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof scriptsLibraryHttpMocks>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderReactQueryHook = testContext.renderReactQueryHook as typeof renderReactQueryHook;
    http = testContext.coreStart.http;

    apiMocks = scriptsLibraryHttpMocks(http);
  });

  it('should call the proper API', async () => {
    await renderReactQueryHook(() => useGetEndpointScriptsList({}));

    expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith({
      path: SCRIPTS_LIBRARY_ROUTE,
      version: '2023-10-31',
      query: {
        page: 1,
        pageSize: 10,
      },
    });
  });

  it('should use correct query values', async () => {
    await renderReactQueryHook(() =>
      useGetEndpointScriptsList({
        page: 2,
        pageSize: 20,
        sortField: 'updatedBy',
        sortDirection: 'desc',
        kuery: 'name: test*',
      })
    );
    expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith({
      path: SCRIPTS_LIBRARY_ROUTE,
      version: '2023-10-31',
      query: {
        page: 2,
        pageSize: 20,
        sortField: 'updatedBy',
        sortDirection: 'desc',
        kuery: 'name: test*',
      },
    });
  });

  it('should allow custom options to be used', async () => {
    await renderReactQueryHook(
      () =>
        useGetEndpointScriptsList(
          {},
          {
            queryKey: ['11', '21'],
            enabled: false,
          }
        ),
      false
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['11', '21'],
        enabled: false,
      })
    );
  });
});
