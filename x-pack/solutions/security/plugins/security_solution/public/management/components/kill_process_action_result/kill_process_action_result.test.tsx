/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  ActionDetails,
  KillProcessActionOutputContent,
  ResponseActionParametersWithProcessData,
  SuspendProcessActionOutputContent,
} from '../../../../common/endpoint/types';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { RESPONSE_ACTION_STATUS } from '../../common/translations';
import type { KillSuspendProcessActionResultProps } from './kill_process_action_result';
import { KillSuspendProcessActionResult } from './kill_process_action_result';

type TestActionDetails = ActionDetails<
  KillProcessActionOutputContent | SuspendProcessActionOutputContent,
  ResponseActionParametersWithProcessData
>;

describe('KillSuspendProcessActionResult', () => {
  const testPrefix = 'test';

  let appTestContext: AppContextTestRender;
  let generator: EndpointActionGenerator;
  let action: TestActionDetails;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<KillSuspendProcessActionResultProps>
  ) => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    generator = new EndpointActionGenerator('test');
    action = generator.generateActionDetails<
      KillProcessActionOutputContent | SuspendProcessActionOutputContent,
      ResponseActionParametersWithProcessData
    >({
      agents: ['agent-a'],
      command: 'kill-process',
    });

    render = (props = {}) =>
      (renderResult = appTestContext.render(
        <KillSuspendProcessActionResult action={action} data-test-subj={testPrefix} {...props} />
      ));
  });

  it('should warn and render nothing when the command is not kill/suspend process', () => {
    const consoleSpy = jest.spyOn(window.console, 'warn').mockImplementation(() => {});
    action = generator.generateActionDetails<
      KillProcessActionOutputContent | SuspendProcessActionOutputContent,
      ResponseActionParametersWithProcessData
    >({ agents: ['agent-a'], command: 'isolate' });

    render();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('kill-process'));
    expect(renderResult.queryByTestId(testPrefix)).toBeNull();
    consoleSpy.mockRestore();
  });

  it('should show the pending message when the action is not completed', () => {
    action = {
      ...action,
      isCompleted: false,
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

    expect(renderResult.getByTestId(`${testPrefix}-pending`).textContent).toEqual(
      RESPONSE_ACTION_STATUS.pendingMessage
    );
  });

  it('should render the process output data when the action completed successfully', () => {
    action = {
      ...action,
      outputs: {
        'agent-a': {
          type: 'json',
          content: {
            code: 'ra_kill-process_success_done',
            pid: 1234,
            entity_id: 'entity-a',
            process_name: 'malware.exe',
            command: 'malware.exe --run',
          },
        },
      },
    };

    const { getByTestId } = render();
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain('Action result:');
    expect(output).toContain('PID 1234');
    expect(output).toContain('Entity ID entity-a');
    expect(output).toContain('Name malware.exe');
    expect(output).toContain('Command malware.exe --run');
  });

  it('should only render the output fields that are present in the content', () => {
    action = {
      ...action,
      outputs: {
        'agent-a': {
          type: 'json',
          content: {
            code: 'ra_kill-process_success_done',
            pid: 1234,
          },
        },
      },
    };

    const { getByTestId } = render();
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain('PID 1234');
    expect(output).not.toContain('Entity ID');
    expect(output).not.toContain('Name');
    expect(output).not.toContain('Command');
  });

  it('should render the process output data for a suspend-process action', () => {
    action = generator.generateActionDetails<
      KillProcessActionOutputContent | SuspendProcessActionOutputContent,
      ResponseActionParametersWithProcessData
    >({
      agents: ['agent-a'],
      command: 'suspend-process',
      outputs: {
        'agent-a': {
          type: 'json',
          content: {
            code: 'ra_suspend-process_success_done',
            pid: 4321,
            entity_id: 'entity-b',
          },
        },
      },
    });

    const { getByTestId } = render();
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain('PID 4321');
    expect(output).toContain('Entity ID entity-b');
  });

  it('should show the failure message when the action was not successful', () => {
    action = {
      ...action,
      isCompleted: true,
      wasSuccessful: false,
      errors: ['Some failure'],
      agentState: {
        'agent-a': {
          isCompleted: true,
          wasSuccessful: false,
          wasCanceled: false,
          completedAt: '2022-04-30T16:08:47.449Z',
          errors: ['Some failure'],
        },
      },
    };

    render();

    expect(
      renderResult.getByTestId(
        `${testPrefix}-agent-a-outputFailureMessage-response-action-failure-info`
      )
    ).not.toBeNull();
  });

  it('should default to the first agent when the agentId prop is not provided', () => {
    action = generator.generateActionDetails<
      KillProcessActionOutputContent | SuspendProcessActionOutputContent,
      ResponseActionParametersWithProcessData
    >({
      agents: ['agent-a', 'agent-b'],
      command: 'kill-process',
      outputs: {
        'agent-a': { type: 'json', content: { code: 'ra_kill-process_success_done', pid: 111 } },
        'agent-b': { type: 'json', content: { code: 'ra_kill-process_success_done', pid: 222 } },
      },
    });

    const { getByTestId } = render();
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain('PID 111');
    expect(output).not.toContain('PID 222');
  });

  it('should render the result for the agentId provided', () => {
    action = generator.generateActionDetails<
      KillProcessActionOutputContent | SuspendProcessActionOutputContent,
      ResponseActionParametersWithProcessData
    >({
      agents: ['agent-a', 'agent-b'],
      command: 'kill-process',
      outputs: {
        'agent-a': { type: 'json', content: { code: 'ra_kill-process_success_done', pid: 111 } },
        'agent-b': { type: 'json', content: { code: 'ra_kill-process_success_done', pid: 222 } },
      },
    });

    const { getByTestId } = render({ agentId: 'agent-b' });
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain('PID 222');
    expect(output).not.toContain('PID 111');
  });

  it('should fall back to the action-level state when agentState has no entry for the agent', () => {
    action = {
      ...action,
      isCompleted: true,
      wasSuccessful: true,
      agentState: {},
      outputs: {
        'agent-a': {
          type: 'json',
          content: { code: 'ra_kill-process_success_done', pid: 1234 },
        },
      },
    };

    const { getByTestId } = render();
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain('Action result:');
    expect(output).toContain('PID 1234');
  });
});
