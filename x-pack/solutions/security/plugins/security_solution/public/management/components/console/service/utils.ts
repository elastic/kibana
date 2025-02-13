/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandArgs, CommandDefinition } from '../types';

export const getCommandNameWithArgs = (command: Partial<CommandDefinition>) => {
  if (!command.mustHaveArgs || !command.args) {
    return command.name;
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
