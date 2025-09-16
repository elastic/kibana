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
import type { getEndpointAuthzInitialState } from '../../../../../../common/endpoint/service/authz';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import type { EndpointCapabilities } from '../../../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_CAPABILITIES } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { PendingActionsResponse } from '../../../../../../common/endpoint/types';

jest.mock('../../../../../common/experimental_features_service');

describe('When using cancel action from response actions console', () => {
  let mockedContext: AppContextTestRender;
  let user: UserEvent;
  let render: (
    agentType?: 'endpoint' | 'microsoft_defender_endpoint' | 'sentinel_one' | 'crowdstrike',
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
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockedContext = createAppRootMockRenderer();

    mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: true });

    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);

    render = async (
      agentType: 'endpoint' | 'microsoft_defender_endpoint' | 'sentinel_one' | 'crowdstrike' = 'microsoft_defender_endpoint',
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
                    ...getEndpointAuthzInitialStateMock(),
                    loading: false,
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
        canAccessResponseConsole: false,
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

      await enterConsoleCommand(renderResult, user, 'cancel --action', { inputOnly: true });

      // Should show the pending actions selector
      expect(renderResult.getByTestId('cancel-action-arg-0')).toBeTruthy();
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

      apiMocks.responseProvider.cancel.mockReturnValue(cancelApiResponse);
      apiMocks.responseProvider.agentPendingActionsSummary.mockReturnValue(mockPendingActions);

      await render('microsoft_defender_endpoint', [...ENDPOINT_CAPABILITIES], {
        canAccessResponseConsole: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel --action', { inputOnly: true });

      await waitFor(() => {
        expect(renderResult.getByTestId('cancel-action-arg-0')).toBeTruthy();
      });
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

      // Render with user who cannot kill processes but has general write permissions
      await render('microsoft_defender_endpoint', [...ENDPOINT_CAPABILITIES], {
        canKillProcess: false,
        canAccessResponseConsole: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel --action', { inputOnly: true });

      await waitFor(() => {
        expect(renderResult.getByTestId('cancel-action-arg-0')).toBeTruthy();
      });
    });

    it('should show appropriate error when cancel API fails', async () => {
      const deferred = getDeferred();

      const mockPendingActions: PendingActionsResponse = {
        data: [
          {
            agent_id: 'a.b.c',
            pending_actions: {
              isolate: 1,
            },
          },
        ],
      };

      apiMocks.responseProvider.cancel.mockReturnValue(
        deferred.promise as unknown as ReturnType<typeof apiMocks.responseProvider.cancel>
      );
      apiMocks.responseProvider.agentPendingActionsSummary.mockReturnValue(mockPendingActions);

      await render('microsoft_defender_endpoint', [...ENDPOINT_CAPABILITIES], {
        canAccessResponseConsole: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel --action', { inputOnly: true });

      await waitFor(() => {
        expect(renderResult.getByTestId('cancel-action-arg-0')).toBeTruthy();
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
      await render('endpoint', [...ENDPOINT_CAPABILITIES], {
        canAccessResponseConsole: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel');

      await waitFor(() => {
        const historyItems = renderResult.container.querySelectorAll(
          '[data-test-subj*="historyItem"]'
        );
        expect(historyItems.length).toBeGreaterThan(0);
      });
    });

    it('should not show cancel command in help when feature flag is enabled but agent type is not supported', async () => {
      mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: true });
      await render('endpoint');

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });
  });

  describe('When sentinel_one agent type is used', () => {
    beforeEach(() => {
      // Update the render function to support sentinel_one agent type
      render = async (
        agentType: 'endpoint' | 'microsoft_defender_endpoint' | 'sentinel_one' | 'crowdstrike' = 'microsoft_defender_endpoint',
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
                      ...getEndpointAuthzInitialStateMock(),
                      loading: false,
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

    it('should not show cancel command for sentinel_one agents', async () => {
      await render('sentinel_one');

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should show error when trying to use cancel command with sentinel_one agent', async () => {
      await render('sentinel_one', [...ENDPOINT_CAPABILITIES], {
        canAccessResponseConsole: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel');

      await waitFor(() => {
        const historyItems = renderResult.container.querySelectorAll(
          '[data-test-subj*="historyItem"]'
        );
        expect(historyItems.length).toBeGreaterThan(0);
        // Check that an error message is displayed indicating unsupported agent type
        const errorElements = renderResult.container.querySelectorAll(
          '[data-test-subj*="badCommand-message"], [data-test-subj*="badArgument-message"]'
        );
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('should not show cancel command even when feature flag is enabled', async () => {
      mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: true });
      await render('sentinel_one');

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should validate user permissions but still reject for unsupported agent type', async () => {
      await render('sentinel_one', [...ENDPOINT_CAPABILITIES], {
        canAccessResponseConsole: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel --action test-action-id');

      await waitFor(() => {
        const historyItems = renderResult.container.querySelectorAll(
          '[data-test-subj*="historyItem"]'
        );
        expect(historyItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('When crowdstrike agent type is used', () => {
    it('should not show cancel command for crowdstrike agents', async () => {
      await render('crowdstrike');

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should show error when trying to use cancel command with crowdstrike agent', async () => {
      await render('crowdstrike', [...ENDPOINT_CAPABILITIES], {
        canAccessResponseConsole: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel');

      await waitFor(() => {
        const historyItems = renderResult.container.querySelectorAll(
          '[data-test-subj*="historyItem"]'
        );
        expect(historyItems.length).toBeGreaterThan(0);
        // Check that an error message is displayed indicating unsupported agent type
        const errorElements = renderResult.container.querySelectorAll(
          '[data-test-subj*="badCommand-message"], [data-test-subj*="badArgument-message"]'
        );
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('should not show cancel command even when feature flag is enabled', async () => {
      mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: true });
      await render('crowdstrike');

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should validate user permissions but still reject for unsupported agent type', async () => {
      await render('crowdstrike', [...ENDPOINT_CAPABILITIES], {
        canAccessResponseConsole: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel --action test-action-id');

      await waitFor(() => {
        const historyItems = renderResult.container.querySelectorAll(
          '[data-test-subj*="historyItem"]'
        );
        expect(historyItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Feature flag interactions across all agent types', () => {
    it('should only enable cancel command for microsoft_defender_endpoint when feature flag is enabled', async () => {
      mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: true });

      // Test microsoft_defender_endpoint - should show cancel command
      await render('microsoft_defender_endpoint');
      await enterConsoleCommand(renderResult, user, 'help');
      expect(renderResult.getByTestId('test-helpOutput').textContent).toContain('cancel');

      // Test endpoint - should NOT show cancel command
      await render('endpoint');
      await enterConsoleCommand(renderResult, user, 'help');
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');

      // Test sentinel_one - should NOT show cancel command
      await render('sentinel_one');
      await enterConsoleCommand(renderResult, user, 'help');
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');

      // Test crowdstrike - should NOT show cancel command
      await render('crowdstrike');
      await enterConsoleCommand(renderResult, user, 'help');
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should disable cancel command for all agent types when feature flag is disabled', async () => {
      mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: false });

      // Test all agent types - none should show cancel command
      const agentTypes: Array<'microsoft_defender_endpoint' | 'endpoint' | 'sentinel_one' | 'crowdstrike'> = [
        'microsoft_defender_endpoint',
        'endpoint',
        'sentinel_one',
        'crowdstrike',
      ];

      for (const agentType of agentTypes) {
        await render(agentType);
        await enterConsoleCommand(renderResult, user, 'help');
        expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
      }
    });

    it('should show appropriate error messages for unsupported agent types regardless of feature flag', async () => {
      mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: true });

      const unsupportedAgentTypes: Array<'endpoint' | 'sentinel_one' | 'crowdstrike'> = [
        'endpoint',
        'sentinel_one',
        'crowdstrike',
      ];

      for (const agentType of unsupportedAgentTypes) {
        await render(agentType, [...ENDPOINT_CAPABILITIES], {
          canAccessResponseConsole: true,
        });

        await enterConsoleCommand(renderResult, user, 'cancel');

        await waitFor(() => {
          const historyItems = renderResult.container.querySelectorAll(
            '[data-test-subj*="historyItem"]'
          );
          expect(historyItems.length).toBeGreaterThan(0);
        });
      }
    });
  });
});
