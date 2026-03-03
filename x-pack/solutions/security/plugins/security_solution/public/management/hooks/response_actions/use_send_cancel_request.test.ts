/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation as _useMutation } from '@kbn/react-query';
import type { RenderHookResult } from '@testing-library/react';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import { CANCEL_ROUTE } from '../../../../common/endpoint/constants';
import type { CancelActionRequestBody } from '../../../../common/api/endpoint';
import type {
  CancelRequestCustomOptions,
  UseSendCancelRequestResult,
} from './use_send_cancel_request';
import { useSendCancelRequest } from './use_send_cancel_request';

const useMutationMock = _useMutation as jest.Mock;

jest.mock('@kbn/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@kbn/react-query');

  return {
    ...actualReactQueryModule,
    useMutation: jest.fn((...args) => actualReactQueryModule.useMutation(...args)),
  };
});

const cancelPayload: CancelActionRequestBody = {
  endpoint_ids: ['test-endpoint-id'],
  agent_type: 'endpoint',
  parameters: {
    id: 'test-action-id',
  },
};

describe('When using the `useSendCancelRequest()` hook', () => {
  let customOptions: CancelRequestCustomOptions;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let renderHook: () => RenderHookResult<UseSendCancelRequestResult, CancelRequestCustomOptions>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    http = testContext.coreStart.http;
    apiMocks = responseActionsHttpMocks(http);
    customOptions = {};

    renderHook = () => {
      return testContext.renderHook(() => useSendCancelRequest(customOptions));
    };
  });

  it('should call the `cancel` API with correct payload', async () => {
    const {
      result: {
        current: { mutateAsync },
      },
    } = renderHook();
    await mutateAsync(cancelPayload);

    expect(apiMocks.responseProvider.cancel).toHaveBeenCalledWith({
      body: JSON.stringify(cancelPayload),
      path: CANCEL_ROUTE,
      version: '2023-10-31',
    });
  });

  it('should allow custom options to be passed to ReactQuery', async () => {
    customOptions.mutationKey = ['cancel-action-key'];
    customOptions.cacheTime = 10;
    renderHook();

    expect(useMutationMock).toHaveBeenCalledWith(expect.any(Function), customOptions);
  });

  it('should handle successful cancel request', async () => {
    const {
      result: {
        current: { mutateAsync },
      },
    } = renderHook();

    const result = await mutateAsync(cancelPayload);

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(apiMocks.responseProvider.cancel).toHaveBeenCalledTimes(1);
  });

  it('should handle cancel request with optional fields', async () => {
    const payloadWithOptionalFields: CancelActionRequestBody = {
      ...cancelPayload,
      alert_ids: ['alert-1', 'alert-2'],
      case_ids: ['case-1'],
      comment: 'Cancelling this action',
    };

    const {
      result: {
        current: { mutateAsync },
      },
    } = renderHook();
    await mutateAsync(payloadWithOptionalFields);

    expect(apiMocks.responseProvider.cancel).toHaveBeenCalledWith({
      body: JSON.stringify(payloadWithOptionalFields),
      path: CANCEL_ROUTE,
      version: '2023-10-31',
    });
  });

  it('should handle different agent types', async () => {
    const sentinelOnePayload: CancelActionRequestBody = {
      ...cancelPayload,
      agent_type: 'sentinel_one',
    };

    const {
      result: {
        current: { mutateAsync },
      },
    } = renderHook();
    await mutateAsync(sentinelOnePayload);

    expect(apiMocks.responseProvider.cancel).toHaveBeenCalledWith({
      body: JSON.stringify(sentinelOnePayload),
      path: CANCEL_ROUTE,
      version: '2023-10-31',
    });
  });

  it('should handle multiple endpoint IDs', async () => {
    const multiEndpointPayload: CancelActionRequestBody = {
      ...cancelPayload,
      endpoint_ids: ['endpoint-1', 'endpoint-2', 'endpoint-3'],
    };

    const {
      result: {
        current: { mutateAsync },
      },
    } = renderHook();
    await mutateAsync(multiEndpointPayload);

    expect(apiMocks.responseProvider.cancel).toHaveBeenCalledWith({
      body: JSON.stringify(multiEndpointPayload),
      path: CANCEL_ROUTE,
      version: '2023-10-31',
    });
  });

  it('should pass custom mutation options correctly', () => {
    const customMutationOptions: CancelRequestCustomOptions = {
      mutationKey: ['custom-cancel-key'],
      retry: 3,
      retryDelay: 1000,
      onSuccess: jest.fn(),
      onError: jest.fn(),
      onSettled: jest.fn(),
    };

    const testContext = createAppRootMockRenderer();
    testContext.renderHook(() => useSendCancelRequest(customMutationOptions));

    expect(useMutationMock).toHaveBeenCalledWith(expect.any(Function), customMutationOptions);
  });

  it('should use correct API version', async () => {
    const {
      result: {
        current: { mutateAsync },
      },
    } = renderHook();
    await mutateAsync(cancelPayload);

    expect(apiMocks.responseProvider.cancel).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '2023-10-31',
      })
    );
  });

  it('should serialize request body as JSON string', async () => {
    const {
      result: {
        current: { mutateAsync },
      },
    } = renderHook();
    await mutateAsync(cancelPayload);

    expect(apiMocks.responseProvider.cancel).toHaveBeenCalledWith(
      expect.objectContaining({
        body: JSON.stringify(cancelPayload),
      })
    );
  });
});
