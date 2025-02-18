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

describe('When using CommandExecutionOutput component', () => {
  let render: (
    props?: Partial<ConsoleProps>
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let setCmd1ToComplete: () => void;

  beforeEach(() => {
    const { renderConsole, commands, enterCommand } = getConsoleTestSetup();

    const cmd1 = commands.find((command) => command.name === 'cmd1');

    if (!cmd1) {
      throw new Error('cmd1 command not found in test mocks');
    }

    (cmd1.RenderComponent as jest.Mock).mockImplementation(
      (props: CommandExecutionComponentProps) => {
        setCmd1ToComplete = () => props.setStatus('success');

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
});
