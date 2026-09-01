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
import { enterConsoleCommand, getConsoleSelectorsAndActionMock } from '../../../console/mocks';
import { waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { getEndpointAuthzInitialState } from '../../../../../../common/endpoint/service/authz';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import type {
  EndpointCapabilities,
  ResponseActionAgentType,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import {
  ENDPOINT_CAPABILITIES,
  RESPONSE_ACTION_AGENT_TYPE,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import type { PendingActionsResponse } from '../../../../../../common/endpoint/types';
import { ExperimentalFeaturesService } from '../../../../../common/experimental_features_service';
import { isActionSupportedByAgentType } from '../../../../../../common/endpoint/service/response_actions/is_response_action_supported';

jest.mock('../../../../../common/experimental_features_service');

const mockedExperimentalFeaturesService = ExperimentalFeaturesService as jest.Mocked<
  typeof ExperimentalFeaturesService
>;

// Test data factories
const createMockPendingActions = (
  actions: Record<string, number> = { isolate: 1 }
): PendingActionsResponse => ({
  data: [
    {
      agent_id: 'a.b.c',
      pending_actions: actions,
    },
  ],
});

const SUPPORTED_AGENT_TYPES = RESPONSE_ACTION_AGENT_TYPE.filter((type) => {
  return isActionSupportedByAgentType(type, 'cancel', 'manual');
});

const UNSUPPORTED_AGENT_TYPES = RESPONSE_ACTION_AGENT_TYPE.filter((type) => {
  return !isActionSupportedByAgentType(type, 'cancel', 'manual');
});

describe('When using cancel action from response actions console', () => {
  let mockedContext: AppContextTestRender;
  let user: UserEvent;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let endpointCapabilities: EndpointCapabilities[];
  let consoleMockUtils: ReturnType<typeof getConsoleSelectorsAndActionMock>;

  // Simplified render function with minimal setup
  const renderConsole = async (
    agentType: ResponseActionAgentType = 'microsoft_defender_endpoint',
    privileges: Partial<ReturnType<typeof getEndpointAuthzInitialState>> = {}
  ) => {
    const renderResult = mockedContext.render(
      <ConsoleManagerTestComponent
        registerConsoleProps={() => ({
          consoleProps: {
            'data-test-subj': 'test',
            commands: getEndpointConsoleCommands({
              agentType,
              endpointCapabilities,
              endpointAgentId: 'a.b.c',
              endpointPrivileges: {
                ...getEndpointAuthzInitialStateMock(),
                loading: false,
                ...privileges,
              },
              platform: 'windows',
            }),
          },
        })}
      />
    );

    consoleMockUtils = getConsoleSelectorsAndActionMock(renderResult, user);
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
    endpointCapabilities = [...ENDPOINT_CAPABILITIES];

    // Set default experimental flags
    mockedContext.setExperimentalFlag({
      microsoftDefenderEndpointCancelEnabled: true,
      responseActionsEndpointCancel: true,
    });

    // Reset the ExperimentalFeaturesService mock to default enabled state
    // @ts-expect-error - we do not need to specify whole object for testing purposes
    mockedExperimentalFeaturesService.get.mockReturnValue({
      microsoftDefenderEndpointCancelEnabled: true,
      microsoftDefenderEndpointRunScriptEnabled: true,
      responseActionsEndpointCancel: true,
    });

    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);
  });

  describe.each(SUPPORTED_AGENT_TYPES)('and agent type is: %s', (agentType) => {
    it('should show cancel command in help when user has write permissions', async () => {
      const renderResult = await renderConsole(agentType);

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput').textContent).toContain('cancel');
    });

    it('should not show cancel command in help when user lacks write permissions', async () => {
      const renderResult = await renderConsole(agentType, {
        canCancelAction: false,
      });

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should show error when trying to cancel without providing action ID', async () => {
      const renderResult = await renderConsole(agentType);

      await enterConsoleCommand(renderResult, user, 'cancel');

      expect(renderResult.getByTestId('test-badArgument-message')).toBeTruthy();
    });

    it('should show pending actions selector when using cancel command with --action flag', async () => {
      apiMocks.responseProvider.agentPendingActionsSummary.mockReturnValue(
        createMockPendingActions({ isolate: 1, 'kill-process': 1 })
      );

      const renderResult = await renderConsole(agentType);

      await enterConsoleCommand(renderResult, user, 'cancel --action', { inputOnly: true });

      expect(renderResult.getByTestId('cancel-action-arg-0')).toBeTruthy();
    });

    it('should handle cancel API response correctly', async () => {
      apiMocks.responseProvider.agentPendingActionsSummary.mockReturnValue(
        createMockPendingActions()
      );

      const renderResult = await renderConsole(agentType, {
        canCancelAction: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel --action', { inputOnly: true });

      await waitFor(() => {
        expect(renderResult.getByTestId('cancel-action-arg-0')).toBeTruthy();
      });
    });

    it('should validate user permissions for specific command types', async () => {
      apiMocks.responseProvider.agentPendingActionsSummary.mockReturnValue(
        createMockPendingActions({ 'kill-process': 1 })
      );

      const renderResult = await renderConsole(agentType, {
        canKillProcess: false,
        canCancelAction: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel --action', { inputOnly: true });

      await waitFor(() => {
        expect(renderResult.getByTestId('cancel-action-arg-0')).toBeTruthy();
      });
    });

    if (agentType === 'endpoint') {
      it('should have a --force argument available', async () => {
        const renderResult = await renderConsole(agentType);
        await enterConsoleCommand(renderResult, user, 'cancel --help');

        expect(renderResult.getByTestId('test-commandUsage').textContent).toContain('--force');
      });
    } else {
      it('should NOT have a --force argument available', async () => {
        const renderResult = await renderConsole(agentType);
        await enterConsoleCommand(renderResult, user, 'cancel --help');

        expect(renderResult.getByTestId('test-commandUsage').textContent).not.toContain('--force');
      });
    }
  });

  describe.each(UNSUPPORTED_AGENT_TYPES)('Unsupported agent type: %s', (agentType) => {
    it('should not show cancel command in help', async () => {
      const renderResult = await renderConsole(agentType);

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should show error when trying to use cancel command', async () => {
      const renderResult = await renderConsole(agentType, {
        canCancelAction: true,
      });

      await enterConsoleCommand(renderResult, user, 'cancel');

      await waitFor(() => {
        const historyItems = renderResult.container.querySelectorAll(
          '[data-test-subj*="historyItem"]'
        );
        expect(historyItems.length).toBeGreaterThan(0);
      });
    });

    it('should reject cancel command with action ID', async () => {
      const renderResult = await renderConsole(agentType, {
        canCancelAction: true,
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

  describe('and agent type is endpoint', () => {
    it('should display help panel "+" button disabled if Endpoint does not support cancel', async () => {
      endpointCapabilities = ENDPOINT_CAPABILITIES.filter((capability) => capability !== 'cancel');
      const renderResult = await renderConsole('endpoint');
      consoleMockUtils.openHelpPanel();

      expect(
        (
          renderResult.getByTestId(
            'test-commandList-Responseactions-cancel-addToInput'
          ) as HTMLButtonElement
        ).disabled
      ).toBe(true);
    });
  });

  describe('Feature flag behavior', () => {
    it('should enable cancel command for Microsoft Defender Endpoint when feature flag is enabled', async () => {
      const renderResult = await renderConsole('microsoft_defender_endpoint');

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput').textContent).toContain('cancel');
    });

    it('should disable cancel command for Microsoft Defender Endpoint when feature flag is disabled', async () => {
      // @ts-expect-error - we do not need to specify whole object for testing purposes
      mockedExperimentalFeaturesService.get.mockReturnValue({
        microsoftDefenderEndpointCancelEnabled: false,
        microsoftDefenderEndpointRunScriptEnabled: true,
      });
      mockedContext.setExperimentalFlag({ microsoftDefenderEndpointCancelEnabled: false });

      const renderResult = await renderConsole('microsoft_defender_endpoint');

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });

    it('should disable cancel command for Endpoint when feature flag is disabled', async () => {
      // @ts-expect-error - we do not need to specify whole object for testing purposes
      mockedExperimentalFeaturesService.get.mockReturnValue({
        responseActionsEndpointCancel: false,
      });
      mockedContext.setExperimentalFlag({ responseActionsEndpointCancel: false });

      const renderResult = await renderConsole('endpoint');

      await enterConsoleCommand(renderResult, user, 'help');

      expect(renderResult.getByTestId('test-helpOutput').textContent).not.toContain('cancel');
    });
  });
});
