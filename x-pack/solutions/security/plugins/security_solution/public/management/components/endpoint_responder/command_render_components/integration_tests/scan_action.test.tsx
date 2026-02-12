/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import type { HttpFetchOptionsWithPath } from '@kbn/core-http-browser';

import {
  ENDPOINT_CAPABILITIES,
  type EndpointCapabilities,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { responseActionsHttpMocks } from '../../../../mocks/response_actions_http_mocks';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
} from '../../../console/components/console_manager/mocks';

import {
  getEndpointConsoleCommands,
  type GetEndpointConsoleCommandsOptions,
} from '../../lib/console_commands_definition';
import { enterConsoleCommand } from '../../../console/mocks';
import { SCAN_ROUTE } from '../../../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import type {
  EndpointPrivileges,
  ResponseActionScanOutputContent,
} from '../../../../../../common/endpoint/types';
import {
  INSUFFICIENT_PRIVILEGES_FOR_COMMAND,
  UPGRADE_AGENT_FOR_RESPONDER,
} from '../../../../../common/translations';
import { endpointActionResponseCodes } from '../../lib/endpoint_action_response_codes';
import { ExperimentalFeaturesService } from '../../../../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../../../../common';

jest.mock('../../../../../common/components/user_privileges');

jest.mock('../../../../../common/experimental_features_service');
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

