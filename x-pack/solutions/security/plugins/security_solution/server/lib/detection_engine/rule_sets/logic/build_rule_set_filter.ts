/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, nodeBuilder, nodeTypes } from '@kbn/es-query';
import type { RuleSetConditions } from '../../../../../common/api/detection_engine/rule_sets';
import {
  PARAMS_IMMUTABLE_FIELD,
  PARAMS_TYPE_FIELD,
  TAGS_FIELD,
} from '../../../../../common/detection_engine/rule_management/rule_fields';
import { convertRuleSearchTermToKQL } from '../../../../../common/detection_engine/rule_management/rule_filtering';

export const RULE_ID_FIELD = 'alert.attributes.params.ruleId';
export const RULE_SO_ID_FIELD = 'alert.id';
const INTEGRATION_PACKAGE_FIELD = 'alert.attributes.params.relatedIntegrations.package';
const SEVERITY_FIELD = 'alert.attributes.params.severity';

interface RuleSetMembership {
  conditions: RuleSetConditions;
  included_rule_ids: string[];
  excluded_rule_ids: string[];
}

const not = (node: KueryNode): KueryNode => nodeTypes.function.buildNode('not', node);

/** A node that matches no rule. */
const matchNothing = (): KueryNode => nodeBuilder.terms(RULE_ID_FIELD, []);

/**
 * The group conditions as one KQL node, or `undefined` when no condition is filled.
 * All filled conditions must match. A rule must have all tags; for the other conditions any value
 * matches (one `terms` query).
 */
export const buildConditionsFilter = (conditions: RuleSetConditions): KueryNode | undefined => {
  const { tags, integrations, rule_types: ruleTypes, severities, source, search } = conditions;
  const nodes: KueryNode[] = [];

  // Tags work like the tags filter of the rules table: a rule must have all of them.
  tags?.forEach((tag) => nodes.push(nodeBuilder.terms(TAGS_FIELD, [tag])));
  if (integrations?.length) nodes.push(nodeBuilder.terms(INTEGRATION_PACKAGE_FIELD, integrations));
  if (ruleTypes?.length) nodes.push(nodeBuilder.terms(PARAMS_TYPE_FIELD, ruleTypes));
  if (severities?.length) nodes.push(nodeBuilder.terms(SEVERITY_FIELD, severities));
  if (source)
    nodes.push(nodeBuilder.is(PARAMS_IMMUTABLE_FIELD, source === 'elastic' ? 'true' : 'false'));
  const term = search?.trim();
  if (term) {
    // Exactly the search of the rules table, so "Save filters as group" keeps the same rules.
    nodes.push(fromKueryExpression(convertRuleSearchTermToKQL(term)));
  }

  return nodes.length ? nodeBuilder.and(nodes) : undefined;
};

/**
 * The rule filter of a group:
 * `(conditions OR rule_id in picked) AND NOT rule_id in left-out`.
 *
 * Picked and left-out lists become `terms` queries, so a group with thousands of picked rules is
 * still one small Elasticsearch query (no max clause count problem).
 */
export const buildRuleSetFilter = (group: RuleSetMembership): KueryNode => {
  const conditions = buildConditionsFilter(group.conditions);
  const included = group.included_rule_ids.length
    ? nodeBuilder.terms(RULE_ID_FIELD, group.included_rule_ids)
    : undefined;

  const members = [conditions, included].filter((node): node is KueryNode => node != null);
  if (members.length === 0) {
    return matchNothing();
  }

  const membersNode = nodeBuilder.or(members);
  // A rule that is picked and left out is in the group: picked wins (same as on save).
  const picked = new Set(group.included_rule_ids);
  const excluded = group.excluded_rule_ids.filter((ruleId) => !picked.has(ruleId));
  return excluded.length
    ? nodeBuilder.and([membersNode, not(nodeBuilder.terms(RULE_ID_FIELD, excluded))])
    : membersNode;
};
