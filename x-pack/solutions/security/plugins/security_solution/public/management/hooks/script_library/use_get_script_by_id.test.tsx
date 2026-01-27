/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetEndpointScript } from './use_get_script_by_id';
import { useQuery as _useQuery } from '@kbn/react-query';
import { scriptsLibraryHttpMocks } from '../../mocks/scripts_library_http_mocks';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
  type ReactQueryHookRenderer,
} from '../../../common/mock/endpoint';
import { SCRIPTS_LIBRARY_ROUTE_ITEM } from '../../../../common/endpoint/constants';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@kbn/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@kbn/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useGetEndpointScript hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetEndpointScript>,
    ReturnType<typeof useGetEndpointScript>
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
    await renderReactQueryHook(() => useGetEndpointScript('script-id-123'));

    expect(apiMocks.responseProvider.getScriptById).toHaveBeenCalledWith({
      path: resolvePathVariables(SCRIPTS_LIBRARY_ROUTE_ITEM, { script_id: 'script-id-123' }),
      version: '2023-10-31',
    });
  });

  it('should allow custom options to be used', async () => {
    await renderReactQueryHook(
      () =>
        useGetEndpointScript('script-id-123', {
          queryKey: ['11', '21'],
          enabled: false,
        }),
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
