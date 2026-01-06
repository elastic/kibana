/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { detectAndPreProcessPastedCommand } from './utils';
import type { CommandDefinition } from '../../../types';

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
