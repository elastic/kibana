/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Extracts query information from ES|QL queries using AST parsing.
 * Uses patterns from @kbn/esql-utils/src/utils/query_parsing_helpers.ts
 */

import type { ESQLFunction, ESQLCommandOption, ESQLSource, ESQLAstItem } from '@kbn/esql-language';
import { Parser, walk, isColumn, isFunctionExpression } from '@kbn/esql-language';
import { useMemo } from 'react';
import { extractFilters } from '../utils/extract_filters';

export interface EsqlQueryInfo {
  metricField: string | undefined;
  /** The actual field being aggregated (e.g., AVG(cpu) → cpu) */
  actualMetricField: string | undefined;
  columns: string[];
  indices: string[];
  dimensions: string[];
  filters: string[];
  /** Whether the query has a STATS command (required for aggregation) */
  hasStats: boolean;
}

/**
 * Extracts indices from the source command (FROM or TS).
 * Handles remote cluster prefixes and comma-separated patterns.
 * Pattern from: getRemoteClustersFromESQLQuery in query_parsing_helpers.ts
 */
const extractIndices = (root: ReturnType<typeof Parser.parse>['root']): string[] => {
  const sourceCommand = root.commands.find(({ name }) => ['from', 'ts'].includes(name));

  if (!sourceCommand) {
    return [];
  }

  const sourceArgs = (sourceCommand.args ?? []) as ESQLSource[];
  const indices: string[] = [];

  for (const arg of sourceArgs) {
    if (arg.type !== 'source') continue;

    // Build full index name including cluster prefix if present
    if (arg.prefix?.value && !arg.name.includes(':')) {
      indices.push(`${arg.prefix.value}:${arg.name}`);
    } else {
      indices.push(arg.name);
    }
  }

  // Return comma-joined indices as a single entry to match expected format
  return indices.length > 0 ? [indices.join(',')] : [];
};

/**
 * Recursively finds the alias (left side of assignment) from a function node.
 * Handles nested structures like: alias = expression WHERE condition
 */
const extractAliasFromFunction = (fn: ESQLFunction): string | null => {
  // Direct assignment: alias = expression
  if (fn.name === '=' && fn.args.length >= 1) {
    const leftArg = fn.args[0];
    if (isColumn(leftArg)) {
      return leftArg.name;
    }
  }

  // Handle STATS ... WHERE: the "where" function wraps the aggregation
  // Structure: where(assignment, condition) where assignment is "alias = expr"
  if (fn.name === 'where' && fn.args.length >= 1) {
    const firstArg = fn.args[0];
    if (isFunctionExpression(firstArg)) {
      return extractAliasFromFunction(firstArg);
    }
  }

  return null;
};

/**
 * Gets the function text for display when no alias is present.
 * Handles nested where() functions by extracting the inner expression.
 */
const getFunctionText = (fn: ESQLFunction): string => {
  // For where() functions, get the text of the aggregation (first arg)
  if (fn.name === 'where' && fn.args.length >= 1) {
    const firstArg = fn.args[0];
    if (isFunctionExpression(firstArg)) {
      return getFunctionText(firstArg);
    }
  }
  return fn.text;
};

/**
 * Gets the output column name from a STATS aggregation argument.
 * Rules:
 * - If there's an alias (alias = expression), use the alias
 * - If no alias, use the function text (e.g., "AVG(field)")
 * - Handles STATS ... WHERE by unwrapping the where() function
 */
const getMetricFieldName = (arg: ESQLAstItem): string | null => {
  if (!arg || !('type' in arg)) return null;

  if (isFunctionExpression(arg)) {
    // Check for alias assignment (handles direct assignment and where() wrapper)
    const alias = extractAliasFromFunction(arg);
    if (alias) {
      return alias;
    }
    // No alias - use the function text
    return getFunctionText(arg);
  }

  if (isColumn(arg)) {
    return arg.name;
  }

  return null;
};

/**
 * Helper to check if an arg is a function (more permissive than isFunctionExpression)
 */
const isFunc = (arg: unknown): arg is ESQLFunction =>
  arg != null && typeof arg === 'object' && 'type' in arg && arg.type === 'function';

/**
 * Extracts all column names from a function expression using AST walking.
 * This finds all columns referenced within the function, regardless of nesting.
 */
const extractColumnsFromFunction = (fn: ESQLFunction): string[] => {
  const columns: string[] = [];
  walk(fn, {
    visitColumn: (node) => {
      // Skip @timestamp as it's a special field
      if (node.name !== '@timestamp') {
        columns.push(node.name);
      }
    },
  });
  return columns;
};

/**
 * Gets the actual metric field name from a STATS aggregation argument.
 * Unlike getMetricFieldName which returns the output column name (alias or function text),
 * this returns the actual field being aggregated.
 * E.g., AVG(cpu.utilization) → cpu.utilization
 *       metric_rate = SUM(RATE(system.cpu)) → system.cpu
 *
 * For assignments (alias = expr), we skip the alias column and return the first
 * column found in the expression.
 */
