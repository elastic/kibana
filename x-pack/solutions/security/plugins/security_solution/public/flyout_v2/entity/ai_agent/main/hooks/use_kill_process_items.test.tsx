/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useGetEndpointDetails, useWithShowResponder } from '../../../../../management/hooks';
import { buildAgentActivity } from '../../../../../entity_analytics/components/ai_security/activity/build_agent_activity';
import type { AgentRun } from '../../../../../entity_analytics/components/ai_security/activity/types';
import { mockAgentIdentity } from '../mocks';
import { AI_AGENT_TEST_IDS } from '../test_ids';
import { useKillProcessItems } from './use_kill_process_items';

jest.mock('../../../../../common/components/user_privileges');
jest.mock('../../../../../management/hooks', () => ({
  useGetEndpointDetails: jest.fn(),
  useWithShowResponder: jest.fn(),
}));

const mockShowResponder = jest.fn();

const runningRun = (endpointAgentId?: string): AgentRun =>
  buildAgentActivity({
    identity: mockAgentIdentity,
    ownEvents: [
      {
        entityId: 'root/entity+id=',
        timestamp: new Date().toISOString(),
        ancestry: [],
        unorderedArgs: [],
        isDescendant: false,
        hasExec: true,
        pid: 16884,
        endpointAgentId,
      },
    ],
    descendantEvents: [],
    sideEffects: new Map(),
    otelEvents: [],
    otelMatch: 'none',
    endedProcessIds: new Set(),
  }).runs[0];

const setPrivileges = (canKillProcess: boolean) =>
  jest.mocked(useUserPrivileges).mockReturnValue({
    endpointPrivileges: { canKillProcess, canAccessResponseConsole: true },
  } as unknown as ReturnType<typeof useUserPrivileges>);

const setEndpoint = (result: Partial<ReturnType<typeof useGetEndpointDetails>>) =>
  jest.mocked(useGetEndpointDetails).mockReturnValue({
    data: undefined,
    isFetching: false,
    error: null,
    ...result,
  } as unknown as ReturnType<typeof useGetEndpointDetails>);

const renderItems = (runs: AgentRun[]) => {
  const { result } = renderHook(() => useKillProcessItems(runs));
  const closePopover = jest.fn();
  render(<div>{result.current(closePopover)}</div>);
  return closePopover;
};

describe('useKillProcessItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPrivileges(true);
    setEndpoint({});
    jest.mocked(useWithShowResponder).mockReturnValue(mockShowResponder);
  });

  it('offers nothing to users who may not kill processes', () => {
    setPrivileges(false);
    renderItems([runningRun('endpoint-1')]);
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.killProcess)).not.toBeInTheDocument();
  });

  it('offers nothing when no run is running', () => {
    renderItems([]);
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.killProcess)).not.toBeInTheDocument();
  });

  it('is disabled when the run has no Defend agent ID', () => {
    renderItems([runningRun(undefined)]);
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.killProcess)).toBeDisabled();
    expect(useGetEndpointDetails).toHaveBeenCalledWith('', { enabled: false });
  });

  it('is disabled when the agent ID is not an enrolled endpoint', () => {
    setEndpoint({ error: { body: { statusCode: 404 } } } as unknown as Partial<
      ReturnType<typeof useGetEndpointDetails>
    >);
    renderItems([runningRun('generated-agent-id')]);
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.killProcess)).toBeDisabled();
  });

  it('opens the response console with kill-process filled in for the root process, without sending it', () => {
    setEndpoint({
      data: {
        host_status: 'healthy',
        metadata: {
          host: { name: 'ci-build-01', os: { name: 'Linux' } },
          Endpoint: { capabilities: ['kill_process'] },
        },
      },
    } as unknown as Partial<ReturnType<typeof useGetEndpointDetails>>);
    const closePopover = renderItems([runningRun('endpoint-1')]);

    const item = screen.getByTestId(AI_AGENT_TEST_IDS.killProcess);
    expect(item).toHaveTextContent('Kill process (PID 16884)');
    fireEvent.click(item);
    expect(closePopover).toHaveBeenCalled();
    expect(mockShowResponder).toHaveBeenCalledWith({
      agentId: 'endpoint-1',
      agentType: 'endpoint',
      hostName: 'ci-build-01',
      platform: 'linux',
      capabilities: ['kill_process'],
      inputCommand: 'kill-process --entityId="root/entity+id="',
    });
  });
});
