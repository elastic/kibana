/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ES|QL Query Inverter
 *
 * Parses an ES|QL query string into an AST via `@elastic/esql`'s Parser,
 * walks WHERE clause expressions to extract field constraints, and produces
 * a set of field→value pairs that would cause a document to match the query.
 *
 * Handles both non-aggregating queries (FROM ... | WHERE ...)
 * and aggregating queries (FROM ... | WHERE ... | STATS ... | WHERE ...) —
 * for aggregating queries, only the first WHERE clause is inverted since
 * subsequent WHERE clauses filter on aggregation results, not document fields.
 *
 * Supported operators: ==, !=, <, <=, >, >=, LIKE, NOT LIKE, RLIKE, NOT RLIKE,
 * IN, IS NULL, IS NOT NULL, AND, OR, NOT.
 */

import { Parser } from '@elastic/esql';
import type { FieldConstraint } from './eql_parser/constraint_extractor';

export type { FieldConstraint };

export interface EsqlConstraints {
  type: 'esql';
  constraints: FieldConstraint[];
}

/**
 * Parse an ES|QL query and extract field constraints from the first WHERE clause.
 *
 * Only the first WHERE is processed — in aggregating queries like
 * `FROM idx | WHERE x == 1 | STATS ... | WHERE count > 5`, the second WHERE
 * filters aggregation results and cannot be inverted into document constraints.
 */
export function extractEsqlConstraints(esqlQuery: string): EsqlConstraints {
  const constraints: FieldConstraint[] = [];
  try {
    const { root, errors } = Parser.parse(esqlQuery);

    // If there are parse errors, return empty constraints gracefully
    if (errors && errors.length > 0) {
      return { type: 'esql', constraints };
    }

    const commands = root?.commands ?? [];

    // Find the first WHERE command — this contains the document-level filter
    const whereCommand = commands.find(
      (cmd: any) => cmd.type === 'command' && cmd.name === 'where'
    );

    if (whereCommand && (whereCommand as any).args?.length > 0) {
      walkExpression((whereCommand as any).args[0], constraints);
    }
  } catch (e) {
    // If ES|QL fails to parse, return empty constraints
    // The rule preview validator will catch the real error
  }
  return { type: 'esql', constraints };
}

/**
 * Recursively walk an ES|QL AST expression node and extract field constraints.
 */
function walkExpression(node: any, out: FieldConstraint[]): void {
  if (!node || typeof node !== 'object') return;

  const { type, name, subtype } = node;

  if (type !== 'function') return;

  switch (subtype) {
    case 'binary-expression':
      walkBinaryExpression(node, out);
      break;

    case 'unary-expression':
      // NOT — skip negated branches (same heuristic as KQL/EQL inverters)
      break;

    case 'postfix-unary-expression':
      walkPostfixUnary(node, out);
      break;

    default:
      // Unknown function subtype — skip
      break;
  }
}

/**
 * Handle binary expressions: AND, OR, comparisons, LIKE, RLIKE, IN.
 */
function walkBinaryExpression(node: any, out: FieldConstraint[]): void {
  const fnName = (node.name ?? '').toLowerCase();
  const args = node.args ?? [];

  switch (fnName) {
    case 'and':
      // Both sides must match — extract from both
      for (const arg of args) {
        walkExpression(arg, out);
      }
      break;

    case 'or':
      // Heuristic: pick first branch (same as KQL/EQL inverters)
      if (args.length > 0) {
        walkExpression(args[0], out);
      }
      break;

    case '==': {
      const { field, value } = extractFieldAndValue(args);
      if (field !== undefined && value !== undefined) {
        out.push({ field, operator: '==', value });
      }
      break;
    }

    case '!=': {
      const { field, value } = extractFieldAndValue(args);
      if (field !== undefined && value !== undefined) {
        out.push({ field, operator: '!=', value, negated: true });
      }
      break;
    }

    case '>':
    case '>=':
    case '<':
    case '<=': {
      const { field, value, reversed } = extractFieldAndValue(args);
      if (field !== undefined && value !== undefined) {
        // If the comparison was reversed (value < field → field > value), flip the operator
        const op = reversed ? flipOperator(fnName) : fnName;
        out.push({ field, operator: op as FieldConstraint['operator'], value });
      }
      break;
    }

    case 'like': {
      const { field, value } = extractFieldAndValue(args);
      if (field !== undefined && value !== undefined) {
        // ES|QL LIKE uses % and _ wildcards; convert to our wildcard format
        const pattern = String(value).replace(/%/g, '*').replace(/_/g, '?');
        out.push({ field, operator: 'wildcard', value: pattern });
      }
      break;
    }

    case 'not like': {
      // Negated LIKE — skip (we want positive constraints)
      break;
    }

    case 'rlike': {
      const { field, value } = extractFieldAndValue(args);
      if (field !== undefined && value !== undefined) {
        out.push({ field, operator: 'regex', value: String(value) });
      }
      break;
    }

    case 'not rlike': {
      // Negated RLIKE — skip
      break;
    }

    case 'in': {
      const field = extractColumnName(args[0]);
      if (field !== undefined && args[1]?.type === 'list') {
        const values = extractListValues(args[1]);
        if (values.length > 0) {
          out.push({ field, operator: 'in', value: values });
        }
      }
      break;
    }

    case 'not': {
      // NOT as binary-expression — skip negated branches
      break;
    }

    default:
      // Unknown binary operator — skip
      break;
  }
}

