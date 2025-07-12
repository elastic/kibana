/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseCommandInput, detectAndPreProcessPastedCommand } from './parsed_command_input';
import type { ParsedCommandInterface } from './types';
import type { CommandDefinition } from '../types';

describe('when using parsed command input utils', () => {
  describe('when using parseCommandInput()', () => {
    const parsedCommandWith = (
      overrides: Partial<Omit<ParsedCommandInterface, 'hasArg' | 'hasArgs'>> = {}
    ): ParsedCommandInterface => {
      return {
        input: '',
        name: 'foo',
        args: {},
        commandDefinitions: [] as CommandDefinition[],
        hasArgs: Object.keys(overrides.args || {}).length > 0,
        ...overrides,
      } as unknown as ParsedCommandInterface;
    };

    it.each([
      ['foo', 'foo'],
      ['    foo', 'foo'],
      ['    foo     ', 'foo'],
      ['foo     ', 'foo'],
      [' foo-bar  ', 'foo-bar'],
    ])('should identify the command entered: [%s]', (input, expectedCommandName) => {
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          name: expectedCommandName,
          args: {},
        })
      );
    });

    it('should parse arguments that have `--` prefix with no value', () => {
      const input = 'foo    --one     --two';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: [true],
            two: [true],
          },
        })
      );
    });

    it('should parse arguments that have a single string value', () => {
      const input = 'foo --one value --two=value2';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['value'],
            two: ['value2'],
          },
        })
      );
    });

    it('should parse arguments that have multiple strings as the value', () => {
      const input = 'foo --one value for one here --two=some more strings for 2';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['value for one here'],
            two: ['some more strings for 2'],
          },
        })
      );
    });

    it('should parse arguments whose value is wrapped in quotes', () => {
      const input = 'foo --one "value for one here" --two="some more strings for 2"';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['value for one here'],
            two: ['some more strings for 2'],
          },
        })
      );
    });

    it('should parse arguments that can be used multiple times', () => {
      const input = 'foo --one 1 --one 11 --two=2 --two=22';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['1', '11'],
            two: ['2', '22'],
          },
        })
      );
    });

    it('should parse arguments whose value has `--` in it (must be escaped)', () => {
      const input = 'foo --one something \\-\\- here --two="\\-\\-something \\-\\-';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['something -- here'],
            two: ['--something --'],
          },
        })
      );
    });

    it('should parse arguments whose value has `=` in it', () => {
      const input = 'foo --one =something \\-\\- here --two="=something=something else';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['=something -- here'],
            two: ['=something=something else'],
          },
        })
      );
    });

    it.each([
      [String.raw`C:\Foo\Dir\whatever.jpg`, undefined],
      [String.raw`C:\\abc`, undefined],
      [String.raw`F:\foo\bar.docx`, undefined],
      [String.raw`C:/foo/bar.docx`, undefined],
      [String.raw`C:\\\//\/\\/\\\/abc/\/\/\///def.txt`, undefined],
      [String.raw`C:\abc~!@#$%^&*()_'+`, undefined],
      [String.raw`C:foobar`, undefined],
      [String.raw`C:\dir with spaces\foo.txt`, undefined],
      [String.raw`C:\dir\file with spaces.txt`, undefined],
      [String.raw`/tmp/linux file with spaces "and quotes" omg.txt`, undefined],
      ['c\\foo\\b\\-\\-ar.txt', String.raw`c\foo\b--ar.txt`],
      ['c:\\foo\\b \\-\\-ar.txt', String.raw`c:\foo\b --ar.txt`],
    ])('should preserve backslashes in argument values: %s', (path, expected) => {
      const input = `foo --path "${path}"`;
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand.args).toEqual({ path: [expected ?? path] });
    });

    describe('selectorStringDefaultValue handling', () => {
      const mockCommandDefinitions: CommandDefinition[] = [
        {
          name: 'testcmd',
          about: 'Test command',
          RenderComponent: () => null,
          args: {
            normal: {
              required: false,
              allowMultiples: false,
              about: 'Normal arg',
            },
            selector: {
              required: false,
              allowMultiples: false,
              about: 'Selector arg',
              selectorStringDefaultValue: true,
              SelectorComponent: () => null,
            },
          },
        },
      ];
      it('should use empty string for selector arguments with selectorStringDefaultValue', () => {
        const input = 'testcmd --selector';
        const parsedCommand = parseCommandInput(input, mockCommandDefinitions);

        expect(parsedCommand.args).toEqual({ selector: [''] });
      });

      it('should use empty string for normal arguments without values', () => {
        const input = 'testcmd --normal';
        const parsedCommand = parseCommandInput(input, mockCommandDefinitions);

        expect(parsedCommand.args).toEqual({ normal: [true] });
      });

      it('should handle mixed argument types correctly', () => {
        const input = 'testcmd --normal --selector';
        const parsedCommand = parseCommandInput(input, mockCommandDefinitions);

        expect(parsedCommand.args).toEqual({
          normal: [true],
          selector: [''],
        });
      });

      it('should work without command definitions (backward compatibility)', () => {
        const input = 'testcmd --normal --selector';
        const parsedCommand = parseCommandInput(input);

        expect(parsedCommand.args).toEqual({
          normal: [true],
          selector: [true],
        });
      });
    });
  });

  describe('detectAndPreProcessPastedCommand()', () => {
    const mockCommandDefinitions: CommandDefinition[] = [
      {
        name: 'runscript',
        about: 'Run a script',
        RenderComponent: () => null,
        args: {
          ScriptName: {
            required: false,
            allowMultiples: false,
            about: 'Script name',
            SelectorComponent: () => null,
          },
          CloudFile: {
            required: false,
            allowMultiples: false,
            about: 'Cloud file',
            SelectorComponent: () => null,
          },
          NormalArg: {
            required: false,
            allowMultiples: false,
            about: 'Normal argument',
          },
        },
      },
    ];

    it('should return original command when no selector arguments are found', () => {
      const input = 'runscript --NormalArg=value';
      const result = detectAndPreProcessPastedCommand(input, mockCommandDefinitions);

      expect(result).toEqual({
        cleanedCommand: input,
        extractedArgState: {},
        hasSelectorArguments: false,
      });
    });

    it('should extract values from selector arguments with equals syntax', () => {
      const input = 'runscript --ScriptName="test.ps1" --CloudFile=script.sh';
      const result = detectAndPreProcessPastedCommand(input, mockCommandDefinitions);

      expect(result).toEqual({
        cleanedCommand: 'runscript --ScriptName --CloudFile',
        extractedArgState: {
          ScriptName: [{ value: 'test.ps1', valueText: 'test.ps1' }],
          CloudFile: [{ value: 'script.sh', valueText: 'script.sh' }],
        },
        hasSelectorArguments: true,
      });
    });

    it('should handle quoted values correctly', () => {
      const input = 'runscript --ScriptName="test with spaces.ps1"';
      const result = detectAndPreProcessPastedCommand(input, mockCommandDefinitions);

      expect(result).toEqual({
        cleanedCommand: 'runscript --ScriptName',
        extractedArgState: {
          ScriptName: [{ value: 'test with spaces.ps1', valueText: 'test with spaces.ps1' }],
        },
        hasSelectorArguments: true,
      });
    });

    it('should handle single quoted values correctly', () => {
      const input = "runscript --ScriptName='test.ps1'";
      const result = detectAndPreProcessPastedCommand(input, mockCommandDefinitions);

      expect(result).toEqual({
        cleanedCommand: 'runscript --ScriptName',
        extractedArgState: {
          ScriptName: [{ value: 'test.ps1', valueText: 'test.ps1' }],
        },
        hasSelectorArguments: true,
      });
    });

    it('should handle unquoted values correctly', () => {
      const input = 'runscript --ScriptName=test.ps1';
      const result = detectAndPreProcessPastedCommand(input, mockCommandDefinitions);

      expect(result).toEqual({
        cleanedCommand: 'runscript --ScriptName',
        extractedArgState: {
          ScriptName: [{ value: 'test.ps1', valueText: 'test.ps1' }],
        },
        hasSelectorArguments: true,
      });
    });

    it('should handle multiple occurrences of the same selector argument', () => {
      const input = 'runscript --ScriptName=test1.ps1 --other --ScriptName="test2.ps1"';
      const result = detectAndPreProcessPastedCommand(input, mockCommandDefinitions);

      expect(result).toEqual({
        cleanedCommand: 'runscript --ScriptName --other --ScriptName',
        extractedArgState: {
          ScriptName: [
            { value: 'test1.ps1', valueText: 'test1.ps1' },
            { value: 'test2.ps1', valueText: 'test2.ps1' },
          ],
        },
        hasSelectorArguments: true,
      });
    });

    it('should preserve non-selector arguments in cleaned command', () => {
      const input = 'runscript --ScriptName="test.ps1" --NormalArg=value --other';
      const result = detectAndPreProcessPastedCommand(input, mockCommandDefinitions);

      expect(result).toEqual({
        cleanedCommand: 'runscript --ScriptName --NormalArg=value --other',
        extractedArgState: {
          ScriptName: [{ value: 'test.ps1', valueText: 'test.ps1' }],
        },
        hasSelectorArguments: true,
      });
    });

    it('should return empty result for empty input', () => {
      const result = detectAndPreProcessPastedCommand('', mockCommandDefinitions);

      expect(result).toEqual({
        cleanedCommand: '',
        extractedArgState: {},
        hasSelectorArguments: false,
      });
    });

    it('should return original command when command definition not found', () => {
      const input = 'unknowncommand --ScriptName="test.ps1"';
      const result = detectAndPreProcessPastedCommand(input, mockCommandDefinitions);

      expect(result).toEqual({
        cleanedCommand: input,
        extractedArgState: {},
        hasSelectorArguments: false,
      });
    });

    it('should return original command when command has no args definition', () => {
      const cmdDefs: CommandDefinition[] = [
        {
          name: 'noargs',
          about: 'Command with no args',
          RenderComponent: () => null,
        },
      ];
      const input = 'noargs --ScriptName="test.ps1"';
      const result = detectAndPreProcessPastedCommand(input, cmdDefs);

      expect(result).toEqual({
        cleanedCommand: input,
        extractedArgState: {},
        hasSelectorArguments: false,
      });
    });

    it('should handle commands with no selector components', () => {
      const cmdDefs: CommandDefinition[] = [
        {
          name: 'regular',
          about: 'Regular command',
          RenderComponent: () => null,
          args: {
            arg1: { required: false, allowMultiples: false, about: 'Arg 1' },
            arg2: { required: false, allowMultiples: false, about: 'Arg 2' },
          },
        },
      ];
      const input = 'regular --arg1="value1" --arg2=value2';
      const result = detectAndPreProcessPastedCommand(input, cmdDefs);

      expect(result).toEqual({
        cleanedCommand: input,
        extractedArgState: {},
        hasSelectorArguments: false,
      });
    });

    it('should work with default empty command definitions', () => {
      const input = 'runscript --ScriptName="test.ps1"';
      const result = detectAndPreProcessPastedCommand(input);

      expect(result).toEqual({
        cleanedCommand: input,
        extractedArgState: {},
        hasSelectorArguments: false,
      });
    });
  });
});
