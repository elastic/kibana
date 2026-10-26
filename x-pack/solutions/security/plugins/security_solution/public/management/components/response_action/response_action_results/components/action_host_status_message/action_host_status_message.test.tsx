/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionDetails, MaybeImmutable } from '../../../../../../../common/endpoint/types';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { EndpointActionGenerator } from '../../../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP } from '../../../../../../../common/endpoint/service/response_actions/constants';
import { OUTPUT_MESSAGES } from '../../../../endpoint_response_actions_list/translations';
import type { ActionHostStatusMessageProps } from './action_host_status_message';
import { ActionHostStatusMessage } from './action_host_status_message';

describe('ActionHostStatusMessage component', () => {
  const testId = 'test';

  let appTestContext: AppContextTestRender;
  let render: (
    props?: Partial<ActionHostStatusMessageProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let action: MaybeImmutable<ActionDetails>;
  let generator: EndpointActionGenerator;

  const setAgentState = (state: Partial<ActionDetails['agentState'][string]>): void => {
    action = {
      ...action,
      agentState: {
        'agent-a': {
          isCompleted: true,
          wasSuccessful: true,
          wasCanceled: false,
          completedAt: new Date().toISOString(),
          errors: undefined,
          ...state,
        },
      },
    };
  };

  beforeEach(() => {
    generator = new EndpointActionGenerator('test');
    appTestContext = createAppRootMockRenderer();
    action = generator.generateActionDetails({ command: 'isolate', agents: ['agent-a'] });

    render = (props = {}) =>
      (renderResult = appTestContext.render(
        <ActionHostStatusMessage action={action} data-test-subj={testId} {...props} />
      ));
  });

  describe('for endpoint agent type', () => {
    const consoleCommandName = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP.isolate;

    it('should show pending message with warning color when not completed', () => {
      setAgentState({ isCompleted: false, wasSuccessful: false, completedAt: undefined });
      render();

      const element = renderResult.getByTestId(testId);

      expect(element.textContent).toEqual(OUTPUT_MESSAGES.isPending(consoleCommandName));
      expect(element.className).toContain('warning');
    });

    it('should show canceled message when action was canceled', () => {
      setAgentState({ wasCanceled: true, wasSuccessful: false });
      render();

      expect(renderResult.getByTestId(testId).textContent).toEqual(
        OUTPUT_MESSAGES.wasCanceled(consoleCommandName)
      );
    });

    it('should show success message with success color when action was successful', () => {
      setAgentState({ wasSuccessful: true });
      render();

      const element = renderResult.getByTestId(testId);

      expect(element.textContent).toEqual(OUTPUT_MESSAGES.wasSuccessful(consoleCommandName));
      expect(element.className).toContain('success');
    });

    it('should show failed message with danger color when action failed', () => {
      setAgentState({ wasSuccessful: false });
      action = { ...action, isExpired: false };
      render();

      const element = renderResult.getByTestId(testId);

      expect(element.textContent).toEqual(OUTPUT_MESSAGES.hasFailed(consoleCommandName));
      expect(element.className).toContain('danger');
    });

    it('should show expired message when action failed and is expired', () => {
      setAgentState({ wasSuccessful: false });
      action = { ...action, isExpired: true };
      render();

      expect(renderResult.getByTestId(testId).textContent).toEqual(
        OUTPUT_MESSAGES.hasExpired(consoleCommandName)
      );
    });

    it('should use first agent when `agentId` prop is not defined', () => {
      setAgentState({ wasSuccessful: true });
      render({ agentId: undefined });

      expect(renderResult.getByTestId(testId).textContent).toEqual(
        OUTPUT_MESSAGES.wasSuccessful(consoleCommandName)
      );
    });
  });

  describe('for CrowdStrike agent type', () => {
    beforeEach(() => {
      action = generator.generateActionDetails({
        command: 'isolate',
        agents: ['agent-a'],
        agentType: 'crowdstrike',
      });
    });

    it('should show "submitted" message when completed (isolate)', () => {
      setAgentState({ wasSuccessful: true });
      render();

      expect(renderResult.getByTestId(testId).textContent).toEqual(
        OUTPUT_MESSAGES.submittedSuccessfully(
          RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP.isolate
        )
      );
    });

    it('should show "failed" message when completed with failure (isolate)', () => {
      setAgentState({ wasSuccessful: false });
      render();

      expect(renderResult.getByTestId(testId).textContent).toEqual(
        OUTPUT_MESSAGES.hasFailed(RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP.isolate)
      );
    });

    it('should show pending message when not yet completed', () => {
      setAgentState({ isCompleted: false, wasSuccessful: false, completedAt: undefined });
      render();

      expect(renderResult.getByTestId(testId).textContent).toEqual(
        OUTPUT_MESSAGES.isPending(RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP.isolate)
      );
    });

    it('should NOT override the message for `runscript` actions', () => {
      action = generator.generateActionDetails({
        command: 'runscript',
        agents: ['agent-a'],
        agentType: 'crowdstrike',
      });
      setAgentState({ wasSuccessful: true });
      render();

      expect(renderResult.getByTestId(testId).textContent).toEqual(
        OUTPUT_MESSAGES.wasSuccessful(RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP.runscript)
      );
    });
  });
});
