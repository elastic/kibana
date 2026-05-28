/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unified Query Inverter — Phase 2
 *
 * Dispatches to the appropriate parser (KQL or EQL) based on rule type,
 * then converts field constraints into concrete ECS field values that
 * would cause a document to match the rule query.
 */

import type { FieldConstraint } from './eql_parser/constraint_extractor';
import { extractEqlConstraints } from './eql_parser';
import { extractKqlConstraints } from './kql_inverter';
import { extractEsqlConstraints } from './esql_inverter';

export type { FieldConstraint };

export interface InvertedRule {
  ruleId: string;
  ruleName: string;
  ruleType: 'eql' | 'query' | 'saved_query' | 'threshold' | 'new_terms' | 'esql';
  language: 'eql' | 'kuery' | 'lucene' | 'esql';
  /** Per-event constraints. For single-event rules, length=1. For EQL sequences, one per term. */
  events: InvertedEvent[];
  /** Sequence-level join keys (EQL only). */
  sequenceJoinKeys: string[];
  maxspan?: string;
}

export interface InvertedEvent {
  eventCategory: string;
  constraints: FieldConstraint[];
  joinKeys: string[];
}

/**
 * Invert a rule query into field constraints.
 *
 * Lucene queries are treated as opaque — we can't reliably parse them,
 * so we return the event category (if determinable) with no constraints
 * and rely on the technique template fallback.
 */
export function invertRuleQuery(rule: {
  id: string;
  name: string;
  type: string;
  language?: string;
  query?: string;
}): InvertedRule {
  const ruleType = rule.type as InvertedRule['ruleType'];
  const language = (rule.language ?? 'kuery') as InvertedRule['language'];
  const query = rule.query ?? '';

  if (ruleType === 'eql' || language === 'eql') {
    return invertEql(rule.id, rule.name, ruleType, query);
  }

  if (language === 'kuery') {
    return invertKql(rule.id, rule.name, ruleType, query);
  }

  if (language === 'esql' || ruleType === 'esql') {
    return invertEsql(rule.id, rule.name, ruleType, query);
  }

  // Lucene — return empty constraints, rely on template fallback
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    ruleType,
    language,
    events: [{ eventCategory: 'any', constraints: [], joinKeys: [] }],
    sequenceJoinKeys: [],
  };
}

function invertEql(
  ruleId: string,
  ruleName: string,
  ruleType: InvertedRule['ruleType'],
  query: string
): InvertedRule {
  const result = extractEqlConstraints(query);
  return {
    ruleId,
    ruleName,
    ruleType,
    language: 'eql',
    events: result.events.map((e) => ({
      eventCategory: e.eventCategory,
      constraints: e.constraints,
      joinKeys: e.joinKeys,
    })),
    sequenceJoinKeys: result.sequenceJoinKeys,
    maxspan: result.maxspan,
  };
}

function invertKql(
  ruleId: string,
  ruleName: string,
  ruleType: InvertedRule['ruleType'],
  query: string
): InvertedRule {
  const result = extractKqlConstraints(query);
  return {
    ruleId,
    ruleName,
    ruleType,
    language: 'kuery',
    events: [{
      eventCategory: detectEventCategory(result.constraints),
      constraints: result.constraints,
      joinKeys: [],
    }],
    sequenceJoinKeys: [],
  };
}

/**
 * Try to detect the event category from constraints.
 * Looks for event.category == "X" or event.type == "X".
 */
function detectEventCategory(constraints: FieldConstraint[]): string {
  const cat = constraints.find(
    (c) => c.field === 'event.category' && c.operator === '==' && typeof c.value === 'string'
  );
  return (cat?.value as string) ?? 'any';
}

function invertEsql(
  ruleId: string,
  ruleName: string,
  ruleType: InvertedRule['ruleType'],
  query: string
): InvertedRule {
  const result = extractEsqlConstraints(query);
  return {
    ruleId,
    ruleName,
    ruleType,
    language: 'esql',
    events: [{
      eventCategory: detectEventCategory(result.constraints),
      constraints: result.constraints,
      joinKeys: [],
    }],
    sequenceJoinKeys: [],
  };
}
