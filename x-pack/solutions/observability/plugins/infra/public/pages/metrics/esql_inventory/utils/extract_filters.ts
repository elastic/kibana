/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, BasicPrettyPrinter } from '@kbn/esql-language';

/**
 * Extracts filter conditions from WHERE commands in an ES|QL query using AST parsing.
 * Returns an array of filter expression strings.
 */
export function extractFilters(query: string): string[] {
  try {
    const { root } = Parser.parse(query);

    // Find all WHERE commands
    const whereCommands = root.commands.filter(({ name }) => name === 'where');

    // Extract the filter expression text from each WHERE command
    return whereCommands
      .map((cmd) => {
        // The WHERE command args contain the filter expression
        if (cmd.args && cmd.args.length > 0) {
          // Use BasicPrettyPrinter to get the text representation of the filter
          // We need to print each arg and join them
          return cmd.args
            .map((arg) => {
              if (arg && 'type' in arg) {
                return BasicPrettyPrinter.expression(arg);
              }
              return '';
            })
            .filter((text) => text !== '')
            .join(' AND ');
        }
        return '';
      })
      .filter((text) => text !== '');
  } catch {
    // If parsing fails, return empty array
    return [];
  }
}
