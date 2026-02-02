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
  ResponseActionRunScriptOutputContent,
} from '../../../../common/endpoint/types';
import { RunscriptOutput } from './runscript_action_output';

import { useUserPrivileges as _useUserPrivileges } from '../../../common/components/user_privileges';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';

jest.mock('../../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('#RunscriptOutput component', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let setUserPrivileges: ReturnType<AppContextTestRender['getUserPrivilegesMockSetter']>;
  let action: ActionDetails<ResponseActionRunScriptOutputContent>;

  beforeEach(() => {
    action = new EndpointActionGenerator('seed').generateActionDetails({
      agents: ['agent-a'],
      agentType: 'microsoft_defender_endpoint',
      command: 'runscript',
      parameters: {
        scriptName: 'run-script.sh',
        args: '--argForSakes',
      },
    });

    appTestContext = createAppRootMockRenderer();
    setUserPrivileges = appTestContext.getUserPrivilegesMockSetter(useUserPrivilegesMock);
    setUserPrivileges.set({ canWriteExecuteOperations: true });

    responseActionsHttpMocks(appTestContext.coreStart.http);

    render = () => {
      renderResult = appTestContext.render(
        <RunscriptOutput action={action} agentId={'agent-a'} data-test-subj="test" />
      );

      return renderResult;
    };
  });

  afterEach(() => {
    setUserPrivileges.reset();
  });

  it('should display no output if no `output` in response', async () => {
    action.outputs = {};
    render();
    const noOutput = renderResult.getByTestId('test-no-output');
    expect(noOutput).toBeInTheDocument();
    expect(noOutput).toHaveTextContent(
      'The output for this runscript action cannot be displayed. Please download the output file to view the results'
    );
  });

  it('should display stdout and stderr output when both are present', async () => {
    action.outputs = {
      'agent-a': {
        content: {
          code: '0',
          stdout: 'this is standard output',
          stderr: 'this is error output',
        },
        type: 'json',
      },
    };

    render();

    const { getByTestId } = renderResult;

    expect(getByTestId('test-stderr')).toBeInTheDocument();
    expect(getByTestId('test-stdout')).toBeInTheDocument();
  });

  it('should display file too large message when code is 413', async () => {
    action.outputs = {
      'agent-a': {
        content: {
          code: '413',
          stdout: '', // empty for testing purpose
          stderr: '', // empty for testing purpose
        },
        type: 'json',
      },
    };

    render();

    const fileTooLargeMessage = renderResult.getByTestId('test-file-too-large');
    expect(fileTooLargeMessage).toBeInTheDocument();
    expect(fileTooLargeMessage).toHaveTextContent(
      'The output is too large to be displayed. Please download the output file to view the results.'
    );
  });
});
