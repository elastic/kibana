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
import type { ConsoleProps, CommandArgDefinition, CommandDefinition } from '../../../types';
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
      'This command supports only one of the following arguments: --foo, --bar'
    );
  });

  it('should show error when it has multiple exclusive arguments', async () => {
    render();
    await enterCommand('cmd6 --foo 234 --bar 123');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'This command supports only one of the following arguments: --foo, --bar'
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

  describe('allowUnknownArguments feature', () => {
    it('should allow unknown arguments when allowUnknownArguments is true', async () => {
      // Create a command that allows unknown arguments
      const testCommand = commands.find((command) => command.name === 'cmd2');
      if (!testCommand) {
        throw new Error('cmd2 definition not found');
      }

      // Set allowUnknownArguments to true
      testCommand.allowUnknownArguments = true;

      render();
      await enterCommand('cmd2 --file test --foo value1 --bar value2');

      // Should execute successfully without error
      expect(renderResult.getByTestId('exec-output')).toBeTruthy();
      expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();
    });

    it('should still validate unknown arguments when allowUnknownArguments is false', async () => {
      const testCommand = commands.find((command) => command.name === 'cmd2');
      if (!testCommand) {
        throw new Error('cmd2 definition not found');
      }

      // Explicitly set allowUnknownArguments to false
      testCommand.allowUnknownArguments = false;

      render();
      await enterCommand('cmd2 --file test --foo value1 --bar value2');

      // Should show error for unknown arguments
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'The following cmd2 arguments are not supported by this command: --foo, --bar'
      );
    });

    it('should still validate unknown arguments when allowUnknownArguments is undefined (default behavior)', async () => {
      const testCommand = commands.find((command) => command.name === 'cmd2');
      if (!testCommand) {
        throw new Error('cmd2 definition not found');
      }

      // Make sure allowUnknownArguments is undefined (default)
      delete testCommand.allowUnknownArguments;

      render();
      await enterCommand('cmd2 --file test --foo value1 --bar value2');

      // Should show error for unknown arguments (current behavior)
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'The following cmd2 arguments are not supported by this command: --foo, --bar'
      );
    });

    it('should work with mustHaveArgs when allowUnknownArguments is true', async () => {
      const testCommand = commands.find((command) => command.name === 'cmd2');
      if (!testCommand) {
        throw new Error('cmd2 definition not found');
      }

      testCommand.allowUnknownArguments = true;
      testCommand.mustHaveArgs = true;

      render();
      await enterCommand('cmd2 --foo value1 --bar value2');

      // Should execute successfully - unknown args satisfy mustHaveArgs requirement
      expect(renderResult.getByTestId('exec-output')).toBeTruthy();
      expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();
    });

    it('should still require known required arguments when allowUnknownArguments is true', async () => {
      const testCommand = commands.find((command) => command.name === 'cmd2');
      if (!testCommand) {
        throw new Error('cmd2 definition not found');
      }

      testCommand.allowUnknownArguments = true;

      render();
      await enterCommand('cmd2 --foo value1 --bar value2');

      // Should show error for missing required --file argument
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'Missing required arguments: --file'
      );
    });

    it('should allow unknown arguments with various value formats', async () => {
      const testCommand = commands.find((command) => command.name === 'cmd2');
      if (!testCommand) {
        throw new Error('cmd2 definition not found');
      }

      testCommand.allowUnknownArguments = true;

      render();
      await enterCommand('cmd2 --file test --foo=value1 --bar "value with spaces" --flag');

      // Should execute successfully with different argument formats
      expect(renderResult.getByTestId('exec-output')).toBeTruthy();
      expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();
    });

    it('should pass unknown arguments to command execution component', async () => {
      const testCommand = commands.find((command) => command.name === 'cmd2');
      if (!testCommand) {
        throw new Error('cmd2 definition not found');
      }

      testCommand.allowUnknownArguments = true;

      // Mock the render component to capture the command args
      let capturedCommand: any;
      const originalRenderComponent = testCommand.RenderComponent;
      testCommand.RenderComponent = (props: any) => {
        capturedCommand = props.command;
        return originalRenderComponent(props);
      };

      render();
      await enterCommand('cmd2 --file test --foo value1 --bar value2');

      // Should pass unknown arguments to the execution component
      expect(capturedCommand.args.foo).toEqual(['value1']);
      expect(capturedCommand.args.bar).toEqual(['value2']);
      expect(capturedCommand.args.file).toEqual(['test']);
    });

    it('should work with exclusive arguments when allowUnknownArguments is true', async () => {
      const testCommand = commands.find((command) => command.name === 'cmd6');
      if (!testCommand) {
        throw new Error('cmd6 definition not found');
      }

      testCommand.allowUnknownArguments = true;

      render();
      await enterCommand('cmd6 --foo 234 --unknownArg value');

      // Should execute successfully with exclusive + unknown args
      expect(renderResult.getByTestId('exec-output')).toBeTruthy();
      expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();
    });

    it('should still validate exclusive arguments conflict when allowUnknownArguments is true', async () => {
      const testCommand = commands.find((command) => command.name === 'cmd6');
      if (!testCommand) {
        throw new Error('cmd6 definition not found');
      }

      testCommand.allowUnknownArguments = true;

      render();
      await enterCommand('cmd6 --foo 234 --bar 123 --unknownArg value');

      // Should show error for exclusive arguments conflict
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'This command supports only one of the following arguments: --foo, --bar'
      );
    });

    describe('runscript command scenarios', () => {
      it('should allow script arguments to be passed directly for runscript command', async () => {
        // Create a mock runscript command with allowUnknownArguments
        const runscriptCommand: CommandDefinition = {
          name: 'runscript',
          about: 'Execute a custom script',
          allowUnknownArguments: true,
          RenderComponent: () => <div data-test-subj="exec-output">Script executed</div>,
          args: {
            ScriptName: {
              required: true,
              allowMultiples: false,
              about: 'Name of the script to execute',
              mustHaveValue: 'non-empty-string',
            },
            comment: {
              required: false,
              allowMultiples: false,
              about: 'Optional comment',
              mustHaveValue: 'non-empty-string',
            },
          },
        };

        // Add to commands list temporarily
        commands.push(runscriptCommand);

        render();
        await enterCommand('runscript --ScriptName test.ps1 --foo value1 --bar value2');

        // Should execute successfully with script arguments
        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
        expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();

        // Clean up
        commands.pop();
      });

      it('should preserve script argument values for runscript command', async () => {
        const runscriptCommand: CommandDefinition = {
          name: 'runscript',
          about: 'Execute a custom script',
          allowUnknownArguments: true,
          RenderComponent: (props: any) => {
            // Verify that script arguments are preserved
            const { command } = props;
            expect(command.args.foo).toEqual(['value1']);
            expect(command.args.bar).toEqual(['value with spaces']);
            expect(command.args.flag).toEqual([true]); // bare argument
            return <div data-test-subj="exec-output">Script executed</div>;
          },
          args: {
            ScriptName: {
              required: true,
              allowMultiples: false,
              about: 'Name of the script to execute',
              mustHaveValue: 'truthy',
            },
          },
        };

        commands.push(runscriptCommand);

        render();
        await enterCommand(
          'runscript --ScriptName test.ps1 --foo value1 --bar "value with spaces" --flag'
        );

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();

        commands.pop();
      });
    });
  });

  describe('Comprehensive runscript scenarios across EDRs', () => {
    describe('CrowdStrike runscript with both direct args and CommandLine', () => {
      let crowdstrikeRunscriptCommand: CommandDefinition;

      beforeEach(() => {
        crowdstrikeRunscriptCommand = {
          name: 'runscript',
          about: 'Execute a custom script on CrowdStrike',
          allowUnknownArguments: true,
          RenderComponent: (props: any) => {
            return <div data-test-subj="exec-output">CrowdStrike script executed</div>;
          },
          args: {
            Raw: {
              required: false,
              allowMultiples: false,
              about: 'Raw script content',
              mustHaveValue: 'non-empty-string',
              exclusiveOr: true,
            },
            CloudFile: {
              required: false,
              allowMultiples: false,
              about: 'Cloud file name',
              mustHaveValue: 'truthy',
              exclusiveOr: true,
            },
            CommandLine: {
              required: false,
              allowMultiples: false,
              about: 'Command line arguments',
              mustHaveValue: 'non-empty-string',
            },
            HostPath: {
              required: false,
              allowMultiples: false,
              about: 'Host path to script',
              mustHaveValue: 'non-empty-string',
              exclusiveOr: true,
            },
            Timeout: {
              required: false,
              allowMultiples: false,
              about: 'Execution timeout',
              mustHaveValue: 'number-greater-than-zero',
            },
          },
        };
        commands.push(crowdstrikeRunscriptCommand);
      });

      afterEach(() => {
        commands.pop();
      });

      it('should support direct script arguments: --CloudFile="script.sh" --foo=value --bar=value', async () => {
        let capturedCommand: any;
        crowdstrikeRunscriptCommand.RenderComponent = (props: any) => {
          capturedCommand = props.command;
          return <div data-test-subj="exec-output">CrowdStrike script executed</div>;
        };

        render();
        await enterCommand(
          'runscript --CloudFile="do_something.sh" --foo=some_value --bar=some_value'
        );

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
        expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();
        expect(capturedCommand.args.CloudFile).toEqual(['do_something.sh']);
        expect(capturedCommand.args.foo).toEqual(['some_value']);
        expect(capturedCommand.args.bar).toEqual(['some_value']);
      });

      it('should support CommandLine with equals: --CommandLine="--foo=value --bar=value"', async () => {
        let capturedCommand: any;
        crowdstrikeRunscriptCommand.RenderComponent = (props: any) => {
          capturedCommand = props.command;
          return <div data-test-subj="exec-output">CrowdStrike script executed</div>;
        };

        render();
        await enterCommand(
          'runscript --CloudFile="do_something.sh" --CommandLine="--foo=some_value --bar=some_value"'
        );

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
        expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();
        expect(capturedCommand.args.CloudFile).toEqual(['do_something.sh']);
        expect(capturedCommand.args.CommandLine).toEqual(['--foo=some_value --bar=some_value']);
      });

      it('should support CommandLine with spaces: --CommandLine="--foo value --bar value"', async () => {
        let capturedCommand: any;
        crowdstrikeRunscriptCommand.RenderComponent = (props: any) => {
          capturedCommand = props.command;
          return <div data-test-subj="exec-output">CrowdStrike script executed</div>;
        };

        render();
        await enterCommand(
          'runscript --CloudFile="do_something.sh" --CommandLine="--foo some_value --bar some_value"'
        );

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
        expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();
        expect(capturedCommand.args.CloudFile).toEqual(['do_something.sh']);
        expect(capturedCommand.args.CommandLine).toEqual(['--foo some_value --bar some_value']);
      });

      it('should support mixed approach: both direct args and CommandLine together', async () => {
        let capturedCommand: any;
        crowdstrikeRunscriptCommand.RenderComponent = (props: any) => {
          capturedCommand = props.command;
          return <div data-test-subj="exec-output">CrowdStrike script executed</div>;
        };

        render();
        await enterCommand(
          'runscript --CloudFile="do_something.sh" --CommandLine="--param1 value1" --foo=direct_value --bar direct_flag'
        );

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
        expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();
        expect(capturedCommand.args.CloudFile).toEqual(['do_something.sh']);
        expect(capturedCommand.args.CommandLine).toEqual(['--param1 value1']);
        expect(capturedCommand.args.foo).toEqual(['direct_value']);
        expect(capturedCommand.args.bar).toEqual([true]); // bare argument
      });

      it('should support Raw script with direct arguments', async () => {
        let capturedCommand: any;
        crowdstrikeRunscriptCommand.RenderComponent = (props: any) => {
          capturedCommand = props.command;
          return <div data-test-subj="exec-output">CrowdStrike script executed</div>;
        };

        render();
        await enterCommand('runscript --Raw="Get-Process" --foo=process_name --bar=verbose');

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
        expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();
        expect(capturedCommand.args.Raw).toEqual(['Get-Process']);
        expect(capturedCommand.args.foo).toEqual(['process_name']);
        expect(capturedCommand.args.bar).toEqual(['verbose']);
      });
    });

    describe('Microsoft Defender runscript with direct arguments', () => {
      let mdeRunscriptCommand: CommandDefinition;

      beforeEach(() => {
        mdeRunscriptCommand = {
          name: 'runscript',
          about: 'Execute a custom script on Microsoft Defender Endpoint',
          allowUnknownArguments: true,
          RenderComponent: (props: any) => {
            return <div data-test-subj="exec-output">MDE script executed</div>;
          },
          args: {
            ScriptName: {
              required: true,
              allowMultiples: false,
              about: 'Name of the script to execute',
              mustHaveValue: 'truthy',
            },
            Args: {
              required: false,
              allowMultiples: false,
              about: 'Script arguments',
              mustHaveValue: 'non-empty-string',
            },
          },
        };
        commands.push(mdeRunscriptCommand);
      });

      afterEach(() => {
        commands.pop();
      });

      it('should support direct script arguments: --ScriptName="script.ps1" --foo=value --bar=value', async () => {
        let capturedCommand: any;
        mdeRunscriptCommand.RenderComponent = (props: any) => {
          capturedCommand = props.command;
          return <div data-test-subj="exec-output">MDE script executed</div>;
        };

        render();
        await enterCommand(
          'runscript --ScriptName="test_script.ps1" --foo=some_value --bar=some_value'
        );

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
        expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();
        expect(capturedCommand.args.ScriptName).toEqual(['test_script.ps1']);
        expect(capturedCommand.args.foo).toEqual(['some_value']);
        expect(capturedCommand.args.bar).toEqual(['some_value']);
      });

      it('should support both Args parameter and direct arguments', async () => {
        let capturedCommand: any;
        mdeRunscriptCommand.RenderComponent = (props: any) => {
          capturedCommand = props.command;
          return <div data-test-subj="exec-output">MDE script executed</div>;
        };

        render();
        await enterCommand(
          'runscript --ScriptName="test_script.ps1" --Args="param1=value1" --foo=direct_value --bar=direct_value'
        );

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
        expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();
        expect(capturedCommand.args.ScriptName).toEqual(['test_script.ps1']);
        expect(capturedCommand.args.Args).toEqual(['param1=value1']);
        expect(capturedCommand.args.foo).toEqual(['direct_value']);
        expect(capturedCommand.args.bar).toEqual(['direct_value']);
      });

      it('should support complex argument formats', async () => {
        let capturedCommand: any;
        mdeRunscriptCommand.RenderComponent = (props: any) => {
          capturedCommand = props.command;
          return <div data-test-subj="exec-output">MDE script executed</div>;
        };

        render();
        await enterCommand(
          'runscript --ScriptName="complex_script.ps1" --param="value with spaces" --count=42 --enabled --config="{json: true}"'
        );

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
        expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();
        expect(capturedCommand.args.ScriptName).toEqual(['complex_script.ps1']);
        expect(capturedCommand.args.param).toEqual(['value with spaces']);
        expect(capturedCommand.args.count).toEqual(['42']);
        expect(capturedCommand.args.enabled).toEqual([true]); // bare argument
        expect(capturedCommand.args.config).toEqual(['{json: true}']);
      });

      it('should still require ScriptName when using direct arguments', async () => {
        render();
        await enterCommand('runscript --foo=value --bar=value');

        expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
          'Missing required arguments: --ScriptName'
        );
      });
    });

    describe('Backward compatibility validation', () => {
      it('should maintain existing CrowdStrike CommandLine behavior', async () => {
        const crowdstrikeCommand = {
          name: 'runscript',
          about: 'Execute a custom script on CrowdStrike',
          allowUnknownArguments: true,
          RenderComponent: () => <div data-test-subj="exec-output">Legacy CommandLine works</div>,
          args: {
            CloudFile: {
              required: false,
              allowMultiples: false,
              about: 'Cloud file name',
              mustHaveValue: 'truthy',
              exclusiveOr: true,
            },
            CommandLine: {
              required: false,
              allowMultiples: false,
              about: 'Command line arguments',
              mustHaveValue: 'non-empty-string',
            },
          },
        };
        commands.push(crowdstrikeCommand);

        render();
        // Test traditional CrowdStrike approach still works
        await enterCommand(
          'runscript --CloudFile="legacy_script.sh" --CommandLine="traditional args"'
        );

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
        expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();

        commands.pop();
      });

      it('should maintain existing Microsoft Defender Args behavior', async () => {
        const mdeCommand = {
          name: 'runscript',
          about: 'Execute a custom script on Microsoft Defender',
          allowUnknownArguments: true,
          RenderComponent: () => <div data-test-subj="exec-output">Legacy Args works</div>,
          args: {
            ScriptName: {
              required: true,
              allowMultiples: false,
              about: 'Script name',
              mustHaveValue: 'truthy',
            },
            Args: {
              required: false,
              allowMultiples: false,
              about: 'Script arguments',
              mustHaveValue: 'non-empty-string',
            },
          },
        };
        commands.push(mdeCommand);

        render();
        // Test traditional Microsoft Defender approach still works
        await enterCommand(
          'runscript --ScriptName="legacy_script.ps1" --Args="traditional arguments"'
        );

        expect(renderResult.getByTestId('exec-output')).toBeTruthy();
        expect(renderResult.queryByTestId('test-badArgument-message')).toBeNull();

        commands.pop();
      });
    });
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
  });
});
