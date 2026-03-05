/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { ReferenceRule } from '../datasets/sample_rules';

/**
 * Extract MITRE ATT&CK techniques from a rule
 */
export function extractMitreTechniques(rule: Partial<ReferenceRule>): Set<string> {
  const techniques = new Set<string>();

  if (rule.threat) {
    for (const threat of rule.threat) {
      if (threat.technique) {
        techniques.add(threat.technique);
      }
    }
  }

  return techniques;
}

/**
 * ES|QL syntax validation using the official @elastic/esql parser.
 */
export function validateEsqlSyntax(query: string): { valid: boolean; error?: string } {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Query is empty' };
  }

  const errors = Parser.parseErrors(query);
  if (errors.length > 0) {
    return { valid: false, error: errors[0].message };
  }

  return { valid: true };
}

/**
 * Calculate precision, recall, and F1 score for set comparison
 */
export function calculateSetMetrics<T>(
  predicted: Set<T>,
  expected: Set<T>
): { precision: number; recall: number; f1: number } {
  if (predicted.size === 0 && expected.size === 0) {
    return { precision: 1.0, recall: 1.0, f1: 1.0 };
  }

  if (predicted.size === 0) {
    return { precision: 0, recall: 0, f1: 0 };
  }

  if (expected.size === 0) {
    return { precision: 0, recall: 0, f1: 0 };
  }

  const truePositives = [...predicted].filter((x) => expected.has(x)).length;

  const precision = truePositives / predicted.size;
  const recall = truePositives / expected.size;

  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { precision, recall, f1 };
}

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
type Severity = (typeof VALID_SEVERITIES)[number];

/** Returns true if severity is one of the four valid enum values. */
export function validateSeverity(severity: unknown): severity is Severity {
  return VALID_SEVERITIES.includes(severity as Severity);
}

/** Returns true if riskScore is a number in the 0–100 range. */
export function validateRiskScore(score: unknown): boolean {
  return typeof score === 'number' && score >= 0 && score <= 100;
}

/** Returns true if interval is a valid Elasticsearch duration string, e.g. `5m`, `30s`, `1h`. */
export function validateInterval(interval: unknown): boolean {
  return typeof interval === 'string' && /^\d+[smhd]$/.test(interval);
}

/**
 * Parses a `now-Xs/m/h/d` date-math expression into seconds.
 * Returns null if the expression cannot be parsed.
 */
export function parseDateMathSeconds(expr: unknown): number | null {
  if (typeof expr !== 'string') return null;
  const m = expr.match(/^now-(\d+)([smhd])$/);
  if (!m) return null;
  const [, n, unit] = m;
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(n, 10) * multipliers[unit];
}

/**
 * Checks that the FROM clause of an ES|QL query is not a bare wildcard (`FROM *`),
 * which is disallowed in alerting rule contexts.
 */
export function validateFromClause(query: string): { valid: boolean; error?: string } {
  const fromLine = query.trim().split(/\s*\|\s*/)[0];
  if (/^FROM\s+\*\s*$/i.test(fromLine)) {
    return { valid: false, error: 'FROM * is not allowed in alerting rules' };
  }
  return { valid: true };
}

/**
 * Check if a rule has all required fields
 */
export function hasRequiredFields(rule: Partial<ReferenceRule>): {
  hasAll: boolean;
  coverage: number;
  missing: string[];
} {
  const requiredFields = ['name', 'description', 'query', 'severity', 'tags', 'riskScore'];
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (
      !rule[field as keyof ReferenceRule] ||
      (Array.isArray(rule[field as keyof ReferenceRule]) &&
        (rule[field as keyof ReferenceRule] as unknown[]).length === 0)
    ) {
      missing.push(field);
    }
  }

  const coverage = (requiredFields.length - missing.length) / requiredFields.length;

  return {
    hasAll: missing.length === 0,
    coverage,
    missing,
  };
}
