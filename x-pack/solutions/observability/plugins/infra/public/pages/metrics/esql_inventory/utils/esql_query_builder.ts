/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Utilities for building and modifying ES|QL queries.
 */

import {
  esql,
  Parser,
  mutate,
  WrappingPrettyPrinter,
  Walker,
  Builder,
  isColumn,
} from '@kbn/esql-language';
import type { ESQLCommandOption, ESQLColumn, ESQLCommand } from '@kbn/esql-language';
import { buildQuery as buildCuratedQuery } from '@kbn/unified-chart-section-viewer';
import type { SortConfig, SelectedMetric } from '../types';
import { parseEsqlQuery } from '../hooks/use_esql_query_info';

/**
 * Build the chart query based on metric instrument type.
 * - Managed (curated) metrics: Use the query builder from entity definitions
 * - Gauges: TS index | STATS AVG(metric) BY entity | SORT ...
 * - Counters: Two-stage aggregation with RATE for per-second rates
 */
export const buildChartQuery = (
  entityField: string,
  metric: SelectedMetric | null,
  index: string,
  sort?: SortConfig,
  groupByFields?: string[]
): string => {
  if (!metric) return esql`TS ${index}`.pipe`LIMIT 1`.print('wrapping');

  let query: string;

  // Handle managed (curated) metrics using the centralized query builder
  if (metric.isManaged && metric.curatedMetric) {
    const curatedMetric = metric.curatedMetric;
    query = buildCuratedQuery(curatedMetric, {
      index,
      entityField,
      trend: false, // Summary query for the grid
    });

    // Apply sort if specified (curated queries have default sort)
    if (sort) {
      query = addSortToQuery(query, sort);
    }

    // Add group by fields if specified (handled here to return early)
    return groupByFields?.length ? addGroupByToQuery(query, groupByFields) : query;
  }

  // Standard metrics: build query based on instrument type
  const sortDir = (sort?.direction?.toUpperCase() ?? 'DESC') as 'ASC' | 'DESC';
  const col = esql.col(metric.name);
  const entity = esql.col(entityField);

  if (metric.instrument === 'counter') {
    // Counter: two-stage aggregation with RATE
    const sortField = sort?.field === 'entity' ? entityField : 'AVG(metric_rate)';
    query = esql`TS ${index}`
      .pipe`STATS metric_rate = SUM(RATE(${col})) BY ${entity}, bucket = BUCKET(@timestamp, 100, ?_tstart, ?_tend)`
      .pipe`STATS AVG(metric_rate) BY ${entity}`
      .sort([sortField, sortDir])
      .print('wrapping');
  } else {
    // Gauge: simple average
    const sortField = sort?.field === 'entity' ? entityField : `AVG(${col})`;
    query = esql`TS ${index}`.pipe`STATS AVG(${col}) BY ${entity}`
      .sort([sortField, sortDir])
      .print('wrapping');
  }

  // Add group by fields if specified
  return groupByFields?.length ? addGroupByToQuery(query, groupByFields) : query;
};

/**
 * Adds or modifies a SORT clause in an ES|QL query.
 * Removes existing SORT and adds new one based on sort configuration.
 */
export const addSortToQuery = (query: string, sort: SortConfig | undefined): string => {
  if (!sort || !query) return query;

  try {
    const { root } = Parser.parse(query);
    if (!root.commands.some(({ name }) => name === 'stats')) return query;

    // Determine sort field from query info
    const info = parseEsqlQuery(query);
    const sortField = sort.field === 'entity' ? info.dimensions[0] : info.metricField;
    if (!sortField) return query;

    // Remove existing SORT commands and add new one
    for (const cmd of [...mutate.commands.sort.listCommands(root)]) {
      mutate.generic.commands.remove(root, cmd);
    }
    mutate.commands.sort.insertExpression(root, {
      parts: sortField,
      order: sort.direction.toUpperCase() as 'ASC' | 'DESC',
    });

    return WrappingPrettyPrinter.print(root, { multiline: true, wrap: 300 });
  } catch {
    return query;
  }
};

/**
 * Adds group by fields to all STATS commands in a query.
 * Fields are added to the BY clause if not already present.
 */
