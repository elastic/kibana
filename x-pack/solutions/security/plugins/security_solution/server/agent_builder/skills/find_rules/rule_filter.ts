/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { z } from '@kbn/zod/v4';
import { type as detectionRuleType } from '@kbn/securitysolution-io-ts-alerting-types';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { fullyEscapeKQLStringParam, prepareKQLStringParam } from '../../../../common/utils/kql';
import {
  convertRuleTagsToKQL,
  convertRuleTypesToKQL,
  KQL_FILTER_DISABLED_RULES,
  KQL_FILTER_ENABLED_RULES,
  KQL_FILTER_IMMUTABLE_RULES,
  KQL_FILTER_MUTABLE_RULES,
} from '../../../../common/detection_engine/rule_management/rule_filtering';
import {
  PARAMS_RISK_SCORE_FIELD,
  PARAMS_SEVERITY_FIELD,
  RULE_NAME_FIELD,
  RULE_PARAMS_FIELDS,
} from '../../../../common/detection_engine/rule_management/rule_fields';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

// ---- Tool dependency interface (shared by inline tools) ----

export interface FindRulesToolDeps {
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  logger: Logger;
}

// ---- Zod helpers ----

const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const nonEmptyString = z.string().min(1);
const riskScoreSchema = z.number().int().min(0).max(100);

// ---- Constants ----

const RULE_UUID_FIELD = 'alert.id';
const RULE_TYPE_VALUES = Object.keys(detectionRuleType.keys) as [Type, ...Type[]];
export const GROUP_BY_TERMS_SIZE = 500;

// ---- Filter language ----
//
// Inspired by the indicator-match rule's `threat_mapping` shape:
//   filter[ outer-array = OR ][ inner-array = AND ] of atomic conditions.
//
// Each condition is one-field-per-object, so the LLM never has to
// remember whether a multi-value array means AND or OR.

const conditionSchema = z.union([
  strictObject({
    enabled: z.boolean().describe('Match rules with this enabled state. Use true or false.'),
  }),
  strictObject({
    ruleSource: z
      .enum(['custom', 'prebuilt'])
      .describe('"custom" = user-authored. "prebuilt" = Elastic-shipped.'),
  }),
  strictObject({
    severity: z
      .enum(['critical', 'high', 'medium', 'low'])
      .describe('Match rules with this exact severity.'),
  }),
  strictObject({
    ruleType: z.enum(RULE_TYPE_VALUES).describe('Match rules of this exact type.'),
  }),
  strictObject({
    tag: nonEmptyString.describe(
      'Match rules carrying this exact tag string. ' +
        'Tag values are environment-specific — discover available tags via `security.discover_rule_tags` before filtering by name.'
    ),
  }),
  strictObject({
    mitreTechnique: nonEmptyString
      .regex(/^T\d{4}(\.\d{3})?$/i, 'mitreTechnique must look like "T1059" or "T1059.001".')
      .describe('MITRE ATT&CK technique ID, e.g. "T1059" or "T1059.001".'),
  }),
  strictObject({
    mitreTactic: nonEmptyString
      .regex(/^TA\d{4}$/i, 'mitreTactic must look like "TA0002".')
      .describe('MITRE ATT&CK tactic ID, e.g. "TA0002".'),
  }),
  strictObject({
    nameContains: nonEmptyString.describe(
      'Search rule names. Behavior mirrors the Detection Rules UI: a SINGLE-word value matches any name containing it as a substring (case-insensitive wildcard on `name.keyword`); a MULTI-word value matches names containing that exact phrase via the analyzer (no wildcards — punctuation/casing normalized but the words must appear together in order). Prefer a single distinctive token for substring search, or a quoted phrase when the exact wording matters.'
    ),
  }),
  strictObject({
    riskScoreMin: riskScoreSchema.describe(
      'Minimum risk_score (inclusive). Pair with riskScoreMax in the same AND-group for a range.'
    ),
  }),
  strictObject({
    riskScoreMax: riskScoreSchema.describe(
      'Maximum risk_score (inclusive). Pair with riskScoreMin in the same AND-group for a range.'
    ),
  }),
  strictObject({
    indexPattern: nonEmptyString.describe(
      'Match rules whose source index list contains this pattern. ' +
        'Supports wildcards, e.g. "logs-endpoint.events.*".'
    ),
  }),
  strictObject({
    ruleUuid: nonEmptyString.describe(
      'Match a specific rule by its alerting Saved Object UUID. This is the value visible in alerts as `kibana.alert.rule.uuid` and in the event log as `kibana.saved_objects.id`. Note: in the Security detection-engine codebase the bare name "ruleId" elsewhere refers to the static `params.ruleId` — that field is surfaced in this tool\'s output as `ruleId`. Use `ruleUuid` (this atom) for SO-UUID-keyed lookups: translating an alerts aggregation, gap search, failing-rule lookups, etc.'
    ),
  }),
]);

export const andGroupSchema = z
  .array(conditionSchema)
  .min(1, 'Each AND-group must contain at least one condition.');

export type Condition = z.infer<typeof conditionSchema>;
export type AndGroup = z.infer<typeof andGroupSchema>;

// ---- Shared parameter descriptions ----

