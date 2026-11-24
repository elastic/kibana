/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type { RuleScope } from '../../../../../../common/api/detection_engine/rule_sets';
import { buildRuleSetFilter } from '../../../rule_sets/logic/build_rule_set_filter';
import type { RuleSetsClient } from '../../../rule_sets/logic/rule_sets_client';

/**
 * The one place that turns a rule scope into a rule filter. Every rules API that can be limited to a
 * rule set calls it, so a new storage of rules changes only this function and the set filter.
 */
export const resolveRuleScope = async (
  scope: RuleScope | undefined,
  getRuleSetsClient: () => Promise<RuleSetsClient>
): Promise<KueryNode | undefined> => {
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
    if (conditions || includedRuleIds || excludedRuleIds) {
      throw new BadRequestError(
        'rule_scope takes either rule_set_id or a rule set definition, not both'
      );
    }
    return (await getRuleSetsClient()).getFilter(ruleSetId);
  }

  return buildRuleSetFilter({
    conditions: conditions ?? {},
    included_rule_ids: includedRuleIds ?? [],
    excluded_rule_ids: excludedRuleIds ?? [],
  });
};