export const addGroupByToQuery = (query: string, groupByFields: string[]): string => {
  if (!query || !groupByFields.length) return query;

  try {
    const { root } = Parser.parse(query);
    const statsCommands = root.commands.filter(({ name }) => name === 'stats');
    if (!statsCommands.length) return query;

    // Process each STATS command
    for (const cmd of statsCommands) {
      // Find the BY option
      const options: ESQLCommandOption[] = [];
      Walker.walk(cmd, { visitCommandOption: (node) => options.push(node) });
      const byOption = options.find(({ name }) => name === 'by');
      if (!byOption) continue;

      // Get existing column names
      const existing = new Set(
        byOption.args.filter((arg): arg is ESQLColumn => isColumn(arg)).map((c) => c.name)
      );

      // Add new fields after the last column
      for (const field of groupByFields) {
        if (existing.has(field)) continue;
        const lastColIdx = byOption.args.findLastIndex((arg) => isColumn(arg));
        byOption.args.splice(lastColIdx + 1, 0, Builder.expression.column(field));
        existing.add(field);
      }
    }

    return WrappingPrettyPrinter.print(root, { multiline: true, wrap: 300 });
  } catch {
    return query;
  }
};

/**
 * Find the insertion index for a WHERE clause (after FROM/TS/WHERE, before STATS).
 */
const findWhereInsertionIndex = (commands: Array<{ name: string }>): number => {
  const beforeWhere = new Set(['from', 'ts', 'where']);
  let idx = 1;
  for (let i = 0; i < commands.length; i++) {
    if (beforeWhere.has(commands[i].name.toLowerCase())) idx = i + 1;
    else break;
  }
  return idx;
};

/**
 * Check if a WHERE command is a simple `field == "value"` or `field != "value"` filter.
 * Returns the operator if it matches, null otherwise.
 */
const getSimpleFilterOperator = (
  cmd: ESQLCommand,
  field: string,
  value: string
): '==' | '!=' | null => {
  if (cmd.name !== 'where' || !cmd.args?.[0]) return null;

  // The WHERE condition should be a direct comparison (not nested in AND/OR)
  const fn = cmd.args[0] as { type?: string; name?: string; args?: unknown[] };
  if (fn.type !== 'function' || (fn.name !== '==' && fn.name !== '!=')) return null;

  // Check column and value match
  let colMatch = false;
  let valMatch = false;

  Walker.walk(cmd, {
    visitColumn: (col) => {
      if (col.name === field) colMatch = true;
    },
    visitLiteral: (lit) => {
      // Normalize: remove surrounding quotes from stored value
      const stored = String(lit.value).replace(/^["']|["']$/g, '');
      if (stored === value) valMatch = true;
    },
  });

  return colMatch && valMatch ? (fn.name as '==' | '!=') : null;
};

/**
 * Add or update a WHERE filter in an ES|QL query.
 * - If a simple filter for the same field/value exists, updates the operator (== <-> !=)
 * - Otherwise adds a new WHERE clause after FROM/TS but before STATS
 * - Complex WHERE conditions are preserved as separate clauses
 */
export const addFilterToQuery = (
  query: string,
  field: string,
  value: string,
  operator: '==' | '!='
): string => {
  if (!query?.trim()) return query;

  try {
    const { root } = Parser.parse(query);
    if (!root.commands?.length) return query;

    // Find and update existing simple filter, or add new one
    let updated = false;
    for (const cmd of root.commands) {
      const existingOp = getSimpleFilterOperator(cmd as ESQLCommand, field, value);
      if (existingOp) {
        // Update operator in place
        (cmd.args![0] as { name: string }).name = operator;
        updated = true;
        break;
      }
    }

    if (!updated) {
      // Build and insert new WHERE clause using Composer
      const col = esql.col(field.includes('.') ? field.split('.') : field);
      const expr = operator === '==' ? esql.exp`${col} == ${value}` : esql.exp`${col} != ${value}`;
      const whereCmd = esql`FROM a`.pipe`WHERE ${expr}`.ast.commands[1];
      mutate.generic.commands.insert(root, whereCmd, findWhereInsertionIndex(root.commands));
    }

    return WrappingPrettyPrinter.print(root, { multiline: true, wrap: 300 });
  } catch {
    return query;
  }
};
