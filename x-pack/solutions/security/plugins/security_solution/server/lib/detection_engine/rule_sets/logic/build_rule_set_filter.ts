/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, nodeBuilder, nodeTypes } from '@kbn/es-query';
import type {
  RuleSetConditions,
  RuleSetValues,
} from '../../../../../common/api/detection_engine/rule_sets';
import {
  ENABLED_FIELD,
  LAST_RUN_OUTCOME_FIELD,
  PARAMS_IMMUTABLE_FIELD,
  PARAMS_TYPE_FIELD,
  TAGS_FIELD,
} from '../../../../../common/detection_engine/rule_management/rule_fields';
import { convertRuleSearchTermToKQL } from '../../../../../common/detection_engine/rule_management/rule_filtering';
import { normalizeRuleSetConditions } from '../../../../../common/detection_engine/rule_sets/rule_set_conditions';

export const RULE_ID_FIELD = 'alert.attributes.params.ruleId';
export const RULE_SO_ID_FIELD = 'alert.id';
const INTEGRATION_PACKAGE_FIELD = 'alert.attributes.params.relatedIntegrations.package';
const SEVERITY_FIELD = 'alert.attributes.params.severity';
const TACTIC_FIELD = 'alert.attributes.params.threat.tactic.name';

/** A `terms` query is exact match, so every id list is bounded well below `index.max_terms_count`. */
export const MAX_TERMS_VALUES = 10_000;

interface RuleSetMembership {
  conditions: RuleSetConditions;
  included_rule_ids: string[];
  excluded_rule_ids: string[];
}

const not = (node: KueryNode): KueryNode => nodeTypes.function.buildNode('not', node);

const terms = (field: string, values: readonly string[]): KueryNode => {
  if (values.length > MAX_TERMS_VALUES) {
    throw new Error(`A rule set filter takes at most ${MAX_TERMS_VALUES} values for ${field}`);
  }
  return nodeBuilder.terms(field, [...values]);
};

/** A node that matches no rule. */
const matchNothing = (): KueryNode => terms(RULE_ID_FIELD, []);

/** `include` with `match: all` is one clause per value; `match: any` and `exclude` are one clause. */
const includeExclude = (
  field: string,
  { include = [], exclude = [], match = 'any' }: Partial<RuleSetValues>
): KueryNode[] => [
  ...(include.length
    ? match === 'all'
      ? include.map((value) => terms(field, [value]))
      : [terms(field, include)]
    : []),
  ...(exclude.length ? [not(terms(field, exclude))] : []),
];

/**
 * The set conditions as one KQL node, or `undefined` when no condition is filled.
 * All filled conditions must match.
 */
export const buildConditionsFilter = (conditions: RuleSetConditions): KueryNode | undefined => {
  const {
    tags,
    related_integrations: integrations,
    type,
    severity,
    rule_source: ruleSource,
    mitre_tactic: tactic,
    tag_categories: tagCategories,
    enabled,
    last_run_outcome: lastRunOutcome,
    search,
  } = normalizeRuleSetConditions(conditions);
  const nodes: KueryNode[] = [
    ...(tags ? includeExclude(TAGS_FIELD, tags) : []),
    ...(integrations ? includeExclude(INTEGRATION_PACKAGE_FIELD, integrations) : []),
    ...(type ? includeExclude(PARAMS_TYPE_FIELD, type) : []),
    ...(severity ? includeExclude(SEVERITY_FIELD, severity) : []),
    ...(tactic ? includeExclude(TACTIC_FIELD, tactic) : []),
    // One group of clauses per tag category: OR inside a category, AND across categories.
    ...Object.values(tagCategories ?? {}).flatMap((values) => includeExclude(TAGS_FIELD, values)),
    // Same field as the Elastic / Custom filter of the rules table.
    ...(ruleSource
      ? [
          nodeBuilder.is(
            PARAMS_IMMUTABLE_FIELD,
            ruleSource.include[0] === 'external' ? 'true' : 'false'
          ),
        ]
      : []),
    ...(enabled != null ? [nodeBuilder.is(ENABLED_FIELD, String(enabled))] : []),
    ...(lastRunOutcome ? includeExclude(LAST_RUN_OUTCOME_FIELD, lastRunOutcome) : []),
    // Exactly the search of the rules table, so "Save filters as rule set" keeps the same rules.
    ...(search ? [fromKueryExpression(convertRuleSearchTermToKQL(search.term))] : []),
  ];

  return nodes.length ? nodeBuilder.and(nodes) : undefined;
};

/**
 * The rule filter of a set:
 * `(conditions OR rule_id in picked) AND NOT rule_id in left-out`.
 *
 * Picked and left-out lists become `terms` queries, so a set with thousands of picked rules is
 * still one small Elasticsearch query (no max clause count problem).
 */
export const buildRuleSetFilter = (ruleSet: RuleSetMembership): KueryNode => {
  const conditions = buildConditionsFilter(ruleSet.conditions);
  const included = ruleSet.included_rule_ids.length
    ? terms(RULE_ID_FIELD, ruleSet.included_rule_ids)
    : undefined;

  const members = [conditions, included].filter((node): node is KueryNode => node != null);
  if (members.length === 0) {
    return matchNothing();
  }

  const membersNode = nodeBuilder.or(members);
  // A rule that is picked and left out is in the set: picked wins (same as on save).
  const picked = new Set(ruleSet.included_rule_ids);
  const excluded = ruleSet.excluded_rule_ids.filter((ruleId) => !picked.has(ruleId));
  return excluded.length
    ? nodeBuilder.and([membersNode, not(terms(RULE_ID_FIELD, excluded))])
    : membersNode;
};
