/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandArgDefinition, CommandArgs, CommandDefinition } from '../types';

export const getCommandNameWithArgs = (command: Partial<CommandDefinition>): string => {
  if (!command.mustHaveArgs || !command.args) {
    return command.name ?? '';
  }

  let hasAnExclusiveOrArg = false;
  const primaryArgs = Object.entries(command.args).reduce<CommandArgs>((acc, [key, value]) => {
    if (value.required) {
      acc[key] = value;
      return acc;
    }
    if (value.exclusiveOr && !hasAnExclusiveOrArg) {
      hasAnExclusiveOrArg = true;
      acc[key] = value;
      return acc;
    }
    return acc;
  }, {});

  return `${command.name} --${Object.keys(primaryArgs).join(' --')}`;
};

export interface BuildCommandUsageListOptions {
  /**
   * If `true` (default), optional arguments will be included (wrapped in `[ ]`) in each
   * command usage entry. Set to `false` to exclude them.
   */
  includeOptionalArgs?: boolean;
}

export const buildCommandUsageList = (
  commandDef: CommandDefinition,
  { includeOptionalArgs = true }: BuildCommandUsageListOptions = {}
): string[] => {
  if (!commandDef.args) {
    return [commandDef.name];
  }

  const response: string[] = [];
  const requiredArgs = getRequiredArgs(commandDef);
  const exclusiveOrGroups = getExclusiveOrArgGroups(commandDef);
  const conditionallyRequired = getConditionallyRequiredArgs(commandDef);
  const optionalArgs = getOptionalArgs(commandDef);

  const baseCommand = `${commandDef.name}${
    requiredArgs.length ? ` ${requiredArgs.map((a) => `--${a.name}`).join(' ')}` : ''
  }`;

  const buildOptionalArgsString = (excludeCommandNames: string[] = []) => {
    if (includeOptionalArgs && optionalArgs.length) {
      return ` [${optionalArgs
        .filter(
          (argDef) => excludeCommandNames.length === 0 || !excludeCommandNames.includes(argDef.name)
        )
        .map((argDef) => `--${argDef.name}`)
        .join(' ')}]`;
    }
    return '';
  };

  if (Object.keys(exclusiveOrGroups).length) {
    // TODO:PT need to incrementally process each group.
    // Currently, it will build them all individually which is not correct if multiple groups are defined.
    const queue: { prefix: string; args: ArgNameAndDefinition[]; usedArgNames: string[] }[] = [
      ...Object.values(exclusiveOrGroups).map((group) => ({
        prefix: baseCommand,
        args: group,
        usedArgNames: [],
      })),
    ];

    while (queue.length > 0) {
      const exclusiveOrGroup = queue.shift();

      if (exclusiveOrGroup) {
        const { prefix, args, usedArgNames } = exclusiveOrGroup;

        for (const arg of args) {
          const updatedBaseCommand = `${prefix} --${arg.name}`;
          usedArgNames.push(arg.name);

          if (conditionallyRequired[arg.name]) {
            queue.unshift({
              prefix: updatedBaseCommand,
              args: conditionallyRequired[arg.name],
              usedArgNames,
            });
          } else {
            response.push(`${updatedBaseCommand}${buildOptionalArgsString(usedArgNames)}`);
          }
        }
      }
    }
  } else {
    response.push(`${baseCommand}${buildOptionalArgsString()}`);
  }

  return response;
};

interface ArgNameAndDefinition {
  name: string;
  definition: CommandArgDefinition;
}

interface ExclusiveOrArgGroupsResponse {
  [groupName: string]: ArgNameAndDefinition[];
}

/**
 * Returns a list of exclusive OR arguments. By default, only the non-conditionally required arguments
 * are returned - these are the ones that require the user to at least provide one of them.
 * To return all defined as exclusive OR, then just pass in `includeConditionallyRequiredArgs: true`.
 * @param commandDef
 * @param [param1]
 * @param [param1.includeConditionallyRequiredArgs]
 */
const getExclusiveOrArgGroups = (
  commandDef: CommandDefinition,
  {
    includeConditionallyRequiredArgs = false,
  }: Partial<{ includeConditionallyRequiredArgs: boolean }> = {}
) => {
  const response: ExclusiveOrArgGroupsResponse = {};

  if (!commandDef.args) {
    return response;
  }

  for (const [argName, argDef] of Object.entries(commandDef.args)) {
    if (
      argDef.exclusiveOrGroupId &&
      (includeConditionallyRequiredArgs ||
        (!includeConditionallyRequiredArgs && !argDef.conditionallyRequired))
    ) {
      if (!response[argDef.exclusiveOrGroupId]) {
        response[argDef.exclusiveOrGroupId] = [];
      }
      response[argDef.exclusiveOrGroupId].push({ name: argName, definition: argDef });
    }
  }

  return response;
};

/**
 * Returns a list of required arguments.
 * @param commandDef
 */
const getRequiredArgs = (commandDef: CommandDefinition): ArgNameAndDefinition[] => {
  if (commandDef.args) {
    return Object.entries(commandDef.args)
      .filter(([, argDef]) => argDef.required)
      .map(([argName, argDef]) => ({ name: argName, definition: argDef }));
  }

  return [];
};

interface ConditionallyRequiredArgsResponse {
  [argName: string]: ArgNameAndDefinition[];
}

/**
 * Returns an object whose keys are the arguments names that when used, require the arguments listed in the value array.
 * @param commandDef
 */
const getConditionallyRequiredArgs = (
  commandDef: CommandDefinition
): ConditionallyRequiredArgsResponse => {
  const response: ConditionallyRequiredArgsResponse = {};

  if (commandDef.args) {
    for (const [argName, argDef] of Object.entries(commandDef.args)) {
      if (argDef.conditionallyRequired) {
        for (const dependeeArgName of argDef.conditionallyRequired) {
          if (!response[dependeeArgName]) {
            response[dependeeArgName] = [];
          }

          response[dependeeArgName].push({ name: argName, definition: argDef });
        }
      }
    }
  }

  return response;
};

/**
 * Returns a list of optional arguments.
 * @param commandDef
 */
const getOptionalArgs = (commandDef: CommandDefinition): ArgNameAndDefinition[] => {
  if (commandDef.args) {
    return Object.entries(commandDef.args)
      .filter(
        ([, argDef]) =>
          !argDef.required && !argDef.exclusiveOrGroupId && !argDef.conditionallyRequired
      )
      .map(([argName, argDef]) => ({ name: argName, definition: argDef }));
  }

  return [];
};
