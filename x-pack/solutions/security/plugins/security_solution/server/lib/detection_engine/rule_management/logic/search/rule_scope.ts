/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type {
  RuleScope,
  RuleSetConditions,
} from '../../../../../../common/api/detection_engine/rule_sets';
import { buildRuleSetFilter } from '../../../rule_sets/logic/build_rule_set_filter';
import type { RuleSetsClient } from '../../../rule_sets/logic/rule_sets_client';

/** What decides the rules of a scope: conditions, picked rules and left-out rules. */
export interface RuleScopeMembership {
  conditions: RuleSetConditions;
  included_rule_ids: string[];
  excluded_rule_ids: string[];
}

/**
 * The membership of a rule scope:
 * - `rule_set_id`: the saved set;
 * - `rule_set_id` and `conditions`: the saved set's picked and left-out rules with other
 *   conditions, an unsaved change of the set (the rules page edits a set in place);
 * - `conditions`, `included_rule_ids`, `excluded_rule_ids`: a definition that is not saved.
 */
export const resolveRuleScopeMembership = async (
  scope: RuleScope | undefined,
  getRuleSetsClient: () => Promise<RuleSetsClient>
): Promise<RuleScopeMembership | undefined> => {
  if (!scope) {
    return undefined;
  }
  const {
    rule_set_id: ruleSetId,
    conditions,
    included_rule_ids: includedRuleIds,
    excluded_rule_ids: excludedRuleIds,
  } = scope;

  if (ruleSetId) {
    if (includedRuleIds || excludedRuleIds) {
      throw new BadRequestError(
        'rule_scope takes rule_set_id (optionally with conditions) or a rule set definition, not both'
      );
    }
    const set = await (await getRuleSetsClient()).get(ruleSetId);
    return {
      conditions: conditions ?? set.conditions,
      included_rule_ids: set.included_rule_ids,
      excluded_rule_ids: set.excluded_rule_ids,
    };
  }

  return {
    conditions: conditions ?? {},
    included_rule_ids: includedRuleIds ?? [],
    excluded_rule_ids: excludedRuleIds ?? [],
  };
};

/**
 * The one place that turns a rule scope into a rule filter. Every rules API that can be limited to a
 * rule set calls it, so a new storage of rules changes only this function and the set filter.
 */
export const resolveRuleScope = async (
  scope: RuleScope | undefined,
  getRuleSetsClient: () => Promise<RuleSetsClient>
): Promise<KueryNode | undefined> => {
  const membership = await resolveRuleScopeMembership(scope, getRuleSetsClient);
  return membership && buildRuleSetFilter(membership);
};
