/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent, { type UserEvent } from '@testing-library/user-event';
import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { responseActionsHttpMocks } from '../../../../mocks/response_actions_http_mocks';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import type { EndpointCapabilities } from '../../../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_CAPABILITIES } from '../../../../../../common/endpoint/service/response_actions/constants';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
} from '../../../console/components/console_manager/mocks';
import { getEndpointConsoleCommands } from '../..';
import React from 'react';
import type { EndpointPrivileges } from '../../../../../../common/endpoint/types';

describe('When using runscript action from response console', () => {
  let mockedContext: AppContextTestRender;
  let user: UserEvent;
  let render: (
    capabilities?: EndpointCapabilities[]
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let consoleManagerMockAccess: ReturnType<
    typeof getConsoleManagerMockRenderResultQueriesAndActions
  >;
  let endpointPrivileges: EndpointPrivileges;

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockedContext = createAppRootMockRenderer();
    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);
    endpointPrivileges = { ...getEndpointAuthzInitialStateMock(), loading: false };

    render = async (capabilities: EndpointCapabilities[] = [...ENDPOINT_CAPABILITIES]) => {
      renderResult = mockedContext.render(
        <ConsoleManagerTestComponent
          registerConsoleProps={() => {
            return {
              consoleProps: {
                'data-test-subj': 'test',
                commands: getEndpointConsoleCommands({
                  agentType: 'endpoint',
                  endpointAgentId: 'a.b.c',
                  endpointCapabilities: [...capabilities],
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

      await consoleManagerMockAccess.clickOnRegisterNewConsole();
      await consoleManagerMockAccess.openRunningConsole();

      return renderResult;
    };
  });

  describe('and agent type is SentinelOne', () => {
    beforeEach(async () => {
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
              inputExample: '--option some_value [--option2',
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

    it.todo('should error when the feature flag is disabled');

    // TODO:PT add more
  });
});
