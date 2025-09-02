/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, isColumn } from '@kbn/esql-ast';

export const getMvExpandFields = (query: string): string[] => {
  const { root } = parse(query);

  const mvExpandCommands = root.commands.filter((command) => command.name === 'mv_expand');

  return mvExpandCommands.reduce<string[]>((acc, command) => {
    const argument = command.args[0];

    if (isColumn(argument) && argument.name) {
      acc.push(argument.name);
    }

    return acc;
  }, []);
};