/**
 * Handle postfix unary expressions: IS NULL, IS NOT NULL.
 */
function walkPostfixUnary(node: any, out: FieldConstraint[]): void {
  const fnName = (node.name ?? '').toLowerCase();
  const args = node.args ?? [];

  switch (fnName) {
    case 'is not null': {
      const field = extractColumnName(args[0]);
      if (field !== undefined) {
        out.push({ field, operator: 'exists', value: true });
      }
      break;
    }

    case 'is null': {
      // IS NULL — skip (we want documents that exist with values)
      break;
    }

    default:
      break;
  }
}

/**
 * Extract field name and value from a binary comparison's args.
 * Handles both `field == value` and `value == field` orderings.
 * Returns { field, value, reversed } where reversed=true if the value was on the left.
 */
function extractFieldAndValue(
  args: any[]
): { field?: string; value?: unknown; reversed?: boolean } {
  if (args.length < 2) return {};

  const left = args[0];
  const right = args[1];

  // Normal: field op value
  const leftField = extractColumnName(left);
  const rightValue = extractLiteralValue(right);
  if (leftField !== undefined && rightValue !== undefined) {
    return { field: leftField, value: rightValue };
  }

  // Reversed: value op field
  const rightField = extractColumnName(right);
  const leftValue = extractLiteralValue(left);
  if (rightField !== undefined && leftValue !== undefined) {
    return { field: rightField, value: leftValue, reversed: true };
  }

  return {};
}

/**
 * Extract a column name from an AST node.
 * Columns have type "column" and a "parts" array of name segments.
 */
function extractColumnName(node: any): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === 'column') {
    // parts: ["event", "category"] → "event.category"
    if (Array.isArray(node.parts) && node.parts.length > 0) {
      return node.parts.join('.');
    }
    // Fallback to name
    if (typeof node.name === 'string') return node.name;
  }
  return undefined;
}

/**
 * Extract a literal value from an AST node.
 */
function extractLiteralValue(node: any): string | number | boolean | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === 'literal') {
    // Use valueUnquoted for string literals if available (strips surrounding quotes)
    if (typeof node.valueUnquoted === 'string') return node.valueUnquoted;
    return node.value;
  }
  return undefined;
}

/**
 * Extract values from an ES|QL list node (used in IN expressions).
 * Lists have structure: { type: "list", values: ESQLAstItem[][] }
 */
function extractListValues(node: any): Array<string | number | boolean> {
  const values: Array<string | number | boolean> = [];
  if (!node || node.type !== 'list' || !Array.isArray(node.values)) return values;

  for (const valueGroup of node.values) {
    // Each element in values is an array of AST items (usually length 1)
    const items = Array.isArray(valueGroup) ? valueGroup : [valueGroup];
    for (const item of items) {
      const val = extractLiteralValue(item);
      if (val !== undefined) {
        values.push(val);
      }
    }
  }
  return values;
}

/**
 * Flip a comparison operator for reversed comparisons (value < field → field > value).
 */
function flipOperator(op: string): string {
  switch (op) {
    case '>':
      return '<';
    case '>=':
      return '<=';
    case '<':
      return '>';
    case '<=':
      return '>=';
    default:
      return op;
  }
}
