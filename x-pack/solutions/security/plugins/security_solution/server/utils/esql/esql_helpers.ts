/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker, isAssignment, isColumn, isOptionNode } from '@kbn/esql-language';
import type { ESQLAstItem, ESQLColumn } from '@kbn/esql-language';
import { isAsExpression, isFieldExpression } from '@kbn/esql-language/src/ast/is';

/**
 * Result of field lineage analysis including dependencies, renames, and aggregation keys.
 */
export interface FieldLineageResult {
  /** Map of column name -> array of source field dependencies */
  dependencies: Map<string, string[]>;
  /** Map of renamed field -> original field name */
  fieldRenames: Map<string, string>;
  /** Set of fields used as aggregation keys (BY clauses) */
  aggregationKeys: Set<string>;
  /** Set of functions used in aggregation keys */
  aggregationKeyFunctions: Set<string>;
  /** Map of column name -> set of functions used to compute it */
  fieldFunctions: Map<string, Set<string>>;
  /** Set of all output columns (final columns in the query) */
  outputColumns: Set<string>;
}

/**
 * Extracts all column references from an ESQL expression.
 * Recursively walks through the AST to find all column nodes.
 */
function extractColumnReferences(expression: ESQLAstItem): string[] {
  const columns = Walker.matchAll(expression, { type: 'column' }) as ESQLColumn[];
  return Array.from(new Set(columns.map((column) => column.parts.join('.'))));
}

/**
 * Extracts all function names referenced in an ESQL expression.
 */
function extractFunctionNames(expression: ESQLAstItem): string[] {
  const functions = Walker.matchAll(expression, { type: 'function' }) as Array<{ name: string }>;
  return Array.from(new Set(functions.map((func) => func.name)));
}

function extractExpressionInfo(expression: ESQLAstItem): {
  fields: string[];
  functions: string[];
} {
  return {
    fields: extractColumnReferences(expression),
    functions: extractFunctionNames(expression),
  };
}

function setFieldFunctions(
  fieldFunctions: Map<string, Set<string>>,
  fieldName: string,
  functions: string[]
): void {
  if (functions.length === 0) {
    return;
  }

  const existing = fieldFunctions.get(fieldName) ?? new Set<string>();
  functions.forEach((func) => existing.add(func));
  fieldFunctions.set(fieldName, existing);
}

function trackComputedField(
  columnName: string,
  expression: ESQLAstItem,
  dependencies: Map<string, string[]>,
  fieldFunctions: Map<string, Set<string>>,
  availableColumns: Set<string>
): void {
  const { fields, functions } = extractExpressionInfo(expression);
  dependencies.set(columnName, fields);
  setFieldFunctions(fieldFunctions, columnName, functions);
  availableColumns.add(columnName);
}

function getRenamePair(arg: ESQLAstItem): { oldName: string; newName: string } | undefined {
  if (isAsExpression(arg)) {
    if (arg.args && arg.args.length >= 2 && isColumn(arg.args[0]) && isColumn(arg.args[1])) {
      return {
        oldName: arg.args[0].parts.join('.'),
        newName: arg.args[1].parts.join('.'),
      };
    }
  } else if (isFieldExpression(arg)) {
    if (arg.args && arg.args.length >= 2 && isColumn(arg.args[0]) && isColumn(arg.args[1])) {
      return {
        oldName: arg.args[1].parts.join('.'),
        newName: arg.args[0].parts.join('.'),
      };
    }
  }

  return undefined;
}

/**
 * Processes EVAL command arguments to extract field dependencies.
 */
function processEvalCommand(
  command: { args: ESQLAstItem[] },
  dependencies: Map<string, string[]>,
  availableColumns: Set<string>,
  fieldFunctions: Map<string, Set<string>>
): void {
  for (const arg of command.args) {
    if (Array.isArray(arg)) {
      // Skip arrays (they represent multiple expressions in some contexts)
    } else if (isAssignment(arg)) {
      // Assignment should have 2 args: left side (column) and right side (expression)
      if (arg.args && arg.args.length >= 2 && isColumn(arg.args[0])) {
        const columnName = arg.args[0].parts.join('.');
        // The right side might be wrapped in an array (see parser TODO comment)
        let expression = arg.args[1];
        if (Array.isArray(expression) && expression.length > 0) {
          expression = expression[0];
        }

        trackComputedField(columnName, expression, dependencies, fieldFunctions, availableColumns);
      }
    } else if (isColumn(arg)) {
      // Simple column reference (no assignment)
      const columnName = arg.parts.join('.');
      availableColumns.add(columnName);
    }
  }
}

