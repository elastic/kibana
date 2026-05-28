/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EqlAst, Expression, SequenceQuery, EventQuery, SequenceTerm } from './types';
import { EqlParser } from './parser';

/**
 * A field constraint extracted from an EQL query condition.
 * Represents what value a field must have for the query to match.
 */
export interface FieldConstraint {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'wildcard' | 'in' | 'like' | 'regex' | 'exists';
  value: unknown; // string | number | boolean | null | string[]
  negated?: boolean;
}

/**
 * Constraints for a single event in an EQL query.
 * For single-event queries, there is one EventConstraints.
 * For sequences, there is one per sequence term.
 */
export interface EventConstraints {
  eventCategory: string;
  constraints: FieldConstraint[];
  joinKeys: string[];
}

/**
 * Full extraction result from an EQL query.
 */
export interface EqlConstraints {
  type: 'single' | 'sequence';
  events: EventConstraints[];
  sequenceJoinKeys: string[];
  maxspan?: string;
}

/**
 * Parse an EQL query string and extract field constraints
 * that can be used to generate matching ECS documents.
 */
export function extractEqlConstraints(eqlQuery: string): EqlConstraints {
  const parser = new EqlParser();
  const ast = parser.parse(eqlQuery);
  return extractFromAst(ast);
}

function extractFromAst(ast: EqlAst): EqlConstraints {
  if (ast.type === 'sequence') {
    return extractFromSequence(ast);
  }
  return extractFromEventQuery(ast);
}

function extractFromSequence(seq: SequenceQuery): EqlConstraints {
  const events = seq.terms.map((term) => extractFromSequenceTerm(term));
  return {
    type: 'sequence',
    events,
    sequenceJoinKeys: seq.joinKeys,
    maxspan: seq.maxspan,
  };
}

function extractFromSequenceTerm(term: SequenceTerm): EventConstraints {
  const constraints: FieldConstraint[] = [];
  extractConstraintsFromExpression(term.condition, constraints, false);

  // Add implicit event.category constraint if not 'any'
  if (term.eventCategory !== 'any') {
    constraints.unshift({
      field: 'event.category',
      operator: '==',
      value: term.eventCategory,
    });
  }

  return {
    eventCategory: term.eventCategory,
    constraints,
    joinKeys: term.joinKeys,
  };
}

function extractFromEventQuery(eq: EventQuery): EqlConstraints {
  const constraints: FieldConstraint[] = [];
  extractConstraintsFromExpression(eq.condition, constraints, false);

  if (eq.eventCategory !== 'any') {
    constraints.unshift({
      field: 'event.category',
      operator: '==',
      value: eq.eventCategory,
    });
  }

  return {
    type: 'single',
    events: [{ eventCategory: eq.eventCategory, constraints, joinKeys: [] }],
    sequenceJoinKeys: [],
  };
}

/**
 * Recursively walk an expression tree and extract field constraints.
 * Only extracts positive constraints (things that MUST be true for the
 * query to match) — ignores OR branches (we'd need to satisfy only one)
 * and negated conditions (we need the condition to be false).
 */
function extractConstraintsFromExpression(
  expr: Expression,
  out: FieldConstraint[],
  negated: boolean
): void {
  switch (expr.type) {
    case 'binary':
      if (expr.operator === 'and' && !negated) {
        // AND: both sides must be true → extract from both
        extractConstraintsFromExpression(expr.left, out, false);
        extractConstraintsFromExpression(expr.right, out, false);
      } else if (expr.operator === 'or' && !negated) {
        // OR: only one side needs to be true → pick the first branch
        // (heuristic: left branch tends to be the "primary" condition)
        extractConstraintsFromExpression(expr.left, out, false);
      }
      // For arithmetic ops, nothing to extract
      break;

    case 'unary':
      if (expr.operator === 'not') {
        extractConstraintsFromExpression(expr.operand, out, !negated);
      }
      break;

    case 'comparison': {
      const field = extractFieldName(expr.left);
      const value = extractLiteralValue(expr.right);
      if (field && value !== undefined) {
        out.push({
          field,
          operator: negated ? negateComparison(expr.operator) : expr.operator,
          value,
          negated,
        });
      }
      // Also handle reversed comparisons: "value" == field
      const fieldRight = extractFieldName(expr.right);
      const valueLeft = extractLiteralValue(expr.left);
      if (!field && fieldRight && valueLeft !== undefined) {
        out.push({
          field: fieldRight,
          operator: negated ? negateComparison(flipComparison(expr.operator)) : flipComparison(expr.operator),
          value: valueLeft,
          negated,
        });
      }
      break;
    }

    case 'wildcard_match': {
      const field = extractFieldName(expr.field);
      const value = extractLiteralValue(expr.value);
      if (field && value !== undefined) {
        out.push({ field, operator: 'wildcard', value, negated });
      }
      break;
    }

    case 'in': {
      const field = extractFieldName(expr.value);
      if (field) {
        const values = expr.list
          .map((e) => extractLiteralValue(e))
          .filter((v): v is string | number | boolean => v !== undefined);
        out.push({
          field,
          operator: 'in',
          value: values,
          negated: expr.negated || negated,
        });
      }
      break;
    }

    case 'like':
    case 'regex': {
      const field = extractFieldName(expr.value);
      if (field && expr.patterns.length > 0) {
        const patterns = expr.patterns
          .map((p) => extractLiteralValue(p))
          .filter((v): v is string => typeof v === 'string');
        out.push({
          field,
          operator: expr.type,
          value: patterns.length === 1 ? patterns[0] : patterns,
          negated,
        });
      }
      break;
    }

    case 'function_call':
      // Functions like length(), stringContains() etc. — extract field refs
      // but we can't easily invert them. Skip for now.
      break;

    case 'field':
      // Bare field reference (e.g. in `where process.name`) — means "exists"
      if (!negated) {
        out.push({ field: expr.name, operator: 'exists', value: true });
      }
      break;

    case 'literal':
      // Bare literal like `true` in `where true` — no constraints
      break;
  }
}

function extractFieldName(expr: Expression): string | undefined {
  if (expr.type === 'field') return expr.name;
  return undefined;
}

function extractLiteralValue(expr: Expression): string | number | boolean | null | undefined {
  if (expr.type === 'literal') return expr.value;
  return undefined;
}

function negateComparison(
  op: '==' | '!=' | '<' | '<=' | '>' | '>='
): '==' | '!=' | '<' | '<=' | '>' | '>=' {
  const map: Record<string, '==' | '!=' | '<' | '<=' | '>' | '>='> = {
    '==': '!=',
    '!=': '==',
    '<': '>=',
    '<=': '>',
    '>': '<=',
    '>=': '<',
  };
  return map[op] ?? op;
}

function flipComparison(
  op: '==' | '!=' | '<' | '<=' | '>' | '>='
): '==' | '!=' | '<' | '<=' | '>' | '>=' {
  const map: Record<string, '==' | '!=' | '<' | '<=' | '>' | '>='> = {
    '==': '==',
    '!=': '!=',
    '<': '>',
    '<=': '>=',
    '>': '<',
    '>=': '<=',
  };
  return map[op] ?? op;
}
