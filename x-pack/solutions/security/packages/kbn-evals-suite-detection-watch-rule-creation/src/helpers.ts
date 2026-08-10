/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Most helpers here are adapted from {@link ../../kbn-evals-suite-security-ai-rules/src/helpers.ts}.
// Differences: threat array shape (nested STIX vs flat strings), @kbn/datemath-based
// resolveDateMathSeconds (vs regex), and @kbn/esql-language-based validateEsqlSyntax.

import { parse as parseDateMath } from '@kbn/datemath';
import { validateQuery } from '@kbn/esql-language';
import type { DraftRule } from './types';

/**
 * Extract MITRE ATT&CK technique IDs from a draft rule's threat array.
 * Collects technique IDs and subtechnique IDs — both included so comparisons
 * work regardless of how specifically the agent or dataset stores them.
 */
export const extractMitreTechniques = (rule: DraftRule): Set<string> => {
  const techniques = new Set<string>();
  for (const threat of rule.threat ?? []) {
    for (const technique of threat.technique ?? []) {
      if (technique.id) techniques.add(technique.id);
      for (const sub of technique.subtechnique ?? []) {
        if (sub.id) techniques.add(sub.id);
      }
    }
  }
  return techniques;
};

/** ES|QL validation using the Kibana-blessed @kbn/esql-language wrapper. */
export const validateEsqlSyntax = async (
  query: string
): Promise<{ valid: boolean; error?: string }> => {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Query is empty' };
  }
  const { errors } = await validateQuery(query);
  if (errors.length > 0) {
    const first = errors[0];
    return { valid: false, error: 'text' in first ? first.text : first.message };
  }
  return { valid: true };
};

/**
 * Checks that the FROM clause of an ES|QL query is not a bare wildcard (`FROM *`),
 * which is disallowed in alerting rule contexts.
 */
export const validateFromClause = (query: string): { valid: boolean; error?: string } => {
  const fromLine = query.trim().split(/\s*\|\s*/)[0];
  if (/^FROM\s+\*\s*$/i.test(fromLine)) {
    return { valid: false, error: 'FROM * is not allowed in alerting rules' };
  }
  return { valid: true };
};

/** Precision, recall, and F1 for set comparisons. */
export const calculateSetMetrics = <T>(
  predicted: Set<T>,
  expected: Set<T>
): { precision: number; recall: number; f1: number } => {
  if (predicted.size === 0 && expected.size === 0) return { precision: 1, recall: 1, f1: 1 };
  if (predicted.size === 0 || expected.size === 0) return { precision: 0, recall: 0, f1: 0 };
  const truePositives = [...predicted].filter((x) => expected.has(x)).length;
  const precision = truePositives / predicted.size;
  const recall = truePositives / expected.size;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1 };
};

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
type Severity = (typeof VALID_SEVERITIES)[number];

export const validateSeverity = (severity: unknown): severity is Severity =>
  VALID_SEVERITIES.includes(severity as Severity);

export const validateRiskScore = (score: unknown): boolean =>
  typeof score === 'number' && score >= 0 && score <= 100;

export const validateInterval = (interval: unknown): boolean =>
  typeof interval === 'string' && /^\d+[smhd]$/.test(interval);

/**
 * Resolves an Elastic date math expression to seconds since epoch.
 * Pass the same `now` to both calls when comparing two expressions.
 */
export const resolveDateMathSeconds = (expr: unknown, now: Date): number | null => {
  if (typeof expr !== 'string') return null;
  const ms = parseDateMath(expr, { forceNow: now })?.valueOf();
  return ms != null ? ms / 1000 : null;
};

const REQUIRED_FIELDS = ['name', 'description', 'query', 'severity', 'tags', 'risk_score'] as const;

export const hasRequiredFields = (
  rule: DraftRule
): { hasAll: boolean; coverage: number; missing: string[] } => {
  const missing: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    const value = rule[field as keyof DraftRule];
    const isAbsent =
      value == null ||
      (typeof value === 'string' && value.length === 0) ||
      (Array.isArray(value) && value.length === 0);
    if (isAbsent) missing.push(field);
  }
  const coverage = (REQUIRED_FIELDS.length - missing.length) / REQUIRED_FIELDS.length;
  return { hasAll: missing.length === 0, coverage, missing };
};