const getActualMetricField = (fn: ESQLFunction): string | null => {
  const columns = extractColumnsFromFunction(fn);

  // If this is an assignment (alias = expr), the first column is the alias
  // We want the second column which is the actual field being aggregated
  if (fn.name === '=' && columns.length >= 2) {
    return columns[1];
  }

  // For non-assignment functions, return the first column found
  return columns[0] ?? null;
};

/**
 * Extracts metric fields and dimensions from STATS commands.
 * - metricFields: Output column names from the last STATS (for display/sorting)
 * - actualMetricFields: Actual source fields from ALL STATS (for querying sample data)
 * - dimensions: BY clause columns from the last STATS
 *
 * For multi-STATS queries like:
 *   | STATS cpu_util = AVG(metrics.system.cpu) BY host.name
 *   | STATS cpu = SUM(cpu_util) BY host.name
 *
 * We need the actual field (metrics.system.cpu) from the first STATS,
 * not the alias (cpu_util) from the second STATS.
 */
const extractStatsInfo = (
  root: ReturnType<typeof Parser.parse>['root']
): { metricFields: string[]; actualMetricFields: string[]; dimensions: string[] } => {
  const metricFields: string[] = [];
  const actualMetricFields: string[] = [];
  const dimensions: string[] = [];

  // Find all STATS commands
  const statsCommands = root.commands.filter(({ name }) => name === 'stats');

  if (statsCommands.length === 0) {
    return { metricFields, actualMetricFields, dimensions };
  }

  // Collect aliases created by STATS commands (these are not actual fields)
  const statsAliases = new Set<string>();

  // Process ALL STATS commands to find actual metric fields
  for (const statsCommand of statsCommands) {
    for (const arg of statsCommand.args ?? []) {
      if (!isFunc(arg)) continue;

      // Track the alias so we know it's not a real field
      const alias = extractAliasFromFunction(arg);
      if (alias) {
        statsAliases.add(alias);
      }

      // Extract the actual field being aggregated
      const actualField = getActualMetricField(arg);
      // Only add if it's not an alias from a previous STATS command
      if (actualField && !statsAliases.has(actualField)) {
        // Avoid duplicates
        if (!actualMetricFields.includes(actualField)) {
          actualMetricFields.push(actualField);
        }
      }
    }
  }

  // For metricFields and dimensions, use the LAST STATS command (final output)
  const lastStatsCommand = statsCommands[statsCommands.length - 1];
  const options: ESQLCommandOption[] = [];

  // Collect all command options from the STATS command
  walk(lastStatsCommand, {
    visitCommandOption: (node) => options.push(node),
  });

  // Extract dimensions from BY clause
  const byOption = options.find(({ name }) => name === 'by');
  if (byOption) {
    for (const arg of byOption.args) {
      if (isColumn(arg)) {
        dimensions.push(arg.name);
      } else if (isFunctionExpression(arg)) {
        // Handle aliased dimensions like "bucket = BUCKET(@timestamp, ...)"
        const alias = extractAliasFromFunction(arg);
        if (alias) {
          dimensions.push(alias);
        } else {
          // For unaliased functions like BUCKET(@timestamp, ...), use the text
          dimensions.push(arg.text);
        }
      }
    }
  }

  // Extract metric fields from last STATS arguments (for output column names)
  const lastStatsArgs = (lastStatsCommand.args ?? []).filter(
    (arg): arg is ESQLFunction => arg != null && 'type' in arg && arg.type === 'function'
  );

  for (const fn of lastStatsArgs) {
    const metricName = getMetricFieldName(fn);
    if (metricName) {
      metricFields.push(metricName);
    }
  }

  return { metricFields, actualMetricFields, dimensions };
};

/**
 * Parses an ES|QL query and extracts structured information using AST.
 * Exported for testing purposes.
 */
export const parseEsqlQuery = (query: string): EsqlQueryInfo => {
  const filters: string[] = extractFilters(query);

  try {
    const { root } = Parser.parse(query);

    // Extract indices from source command
    const indices = extractIndices(root);

    // Check if there's a STATS command
    const hasStats = root.commands.some(({ name }) => name === 'stats');

    // Extract STATS info
    const { metricFields, actualMetricFields, dimensions } = extractStatsInfo(root);

    return {
      metricField: metricFields[0],
      actualMetricField: actualMetricFields[0],
      columns: metricFields,
      dimensions,
      indices,
      filters,
      hasStats,
    };
  } catch {
    // Parser failed - return empty result
    return {
      metricField: undefined,
      actualMetricField: undefined,
      columns: [],
      dimensions: [],
      indices: [],
      filters,
      hasStats: false,
    };
  }
};

export const useEsqlQueryInfo = ({ query }: { query: string }): EsqlQueryInfo => {
  return useMemo(() => parseEsqlQuery(query), [query]);
};
