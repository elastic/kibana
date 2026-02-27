/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation as _useMutation } from '@kbn/react-query';
import type { MemoryDumpActionRequestBody } from '../../../../common/api/endpoint/actions/response_actions/memory_dump';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import type { RenderHookResult } from '@testing-library/react';
import type {
  MemoryDumpRequestOptions,
  UseSendMemoryDumpRequestResult,
} from './use_send_memory_dump_request';
import { useSendMemoryDumpRequest } from './use_send_memory_dump_request';
import { MEMORY_DUMP_ROUTE } from '../../../../common/endpoint/constants';

const useMutationMock = _useMutation as jest.Mock;

jest.mock('@kbn/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@kbn/react-query');

  return {
    ...actualReactQueryModule,
    useMutation: jest.fn((...args) => actualReactQueryModule.useMutation(...args)),
  };
});

describe('useSendMemoryDumpRequest() hook', () => {
  let memoryDumpBody: MemoryDumpActionRequestBody;
  let reactQueryOptions: MemoryDumpRequestOptions;
  let http: AppContextTestRender['coreStart']['http'];
  let renderHook: () => RenderHookResult<UseSendMemoryDumpRequestResult, MemoryDumpRequestOptions>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    memoryDumpBody = {
      endpoint_ids: ['123'],
      agent_type: 'endpoint',
      parameters: {
        type: 'process',
        pid: 5,
      },
    };
    reactQueryOptions = { meta: { something: 'here' } };
    http = testContext.coreStart.http;
    responseActionsHttpMocks(http);

    renderHook = () => {
      return testContext.renderHook(() => useSendMemoryDumpRequest(reactQueryOptions));
    };
  });

  it('should call the correct API with payload', async () => {
    const {
      result: {
        current: { mutateAsync: sendMemoryDump },
      },
    } = renderHook();
    await sendMemoryDump(memoryDumpBody);

    expect(http.post).toHaveBeenCalledWith(MEMORY_DUMP_ROUTE, {
      body: JSON.stringify(memoryDumpBody),
      version: '2023-10-31',
    });
  });

  it('should return action details after request is created', async () => {
    const {
      result: {
        current: { mutateAsync: sendMemoryDump },
      },
    } = renderHook();
    const apiResponse = await sendMemoryDump(memoryDumpBody);

    expect(apiResponse).toEqual({
      data: expect.objectContaining({
        parameters: memoryDumpBody.parameters,
        agents: memoryDumpBody.endpoint_ids,
        agentType: memoryDumpBody.agent_type,
      }),
    });
  });

  it('should allow custom options to be used', async () => {
    renderHook();

    expect(useMutationMock).toHaveBeenCalledWith(expect.any(Function), reactQueryOptions);
  });
});
