/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useGetAgentStatus } from './use_get_agent_status';
import { agentStatusGetHttpMock } from '../../mocks';
import { AGENT_STATUS_ROUTE } from '../../../../common/endpoint/constants';
import type { RenderHookResult } from '@testing-library/react';
import { waitFor } from '@testing-library/react';

describe('useGetAgentStatus hook', () => {
  let httpMock: AppContextTestRender['coreStart']['http'];
  let agentIdsProp: Parameters<typeof useGetAgentStatus>[0];
  let optionsProp: Parameters<typeof useGetAgentStatus>[2];
  let apiMock: ReturnType<typeof agentStatusGetHttpMock>;
  let renderHook: () => RenderHookResult<ReturnType<typeof useGetAgentStatus>, unknown>;

  beforeEach(() => {
    const appTestContext = createAppRootMockRenderer();

    httpMock = appTestContext.coreStart.http;
    apiMock = agentStatusGetHttpMock(httpMock);
    renderHook = () => {
      return appTestContext.renderHook(() =>
        useGetAgentStatus(agentIdsProp, 'endpoint', optionsProp)
      );
    };
    agentIdsProp = '1-2-3';
    optionsProp = undefined;
  });

  it('should accept a single agent id (string)', () => {
    renderHook();

    expect(httpMock.get).toHaveBeenCalledWith(AGENT_STATUS_ROUTE, {
      query: { agentIds: ['1-2-3'], agentType: 'endpoint' },
      version: '1',
    });
  });

  it('should accept multiple agent ids (array)', () => {
    agentIdsProp = ['1', '2', '3'];
    renderHook();

    expect(httpMock.get).toHaveBeenCalledWith(AGENT_STATUS_ROUTE, {
      query: { agentIds: ['1', '2', '3'], agentType: 'endpoint' },
      version: '1',
    });
  });

  it('should only use agentIds that are not empty strings', () => {
    agentIdsProp = ['', '1', ''];
    renderHook();

    expect(httpMock.get).toHaveBeenCalledWith(AGENT_STATUS_ROUTE, {
      query: { agentIds: ['1'], agentType: 'endpoint' },
      version: '1',
    });
  });

  it('should return expected data', async () => {
    const { result } = renderHook();
    await waitFor(() =>
      expect(result.current.data).toEqual({
        '1-2-3': {
          agentId: '1-2-3',
          agentType: 'endpoint',
          found: true,
          isolated: false,
          lastSeen: expect.any(String),
          pendingActions: {},
          status: 'healthy',
        },
      })
    );
  });

  it('should NOT call agent status api if list of agent ids is empty', async () => {
    agentIdsProp = ['', '     '];
    const { result } = renderHook();
    await waitFor(() => {
      expect(result.current.data).toEqual({});
      expect(apiMock.responseProvider.getAgentStatus).not.toHaveBeenCalled();
    });
  });
});