describe('When using scan action from response actions console', () => {
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
  let getConsoleCommandsOptions: GetEndpointConsoleCommandsOptions;
  let mockedContext: AppContextTestRender;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue(allowedExperimentalValues);

    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockedContext = createAppRootMockRenderer();

    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);
    endpointPrivileges = {
      ...getEndpointAuthzInitialStateMock(),
      loading: false,
      canWriteScanOperations: true,
    };

    getConsoleCommandsOptions = {
      agentType: 'endpoint',
      endpointAgentId: 'agent-a',
      endpointCapabilities: [...ENDPOINT_CAPABILITIES],
      endpointPrivileges,
      platform: 'linux',
    };

    render = async (capabilities: EndpointCapabilities[] = [...ENDPOINT_CAPABILITIES]) => {
      renderResult = mockedContext.render(
        <ConsoleManagerTestComponent
          registerConsoleProps={() => {
            return {
              consoleProps: {
                'data-test-subj': 'test',
                commands: getEndpointConsoleCommands({
                  ...getConsoleCommandsOptions,
                  endpointCapabilities: capabilities,
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

  it('should show an error if the `scan` capability is not present in the endpoint', async () => {
    await render([]);
    await enterConsoleCommand(renderResult, user, 'scan --path="one/two"');

    expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
      UPGRADE_AGENT_FOR_RESPONDER('endpoint', 'scan')
    );
  });

  it('should show an error if the `scan` is not authorized', async () => {
    endpointPrivileges.canWriteScanOperations = false;
    await render();
    await enterConsoleCommand(renderResult, user, 'scan --path="one/two"');

    expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
      INSUFFICIENT_PRIVILEGES_FOR_COMMAND
    );
  });

  it('should show an error if `scan` is entered without `--path` argument', async () => {
    await render();
    await enterConsoleCommand(renderResult, user, 'scan');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Missing required arguments: --path'
    );
  });

  it('should show error if `--path` is empty string', async () => {
    await render();
    await enterConsoleCommand(renderResult, user, 'scan --path=""');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Argument --path must have a value'
    );
  });

  it('should call the `scan` api with the expected payload', async () => {
    await render();
    await enterConsoleCommand(renderResult, user, 'scan --path="one/two"');

    await waitFor(() => {
      expect(apiMocks.responseProvider.scan).toHaveBeenCalledWith({
        body: '{"agent_type":"endpoint","endpoint_ids":["agent-a"],"parameters":{"path":"one/two"}}',
        path: SCAN_ROUTE,
        version: '2023-10-31',
      });
    });
  });

  it('should only accept one `--comment`', async () => {
    await render();
    await enterConsoleCommand(
      renderResult,
      user,
      'scan --path="one/two" --comment "one" --comment "two"'
    );

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Argument can only be used once: --comment'
    );
  });

  it('should work with a single `--comment` argument', async () => {
    apiMocks.responseProvider.scan.mockDelay.mockImplementation(
      () => new Promise((r) => setTimeout(r, 100))
    );
    await render();
    await enterConsoleCommand(renderResult, user, 'scan --path="one/two" --comment "Scan folder"');

    await waitFor(() => {
      expect(renderResult.getByTestId('scan-pending').textContent).toEqual(
        'File path scan is in progress.'
      );
    });
  });

  it('should work with `--help argument`', async () => {
    await render();
    await enterConsoleCommand(renderResult, user, 'scan --help');

    expect(renderResult.getByTestId('test-helpOutput').textContent).toEqual(
      'About' +
        'Scan the host for malware' +
        'Usage' +
        'scan --path [--comment]' +
        'Required parameters--path - The absolute path to a file or directory to be scanned' +
        'Optional parameters--comment - A comment to go along with the action' +
        'Examples' +
        'can --path "/full/path/to/folder" --comment "Scan folder for malware"'
    );
  });

  it('should display pending message', async () => {
    apiMocks.responseProvider.scan.mockDelay.mockImplementation(
      () => new Promise((r) => setTimeout(r, 100))
    );
    await render();
    await enterConsoleCommand(renderResult, user, 'scan --path="one/two"');

    await waitFor(() => {
      expect(renderResult.getByTestId('scan-pending').textContent).toEqual(
        'File path scan is in progress.'
      );
    });
  });

  it('should display action completion info', async () => {
    const actionDetailsApiResponseMock: ReturnType<typeof apiMocks.responseProvider.actionDetails> =
      {
        data: {
          ...apiMocks.responseProvider.actionDetails({
            path: '/agent-a',
          } as HttpFetchOptionsWithPath).data,
          completedAt: new Date().toISOString(),
          command: 'scan',
          outputs: {
            'agent-a': {
              type: 'json',
              content: {
                code: 'ra_scan_success_done',
              } as unknown as ResponseActionScanOutputContent,
            },
          },
        },
      };

    apiMocks.responseProvider.actionDetails.mockReturnValue(actionDetailsApiResponseMock);

    await render();
    await enterConsoleCommand(renderResult, user, 'scan --path="one/two"');

    await waitFor(() => {
      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(renderResult.getByTestId('scan-success').textContent).toEqual('Scan complete');
    });
  });

  it.each([
    'ra_scan_error_canceled',
    'ra_scan_error_not-found',
    'ra_scan_error_invalid-input',
    'ra_scan_error_queue-quota',
    'ra_scan_error_processing',
    'ra_scan_error_processing-interrupted',
  ])('should show detailed error if `scan` failure returned code: %s', async (outputCode) => {
    const mockData = apiMocks.responseProvider.actionDetails({
      path: '/api/endpoint/action/agent-a',
    }).data;

    const actionDetailsApiResponseMock: ReturnType<typeof apiMocks.responseProvider.actionDetails> =
      {
        data: {
          ...mockData,
          id: '123',
          completedAt: new Date().toISOString(),
          command: 'scan',
          outputs: {
            'agent-a': {
              type: 'json',
              content: {
                code: outputCode,
              } as unknown as ResponseActionScanOutputContent,
            },
          },
          errors: ['error message'],
          wasSuccessful: false,
          status: 'failed',
          agentState: {
            'agent-a': {
              ...mockData.agentState['agent-a'],
              wasSuccessful: false,
              errors: ['error message'],
            },
          },
          parameters: {
            path: '/error/path',
          },
        },
      };

    apiMocks.responseProvider.actionDetails.mockReturnValue(actionDetailsApiResponseMock);
    await render();
    await enterConsoleCommand(renderResult, user, 'scan --path="/error/path"');

    await waitFor(() => {
      expect(renderResult.getByTestId('scan-actionFailure').textContent).toMatch(
        // RegExp below taken from: https://github.com/sindresorhus/escape-string-regexp/blob/main/index.js
        new RegExp(endpointActionResponseCodes[outputCode].replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'))
      );
    });
  });
});
