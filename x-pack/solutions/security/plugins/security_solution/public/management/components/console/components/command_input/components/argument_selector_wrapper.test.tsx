/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, act } from '@testing-library/react';
import type { ConsoleTestSetup } from '../../../mocks';
import { getConsoleTestSetup } from '../../../mocks';
import type { CommandArgumentValueSelectorProps } from '../../../types';

describe('Console: ArgumentSelectorWrapper', () => {
  let testSetup: ConsoleTestSetup;
  let renderResult: ReturnType<ConsoleTestSetup['renderConsole']>;
  let selectorProps: CommandArgumentValueSelectorProps | undefined;

  const SelectorComponentMock = jest.fn((props: CommandArgumentValueSelectorProps) => {
    selectorProps = props;
    return <span data-test-subj="test-argSelector">{props.valueText}</span>;
  });

  beforeEach(() => {
    selectorProps = undefined;
    testSetup = getConsoleTestSetup();

    // Add a command whose argument uses a value selector component
    testSetup.commands.push({
      name: 'cmd-with-selector',
      about: 'a command with an argument value selector',
      RenderComponent: () => null,
      args: {
        file: {
          about: 'a file argument',
          required: false,
          allowMultiples: false,
          SelectorComponent: SelectorComponentMock,
        },
      },
    });

    renderResult = testSetup.renderConsole();
    testSetup.enterCommand('cmd-with-selector --file', { inputOnly: true });
  });

  it('should pass `requestFocus` and `consoleApi` to the SelectorComponent', async () => {
    await waitFor(() => {
      expect(selectorProps).toBeDefined();
    });

    expect(selectorProps!.requestFocus).toBeInstanceOf(Function);
    expect(selectorProps!.consoleApi).toBeDefined();
    expect(selectorProps!.consoleApi.setInput).toBeInstanceOf(Function);
    expect(selectorProps!.consoleApi.setFocusOnInput).toBeInstanceOf(Function);
  });

  it('should return focus to the console input when `requestFocus()` is called', async () => {
    await waitFor(() => {
      expect(selectorProps).toBeDefined();
    });

    act(() => {
      selectorProps!.requestFocus!();
    });

    await waitFor(() => {
      expect(
        renderResult.getByTestId('test-keyCapture-input').querySelector('input')
      ).toHaveFocus();
    });
  });

  it('should update the console input when the selector uses `consoleApi.setInput()`', async () => {
    await waitFor(() => {
      expect(selectorProps).toBeDefined();
    });

    act(() => {
      selectorProps!.consoleApi.setInput('isolate');
    });

    await waitFor(() => {
      expect(renderResult.getByTestId('test-cmdInput-leftOfCursor').textContent).toEqual('isolate');
    });
  });
});
