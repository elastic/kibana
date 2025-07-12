/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedCommandInput, ParsedCommandInterface } from './types';
import type { CommandDefinition, CommandArgDefinition } from '../types';

const parseInputString = (
  rawInput: string,
  commandDefinitions: CommandDefinition[] = []
): ParsedCommandInput => {
  const input = rawInput.trim();
  const response: ParsedCommandInput = {
    name: getCommandNameFromTextInput(input),
    args: {},
  };

  if (!input) {
    return response;
  }

  const inputFirstSpacePosition = input.indexOf(' ');
  const rawArguments =
    inputFirstSpacePosition === -1
      ? []
      : input.substring(inputFirstSpacePosition).trim().split(/--/);

  // Find command definition for selector argument handling
  const commandDef = commandDefinitions.find((def) => def.name === response.name);

  for (const rawArg of rawArguments) {
    const argNameAndValueTrimmedString = rawArg.trim();

    if (argNameAndValueTrimmedString) {
      // rawArgument possible values here are:
      //    'option=something'
      //    'option'
      //    'option something
      // These all having possible spaces before and after

      const firstSpaceOrEqualSign = /[ =]/.exec(argNameAndValueTrimmedString);

      // Grab the argument name
      const argName = (
        firstSpaceOrEqualSign
          ? argNameAndValueTrimmedString.substring(0, firstSpaceOrEqualSign.index).trim()
          : argNameAndValueTrimmedString
      ).trim();

      if (argName) {
        if (!response.args[argName]) {
          response.args[argName] = [];
        }

        // if this argument name has a value, then process that
        if (argName !== argNameAndValueTrimmedString && firstSpaceOrEqualSign) {
          let newArgValue = argNameAndValueTrimmedString
            .substring(firstSpaceOrEqualSign.index + 1)
            .trim()
            .replace(/\\-\\-/g, '--');

          if (newArgValue.charAt(0) === '"') {
            newArgValue = newArgValue.substring(1);
          }

          if (newArgValue.charAt(newArgValue.length - 1) === '"') {
            newArgValue = newArgValue.substring(0, newArgValue.length - 1);
          }

          response.args[argName].push(newArgValue);
        } else {
          // Argument has no value (bare flag)
          // Check if this argument has selectorStringDefaultValue set to true
          const argDef = commandDef?.args?.[argName] as CommandArgDefinition | undefined;
          const useStringValue = argDef?.selectorStringDefaultValue === true;
          response.args[argName].push(useStringValue ? '' : true);
        }
      }
    }
  }

  return response;
};

class ParsedCommand implements ParsedCommandInterface {
  public readonly name: string;
  public readonly args: Record<string, string[]>;
  public readonly hasArgs: boolean;

  constructor(
    public readonly input: string,
    public readonly commandDefinitions: CommandDefinition[] = []
  ) {
    const parseInput = parseInputString(input, commandDefinitions);
    this.name = parseInput.name;
    this.args = parseInput.args;
    this.hasArgs = Object.keys(this.args).length > 0;
  }

  hasArg(argName: string): boolean {
    return argName in this.args;
  }
}

export const parseCommandInput = (
  input: string,
  commandDefinitions: CommandDefinition[] = []
): ParsedCommandInterface => {
  return new ParsedCommand(input, commandDefinitions);
};

export const getCommandNameFromTextInput = (input: string): string => {
  const trimmedInput = input.trimStart();

  if (!trimmedInput) {
    return '';
  }

  const firstSpacePosition = input.indexOf(' ');

  if (firstSpacePosition === -1) {
    return trimmedInput;
  }

  return trimmedInput.substring(0, firstSpacePosition);
};

export const getArgumentsForCommand = (command: CommandDefinition): string[] => {
  let requiredArgs = '';
  let optionalArgs = '';
  const exclusiveOrArgs: string[] = [];

  if (command.args) {
    for (const [argName, argDefinition] of Object.entries(command.args) as Array<
      [string, CommandArgDefinition]
    >) {
      if (argDefinition.required) {
        if (requiredArgs.length) {
          requiredArgs += ' ';
        }
        requiredArgs += `--${argName}`;
      } else if (argDefinition.exclusiveOr) {
        exclusiveOrArgs.push(`--${argName}`);
      } else {
        if (optionalArgs.length) {
          optionalArgs += ' ';
        }
        optionalArgs += `--${argName}`;
      }
    }
  }

  const buildArgumentText = ({
    required,
    exclusive,
    optional,
  }: {
    required?: string;
    exclusive?: string;
    optional?: string;
  }) => {
    return `${required ? required : ''}${exclusive ? ` ${exclusive}` : ''} ${
      optional && optional.length > 0 ? `[${optional}]` : ''
    }`.trim();
  };

  return exclusiveOrArgs.length > 0
    ? exclusiveOrArgs.map((exclusiveArg) => {
        return buildArgumentText({
          required: requiredArgs,
          exclusive: exclusiveArg,
          optional: optionalArgs,
        });
      })
    : requiredArgs || optionalArgs
    ? [buildArgumentText({ required: requiredArgs, optional: optionalArgs })]
    : [];
};

/**
 * Detects and pre-processes pasted commands that contain argument values
 * for arguments that should be handled by selector components.
 *
 * For example: "runscript --ScriptName=\"test.ps1\"" becomes:
 * - cleanedCommand: "runscript --ScriptName"
 * - extractedArgState: { ScriptName: [{ value: "test.ps1", valueText: "test.ps1" }] }
 */
export const detectAndPreProcessPastedCommand = (
  rawInput: string,
  commandDefinitions: CommandDefinition[] = []
): {
  cleanedCommand: string;
  extractedArgState: Record<string, Array<{ value: string; valueText: string }>>;
  hasSelectorArguments: boolean;
} => {
  const result = {
    cleanedCommand: rawInput,
    extractedArgState: {} as Record<string, Array<{ value: string; valueText: string }>>,
    hasSelectorArguments: false,
  };

  // Early return if no input
  if (!rawInput.trim()) {
    return result;
  }

  const commandName = getCommandNameFromTextInput(rawInput);
  const commandDef = commandDefinitions.find((def) => def.name === commandName);

  // Early return if command not found or has no selector arguments
  if (!commandDef?.args) {
    return result;
  }

  // Find arguments that have SelectorComponents (like ScriptName)
  const selectorArguments = Object.entries(commandDef.args).filter(
    ([_, argDef]: [string, CommandArgDefinition]) => argDef.SelectorComponent
  );

  if (selectorArguments.length === 0) {
    return result;
  }

  let cleanedCommand = rawInput;
  let hasExtractedValues = false;

  // Process each selector argument to extract embedded values
  for (const [argName] of selectorArguments) {
    const argPattern = new RegExp(`--${argName}\\s*[=]\\s*(["'][^"]*["']|\\S+)`, 'g');
    let match;

    while ((match = argPattern.exec(rawInput)) !== null) {
      let value = match[1];

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Store the extracted value in argState format
      if (!result.extractedArgState[argName]) {
        result.extractedArgState[argName] = [];
      }

      result.extractedArgState[argName].push({
        value,
        valueText: value,
      });

      // Replace the full argument with value with just the argument name
      cleanedCommand = cleanedCommand.replace(match[0], `--${argName}`);
      hasExtractedValues = true;
    }
  }

  result.cleanedCommand = cleanedCommand;
  result.hasSelectorArguments = hasExtractedValues;

  return result;
};
