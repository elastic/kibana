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

  it('should render the "No process result" message when no output content is available', () => {
    action = {
      ...action,
      outputs: {},
    };

    const { getByTestId } = render();

    expect(getByTestId(testPrefix).textContent).toContain('No process result is available');
  });

  describe('and the action output contains process descendants', () => {
    const descendants = [
      {
        pid: 456,
        parent_pid: 234,
        entity_id: 'ksuqwn8364fnbks.456',
        command: '456_command.exe',
        was_killed: true,
      },
      {
        pid: 567,
        parent_pid: 456,
        entity_id: 'ksuqwn8364fnbks.567',
        command: '567_command.exe',
        was_killed: true,
      },
      {
        pid: 5671,
        parent_pid: 567,
        entity_id: 'ksuqwn8364fnbks.5671',
        command: '5671_command.exe',
        was_killed: true,
      },
      {
        pid: 56711,
        parent_pid: 5671,
        entity_id: 'ksuqwn8364fnbks.56711',
        command: '56711_command.exe',
        was_killed: true,
      },
      {
        pid: 56712,
        parent_pid: 5671,
        entity_id: 'ksuqwn8364fnbks.56712',
        command: '56712_command.exe',
        was_killed: true,
      },
      {
        pid: 654,
        parent_pid: 234,
        entity_id: 'ksuqwn8364fnbks.654',
        command: '654_command.exe',
        was_killed: false,
        error: 'process is protected',
      },
    ];

    beforeEach(() => {
      action = {
        ...action,
        outputs: {
          'agent-a': {
            type: 'json',
            content: {
              code: 'ra_kill-process_success_done',
              pid: 234,
              descendants,
            },
          },
        },
      };
    });

    it('should render the descendants label with the descendant count', () => {
      const { getByTestId } = render();

      expect(getByTestId(testPrefix).textContent).toContain('Descendants (6)');
    });

    it('should render the process tree with a node for each descendant', () => {
      const { getByTestId } = render();
      const treeTestId = `${testPrefix}-agent-a-processTree`;

      // A node is rendered for each descendant, keyed by PID
      [456, 567, 5671, 56711, 56712, 654].forEach((pid) => {
        expect(getByTestId(`${treeTestId}-${pid}`)).not.toBeNull();
      });
    });

    it('should render the details of a descendant process within the tree', () => {
      const { getAllByTestId } = render();

      expect(
        getAllByTestId(`${testPrefix}-agent-a-processTree-456-details`)[0].textContent
      ).toContain('456_command.exe');
    });

    it('should not render the descendants tree for a suspend-process action', () => {
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
              descendants: [{ pid: 456, parent_pid: 4321, command: '456_command.exe' }],
            },
          },
        },
      });

      const { getByTestId, queryByTestId } = render();

      expect(getByTestId(testPrefix).textContent).not.toContain('Descendants');
      expect(queryByTestId(`${testPrefix}-agent-a-processTree`)).toBeNull();
    });

    it('should not render the descendants section when the output has no descendants', () => {
      action = {
        ...action,
        outputs: {
          'agent-a': {
            type: 'json',
            content: { code: 'ra_kill-process_success_done', pid: 1234 },
          },
        },
      };

      const { getByTestId, queryByTestId } = render();

      expect(getByTestId(testPrefix).textContent).not.toContain('Descendants');
      expect(queryByTestId(`${testPrefix}-agent-a-processTree`)).toBeNull();
    });
  });
});
