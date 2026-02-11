/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { RunscriptActionResult } from './runscript_action_result';

import { useUserPrivileges as _useUserPrivileges } from '../../../common/components/user_privileges';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import { waitFor } from '@testing-library/react';

jest.mock('../../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('RunscriptActionResult component', () => {
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
        <RunscriptActionResult action={action} data-test-subj="test" />
      );

      return renderResult;
    };
  });

  afterEach(() => {
    setUserPrivileges.reset();
  });

  it.each(['crowdstrike', 'sentinel_one'] as const)(
    'should display no output if %s agent type does not support outputs',
    (agentType) => {
      action.agentType = agentType;
      render();
      expect(renderResult.queryByTestId('test-output')).toBeNull();
    }
  );

  it.each(['crowdstrike', 'microsoft_defender_endpoint', 'sentinel_one'] as const)(
    'should display no download link for %s when user has no authz',
    (agentType) => {
      setUserPrivileges.set({ canWriteExecuteOperations: false });
      action.agentType = agentType;
      render();

      expect(renderResult.queryByTestId('test-download')).toBeNull();
    }
  );

  describe('for Microsoft Defender Endpoint', () => {
    it('should display file link for `microsoft_defender_endpoint` agent type', async () => {
      render();

      await waitFor(
        () => {
          expect(renderResult.getByTestId('test-download')).toBeTruthy();
        },
        { timeout: 5000 }
      );
    }, 10000);

    it('should display output content for `microsoft_defender_endpoint` agent', () => {
      action.outputs = {
        'agent-a': {
          type: 'json',
          content: {
            code: '0',
            stdout: 'script output',
            stderr: '',
          },
        },
      };

      render();

      const stdoutAccordion = renderResult.getByTestId('test-output-stdout-title');
      expect(stdoutAccordion).toBeInTheDocument();
      expect(stdoutAccordion).toHaveTextContent('Runscript output');
    });
  });

  describe('for Elastic Defend Endpoint', () => {
    beforeEach(() => {
      action = new EndpointActionGenerator('seed').generateActionDetails({
        agents: ['agent-a'],
        agentType: 'endpoint',
        command: 'runscript',
      });
    });

    it('should display results file download', async () => {
      render();
      await waitFor(() => {
        expect(renderResult.queryByTestId('test-download-loading')).toBeNull();
      });

      expect(renderResult.getByTestId('test-download')).toBeInTheDocument();
      expect(renderResult.getByTestId('test-download-passcodeMessage')).toBeInTheDocument();
    });

    it('should display the output content', () => {
      render();

      expect(renderResult.getByTestId('test-output')).toBeInTheDocument();
    });
  });
});
