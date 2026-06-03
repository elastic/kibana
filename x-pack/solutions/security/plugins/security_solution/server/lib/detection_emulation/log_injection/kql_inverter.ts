/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * KQL Query Inverter — Phase 2
 *
 * Parses a KQL query string into an AST via @kbn/es-query's
 * `fromKueryExpression`, walks the tree to extract field constraints,
 * and produces a set of field→value pairs that would cause a document
 * to match the query.
 */

import { fromKueryExpression } from '@kbn/es-query';
import type { FieldConstraint } from './eql_parser/constraint_extractor';

// Re-export for unified API
export type { FieldConstraint };

export interface KqlConstraints {
  type: 'kql';
  constraints: FieldConstraint[];
}

/**
 * Parse a KQL query and extract field constraints that, when satisfied,
 * would cause a document to match the query.
 *
 * Strategy:
 * - `and` nodes: extract from both sides (both must match)
 * - `or` nodes: extract from first branch only (heuristic)
 * - `is` (equality): field == value
 * - `range`: field < / <= / > / >= value
 * - `exists`: field must exist
 * - `nested`: recurse into nested path
 * - `not`: skip (we want positive constraints)
 */
export function extractKqlConstraints(kqlQuery: string): KqlConstraints {
  const constraints: FieldConstraint[] = [];
  try {
    const ast = fromKueryExpression(kqlQuery);
    walkNode(ast, constraints);
  } catch (e) {
    // If KQL fails to parse, return empty constraints
    // The rule preview validator will catch the real error
  }
  return { type: 'kql', constraints };
}

function walkNode(node: ReturnType<typeof fromKueryExpression>, out: FieldConstraint[]): void {
  if (!node || typeof node !== 'object') return;

  const type = node.type as string;
  const fn = (node as any).function as string | undefined;

  if (type === 'function' && fn) {
    switch (fn) {
      case 'and':
        for (const arg of (node as any).arguments ?? []) {
          walkNode(arg, out);
        }
        break;

      case 'or':
        // Heuristic: pick first branch
        if ((node as any).arguments?.length > 0) {
          walkNode((node as any).arguments[0], out);
        }
        break;

      case 'not':
        // Skip negated constraints — we want positive matches
        break;

      case 'is': {
        const args = (node as any).arguments ?? [];
        const field = String(extractLiteralValue(args[0]) ?? '');
        const value = extractLiteralValue(args[1]);
        if (field && value !== undefined) {
          // Wildcard values (contains *)
          if (typeof value === 'string' && value.includes('*')) {
            out.push({ field, operator: 'wildcard', value });
          } else {
            out.push({ field, operator: '==', value });
          }
        }
        break;
      }

      case 'range': {
        const args = (node as any).arguments ?? [];
        const field = String(extractLiteralValue(args[0]) ?? '');
        const op = String(extractLiteralValue(args[1]) ?? '');
        const value = extractLiteralValue(args[2]);
        if (field && op && value !== undefined) {
          const opMap: Record<string, FieldConstraint['operator']> = {
            gt: '>',
            gte: '>=',
            lt: '<',
            lte: '<=',
          };
          out.push({ field, operator: opMap[op] ?? '>=', value });
        }
        break;
      }

      case 'exists': {
        const args = (node as any).arguments ?? [];
        const field = String(extractLiteralValue(args[0]) ?? '');
        if (field) {
          out.push({ field, operator: 'exists', value: true });
        }
        break;
      }

      case 'nested': {
        const args = (node as any).arguments ?? [];
        if (args.length >= 2) {
          // args[0] = path literal, args[1] = sub-expression
          const nestedConstraints: FieldConstraint[] = [];
          walkNode(args[1], nestedConstraints);
          const path = extractLiteralValue(args[0]);
          if (path) {
            for (const c of nestedConstraints) {
              out.push({ ...c, field: `${path}.${c.field}` });
            }
          }
        }
        break;
      }
    }
  }
}

function extractLiteralValue(node: any): string | number | boolean | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === 'literal') return node.value;
  // For field references, the value is the field name
  if (node.type === 'function' && node.function === 'is' && node.arguments?.[0]?.type === 'literal') {
    return node.arguments[0].value;
  }
  if (typeof node.value !== 'undefined') return node.value;
  return undefined;
}
