/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { CommandArgs, CommandDefinition } from '../types';

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

/**
 * Returns an array of command usage strings based on the command definition. Multiple usage examples may be returned
 * for a command that defines `exclusiveOr` arguments.
 * @param command
 */
export const getCommandInputUsageList = (
  command: CommandDefinition,
  { includeOptionalArgs = true }: Partial<{ includeOptionalArgs: boolean }> = {}
): string[] => {
  if (!command.args) {
    return [command.name];
  }

  const response: string[] = [];
  const argDetails = buildCommandArgsList(command);
  const commandWithRequiredArgs = `${command.name}${
    argDetails.required.length > 0
      ? ` ${argDetails.required.map((arg) => arg.title).join(' ')}`
      : ''
  }`;
  const optionalArgs =
    argDetails.optional.length > 0
      ? ` ${argDetails.optional.map((arg) => arg.title).join(' ')}`
      : '';

  if (argDetails.exclusiveOr.length > 0) {
    for (const exclusiveOrArg of argDetails.exclusiveOr) {
      response.push(
        `${commandWithRequiredArgs} ${exclusiveOrArg.title}${
          includeOptionalArgs ? optionalArgs : ''
        }`
      );
    }
  } else {
    response.push(`${commandWithRequiredArgs}${includeOptionalArgs ? optionalArgs : ''}`);
  }

  return response;
};

type CommandArgDetails = Array<{
  title: string;
  description: ReactNode;
}>;

interface CommandArgList {
  required: CommandArgDetails[];
  exclusiveOr: CommandArgDetails[];
  optional: CommandArgDetails[];
}

/**
 * Builds the list of command arguments - that includes the `--` prefix` for the Command grouped by `required`, `exclusiveOr`, and `optional`.
 * Output cna be be used to build help output.
 * @param commandDef
 */
export const buildCommandArgsList = (commandDef: CommandDefinition): CommandArgList => {
  if (!commandDef.args) {
    return {
      required: [],
      exclusiveOr: [],
      optional: [],
    };
  }

  return Object.entries(commandDef.args).reduce<CommandArgList>(
    (acc, curr) => {
      const item = {
        title: `--${curr[0]}`,
        description: curr[1].about,
      };
      if (curr[1].required) {
        acc.required.push(item);
      } else if (curr[1].exclusiveOr) {
        acc.exclusiveOr.push(item);
      } else {
        acc.optional.push(item);
      }

      return acc;
    },
    {
      required: [],
      exclusiveOr: [],
      optional: [],
    }
  );
};