/**
 * Processes STATS command arguments to extract field dependencies.
 * Also tracks BY clause fields (aggregation keys) as they can contain sensitive data.
 */
function processStatsCommand(
  command: { args: ESQLAstItem[] },
  dependencies: Map<string, string[]>,
  availableColumns: Set<string>,
  aggregationKeys: Set<string>,
  aggregationKeyFunctions: Set<string>,
  fieldFunctions: Map<string, Set<string>>
): void {
  for (const arg of command.args) {
    if (Array.isArray(arg)) {
      // Skip arrays
    } else if (isOptionNode(arg) && arg.name === 'by') {
      // Track BY clause fields as aggregation keys (they can contain PII)
      const { fields: byFields, functions: byFunctions } = extractExpressionInfo(arg);
      byFields.forEach((field) => {
        aggregationKeys.add(field);
        // Also track as available column
        availableColumns.add(field);
        // If not already tracked, mark as source field
        if (!dependencies.has(field)) {
          dependencies.set(field, [field]);
        }
      });
      byFunctions.forEach((func) => aggregationKeyFunctions.add(func));
    } else if (isAssignment(arg)) {
      // Assignment should have 2 args: left side (column) and right side (expression)
      if (arg.args && arg.args.length >= 2 && isColumn(arg.args[0])) {
        const columnName = arg.args[0].parts.join('.');
        // The right side might be wrapped in an array (see parser TODO comment)
        let expression = arg.args[1];
        if (Array.isArray(expression) && expression.length > 0) {
          expression = expression[0];
        }

        trackComputedField(columnName, expression, dependencies, fieldFunctions, availableColumns);
      }
    } else if (isColumn(arg)) {
      // Simple column reference
      const columnName = arg.parts.join('.');
      availableColumns.add(columnName);
    }
  }
}

/**
 * Processes RENAME command arguments to track field renames.
 * Renamed fields inherit the sensitivity of their source fields.
 */
function processRenameCommand(
  command: { args: ESQLAstItem[] },
  dependencies: Map<string, string[]>,
  availableColumns: Set<string>,
  fieldRenames: Map<string, string>,
  fieldFunctions: Map<string, Set<string>>
): void {
  for (const arg of command.args) {
    if (Array.isArray(arg)) {
      // Skip arrays
    } else {
      const renamePair = getRenamePair(arg);
      if (renamePair) {
        const { oldName, newName } = renamePair;

        // Track the rename mapping
        fieldRenames.set(newName, oldName);

        // Copy dependencies from old field to new field
        const existingDependencies = dependencies.get(oldName) ?? [oldName];
        dependencies.set(newName, existingDependencies);

        const existingFunctions = fieldFunctions.get(oldName);
        if (existingFunctions) {
          fieldFunctions.set(newName, new Set(existingFunctions));
        }

        // Update available columns
        availableColumns.delete(oldName);
        availableColumns.add(newName);
      }
    }
  }
}

/**
 * Processes KEEP command arguments to track kept columns.
 */
function processKeepCommand(
  command: { args: ESQLAstItem[] },
  dependencies: Map<string, string[]>,
  availableColumns: Set<string>
): void {
  for (const arg of command.args) {
    if (Array.isArray(arg)) {
      // Skip arrays
    } else if (isColumn(arg)) {
      const columnName = arg.parts.join('.');
      // If this column has dependencies, ensure they're tracked
      if (!dependencies.has(columnName) && availableColumns.has(columnName)) {
        // Column exists but has no computed dependencies (it's a source field)
        dependencies.set(columnName, [columnName]);
      }
    }
  }
}

/**
 * Extracts comprehensive field lineage information from an ESQL query.
 * This includes dependencies, field renames, aggregation keys, and output columns.
 *
 * @param esql - The ESQL query string
 * @returns Field lineage result with dependencies, renames, aggregation keys, and output columns
 */
