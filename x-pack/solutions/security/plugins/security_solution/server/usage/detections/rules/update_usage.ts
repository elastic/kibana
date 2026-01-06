/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesTypeUsage, RuleMetric } from './types';
import { updateQueryUsage } from './usage_utils/update_query_usage';
import { updateTotalUsage } from './usage_utils/update_total_usage';

export const updateRuleUsage = (
  detectionRuleMetric: RuleMetric,
  usage: RulesTypeUsage
): RulesTypeUsage => {
  const {
    rule_type: ruleType,
    elastic_rule: elasticRule,
    is_customized: isCustomized,
  } = detectionRuleMetric;

  const ruleMap: Record<RuleMetric['rule_type'], keyof RulesTypeUsage> = {
    query: 'query',
    threshold: 'threshold',
    eql: 'eql',
    machine_learning: 'machine_learning',
    threat_match: 'threat_match',
    new_terms: 'new_terms',
    esql: 'esql',
  };

  const customMap: Record<RuleMetric['rule_type'], keyof RulesTypeUsage> = {
    query: 'query_custom',
    threshold: 'threshold_custom',
    eql: 'eql_custom',
    machine_learning: 'machine_learning_custom',
    threat_match: 'threat_match_custom',
    new_terms: 'new_terms_custom',
    esql: 'esql_custom',
  };

  let updated: RulesTypeUsage = {
    ...usage,
  };

  if (ruleType in ruleMap) {
    const baseKey = ruleMap[ruleType];
    updated = {
      ...updated,
      [baseKey]: updateQueryUsage({ ruleType: baseKey, usage, detectionRuleMetric }),
    };

    if (!elasticRule) {
      const customKey = customMap[ruleType];
      updated = {
        ...updated,
        [customKey]: updateQueryUsage({ ruleType: customKey, usage, detectionRuleMetric }),
      };
    }
  }

  if (elasticRule) {
    updated = {
      ...updated,
      elastic_total: updateTotalUsage({
        detectionRuleMetric,
        updatedUsage: usage,
        totalType: 'elastic_total',
      }),
      [isCustomized ? 'elastic_customized_total' : 'elastic_noncustomized_total']: updateTotalUsage(
        {
          detectionRuleMetric,
          updatedUsage: usage,
          totalType: isCustomized ? 'elastic_customized_total' : 'elastic_noncustomized_total',
        }
      ),
    };
  } else {
    updated = {
      ...updated,
      custom_total: updateTotalUsage({
        detectionRuleMetric,
        updatedUsage: usage,
        totalType: 'custom_total',
      }),
    };
  }

  return updated;
};
