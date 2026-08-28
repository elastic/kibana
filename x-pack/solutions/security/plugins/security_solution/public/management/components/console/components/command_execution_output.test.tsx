/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ConsoleProps } from '..';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { getConsoleTestSetup } from '../mocks';
import { act } from '@testing-library/react';
import type { CommandExecutionComponentProps } from '../types';
import type { CommandExecutionState } from './console_state/types';

describe('When using CommandExecutionOutput component', () => {
  let render: (
    props?: Partial<ConsoleProps>
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let setCmd1ToComplete: () => void;
  let setCmd1Status: (status: CommandExecutionState['status']) => void;

  beforeEach(() => {
    const { renderConsole, commands, enterCommand } = getConsoleTestSetup();

    const cmd1 = commands.find((command) => command.name === 'cmd1');

    if (!cmd1) {
      throw new Error('cmd1 command not found in test mocks');
    }

    (cmd1.RenderComponent as jest.Mock).mockImplementation(
      (props: CommandExecutionComponentProps) => {
        setCmd1ToComplete = () => props.setStatus('success');
        setCmd1Status = (status) => props.setStatus(status);

        return <div>{'output'}</div>;
      }
    );

    render = async (props = {}) => {
      renderResult = renderConsole(props);
      await enterCommand('cmd1');
      return renderResult;
    };
  });

  it('should show long running hint message if pending and >15s have passed', async () => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    await render();

    expect(renderResult.queryByTestId('test-longRunningCommandHint')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(16 * 1000);
    });

    expect(renderResult.getByTestId('test-longRunningCommandHint')).not.toBeNull();
  });

  it('should remove long running hint message if command completes', async () => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    await render();

    act(() => {
      jest.advanceTimersByTime(16 * 1000);
    });

    expect(renderResult.getByTestId('test-longRunningCommandHint')).not.toBeNull();

    act(() => {
      setCmd1ToComplete();
    });

    expect(renderResult.queryByTestId('test-longRunningCommandHint')).toBeNull();
  });

  it('should not show the busy indicator or long running hint while status is `creating`', async () => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    await render();

    act(() => {
      setCmd1Status('creating');
    });

    act(() => {
      jest.advanceTimersByTime(16 * 1000);
    });

    expect(renderResult.container.querySelector('.busy-indicator')).toBeNull();
    expect(renderResult.queryByTestId('test-longRunningCommandHint')).toBeNull();
  });

  it('should only start the long running hint timer once status becomes `pending`', async () => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    await render();

    // While `creating`, the hint should not appear even after the long-running threshold elapses
    act(() => {
      setCmd1Status('creating');
    });
    act(() => {
      jest.advanceTimersByTime(16 * 1000);
    });
    expect(renderResult.queryByTestId('test-longRunningCommandHint')).toBeNull();

    // Once the command transitions to `pending`, the timer starts fresh and the hint appears after 15s
    act(() => {
      setCmd1Status('pending');
    });
    act(() => {
      jest.advanceTimersByTime(16 * 1000);
    });
    expect(renderResult.getByTestId('test-longRunningCommandHint')).not.toBeNull();
  });
});
