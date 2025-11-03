/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '@kbn/security-solution-plugin/public/common/mock/endpoint';
import userEvent, { UserEvent } from '@testing-library/user-event/index';
import {
  ENDPOINT_CAPABILITIES,
  ResponseActionAgentType,
} from '@kbn/security-solution-plugin/common/endpoint/service/response_actions/constants';
import { responseActionsHttpMocks } from '@kbn/security-solution-plugin/public/management/mocks/response_actions_http_mocks';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
} from '@kbn/security-solution-plugin/public/management/components/console/components/console_manager/mocks';
import { getConsoleSelectorsAndActionMock } from '@kbn/security-solution-plugin/public/management/components/console/mocks';
import type { EndpointPrivileges } from '@kbn/security-solution-plugin/common/endpoint/types';
import { getEndpointAuthzInitialStateMock } from '@kbn/security-solution-plugin/common/endpoint/service/authz/mocks';
import { getEndpointConsoleCommands } from '@kbn/security-solution-plugin/public/management/components/endpoint_responder';
import React from 'react';

describe('Memory dump response action', () => {
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

  describe('and agent type is Endpoint', () => {
    //
  });
});
