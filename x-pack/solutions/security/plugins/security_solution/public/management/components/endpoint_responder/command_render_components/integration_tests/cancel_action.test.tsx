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
import { ExperimentalFeaturesService } from '../../../../../common/experimental_features_service';

jest.mock('../../../../../common/experimental_features_service');

const mockedExperimentalFeaturesService = ExperimentalFeaturesService as jest.Mocked<typeof ExperimentalFeaturesService>;

describe('When using cancel action from response actions console', () => {
  let mockedContext: AppContextTestRender;
  let user: UserEvent;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;

  const renderConsole = async (
    agentType: 'endpoint' | 'microsoft_defender_endpoint' | 'sentinel_one' | 'crowdstrike' = 'microsoft_defender_endpoint',
    capabilities: EndpointCapabilities[] = [...ENDPOINT_CAPABILITIES],
    privileges: Partial<ReturnType<typeof getEndpointAuthzInitialState>> = {}
  ) => {
    const renderResult = mockedContext.render(
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

    const consoleManagerMockAccess = getConsoleManagerMockRenderResultQueriesAndActions(
      user,
      renderResult
    );

    await consoleManagerMockAccess.clickOnRegisterNewConsole();
    await consoleManagerMockAccess.openRunningConsole();

    return renderResult;
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockedContext = createAppRootMockRenderer();

    // Set default experimental flags
    mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: true });

    // Reset the ExperimentalFeaturesService mock to default enabled state
    mockedExperimentalFeaturesService.get.mockReturnValue({
      microsoftDefenderEndpointCancelEnabled: true,
      responseActionsMSDefenderEndpointEnabled: true,
      microsoftDefenderEndpointRunScriptEnabled: true,
    } as any);

    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);
  });

  describe('Microsoft Defender Endpoint cancel functionality', () => {
    it('should show cancel command in help when user has write permissions', async () => {
      const renderResult = await renderConsole('microsoft_defender_endpoint');

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();
      expect(renderResult.getByTestId('test-helpOutput').textContent).toContain('cancel');
    });

    it('should not show cancel command in help when user lacks write permissions', async () => {
      const renderResult = await renderConsole('microsoft_defender_endpoint', [...ENDPOINT_CAPABILITIES], {
        canAccessResponseConsole: false,
      });

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should show error when trying to cancel without providing action ID', async () => {
      const renderResult = await renderConsole('microsoft_defender_endpoint');

      await enterConsoleCommand(renderResult, user, 'cancel');

      expect(renderResult.getByTestId('test-badArgument-message')).toBeTruthy();
    });

    it('should show pending actions selector when using cancel command with --action flag', async () => {
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

      const renderResult = await renderConsole('microsoft_defender_endpoint');

      await enterConsoleCommand(renderResult, user, 'cancel --action', { inputOnly: true });

      expect(renderResult.getByTestId('cancel-action-arg-0')).toBeTruthy();
    });

    it('should handle cancel API response correctly', async () => {
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

      apiMocks.responseProvider.agentPendingActionsSummary.mockReturnValue(mockPendingActions);

      const renderResult = await renderConsole('microsoft_defender_endpoint', [...ENDPOINT_CAPABILITIES], {
        canAccessResponseConsole: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel --action', { inputOnly: true });

      await waitFor(() => {
        expect(renderResult.getByTestId('cancel-action-arg-0')).toBeTruthy();
      });
    });

    it('should validate user permissions for specific command types', async () => {
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

      const renderResult = await renderConsole('microsoft_defender_endpoint', [...ENDPOINT_CAPABILITIES], {
        canKillProcess: false,
        canAccessResponseConsole: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel --action', { inputOnly: true });

      await waitFor(() => {
        expect(renderResult.getByTestId('cancel-action-arg-0')).toBeTruthy();
      });
    });
  });

  describe.each([
    'endpoint',
    'sentinel_one',
    'crowdstrike',
  ] as const)('Unsupported agent type: %s', (agentType) => {
    it('should not show cancel command in help', async () => {
      const renderResult = await renderConsole(agentType);

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should show error when trying to use cancel command', async () => {
      const renderResult = await renderConsole(agentType, [...ENDPOINT_CAPABILITIES], {
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

    it('should not show cancel command even when feature flag is enabled', async () => {
      mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: true });
      const renderResult = await renderConsole(agentType);

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should reject cancel command with action ID for unsupported agent type', async () => {
      const renderResult = await renderConsole(agentType, [...ENDPOINT_CAPABILITIES], {
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

  describe('Feature flag behavior', () => {
    it('should enable cancel command only for Microsoft Defender Endpoint when feature flag is enabled', async () => {
      mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: true });

      const renderResult = await renderConsole('microsoft_defender_endpoint');
      await enterConsoleCommand(renderResult, user, 'help');
      expect(renderResult.getByTestId('test-helpOutput').textContent).toContain('cancel');
    });

    it('should disable cancel command for Microsoft Defender Endpoint when feature flag is disabled', async () => {
      mockedExperimentalFeaturesService.get.mockReturnValue({
        microsoftDefenderEndpointCancelEnabled: false,
        responseActionsMSDefenderEndpointEnabled: true,
        microsoftDefenderEndpointRunScriptEnabled: true,
      } as any);

      mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: false });

      const renderResult = await renderConsole('microsoft_defender_endpoint');
      await enterConsoleCommand(renderResult, user, 'help');
      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should not enable cancel for unsupported agent types regardless of feature flag', async () => {
      mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: true });

      const endpointRenderResult = await renderConsole('endpoint');
      await enterConsoleCommand(endpointRenderResult, user, 'help');
      expect(endpointRenderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });
  });
});
