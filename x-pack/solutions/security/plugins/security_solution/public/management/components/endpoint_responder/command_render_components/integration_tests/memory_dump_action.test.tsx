/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_CAPABILITIES } from '../../../../../../common/endpoint/service/response_actions/constants';
import { responseActionsHttpMocks } from '../../../../mocks/response_actions_http_mocks';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
} from '../../../console/components/console_manager/mocks';
import { enterConsoleCommand } from '../../../console/mocks';
import type { EndpointPrivileges } from '../../../../../../common/endpoint/types';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import { getEndpointConsoleCommands } from '../..';
import React from 'react';
import { EndpointActionGenerator } from '../../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { waitFor } from '@testing-library/react';
import { ExperimentalFeaturesService as _ExperimentalFeaturesService } from '../../../../../common/experimental_features_service';
import type { SupportedHostOsType } from '../../../../../../common/endpoint/constants';
import { MEMORY_DUMP_ROUTE } from '../../../../../../common/endpoint/constants';

jest.mock('../../../../../common/experimental_features_service');

const ExperimentalFeaturesServiceMock = _ExperimentalFeaturesService;

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
  let endpointPrivileges: EndpointPrivileges;
  let hostPlatform: SupportedHostOsType;
  let capabilities: string[];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    hostPlatform = 'linux';
    capabilities = [...ENDPOINT_CAPABILITIES];
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
                  endpointCapabilities: capabilities,
                  endpointPrivileges,
                  platform: hostPlatform,
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

  describe('and agent type is Endpoint', () => {
    beforeEach(() => {
      (ExperimentalFeaturesServiceMock.get as jest.Mock).mockReturnValue({
        responseActionsEndpointMemoryDump: true,
      });
    });

    it('should error when feature flag is disabled', async () => {
      (ExperimentalFeaturesServiceMock.get as jest.Mock).mockReturnValue({
        responseActionsEndpointMemoryDump: false,
      });
      await render();
      await enterConsoleCommand(renderResult, user, 'memory-dump --kernel');

      expect(renderResult.getByTestId('test-unknownCommandError').textContent).toEqual(
        'Unsupported text/command' +
          'The text you entered memory-dump --kernel is unsupported! ' +
          'Click  Help or type help for assistance.'
      );
    });

    it('should call memory dump api with expected payload', async () => {
      await render();
      await enterConsoleCommand(renderResult, user, 'memory-dump --kernel');

      await waitFor(() => {
        expect(apiMocks.responseProvider.memoryDump).toHaveBeenCalledWith({
          body: '{"agent_type":"endpoint","endpoint_ids":["a.b.c"],"parameters":{"type":"kernel"}}',
          path: MEMORY_DUMP_ROUTE,
          version: '2023-10-31',
        });
      });
    });

    it('should display results when action completes', async () => {
      apiMocks.responseProvider.actionDetails.mockReturnValue({
        data: new EndpointActionGenerator('seed').generateActionDetails({
          agents: ['a.b.c'],
          command: 'memory-dump',
        }),
      });
      await render();
      await enterConsoleCommand(renderResult, user, 'memory-dump --kernel');

      await waitFor(() => {
        expect(renderResult.getByTestId('memoryDumpResult').textContent).toBeTruthy();
      });
    });

    it.each`
      arg           | value
      ${'pid'}      | ${234}
      ${'entityId'} | ${'some-entity-id'}
    `('should error when $arg is used with --type=kernel', async ({ arg, value }) => {
      await render();
      await enterConsoleCommand(renderResult, user, `memory-dump --kernel --${arg}=${value}`);

      expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
        '"pid" and "entityId" arguments are not supported for "kernel" memory dumps'
      );
    });

    it('should error when type is process but no pid or entity id entered', async () => {
      await render();
      await enterConsoleCommand(renderResult, user, `memory-dump --process`);

      expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
        '"pid" or "entityId argument is required for "process" memory dumps'
      );
    });

    it('should error when doing a kernel memory dump on MAC host', async () => {
      hostPlatform = 'macos';
      capabilities = capabilities.filter((value) => value !== 'memdump_kernel');
      await render();
      await enterConsoleCommand(renderResult, user, `memory-dump --kernel`);

      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'Invalid argument value: --kernel. "kernel" memory dump type is not currently supported for this host OS type (macos)'
      );
    });

    it('should disable command if endpoint does not support memory dump', async () => {
      capabilities = capabilities.filter(
        (value) => value !== 'memdump_process' && value !== 'memdump_kernel'
      );
      await render();
      await enterConsoleCommand(renderResult, user, `memory-dump --process --pid=123`);

      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'Invalid argument value: --process. "process" memory dump type is not currently supported for this host OS type (linux)'
      );
    });

    it('should error if PID is not a number', async () => {
      await render();
      await enterConsoleCommand(renderResult, user, `memory-dump --process --pid="some-number"`);

      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'Argument --pid value must be a number'
      );
    });

    it('should error is entity id is empty string', async () => {
      await render();
      await enterConsoleCommand(renderResult, user, `memory-dump --process --entityId="    "`);

      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'Argument --entityId must have a value'
      );
    });
  });
});
