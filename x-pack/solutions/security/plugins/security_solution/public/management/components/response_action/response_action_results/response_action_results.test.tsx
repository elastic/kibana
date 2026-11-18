/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionDetails, MaybeImmutable } from '../../../../../common/endpoint/types';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import type { ResponseActionsApiCommandNames } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP } from '../../../../../common/endpoint/service/response_actions/constants';
import { OUTPUT_MESSAGES } from '../../endpoint_response_actions_list/translations';
import { ResponseActionResults } from './response_action_results';
import type { ResponseActionResultsProps } from './types';

describe('ResponseActionResults component', () => {
  const testPrefix = 'test';

  let appTestContext: AppContextTestRender;
  let render: (
    props?: Partial<ResponseActionResultsProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let action: MaybeImmutable<ActionDetails>;

  const generateAction = (
    overrides: Parameters<EndpointActionGenerator['generateActionDetails']>[0] = {}
  ) => new EndpointActionGenerator('test').generateActionDetails(overrides);

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    action = generateAction({ command: 'isolate', agents: ['agent-a'] });

    render = (props = {}) =>
      (renderResult = appTestContext.render(
        <ResponseActionResults action={action} data-test-subj={testPrefix} {...props} />
      ));
  });

  it('should render with the provided data-test-subj prefix', () => {
    render();

    expect(renderResult.getByTestId(testPrefix)).not.toBeNull();
  });

  it('should render nothing and log a console warning when agentId is not in action.agents', () => {
    const consoleSpy = jest.spyOn(window.console, 'warn').mockImplementation(() => {});

    render({ agentId: 'not-a-real-agent' });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not-a-real-agent'));
    expect(renderResult.queryByTestId(testPrefix)).toBeNull();

    consoleSpy.mockRestore();
  });

  describe('single agent status message', () => {
    const consoleCommandName = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP.isolate;
    const statusMessageTestId = `${testPrefix}-hostStatus`;

    it('should show the pending message when the agent action is not completed', () => {
      action = {
        ...action,
        agentState: {
          'agent-a': {
            isCompleted: false,
            wasSuccessful: false,
            wasCanceled: false,
            completedAt: undefined,
            errors: undefined,
          },
        },
      };

      render();

      expect(renderResult.getByTestId(statusMessageTestId).textContent).toEqual(
        OUTPUT_MESSAGES.isPending(consoleCommandName)
      );
    });

    it('should show the canceled message when the agent action was canceled', () => {
      action = {
        ...action,
        agentState: {
          'agent-a': {
            isCompleted: true,
            wasSuccessful: false,
            wasCanceled: true,
            completedAt: new Date().toISOString(),
            errors: undefined,
          },
        },
      };

      render();

      expect(renderResult.getByTestId(statusMessageTestId).textContent).toEqual(
        OUTPUT_MESSAGES.wasCanceled(consoleCommandName)
      );
    });

    it('should show the success message when the agent action was successful', () => {
      action = {
        ...action,
        agentState: {
          'agent-a': {
            isCompleted: true,
            wasSuccessful: true,
            wasCanceled: false,
            completedAt: new Date().toISOString(),
            errors: undefined,
          },
        },
      };

      render();

      expect(renderResult.getByTestId(statusMessageTestId).textContent).toEqual(
        OUTPUT_MESSAGES.wasSuccessful(consoleCommandName)
      );
    });

    it('should show the expired message when the action expired', () => {
      action = {
        ...action,
        isExpired: true,
        agentState: {
          'agent-a': {
            isCompleted: true,
            wasSuccessful: false,
            wasCanceled: false,
            completedAt: new Date().toISOString(),
            errors: ['some error'],
          },
        },
      };

      render();

      expect(renderResult.getByTestId(statusMessageTestId).textContent).toEqual(
        OUTPUT_MESSAGES.hasExpired(consoleCommandName)
      );
    });

    it('should show the failed message when the action failed and did not expire', () => {
      action = {
        ...action,
        isExpired: false,
        agentState: {
          'agent-a': {
            isCompleted: true,
            wasSuccessful: false,
            wasCanceled: false,
            completedAt: new Date().toISOString(),
            errors: ['some error'],
          },
        },
      };

      render();

      expect(renderResult.getByTestId(statusMessageTestId).textContent).toEqual(
        OUTPUT_MESSAGES.hasFailed(consoleCommandName)
      );
    });
  });

  describe('and dispatching to the command-specific results component', () => {
    const cases: Array<[ResponseActionsApiCommandNames, string]> = [
      ['isolate', 'isolatationResults'],
      ['unisolate', 'isolatationResults'],
      ['kill-process', 'killSuspendProcessResults'],
      ['suspend-process', 'killSuspendProcessResults'],
      ['running-processes', 'processesResults'],
      ['get-file', 'getFileResults'],
      ['execute', 'executeResults'],
      ['upload', 'uploadResults'],
      ['scan', 'scanResults'],
      ['runscript', 'runscriptResults'],
      ['cancel', 'cancelResults'],
      ['memory-dump', 'memoryDumpResults'],
    ];

    it.each(cases)(
      'should render the results component for a "%s" action',
      (command, expectedTestIdSuffix) => {
        action = generateAction({ command, agents: ['agent-a'] });

        render();

        expect(renderResult.getByTestId(`${testPrefix}-${expectedTestIdSuffix}`)).not.toBeNull();
      }
    );

    it('should not render any command results component while the agent action is pending', () => {
      action = generateAction({ command: 'kill-process', agents: ['agent-a'] });
      action = {
        ...action,
        agentState: {
          'agent-a': {
            isCompleted: false,
            wasSuccessful: false,
            wasCanceled: false,
            completedAt: undefined,
            errors: undefined,
          },
        },
      };

      render();

      expect(renderResult.queryByTestId(`${testPrefix}-killSuspendProcessResults`)).toBeNull();
    });
  });

  describe('multi-agent display', () => {
    beforeEach(() => {
      action = generateAction({ command: 'isolate', agents: ['agent-a', 'agent-b'] });
    });

    it('should render a host status/result section for every agent', () => {
      render();

      expect(renderResult.getAllByTestId(`${testPrefix}-hostStatusAndResults`)).toHaveLength(2);
    });

    it('should show each host name alongside its status', () => {
      render();

      expect(renderResult.getByTestId(testPrefix).textContent).toEqual(
        expect.stringContaining('Host-agent-a')
      );
      expect(renderResult.getByTestId(testPrefix).textContent).toEqual(
        expect.stringContaining('Host-agent-b')
      );
    });

    it('should fall back to the agent id when no host name is known', () => {
      action = { ...action, hosts: {} };

      render();

      expect(renderResult.getByTestId(testPrefix).textContent).toEqual(
        expect.stringContaining('agent-a')
      );
    });

    it('should show the completed date only for agents whose action has completed', () => {
      action = {
        ...action,
        agentState: {
          'agent-a': {
            isCompleted: true,
            wasSuccessful: true,
            wasCanceled: false,
            completedAt: new Date().toISOString(),
            errors: undefined,
          },
          'agent-b': {
            isCompleted: false,
            wasSuccessful: false,
            wasCanceled: false,
            completedAt: undefined,
            errors: undefined,
          },
        },
      };

      render();

      expect(renderResult.getAllByText(OUTPUT_MESSAGES.expandSection.completedAt)).toHaveLength(1);
    });

    it('should render a horizontal rule between agents but not after the last one', () => {
      render();

      expect(renderResult.container.querySelectorAll('hr')).toHaveLength(1);
    });

    it('should treat the display as single-agent when an explicit agentId is provided', () => {
      render({ agentId: 'agent-b' });

      expect(renderResult.getByTestId(testPrefix).textContent).not.toEqual(
        expect.stringContaining('Host-agent-b:')
      );
      expect(renderResult.container.querySelectorAll('hr')).toHaveLength(0);
    });
  });
});
