/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandArgDefinition, CommandDefinition } from '../types';

export interface BuildCommandUsageListOptions {
  /**
   * If `true` (default), optional arguments will be included (wrapped in `[ ]`) in each
   * command usage entry. Set to `false` to exclude them.
   */
  includeOptionalArgs?: boolean;
}

/**
 * Builds a list of command usage strings for the given command definition. The usage entries are
 * built based on the command's argument definitions.
 * @param commandDef
 * @param [options]
 * @param [options.includeOptionalArgs]
 */
export const buildCommandUsageList = (
  commandDef: CommandDefinition,
  { includeOptionalArgs = true }: Partial<BuildCommandUsageListOptions> = {}
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
          let updatedBaseCommand = `${prefix} --${arg.name}`;
          usedArgNames.push(arg.name);

          if (conditionallyRequired[arg.name]) {
            if (conditionallyRequired[arg.name].allOf.length > 0) {
              updatedBaseCommand += ` ${conditionallyRequired[arg.name].allOf
                .map(({ name: argName }) => {
                  usedArgNames.push(argName);
                  return `--${argName}`;
                })
                .join(' ')}`;
            }

            if (Object.keys(conditionallyRequired[arg.name].oneOf).length > 0) {
              const conditionallyRequiredExclusiveOrGroups = Object.values(
                conditionallyRequired[arg.name].oneOf
              );

              // TODO:PT need to incrementally process each group.
              // Currently, it will build them all individually which is not correct if multiple groups are defined.
              for (const conditionalExclusiveOrGroup of conditionallyRequiredExclusiveOrGroups) {
                queue.unshift({
                  prefix: updatedBaseCommand,
                  args: conditionalExclusiveOrGroup,
                  usedArgNames,
                });
              }
            }
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

export interface ArgNameAndDefinition {
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
 * @param [options]
 * @param [options.includeConditionallyRequiredArgs]
 */
export const getExclusiveOrArgGroups = (
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
export const getRequiredArgs = (commandDef: CommandDefinition): ArgNameAndDefinition[] => {
  if (commandDef.args) {
    return Object.entries(commandDef.args)
      .filter(([, argDef]) => argDef.required)
      .map(([argName, argDef]) => ({ name: argName, definition: argDef }));
  }

  return [];
};

interface ConditionallyRequiredArgsResponse {
  /** The key - argName - is the argument that when used, requires the arguments listed in the value array */
  [argName: string]: {
    /** A list of exclusive OR conditionally required arguments. At least one argument from each group is required */
    oneOf: {
      [exclusiveOfGroupName: string]: ArgNameAndDefinition[];
    };
    /** A list of arguments that are all required */
    allOf: ArgNameAndDefinition[];
  };
}

/**
 * Returns an object whose keys are the arguments names that when used, require the arguments listed associated object.
 * @param commandDef
 */
export const getConditionallyRequiredArgs = (
  commandDef: CommandDefinition
): ConditionallyRequiredArgsResponse => {
  const response: ConditionallyRequiredArgsResponse = {};

  if (commandDef.args) {
    for (const [argName, argDef] of Object.entries(commandDef.args)) {
      if (argDef.conditionallyRequired) {
        for (const dependeeArgName of argDef.conditionallyRequired) {
          if (!response[dependeeArgName]) {
            response[dependeeArgName] = { oneOf: {}, allOf: [] };
          }

          if (argDef.exclusiveOrGroupId) {
            if (!response[dependeeArgName].oneOf[argDef.exclusiveOrGroupId]) {
              response[dependeeArgName].oneOf[argDef.exclusiveOrGroupId] = [];
            }

            response[dependeeArgName].oneOf[argDef.exclusiveOrGroupId].push({
              name: argName,
              definition: argDef,
            });
          } else {
            response[dependeeArgName].allOf.push({ name: argName, definition: argDef });
          }
        }
      }
    }
  }

  return response;
};

/**
 * Returns a list of optional arguments. This excludes arguments that are part of a exclusive group that is
 * not conditionally required. It also excludes conditionally required arguments by default.
 * Set `options.includeConditionallyRequired` to true to include conditionally required arguments.
 * @param commandDef
 * @param includeConditionallyRequired
 */
export const getOptionalArgs = (
  commandDef: CommandDefinition,
  { includeConditionallyRequired = false }: Partial<{ includeConditionallyRequired: boolean }> = {}
): ArgNameAndDefinition[] => {
  if (commandDef.args) {
    return Object.entries(commandDef.args)
      .filter(
        ([, argDef]) =>
          !argDef.required &&
          // Don't include exclusive OR arguments if they are defined as conditionally required
          (!argDef.exclusiveOrGroupId ||
            (argDef.exclusiveOrGroupId && argDef.conditionallyRequired)) &&
          // Exclude conditionally required - unless parameter to include it is true
          (includeConditionallyRequired || !argDef.conditionallyRequired)
      )
      .map(([argName, argDef]) => ({ name: argName, definition: argDef }));
  }

  return [];
};
