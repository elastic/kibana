/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
} from '../../../console/components/console_manager/mocks';
import React from 'react';
import { getEndpointConsoleCommands } from '../../lib/console_commands_definition';
import { responseActionsHttpMocks } from '../../../../mocks/response_actions_http_mocks';
import { enterConsoleCommand } from '../../../console/mocks';
import { waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { getDeferred } from '../../../../mocks/utils';
import { getEndpointAuthzInitialState } from '../../../../../../common/endpoint/service/authz';
import type { EndpointCapabilities } from '../../../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_CAPABILITIES } from '../../../../../../common/endpoint/service/response_actions/constants';
import { UPGRADE_AGENT_FOR_RESPONDER } from '../../../../../common/translations';
import type { PendingActionsResponse } from '../../../../../../common/endpoint/types';

jest.mock('../../../../../common/experimental_features_service');

describe('When using cancel action from response actions console', () => {
  let user: UserEvent;
  let render: (
    agentType?: 'endpoint' | 'microsoft_defender_endpoint',
    capabilities?: EndpointCapabilities[],
    privileges?: Partial<ReturnType<typeof getEndpointAuthzInitialState>>
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let consoleManagerMockAccess: ReturnType<
    typeof getConsoleManagerMockRenderResultQueriesAndActions
  >;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mockedContext = createAppRootMockRenderer();

    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);

    render = async (
      agentType: 'endpoint' | 'microsoft_defender_endpoint' = 'microsoft_defender_endpoint',
      capabilities: EndpointCapabilities[] = [...ENDPOINT_CAPABILITIES],
      privileges: Partial<ReturnType<typeof getEndpointAuthzInitialState>> = {}
    ) => {
      renderResult = mockedContext.render(
        <ConsoleManagerTestComponent
          registerConsoleProps={() => {
            return {
              consoleProps: {
                'data-test-subj': 'test',
                commands: getEndpointConsoleCommands({
                  agentType,
                  endpointAgentId: 'a.b.c',
                  endpointCapabilities: [...capabilities],
                  endpointPrivileges: {
                    ...getEndpointAuthzInitialState(),
                    loading: false,
                    canWriteSecuritySolution: true,
                    canIsolateHost: true,
                    canUnIsolateHost: true,
                    canKillProcess: true,
                    canWriteExecuteOperations: true,
                    canWriteFileOperations: true,
                    ...privileges,
                  },
                  platform: 'windows',
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

  describe('When Microsoft Defender Endpoint agent type is used', () => {
    it('should show cancel command in help when user has write permissions', async () => {
      await render('microsoft_defender_endpoint');

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();
      expect(renderResult.getByTestId('test-helpOutput').textContent).toContain('cancel');
    });

    it('should not show cancel command in help when user lacks write permissions', async () => {
      await render('microsoft_defender_endpoint', [...ENDPOINT_CAPABILITIES], {
        canWriteSecuritySolution: false,
      });

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should show error when trying to cancel without providing action ID', async () => {
      await render('microsoft_defender_endpoint');

      await enterConsoleCommand(renderResult, user, 'cancel');

      expect(renderResult.getByTestId('test-badArgument-message')).toBeTruthy();
    });

    it('should show pending actions selector when using cancel command with --action flag', async () => {
      // Mock the get pending actions API
      const mockPendingActions: PendingActionsResponse = {
        data: [
          {
            agent_id: 'a.b.c',
            pending_actions: {
              isolate: 1,
              'kill-process': 1,
            },
          },
        ],
      };

      apiMocks.responseProvider.agentPendingActionsSummary.mockReturnValue(mockPendingActions);

      await render('microsoft_defender_endpoint');

      await enterConsoleCommand(renderResult, user, 'cancel --action');

      // Should show the pending actions selector
      expect(renderResult.getByTestId('cancel-action-arg')).toBeTruthy();
    });

    it('should call cancel API when command is entered with valid action ID', async () => {
      const cancelApiResponse: ReturnType<typeof apiMocks.responseProvider.cancel> = {
        data: {
          ...apiMocks.responseProvider.cancel().data,
          completedAt: new Date().toISOString(),
          command: 'cancel',
          id: 'cancel-action-123',
          agents: ['a.b.c'],
        },
      };

      apiMocks.responseProvider.cancel.mockReturnValue(cancelApiResponse);

      await render('microsoft_defender_endpoint');

      await enterConsoleCommand(renderResult, user, 'cancel --action="action-123-456-789"');

      await waitFor(() => {
        expect(apiMocks.responseProvider.cancel).toHaveBeenCalledWith({
          path: expect.stringContaining('/api/endpoint/action/cancel'),
          version: '2023-10-31',
          method: 'post',
          body: JSON.stringify({
            agent_type: 'microsoft_defender_endpoint',
            endpoint_ids: ['a.b.c'],
            action_id: 'action-123-456-789',
          }),
        });
      });

      expect(renderResult.getByTestId('cancel-actionSuccess')).toBeTruthy();
    });

    it('should validate user has permission to cancel specific command types', async () => {
      // Mock pending action that requires kill-process permission
      const mockPendingActions: PendingActionsResponse = {
        data: [
          {
            agent_id: 'a.b.c',
            pending_actions: {
              'kill-process': 1,
            },
          },
        ],
      };

      apiMocks.responseProvider.agentPendingActionsSummary.mockReturnValue(mockPendingActions);

      // Render with user who cannot kill processes
      await render('microsoft_defender_endpoint', [...ENDPOINT_CAPABILITIES], {
        canKillProcess: false,
      });

      await enterConsoleCommand(renderResult, user, 'cancel --action');

      // The action should not be available for cancellation due to insufficient permissions
      const actionSelector = renderResult.getByTestId('cancel-action-arg');
      expect(actionSelector).toBeTruthy();
    });

    it('should show appropriate error when cancel API fails', async () => {
      const deferred = getDeferred();
      apiMocks.responseProvider.cancel.mockReturnValue(deferred.promise as any);

      await render('microsoft_defender_endpoint');

      await enterConsoleCommand(renderResult, user, 'cancel --action="action-123-456-789"');

      expect(renderResult.getByTestId('cancel-pending')).toBeTruthy();

      deferred.reject(new Error('API Error'));

      await waitFor(() => {
        expect(renderResult.getByTestId('cancel-error')).toBeTruthy();
      });
    });
  });

  describe('When endpoint agent type is used', () => {
    it('should not show cancel command for standard endpoint agents', async () => {
      await render('endpoint');

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should show error when trying to use cancel command with endpoint agent', async () => {
      await render('endpoint');

      await enterConsoleCommand(renderResult, user, 'cancel --action="action-123"');

      expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
        UPGRADE_AGENT_FOR_RESPONDER('endpoint', 'cancel')
      );
    });
  });
});
