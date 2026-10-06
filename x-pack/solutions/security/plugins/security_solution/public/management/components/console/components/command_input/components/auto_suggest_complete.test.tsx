/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import { getConsoleTestSetup } from '../../../mocks';
import type { CommandDefinition } from '../../..';

describe('Console: AutoSuggestComplete', () => {
  it('should suggest a command name when the user starts typing', async () => {
    const testSetup = getConsoleTestSetup();
    const { renderConsole, enterCommand } = testSetup;

    testSetup.commands.push({
      name: 'my-command',
      about: 'my command description',
      RenderComponent: () => null,
    } as unknown as CommandDefinition);

    const renderResult = renderConsole();

    await enterCommand('my', { inputOnly: true });

    await waitFor(() => {
      expect(renderResult.getByTestId('test-cmdInput-suggestion')).toHaveTextContent('-command');
    });
  });

  it('should suggest an argument name when the user types --', async () => {
    const testSetup = getConsoleTestSetup();
    const { renderConsole, enterCommand } = testSetup;

    testSetup.commands.push({
      name: 'my-command',
      about: 'my command description',
      RenderComponent: () => null,
      args: {
        'some-arg': { about: 'some argument', required: false },
      },
    } as unknown as CommandDefinition);

    const renderResult = renderConsole();

    // Enter command and then start typing an argument
    await enterCommand('my-command --so', { inputOnly: true });

    await waitFor(() => {
      expect(renderResult.getByTestId('test-cmdInput-suggestion')).toHaveTextContent('me-arg');
    });
  });

  it('should not suggest anything if there is no match', async () => {
    const testSetup = getConsoleTestSetup();
    const { renderConsole, enterCommand } = testSetup;

    testSetup.commands.push({
      name: 'my-command',
      about: 'my command description',
      RenderComponent: () => null,
    } as unknown as CommandDefinition);

    const renderResult = renderConsole();

    await enterCommand('unknown', { inputOnly: true });

    await waitFor(() => {
      expect(renderResult.queryByTestId('test-cmdInput-suggestion')).toBeNull();
    });
  });

  it('should not suggest anything if the input ends with a space', async () => {
    const testSetup = getConsoleTestSetup();
    const { renderConsole, enterCommand } = testSetup;

    testSetup.commands.push({
      name: 'my-command',
      about: 'my command description',
      RenderComponent: () => null,
    } as unknown as CommandDefinition);

    const renderResult = renderConsole();

    await enterCommand('my ', { inputOnly: true });

    await waitFor(() => {
      expect(renderResult.queryByTestId('test-cmdInput-suggestion')).toBeNull();
    });
  });

  it('should suggest the rest of the command when it partially matches', async () => {
    const testSetup = getConsoleTestSetup();
    const { renderConsole, enterCommand } = testSetup;

    testSetup.commands.push({
      name: 'isolate',
      about: 'isolate command',
      RenderComponent: () => null,
    } as unknown as CommandDefinition);

    const renderResult = renderConsole();

    await enterCommand('iso', { inputOnly: true });

    await waitFor(() => {
      expect(renderResult.getByTestId('test-cmdInput-suggestion')).toHaveTextContent('late');
    });
  });

  it('should not suggest anything if the cursor is in the middle of a word', async () => {
    const testSetup = getConsoleTestSetup();
    const { renderConsole, enterCommand } = testSetup;

    testSetup.commands.push({
      name: 'isolate',
      about: 'isolate command',
      RenderComponent: () => null,
    } as unknown as CommandDefinition);

    const renderResult = renderConsole();

    await enterCommand('is', { inputOnly: true });
    await waitFor(() => {
      expect(renderResult.getByTestId('test-cmdInput-suggestion')).toHaveTextContent('olate');
    });

    // Move cursor back to 'i'
    await enterCommand('{ArrowLeft}', { inputOnly: true, useKeyboard: true });

    await waitFor(() => {
      expect(renderResult.queryByTestId('test-cmdInput-suggestion')).toBeNull();
    });
  });

  it('should not suggest anything if the input matches a command name exactly', async () => {
    const testSetup = getConsoleTestSetup();
    const { renderConsole, enterCommand } = testSetup;

    testSetup.commands.push({
      name: 'isolate',
      about: 'isolate command',
      RenderComponent: () => null,
    } as unknown as CommandDefinition);

    const renderResult = renderConsole();

    await enterCommand('isolate', { inputOnly: true });

    await waitFor(() => {
      expect(renderResult.queryByTestId('test-cmdInput-suggestion')).toBeNull();
    });
  });

  it('should not suggest anything if the input matches an argument name exactly', async () => {
    const testSetup = getConsoleTestSetup();
    const { renderConsole, enterCommand } = testSetup;

    testSetup.commands.push({
      name: 'isolate',
      about: 'isolate command',
      RenderComponent: () => null,
      args: {
        'some-arg': { about: 'some argument', required: false },
      },
    } as unknown as CommandDefinition);

    const renderResult = renderConsole();

    await enterCommand('isolate --some-arg', { inputOnly: true });

    await waitFor(() => {
      expect(renderResult.queryByTestId('test-cmdInput-suggestion')).toBeNull();
    });
  });
});