export const FILTER_DESCRIPTION =
  'Outer array = OR. Inner array = AND. Each leaf is one atomic condition (one field per object). ' +
  'Example "critical AND tagged MITRE": `[[{ "severity": "critical" }, { "tag": "MITRE" }]]`. ' +
  'Example "critical OR high": `[[{ "severity": "critical" }], [{ "severity": "high" }]]`. ' +
  'Example "tagged MITRE AND tagged Custom (same rule)": `[[{ "tag": "MITRE" }, { "tag": "Custom" }]]`. ' +
  'Omit to match all rules.';

export const EXCLUDE_DESCRIPTION =
  'Same shape as `filter`. Rules matching ANY group here are excluded. ' +
  'Example "MITRE-tagged but not Custom": filter=`[[{ "tag": "MITRE" }]]`, exclude=`[[{ "tag": "Custom" }]]`.';

// ---- KQL building ----

function escapeUnquotedWildcardKql(value: string): string {
  return fullyEscapeKQLStringParam(value).replace(/\\\*/g, '*');
}

function isSingleTerm(value: string): boolean {
  return !value.includes(' ');
}

function buildConditionKql(c: Condition): string {
  if ('enabled' in c) return c.enabled ? KQL_FILTER_ENABLED_RULES : KQL_FILTER_DISABLED_RULES;
  if ('ruleSource' in c) {
    return c.ruleSource === 'prebuilt' ? KQL_FILTER_IMMUTABLE_RULES : KQL_FILTER_MUTABLE_RULES;
  }
  if ('severity' in c) return `${PARAMS_SEVERITY_FIELD}: ${prepareKQLStringParam(c.severity)}`;
  if ('ruleType' in c) return convertRuleTypesToKQL([c.ruleType]);
  if ('tag' in c) return convertRuleTagsToKQL([c.tag]);
  if ('mitreTechnique' in c) {
    const mitreField = c.mitreTechnique.includes('.')
      ? RULE_PARAMS_FIELDS.SUBTECHNIQUE_ID
      : RULE_PARAMS_FIELDS.TECHNIQUE_ID;
    return `${mitreField}: ${prepareKQLStringParam(c.mitreTechnique)}`;
  }
  if ('mitreTactic' in c) {
    return `${RULE_PARAMS_FIELDS.TACTIC_ID}: ${prepareKQLStringParam(c.mitreTactic)}`;
  }
  if ('nameContains' in c) {
    const escaped = fullyEscapeKQLStringParam(c.nameContains);
    return isSingleTerm(escaped)
      ? `${RULE_NAME_FIELD}.keyword: *${escaped}*`
      : `${RULE_NAME_FIELD}: ${prepareKQLStringParam(c.nameContains)}`;
  }
  if ('riskScoreMin' in c) {
    return `${PARAMS_RISK_SCORE_FIELD} >= ${c.riskScoreMin}`;
  }
  if ('riskScoreMax' in c) {
    return `${PARAMS_RISK_SCORE_FIELD} <= ${c.riskScoreMax}`;
  }
  if ('indexPattern' in c) {
    const escaped = escapeUnquotedWildcardKql(c.indexPattern);
    return isSingleTerm(escaped)
      ? `${RULE_PARAMS_FIELDS.INDEX}: ${escaped}`
      : `${RULE_PARAMS_FIELDS.INDEX}: ${prepareKQLStringParam(c.indexPattern)}`;
  }
  return `${RULE_UUID_FIELD}: ${prepareKQLStringParam(`alert:${c.ruleUuid}`)}`;
}

function buildAndGroup(g: AndGroup): string {
  if (g.length === 1) return buildConditionKql(g[0]);
  return g.map(buildConditionKql).join(' AND ');
}

function buildGroupsKql(groups: AndGroup[] | undefined): string | undefined {
  if (!groups || groups.length === 0) return undefined;
  const built = groups.map(buildAndGroup);
  if (built.length === 1) return built[0];
  return built.map((c) => `(${c})`).join(' OR ');
}

export function buildFullFilter(
  filter: AndGroup[] | undefined,
  exclude: AndGroup[] | undefined
): string | undefined {
  const positive = buildGroupsKql(filter);
  const negative = buildGroupsKql(exclude);

  if (positive && negative) return `(${positive}) AND NOT (${negative})`;
  if (positive) return positive;
  if (negative) return `NOT (${negative})`;
  return undefined;
}

// ---- Aggregation helpers (used by discover_rule_tags) ----

export interface TermsAggregationResult {
  by_field?: {
    buckets?: Array<{ key: string | number | boolean; doc_count: number }>;
    sum_other_doc_count?: number;
  };
}

export function buildAggregationResult({
  label,
  message,
  aggResult,
}: {
  label: string;
  message: string;
  aggResult: TermsAggregationResult | undefined;
}) {
  const byField = aggResult?.by_field;
  const buckets = byField?.buckets ?? [];
  const otherDocCount = byField?.sum_other_doc_count ?? 0;
  const truncationHint =
    otherDocCount > 0
      ? ` There are additional groups beyond the top ${buckets.length} (sum_other_doc_count=${otherDocCount}). Narrow the filter or surface this limitation to the user before saying a value does not exist.`
      : '';

  return {
    message: `${message} (${buckets.length} groups).${truncationHint}`,
    field: label,
    groups: buckets.map((bucket) => ({ value: bucket.key, count: bucket.doc_count })),
    truncated: otherDocCount > 0,
    otherDocCount,
  };
}
