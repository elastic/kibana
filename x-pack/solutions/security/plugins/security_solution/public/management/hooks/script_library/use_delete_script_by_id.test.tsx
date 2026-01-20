/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDeleteEndpointScript } from './use_delete_script_by_id';
import { scriptsLibraryHttpMocks } from '../../mocks/scripts_library_http_mocks';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../common/mock/endpoint';
import { useHttp } from '../../../common/lib/kibana';
import { SCRIPTS_LIBRARY_ROUTE_ITEM } from '../../../../common/endpoint/constants';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { renderMutation } from '../test_utils';
import { act } from '@testing-library/react';

jest.mock('../../../common/lib/kibana');

describe('useDeleteEndpointScript hook', () => {
  let response: ReturnType<typeof useDeleteEndpointScript>;
  const useHttpMock = useHttp as jest.Mock;
  let http: AppContextTestRender['coreStart']['http'];

  let apiMocks: ReturnType<typeof scriptsLibraryHttpMocks>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();
    http = testContext.coreStart.http;
    useHttpMock.mockReturnValue(http);

    apiMocks = scriptsLibraryHttpMocks(http);
  });

  it('should delete a script by id', async () => {
    response = await renderMutation(() => useDeleteEndpointScript());

    await act(async () => {
      await response.mutateAsync({ script_id: 'script-id-123' });
    });

    expect(apiMocks.responseProvider.deleteScriptById).toHaveBeenCalledWith({
      path: resolvePathVariables(SCRIPTS_LIBRARY_ROUTE_ITEM, { script_id: 'script-id-123' }),
      version: '2023-10-31',
    });
  });

  it('should call onSuccess when successful', async () => {
    const onSuccess = jest.fn();

    response = await renderMutation(() =>
      useDeleteEndpointScript({
        onSuccess,
      })
    );
    await act(async () => {
      await response.mutateAsync({ script_id: 'script-id-123' });
    });

    expect(apiMocks.responseProvider.deleteScriptById).toHaveBeenCalledWith({
      path: resolvePathVariables(SCRIPTS_LIBRARY_ROUTE_ITEM, { script_id: 'script-id-123' }),
      version: '2023-10-31',
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should call onError when deletion fails due to error', async () => {
    // @ts-expect-error Testing purposes
    apiMocks.responseProvider.deleteScriptById.mockRejectedValueOnce({
      response: {
        message: 'Error deleting script',
        statusCode: 503,
      },
    });
    const onError = jest.fn();

    response = await renderMutation(() =>
      useDeleteEndpointScript({
        onError,
      })
    );
    await act(async () => {
      await response.mutateAsync({ script_id: 'script-id-123' }).catch(() => {});
    });

    expect(apiMocks.responseProvider.deleteScriptById).toHaveBeenCalledWith({
      path: resolvePathVariables(SCRIPTS_LIBRARY_ROUTE_ITEM, { script_id: 'script-id-123' }),
      version: '2023-10-31',
    });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        response: expect.objectContaining({
          message: 'Error deleting script',
          statusCode: 503,
        }),
      }),
      { script_id: 'script-id-123' },
      undefined
    );
  });
});
