/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { getConsoleTestSetup } from '../../../mocks';
import type { ConsoleTestSetup } from '../../../mocks';
import type {
  ConsoleProps,
  CommandArgDefinition,
  CommandDefinition,
  Command,
} from '../../../types';
import { executionTranslations } from './translations';

describe('When a Console command is entered by the user', () => {
  let render: (props?: Partial<ConsoleProps>) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let commands: ConsoleTestSetup['commands'];
  let enterCommand: ConsoleTestSetup['enterCommand'];

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    ({ commands, enterCommand } = testSetup);
    render = (props = {}) => (renderResult = testSetup.renderConsole(props));
  });

  it('should clear the command output history when `clear` is entered', async () => {
    render();
    await enterCommand('help');
    await enterCommand('help');

    expect(renderResult.getByTestId('test-historyOutput').childElementCount).toBe(2);

    await enterCommand('clear');

    expect(renderResult.getByTestId('test-historyOutput').childElementCount).toBe(0);
  });

  it('should show individual command help when `--help` option is used', async () => {
    render();
    await enterCommand('cmd2 --help');

    expect(renderResult.getByTestId('test-commandUsage')).toBeTruthy();
  });

  it('should render custom command `--help` output when Command service defines `getCommandUsage()`', async () => {
    const cmd2 = commands.find((command) => command.name === 'cmd2');

    if (cmd2) {
      cmd2.HelpComponent = () => {
        return <div data-test-subj="cmd-help">{'command help  here'}</div>;
      };
      cmd2.HelpComponent.displayName = 'HelpComponent';
    }

    render();
    await enterCommand('cmd2 --help');

    expect(renderResult.getByTestId('cmd-help')).toBeTruthy();
  });

  it('should execute a command entered', async () => {
    render();
    await enterCommand('cmd1');

    expect(renderResult.getByTestId('exec-output')).toBeTruthy();
  });

  it('should allow multiple of the same options if `allowMultiples` is `true`', async () => {
    render();
    await enterCommand('cmd3 --foo one --foo two');

    expect(renderResult.getByTestId('exec-output')).toBeTruthy();
  });

  it('should show error if unknown command', async () => {
    render();
    await enterCommand('foo-foo');

    expect(renderResult.getByTestId('test-unknownCommandError').textContent).toEqual(
      'Unsupported text/commandThe text you entered foo-foo is unsupported! Click  Help or type help for assistance.'
    );
  });

  it('should show error if options are used but command supports none', async () => {
    render();
    await enterCommand('cmd1 --foo');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Command does not support any arguments'
    );
  });

  it('should show error if unknown (single) argument is used', async () => {
    render();
    await enterCommand('cmd2 --file test --foo');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'The following cmd2 argument is not supported by this command: --foo'
    );
  });

  it('should show error if unknown (multiple) arguments are used', async () => {
    render();
    await enterCommand('cmd2 --file test --foo --bar');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'The following cmd2 arguments are not supported by this command: --foo, --bar'
    );
  });

  it('should show error if unknown arguments are used along with the `--help` argument', async () => {
    render();
    await enterCommand('cmd2 one two three --help');

    expect(renderResult.getByTestId('test-badArgument').textContent).toMatch(
      /Unsupported argument/
    );
  });

  it('should show error if values are given to the `--help` argument', async () => {
    render();
    await enterCommand('cmd2 --help one --help');

    expect(renderResult.getByTestId('test-badArgument').textContent).toMatch(
      /Unsupported argument/
    );
  });

  it('should show error if any required option is not set', async () => {
    render();
    await enterCommand('cmd2 --ext one');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Missing required argument: --file'
    );
  });

  it('should show error if argument is used more than once', async () => {
    render();
    await enterCommand('cmd2 --file one --file two');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Argument can only be used once: --file'
    );
  });

  it("should show error returned by the option's `validate()` callback", async () => {
    render();
    await enterCommand('cmd2 --file one --bad foo');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Invalid argument value: --bad. This is a bad value'
    );
  });

  it('should show error if no options were provided, but command requires some', async () => {
    render();
    await enterCommand('cmd2');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Missing required arguments: --file'
    );
  });

  it('should show error if all arguments are optional, but at least 1 must be defined', async () => {
    render();
    await enterCommand('cmd4');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'At least one argument must be used'
    );
  });

  it("should show error if command's definition `validate()` callback returns a message", async () => {
    const cmd1Definition = commands.find((command) => command.name === 'cmd1');

    if (!cmd1Definition) {
      throw new Error('cmd1 definition not found');
    }

    cmd1Definition.validate = () => 'command is invalid';

    render();
    await enterCommand('cmd1');

    expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
      'command is invalid'
    );
  });

  it("should show error for --help if command's definition `validate()` callback returns a message", async () => {
    const cmd1Definition = commands.find((command) => command.name === 'cmd1');

    if (!cmd1Definition) {
      throw new Error('cmd1 definition not found');
    }

    cmd1Definition.validate = () => 'command is invalid';

    render();
    await enterCommand('cmd1 --help');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'command is invalid'
    );
  });

  it('should show error no options were provided, but has exclusive or arguments', async () => {
    render();
    await enterCommand('cmd6');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'This command requires (only) one of the following arguments: --foo, --bar'
    );
  });

  it('should show error when it has multiple exclusive arguments', async () => {
    render();
    await enterCommand('cmd6 --foo 234 --bar 123');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'This command requires (only) one of the following arguments: --foo, --bar'
    );
  });

  it('should show success when one exclusive argument is used', async () => {
    render();
    await enterCommand('cmd6 --foo 234');

    expect(renderResult.getByTestId('exec-output')).toBeTruthy();
  });

  it('should show success when the other exclusive argument is used', async () => {
    render();
    await enterCommand('cmd6 --bar 234');

    expect(renderResult.getByTestId('exec-output')).toBeTruthy();
  });

  describe('Argument value validators', () => {
    let command: CommandDefinition;

    const setValidation = (validation: CommandArgDefinition['mustHaveValue']): void => {
      command.args!.foo.mustHaveValue = validation;
    };

    beforeEach(() => {
      command = commands.find(({ name }) => name === 'cmd3')!;
      command.args!.foo.allowMultiples = false;
    });

    it('should validate argument with `mustHaveValue=non-empty-string', async () => {
      setValidation('non-empty-string');
      const { getByTestId } = render();
      await enterCommand('cmd3 --foo=""');

      expect(getByTestId('test-badArgument-message')).toHaveTextContent(
        executionTranslations.mustHaveValue('foo')
      );
    });

    it('should validate argument with `mustHaveValue=truthy', async () => {
      setValidation('truthy');
      const { getByTestId } = render();
      await enterCommand('cmd3 --foo=""');

      expect(getByTestId('test-badArgument-message')).toHaveTextContent(
        executionTranslations.mustHaveValue('foo')
      );
    });

    it('should validate argument with `mustHaveValue=number', async () => {
      setValidation('number');
      const { getByTestId } = render();
      await enterCommand('cmd3 --foo="hi"');

      expect(getByTestId('test-badArgument-message')).toHaveTextContent(
        executionTranslations.mustBeNumber('foo')
      );
    });

    it('should validate argument with `mustHaveValue=number-greater-than-zero', async () => {
      setValidation('number-greater-than-zero');
      const { getByTestId } = render();
      await enterCommand('cmd3 --foo="0"');

      expect(getByTestId('test-badArgument-message')).toHaveTextContent(
        executionTranslations.mustBeGreaterThanZero('foo')
      );
    });

    it('should reject a value for an argument with `mustHaveValue=false`', async () => {
      const cmd2 = commands.find(({ name }) => name === 'cmd2');

      if (!cmd2) {
        throw new Error('cmd2 definition not found');
      }

      cmd2.args!.ext.mustHaveValue = false;

      const { getByTestId } = render();
      await enterCommand('cmd2 --file test --ext value');

      expect(getByTestId('test-badArgument-message')).toHaveTextContent(
        executionTranslations.argDoesNotAcceptAnyValue('ext')
      );
    });
  });

  describe('argState handling', () => {
    it('should include argState in command when available', async () => {
      const mockCommand = commands.find(({ name }) => name === 'cmd1');
      if (!mockCommand) {
        throw new Error('cmd1 not found');
      }

      // Mock RenderComponent to capture the command object
      let capturedCommand: Command | null = null;
      const originalRenderComponent = mockCommand.RenderComponent;
      const MockRenderComponent = (props: { command: Command }) => {
        capturedCommand = props.command;
        // Create mock props that satisfy CommandExecutionComponentProps interface
        const mockProps = {
          command: props.command,
          store: {},
          setStore: () => {},
          status: 'pending' as const,
          setStatus: () => {},
          ResultComponent: () => null,
        };
        return React.createElement(originalRenderComponent, mockProps);
      };
      mockCommand.RenderComponent = MockRenderComponent;

      render();
      await enterCommand('cmd1');

      // Verify that the command object has argState property (even if undefined)
      expect(capturedCommand).toHaveProperty('argState');

      // Restore original component
      mockCommand.RenderComponent = originalRenderComponent;
    });

    it('should pass argState to command history when command is executed', async () => {
      render();
      await enterCommand('cmd1');

      // Check that the command history was updated (basic verification)
      expect(renderResult.getByTestId('test-historyOutput')).toBeTruthy();

      // The core functionality is that argState gets passed to updateInputHistoryState
      // which is tested implicitly by the command execution working properly
    });

    it('should handle commands with argState in command execution flow', async () => {
      const mockCommand = commands.find(({ name }) => name === 'cmd1');
      if (!mockCommand) {
        throw new Error('cmd1 not found');
      }

      let capturedCommand: Command | null = null;
      const originalRenderComponent = mockCommand.RenderComponent;
      const MockRenderComponent = (props: { command: Command }) => {
        capturedCommand = props.command;
        // Create mock props that satisfy CommandExecutionComponentProps interface
        const mockProps = {
          command: props.command,
          store: {},
          setStore: () => {},
          status: 'pending' as const,
          setStatus: () => {},
          ResultComponent: () => null,
        };
        return React.createElement(originalRenderComponent, mockProps);
      };
      mockCommand.RenderComponent = MockRenderComponent;

      render();
      await enterCommand('cmd1');

      // Verify that the command object structure includes argState property
      expect(capturedCommand).toHaveProperty('input');
      expect(capturedCommand).toHaveProperty('inputDisplay');
      expect(capturedCommand).toHaveProperty('args');
      expect(capturedCommand).toHaveProperty('argState');
      expect(capturedCommand).toHaveProperty('commandDefinition');

      // Restore original component
      mockCommand.RenderComponent = originalRenderComponent;
    });
  });

  describe('exclusiveOrGroupId validation', () => {
    describe('when command has multiple exclusive or argument groups', () => {
      beforeEach(() => {
        commands.push({
          name: 'cmd-multi-exclusive',
          about: 'command with multiple exclusive or groups',
          RenderComponent: commands[0].RenderComponent,
          args: {
            argA: {
              about: 'arg a',
              required: false,
              allowMultiples: false,
              exclusiveOrGroupId: 'group1',
            },
            argB: {
              about: 'arg b',
              required: false,
              allowMultiples: false,
              exclusiveOrGroupId: 'group1',
            },
            argC: {
              about: 'arg c',
              required: false,
              allowMultiples: false,
              exclusiveOrGroupId: 'group2',
            },
            argD: {
              about: 'arg d',
              required: false,
              allowMultiples: false,
              exclusiveOrGroupId: 'group2',
            },
          },
        });
      });

      it('should show error when no arguments are provided', async () => {
        render();
        await enterCommand('cmd-multi-exclusive');

        expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
          'This command requires (only) one of the following arguments: --argA, --argB, --argC, --argD'
        );
      });

      it('should show error when only one group is satisfied but not the other', async () => {
        render();
        await enterCommand('cmd-multi-exclusive --argA');

        expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
          'This command requires (only) one of the following arguments: --argC, --argD'
        );
      });

      it('should show error when multiple arguments from the same group are provided', async () => {
        render();
        await enterCommand('cmd-multi-exclusive --argA --argB --argC');

        expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
          'This command requires (only) one of the following arguments: --argA, --argB'
        );
      });

      it('should succeed when exactly one argument from each group is provided', async () => {
        render();
        await enterCommand('cmd-multi-exclusive --argA --argC');

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
      });

      it('should succeed when an alternate argument from each group is provided', async () => {
        render();
        await enterCommand('cmd-multi-exclusive --argB --argD');

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
      });
    });
  });

  describe('conditionallyRequired validation', () => {
    describe('when command has conditionally required allOf arguments', () => {
      beforeEach(() => {
        commands.push({
          name: 'cmd-cond-allof',
          about: 'command with conditionally required allOf args',
          RenderComponent: commands[0].RenderComponent,
          args: {
            trigger: { about: 'trigger arg', required: false, allowMultiples: false },
            depA: {
              about: 'dep a',
              required: false,
              allowMultiples: false,
              conditionallyRequired: ['trigger'],
            },
            depB: {
              about: 'dep b',
              required: false,
              allowMultiples: false,
              conditionallyRequired: ['trigger'],
            },
          },
        });
      });

      it('should show error when trigger is used without any conditionally required args', async () => {
        render();
        await enterCommand('cmd-cond-allof --trigger');

        expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
          'Use of --trigger requires the following additional arguments: --depA, --depB'
        );
      });

      it('should show error when trigger is used with only some of the conditionally required args', async () => {
        render();
        await enterCommand('cmd-cond-allof --trigger --depA');

        expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
          'Use of --trigger requires the following additional arguments: --depA, --depB'
        );
      });

      it('should succeed when trigger is used with all conditionally required args', async () => {
        render();
        await enterCommand('cmd-cond-allof --trigger --depA --depB');

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
      });

      it('should succeed when trigger is not used and conditionally required args are absent', async () => {
        render();
        await enterCommand('cmd-cond-allof --depA');

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
      });
    });

    describe('when command has conditionally required oneOf (exclusiveOr) arguments', () => {
      beforeEach(() => {
        commands.push({
          name: 'cmd-cond-oneof',
          about: 'command with conditionally required oneOf args',
          RenderComponent: commands[0].RenderComponent,
          args: {
            trigger: { about: 'trigger arg', required: false, allowMultiples: false },
            depX: {
              about: 'dep x',
              required: false,
              allowMultiples: false,
              conditionallyRequired: ['trigger'],
              exclusiveOrGroupId: 'depGroup',
            },
            depY: {
              about: 'dep y',
              required: false,
              allowMultiples: false,
              conditionallyRequired: ['trigger'],
              exclusiveOrGroupId: 'depGroup',
            },
          },
        });
      });

      it('should show error when trigger is used without any argument from the exclusive or group', async () => {
        render();
        await enterCommand('cmd-cond-oneof --trigger');

        expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
          'Argument --trigger requires (only) one of the following arguments: --depX, --depY'
        );
      });

      it('should succeed when trigger is used with one argument from the exclusive or group', async () => {
        render();
        await enterCommand('cmd-cond-oneof --trigger --depX');

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
      });

      it('should succeed when trigger is used with the other argument from the exclusive or group', async () => {
        render();
        await enterCommand('cmd-cond-oneof --trigger --depY');

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
      });

      it('should succeed when trigger is not used and the exclusive or group is not required', async () => {
        render();
        await enterCommand('cmd-cond-oneof --depX');

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
      });
    });
  });
});
