/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation as _useMutation } from '@kbn/react-query';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import type { RenderHookResult } from '@testing-library/react';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import { RUN_SCRIPT_ROUTE } from '../../../../common/endpoint/constants';
import type { RunScriptActionRequestBody } from '../../../../common/api/endpoint';
import type {
  RunScriptRequestCustomOptions,
  UseSendRunScriptRequestResult,
} from './use_send_run_script_endpoint_request';
import { useSendRunScriptEndpoint } from './use_send_run_script_endpoint_request';

const useMutationMock = _useMutation as jest.Mock;

jest.mock('@kbn/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@kbn/react-query');

  return {
    ...actualReactQueryModule,
    useMutation: jest.fn((...args) => actualReactQueryModule.useMutation(...args)),
  };
});

const runScriptPayload: RunScriptActionRequestBody = {
  endpoint_ids: ['test-endpoint-id'],
  agent_type: 'crowdstrike',
  parameters: { raw: 'ls' },
};

describe('When using the `useSendRunScriptRequest()` hook', () => {
  let customOptions: RunScriptRequestCustomOptions;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let renderHook: () => RenderHookResult<
    UseSendRunScriptRequestResult,
    RunScriptRequestCustomOptions
  >;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    http = testContext.coreStart.http;
    apiMocks = responseActionsHttpMocks(http);
    customOptions = {};

    renderHook = () => {
      return testContext.renderHook(() => useSendRunScriptEndpoint(customOptions));
    };
  });

  it('should call the `runScript` API with correct payload', async () => {
    const {
      result: {
        current: { mutateAsync },
      },
    } = renderHook();
    await mutateAsync(runScriptPayload);

    expect(apiMocks.responseProvider.runscript).toHaveBeenCalledWith({
      body: JSON.stringify(runScriptPayload),
      path: RUN_SCRIPT_ROUTE,
      version: '2023-10-31',
    });
  });

  it('should allow custom options to be passed to ReactQuery', async () => {
    customOptions.mutationKey = ['pqr-abc'];
    customOptions.cacheTime = 10;
    renderHook();

    expect(useMutationMock).toHaveBeenCalledWith(expect.any(Function), customOptions);
  });
});
