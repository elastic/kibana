/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type {
  ActionDetails,
  GetProcessesActionOutputContent,
} from '../../../../common/endpoint/types';
import { RunningProcessesActionResults } from './running_processes_action_results';
import { useUserPrivileges as _useUserPrivileges } from '../../../common/components/user_privileges';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import { waitFor } from '@testing-library/react';

jest.mock('../../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('Running Processes Action Results component', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let setUserPrivileges: ReturnType<AppContextTestRender['getUserPrivilegesMockSetter']>;
  let action: ActionDetails<GetProcessesActionOutputContent>;
  let agentId: string | undefined;

  beforeEach(() => {
    action = new EndpointActionGenerator('seed').generateActionDetails({
      agents: ['agent-a', 'agent-b'],
      command: 'running-processes',
    });

    agentId = 'agent-b';
    appTestContext = createAppRootMockRenderer();
    setUserPrivileges = appTestContext.getUserPrivilegesMockSetter(useUserPrivilegesMock);
    setUserPrivileges.set({ canGetRunningProcesses: true });

    responseActionsHttpMocks(appTestContext.coreStart.http);

    render = () => {
      renderResult = appTestContext.render(
        <RunningProcessesActionResults action={action} agentId={agentId} data-test-subj="test" />
      );

      return renderResult;
    };
  });

  afterEach(() => {
    setUserPrivileges.reset();
  });

  it('should display output content for endpoint agent', () => {
    render();

    expect(
      Array.from(renderResult.getByTestId('test-processListTable').querySelectorAll('th')).map(
        ($th) => $th.textContent
      )
    ).toEqual(['USER', 'PID', 'ENTITY ID', 'COMMAND']);
  });

  it('should display output content sentinelone agent type', async () => {
    action.agentType = 'sentinel_one';
    render();

    await waitFor(() => {
      expect(renderResult.getByTestId('test-download'));
    });
  });

  it('should display nothing if agent type does not support processes', () => {
    action.agentType = 'crowdstrike';
    render();

    expect(renderResult.queryByTestId('test')).toBeNull();
  });

  it('should display output for actions sent to multiple agents', () => {
    agentId = undefined;
    render();

    expect(renderResult.queryAllByTestId('test-processListTable')).toHaveLength(2);
  });

  it('should display nothing for SentinelOne when user has no authz', () => {
    setUserPrivileges.set({ canGetRunningProcesses: false });
    action.agentType = 'sentinel_one';
    render();

    expect(renderResult.queryByTestId('test')).toBeNull();
  });
});
