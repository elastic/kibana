/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstQueryExpression, ESQLCommand } from '@kbn/esql-ast';
import { Walker, BasicPrettyPrinter, isFunctionExpression, isColumn, mutate } from '@kbn/esql-ast';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import { partition } from 'lodash/fp';
import type { ESQLProperNode } from '@kbn/esql-ast/src/types';
import { Parser } from '@kbn/esql-ast/src/parser/parser';
import { isAsExpression, isFieldExpression } from '@kbn/esql-ast/src/ast/is';
import { getPrivilegedMonitorUsersIndex } from '../../../../../common/entity_analytics/privilege_monitoring/utils';

export const getPrivilegedMonitorUsersJoin = (
  namespace: string
) => `| RENAME @timestamp AS event_timestamp
  | LOOKUP JOIN ${getPrivilegedMonitorUsersIndex(namespace)} ON user.name
  | RENAME event_timestamp AS @timestamp
  | WHERE user.is_privileged == true`;

/**
 * Rewrites que query to remove FORK branches that contain columns not available.
 */
export function removeInvalidForkBranchesFromESQL(fields: DataViewFieldMap, esql: string) {
  const { root } = Parser.parse(esql);
  const forkCommands = Walker.findAll(root, (node) => node.name === 'fork') as Array<
    ESQLCommand<'fork'>
  >;

  // The query has no FORK command, so we can return the original ESQL query
  if (forkCommands.length === 0) {
    return esql;
  }

  // There is no technical limitation preventing us from having multiple FORK commands in the query,
  // but the current implementation only supports a single FORK command.
  if (forkCommands.length > 1) {
    throw new Error('removeInvalidForkBranchesFromESQL does not support Multiple FORK commands');
  }

  const forkCommand = forkCommands[0];

  const forkArguments = forkCommand?.args as ESQLAstQueryExpression[];

  if (!forkArguments || forkArguments.length < 2) {
    throw new Error('Invalid ESQL query: FORK command must have at least two arguments');
  }

  // Columns create by the EVAL and RENAME command
  const createdColumns = getAllCreatedColumns(root);

  const isInvalidColumn = (node: ESQLProperNode) =>
    isColumn(node) && !createdColumns.includes(node.name) && !fields[node.name]; // Check if the column was created or exists in the fields map

  const [invalidBranches, validBranches] = partition(
    (forkArgument) => Walker.find(forkArgument, isInvalidColumn),
    forkArguments
  );

  // When all branches are valid we can return the original ESQL query
  if (invalidBranches.length === 0) {
    return esql;
  }

  // No valid FORK branches found
  if (validBranches.length === 0) {
    return undefined; // TODO can we throw an error here? or return an empty query?
  }

  // When FORK has only one valid branch we need to remove the fork command from query and add the valid branch back to the root
  if (validBranches.length === 1) {
    return moveForkBranchToToplevel(root, forkCommand, validBranches[0]);
  }

  // Remove the invalid branches
  invalidBranches.forEach((branch) => {
    mutate.generic.commands.args.remove(root, branch);
  });
  return BasicPrettyPrinter.multiline(root);
}

function moveForkBranchToToplevel(
  root: ESQLAstQueryExpression,
  forkCommand: ESQLCommand<'fork'>,
  validBranch: ESQLAstQueryExpression
) {
  // Find where the fork index is to insert the valid branch
  const forkIndex = root.commands.findIndex((cmd) => cmd.name === 'fork');
  mutate.generic.commands.remove(root, forkCommand);

  validBranch.commands.reverse().forEach((command) => {
    mutate.generic.commands.insert(root, command, forkIndex);
  });

  return BasicPrettyPrinter.multiline(root);
}

function getAllCreatedColumns(root: ESQLAstQueryExpression) {
  const evalCommands = Walker.findAll(root, (node) => node.name === 'eval') as Array<
    ESQLCommand<'eval'>
  >;

  // Columns create by the EVAL command
  // Syntax: | EVAL new_column = column
  const evalColumns = evalCommands
    .map((command) => {
      return command.args.map((arg) => {
        if (isFunctionExpression(arg) && isColumn(arg.args[0])) {
          return arg.args[0].name;
        }

        return null;
      });
    })
    .flat();

  const renameCommands = Walker.findAll(root, (node) => node.name === 'rename') as Array<
    ESQLCommand<'rename'>
  >;

  // Columns create by the RENAME command
  // Syntaxes:
  // 1. | RENAME column AS new_column, column2 AS new_column2
  // 2. | RENAME new_column = column, new_column2 = column2 (9.1+)
  const renamedColumns = renameCommands
    .map((command) => {
      return command.args.map((arg) => {
        if (isAsExpression(arg)) {
          if (isColumn(arg.args[1])) {
            return arg.args[1].name;
          }
        }

        if (isFieldExpression(arg)) {
          if (isColumn(arg.args[0])) {
            return arg.args[0].name;
          }
        }

        return null;
      });
    })
    .flat();

  // Here we get all created columns from EVAL and RENAME commands
  // We don't care where they are located, we just need to know which columns are available in the query
  // If a column is used on a place where it isn't available ESQL will handle the error
  const createdColumns = [...evalColumns, ...renamedColumns].filter(
    (column): column is string => column !== null
  );
  return createdColumns;
}
