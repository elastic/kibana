/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type {
  ActionDetails,
  ResponseActionMemoryDumpOutputContent,
  ResponseActionMemoryDumpParameters,
} from '../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import React from 'react';
import { MemoryDumpResponseActionOutputResult } from './memory_dump_response_action_output_result';
import { RESPONSE_ACTION_STATUS, YES_LABEL, NO_LABEL } from '../../common/translations';

describe('MemoryDumpResponseActionOutputResult component', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let action: ActionDetails<
    ResponseActionMemoryDumpOutputContent,
    ResponseActionMemoryDumpParameters
  >;
  let agentId: string | undefined;

  beforeEach(() => {
    const generator = new EndpointActionGenerator('seed');

    appTestContext = createAppRootMockRenderer();
    action = generator.generateActionDetails<
      ResponseActionMemoryDumpOutputContent,
      ResponseActionMemoryDumpParameters
    >({
      command: 'memory-dump',
      isCompleted: true,
      isExpired: false,
      agentType: 'endpoint',
      status: 'successful',
    });

    agentId = action.agents[0];

    // Add a second agent id to the action
    action.agents.unshift('agent-2');
    action.agentState['agent-2'] = {
      isCompleted: true,
      wasSuccessful: true,
      wasCanceled: false,
      errors: undefined,
      completedAt: new Date().toISOString(),
    };
    // @ts-expect-error
    action.outputs['agent-2'] = {
      type: 'json',
      content: {
        code: 'ra_memory_dump_success',
        path: '/home/user/agent-2/tmp/memory-dump.2025-11-03T16:22:05.365Z.zip',
        file_size: 22790,
        disk_free_space: 1150000,
      },
    };

    render = () => {
      renderResult = appTestContext.render(
        <MemoryDumpResponseActionOutputResult
          action={action}
          agentId={agentId}
          data-test-subj="test"
        />
      );

      return renderResult;
    };
  });

  it('should render successful output', () => {
    const { getByTestId } = render();

    expect(getByTestId('test').textContent).toEqual(
      'Memory dump file was created on host:' +
        `File: /home/user/${agentId}/tmp/memory-dump.2025-11-03T16:22:05.365Z.zip ` +
        'Size: 22.79MB' +
        'Disk free space: 1.15GB'
    );
  });

  it('should display pending if action not complete yet for agent id', () => {
    action.isCompleted = false;
    action.agentState[agentId!] = {
      isCompleted: false,
      wasSuccessful: false,
      wasCanceled: false,
      errors: undefined,
      completedAt: undefined,
    };
    const { getByTestId } = render();

    expect(getByTestId('test').textContent).toEqual(RESPONSE_ACTION_STATUS.pendingMessage);
  });

  it('should render failure output', () => {
    action.isCompleted = true;
    action.wasSuccessful = false;
    action.status = 'failed';
    action.errors = ['Error info A'];
    action.agentState[agentId!] = {
      isCompleted: true,
      wasSuccessful: false,
      wasCanceled: false,
      errors: ['Error info A'],
      completedAt: new Date().toISOString(),
    };
    const { getByTestId } = render();

    expect(getByTestId('test').textContent).toEqual(
      'The following error was encountered:Host: Host-agent-aErrors: Error info A'
    );
  });

  it('should render output for first agent if one is not provided', () => {
    agentId = undefined;
    const { getByTestId } = render();

    expect(getByTestId('test').textContent).toEqual(
      'Memory dump file was created on host:' +
        'File: /home/user/agent-2/tmp/memory-dump.2025-11-03T16:22:05.365Z.zip ' +
        'Size: 22.26KB' +
        'Disk free space: 1.10MB'
    );
  });

  it('should display nothing if agentId provided is not in the action', () => {
    agentId = 'not-in-action';
    const { getByTestId } = render();

    expect(getByTestId('test').textContent).toEqual('');
  });

  it('should render a copy button for the file path', () => {
    const { getByRole } = render();

    expect(getByRole('button', { name: 'Copy file path to clipboard' })).toBeTruthy();
  });

  it('should NOT render total memory size and total bytes captured when absent from output', () => {
    const { getByTestId, queryByText } = render();

    expect(getByTestId('test').textContent).not.toContain('Total memory size');
    expect(queryByText('Total memory size', { exact: false })).toBeNull();
    expect(queryByText('Total bytes captured', { exact: false })).toBeNull();
  });

  it('should render total memory size and total bytes captured for raw memory dumps', () => {
    // @ts-expect-error
    action.outputs[agentId!].content.total_memory_size = 53_000_000;
    // @ts-expect-error
    action.outputs[agentId!].content.total_bytes_captured = 52_000_000;

    const { getByTestId } = render();

    expect(getByTestId('test').textContent).toEqual(
      'Memory dump file was created on host:' +
        `File: /home/user/${agentId}/tmp/memory-dump.2025-11-03T16:22:05.365Z.zip ` +
        'Size: 22.79MB' +
        'Disk free space: 1.15GB' +
        'Total memory size: 50.54MB' +
        'Total bytes captured: 49.59MB'
    );
  });

  it('should NOT render user space included when absent from output', () => {
    const { queryByText } = render();

    expect(queryByText('User space included', { exact: false })).toBeNull();
  });

  it('should render user space included as Yes when user_space_included is true', () => {
    // @ts-expect-error
    action.outputs[agentId!].content.user_space_included = true;

    const { getByTestId } = render();

    expect(getByTestId('test').textContent).toContain(`User space included: ${YES_LABEL}`);
  });

  it('should render user space included as No when user_space_included is false', () => {
    // @ts-expect-error
    action.outputs[agentId!].content.user_space_included = false;

    const { getByTestId } = render();

    expect(getByTestId('test').textContent).toContain(`User space included: ${NO_LABEL}`);
  });

  it('should NOT render driver warning when dump_executed_from_driver is absent', () => {
    const { queryByText } = render();

    expect(
      queryByText(/This kernel memory dump was collected from user mode/, { exact: false })
    ).toBeNull();
  });

  it('should NOT render driver warning when dump_executed_from_driver is true', () => {
    // @ts-expect-error
    action.outputs[agentId!].content.dump_executed_from_driver = true;

    const { queryByText } = render();

    expect(
      queryByText(/This kernel memory dump was collected from user mode/, { exact: false })
    ).toBeNull();
  });

  it('should render driver warning when dump_executed_from_driver is false', () => {
    // @ts-expect-error
    action.outputs[agentId!].content.dump_executed_from_driver = false;

    const { getByText } = render();

    expect(
      getByText(
        'This kernel memory dump was collected from user mode. It does not include user-mode memory and may be subject to OS restrictions that limit coverage on some systems. If a full process memory for forensics is needed execute a `memory-dump --raw` instead',
        { exact: false }
      )
    ).toBeTruthy();
  });
});
