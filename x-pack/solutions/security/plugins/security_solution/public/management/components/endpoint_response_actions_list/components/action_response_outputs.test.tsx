/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import type {
  ActionDetails,
  ResponseActionRunScriptOutputContent,
} from '../../../../../common/endpoint/types';
import { ActionResponseOutputs } from './action_response_outputs';

import { useUserPrivileges as _useUserPrivileges } from '../../../../common/components/user_privileges';
import { responseActionsHttpMocks } from '../../../mocks/response_actions_http_mocks';

jest.mock('../../../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('ActionResponseOutputs component', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let setUserPrivileges: ReturnType<AppContextTestRender['getUserPrivilegesMockSetter']>;

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    setUserPrivileges = appTestContext.getUserPrivilegesMockSetter(useUserPrivilegesMock);
    setUserPrivileges.set({
      canWriteFileOperations: true,
      canReadActionsLogManagement: true,
      canAccessEndpointActionsLogManagement: true,
      canWriteExecuteOperations: true,
    });

    responseActionsHttpMocks(appTestContext.coreStart.http);
  });

  afterEach(() => {
    setUserPrivileges.reset();
  });

  describe('CrowdStrike runscript actions', () => {
    it('should render runscript output instead of generic "submitted successfully" message', () => {
      const action: ActionDetails<ResponseActionRunScriptOutputContent> =
        new EndpointActionGenerator('seed').generateActionDetails({
          agents: ['agent-a'],
          agentType: 'crowdstrike',
          command: 'runscript',
          wasSuccessful: true,
          isCompleted: true,
        });
      action.outputs = {
        'agent-a': {
          type: 'text',
          content: {
            code: '200',
            stdout: 'crowdstrike script output',
            stderr: '',
          },
        },
      };

      renderResult = appTestContext.render(
        <ActionResponseOutputs action={action} data-test-subj="test" />
      );

      // Should NOT show the generic "submitted successfully" message for runscript
      expect(renderResult.container.textContent).not.toContain('submitted successfully');
    });

    it('should show "submitted successfully" for CrowdStrike isolate actions', () => {
      const action = new EndpointActionGenerator('seed').generateActionDetails({
        agents: ['agent-a'],
        agentType: 'crowdstrike',
        command: 'isolate',
        wasSuccessful: true,
        isCompleted: true,
      });

      renderResult = appTestContext.render(
        <ActionResponseOutputs action={action} data-test-subj="test" />
      );

      expect(renderResult.container.textContent).toContain('submitted successfully');
    });

    it('should show "submitted successfully" for CrowdStrike release actions', () => {
      const action = new EndpointActionGenerator('seed').generateActionDetails({
        agents: ['agent-a'],
        agentType: 'crowdstrike',
        command: 'unisolate',
        wasSuccessful: true,
        isCompleted: true,
      });

      renderResult = appTestContext.render(
        <ActionResponseOutputs action={action} data-test-subj="test" />
      );

      expect(renderResult.container.textContent).toContain('submitted successfully');
    });
  });
});