export function extractFieldLineage(esql: string): FieldLineageResult {
  const dependencies = new Map<string, string[]>();
  const fieldRenames = new Map<string, string>();
  const aggregationKeys = new Set<string>();
  const aggregationKeyFunctions = new Set<string>();
  const fieldFunctions = new Map<string, Set<string>>();
  const outputColumns = new Set<string>();

  // Trim the query to remove leading/trailing whitespace
  const trimmedQuery = esql.trim();
  const { errors, root } = Parser.parse(trimmedQuery);
  // If there are parse errors, we can't reliably extract dependencies
  // but we'll still try to process what was parsed
  if (errors.length > 0 && root.commands.length === 0) {
    return {
      dependencies,
      fieldRenames,
      aggregationKeys,
      aggregationKeyFunctions,
      fieldFunctions,
      outputColumns,
    };
  }

  // Track available columns as we process commands
  const availableColumns = new Set<string>();

  // Process each command in order
  for (const command of root.commands) {
    const commandName = command.name?.toLowerCase();
    if (commandName === 'eval') {
      processEvalCommand(command, dependencies, availableColumns, fieldFunctions);
    } else if (commandName === 'stats') {
      processStatsCommand(
        command,
        dependencies,
        availableColumns,
        aggregationKeys,
        aggregationKeyFunctions,
        fieldFunctions
      );
    } else if (commandName === 'rename') {
      processRenameCommand(command, dependencies, availableColumns, fieldRenames, fieldFunctions);
    } else if (commandName === 'keep') {
      processKeepCommand(command, dependencies, availableColumns);
    }
    // FROM and other commands don't need special processing
  }

  // Determine output columns - these are the columns available after the last command
  // If there's a KEEP command, use those columns; otherwise use all available columns
  const lastKeepCommand = root.commands
    .slice()
    .reverse()
    .find((cmd) => cmd.name?.toLowerCase() === 'keep');

  if (lastKeepCommand) {
    // Extract columns from the last KEEP command
    for (const arg of lastKeepCommand.args) {
      if (isColumn(arg)) {
        const columnName = arg.parts.join('.');
        outputColumns.add(columnName);
      }
    }
  } else {
    // No KEEP command, all available columns are output
    availableColumns.forEach((col) => outputColumns.add(col));
  }

  return {
    dependencies,
    fieldRenames,
    aggregationKeys,
    aggregationKeyFunctions,
    fieldFunctions,
    outputColumns,
  };
}

/**
 * Recursively resolves all base field dependencies for a given field.
 * This includes following renames and transitive dependencies.
 *
 * @param fieldName - The field name to resolve
 * @param dependencies - Field dependencies map
 * @param fieldRenames - Field renames map
 * @param visited - Set of already visited fields to prevent cycles
 * @returns Set of all base field names that this field depends on
 */
export function resolveBaseFields(
  fieldName: string,
  dependencies: Map<string, string[]>,
  fieldRenames: Map<string, string>,
  visited: Set<string> = new Set()
): Set<string> {
  // Prevent infinite loops
  if (visited.has(fieldName)) {
    return new Set();
  }
  visited.add(fieldName);

  const baseFields = new Set<string>();

  // Check if this field is a rename of another field
  const originalField = fieldRenames.get(fieldName);
  if (originalField) {
    // Recursively resolve the original field
    const originalBaseFields = resolveBaseFields(
      originalField,
      dependencies,
      fieldRenames,
      visited
    );
    originalBaseFields.forEach((f) => baseFields.add(f));
  }

  // Get direct dependencies
  const deps = dependencies.get(fieldName);
  if (deps) {
    for (const dep of deps) {
      // If the dependency is the same as the field itself, it's a base field
      if (dep === fieldName) {
        baseFields.add(fieldName);
      } else {
        // Recursively resolve the dependency
        const depBaseFields = resolveBaseFields(dep, dependencies, fieldRenames, visited);
        depBaseFields.forEach((f) => baseFields.add(f));
      }
    }
  } else {
    // No dependencies tracked, assume it's a base field
    baseFields.add(fieldName);
  }

  return baseFields;
}
