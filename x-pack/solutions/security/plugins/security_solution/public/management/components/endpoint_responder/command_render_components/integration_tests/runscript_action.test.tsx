/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent, { type UserEvent } from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { responseActionsHttpMocks } from '../../../../mocks/response_actions_http_mocks';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_CAPABILITIES } from '../../../../../../common/endpoint/service/response_actions/constants';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
} from '../../../console/components/console_manager/mocks';
import { getEndpointConsoleCommands } from '../..';
import React from 'react';
import type { EndpointPrivileges } from '../../../../../../common/endpoint/types';
import { enterConsoleCommand, getConsoleSelectorsAndActionMock } from '../../../console/mocks';

describe('When using runscript action from response console', () => {
  let mockedContext: AppContextTestRender;
  let user: UserEvent;
  let render: (
    agentType?: ResponseActionAgentType
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let consoleManagerMockAccess: ReturnType<
    typeof getConsoleManagerMockRenderResultQueriesAndActions
  >;
  let consoleMockUtils: ReturnType<typeof getConsoleSelectorsAndActionMock>;
  let endpointPrivileges: EndpointPrivileges;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockedContext = createAppRootMockRenderer();
    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);
    endpointPrivileges = { ...getEndpointAuthzInitialStateMock(), loading: false };
    render = async (agentType: ResponseActionAgentType = 'endpoint') => {
      renderResult = mockedContext.render(
        <ConsoleManagerTestComponent
          registerConsoleProps={() => {
            return {
              consoleProps: {
                'data-test-subj': 'test',
                commands: getEndpointConsoleCommands({
                  agentType,
                  endpointAgentId: 'a.b.c',
                  endpointCapabilities: [...ENDPOINT_CAPABILITIES],
                  endpointPrivileges,
                  platform: 'linux',
                }),
              },
            };
          }}
        />
      );

      consoleManagerMockAccess = getConsoleManagerMockRenderResultQueriesAndActions(
        user,
        renderResult
      );
      consoleMockUtils = getConsoleSelectorsAndActionMock(renderResult, user);

      await consoleManagerMockAccess.clickOnRegisterNewConsole();
      await consoleManagerMockAccess.openRunningConsole();

      return renderResult;
    };
  });

  describe('and agent type is SentinelOne', () => {
    beforeEach(async () => {
      const _render = render;

      render = () => _render('sentinel_one');

      mockedContext.setExperimentalFlag({ responseActionsSentinelOneRunScriptEnabled: true });

      apiMocks.responseProvider.fetchScriptList.mockReturnValue({
        data: [
          {
            id: '1',
            name: 'Script 1',
            description: 'Test script 1',
            meta: {
              id: '1',
              scriptDescription: 'Test script 1',
              osTypes: ['linux'],
              inputInstructions: 'Test input instructions',
              inputExample: '--option some_value [--option2]',
              inputRequired: true,
              shortFileName: 'script1.sh',
            },
          },
          {
            id: '2',
            name: 'Script 2',
            description: 'Test script 2',
            meta: {
              id: '2',
              scriptDescription: 'Test script 2',
              osTypes: ['linux'],
              inputInstructions: 'Test input instructions',
              inputExample: '[--option3 some_value]',
              inputRequired: false,
              shortFileName: 'script2.sh',
            },
          },
        ],
      });
    });

    it('should error when the feature flag is disabled', async () => {
      mockedContext.setExperimentalFlag({ responseActionsSentinelOneRunScriptEnabled: false });
      await render();
      await enterConsoleCommand(renderResult, user, 'runscript');

      expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
        'Support for runscript is not currently available for SentinelOne.'
      );
    });

    it('should retrieve and display list of scripts for OS type', async () => {
      await render();
      await enterConsoleCommand(renderResult, user, 'runscript --script', { inputOnly: true });

      await waitFor(() => {
        expect(apiMocks.responseProvider.fetchScriptList).toHaveBeenCalledWith({
          path: '/internal/api/endpoint/action/custom_scripts',
          query: { agentType: 'sentinel_one', osType: 'linux' },
          version: '1',
        });
      });

      await waitFor(() => {
        expect(renderResult.getAllByTestId('scriptSelector-runscript-script')).toHaveLength(2);
      });
    });

    it('should show error if no script is selected', async () => {
      await render();
      await enterConsoleCommand(renderResult, user, 'runscript --script');

      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'Argument --script must have a value'
      );
    });

    it('should show error if inputParams is required by script and none were entered', async () => {
      await render();
      await enterConsoleCommand(renderResult, user, 'runscript --script', { inputOnly: true });
      await waitFor(() =>
        user.click(renderResult.getAllByTestId('scriptSelector-runscript-script')[0])
      );
      await waitFor(() => {
        expect(renderResult.queryByTestId('scriptSelector-runscript-popupPanel')).toBeNull();
      });
      consoleMockUtils.submitCommand();

      expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
        'Script "Script 1" requires input parameters to be entered: Test input instructions'
      );
    });

    it('should show usage example provided for the script (if any)', async () => {
      await render();
      await enterConsoleCommand(renderResult, user, 'runscript --script', { inputOnly: true });
      await waitFor(() =>
        user.click(renderResult.getAllByTestId('scriptSelector-runscript-script')[0])
      );
      await waitFor(() => {
        expect(renderResult.queryByTestId('scriptSelector-runscript-popupPanel')).toBeNull();
      });

      expect(renderResult.getByTestId('test-footer')).toHaveTextContent(
        `Script 1 script input: --option some_value [--option2]`
      );
    });

    it('should call runscript api with expected payload', async () => {
      await render();
      await enterConsoleCommand(renderResult, user, 'runscript --script', { inputOnly: true });
      await waitFor(() =>
        user.click(renderResult.getAllByTestId('scriptSelector-runscript-script')[1])
      );
      await waitFor(() => {
        expect(renderResult.queryByTestId('scriptSelector-runscript-popupPanel')).toBeNull();
      });
      consoleMockUtils.submitCommand();

      await waitFor(() => {
        expect(apiMocks.responseProvider.runscript).toHaveBeenCalledWith({
          body: '{"agent_type":"sentinel_one","endpoint_ids":["a.b.c"],"parameters":{"scriptId":"2"}}',
          path: '/api/endpoint/action/run_script',
          version: '2023-10-31',
        });
      });
    });
  });
});
