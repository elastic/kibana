/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { isCustomizedPrebuiltRule } from '../../../../../../common/api/detection_engine/model/rule_schema/utils';
import type { FacetCounts } from '../../../../../../common/api/detection_engine/rule_management/granular_rules_contract.gen';
import type { PrebuiltReviewUpgradeFacetCategory } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_review_shared';

const bump = (out: Record<string, number>, key: string) => {
  out[key] = (out[key] ?? 0) + 1;
};

export const computePrebuiltUpgradeFacetCounts = (
  rules: RuleResponse[],
  categories: PrebuiltReviewUpgradeFacetCategory[]
): FacetCounts => {
  const counts: FacetCounts = {};
  for (const category of categories) {
    counts[category] = {};
  }

  for (const rule of rules) {
    for (const category of categories) {
      const bucket = counts[category];
      if (bucket) {
        switch (category) {
          case 'tags':
            for (const tag of rule.tags ?? []) {
              bump(bucket, tag);
            }
            break;
          case 'severity':
            if (rule.severity != null) {
              bump(bucket, rule.severity);
            }
            break;
          case 'name':
            if (rule.name != null) {
              bump(bucket, rule.name);
            }
            break;
          case 'type':
            if (rule.type != null) {
              bump(bucket, rule.type);
            }
            break;
          case 'customization_status':
            bump(bucket, isCustomizedPrebuiltRule(rule) ? 'CUSTOMIZED' : 'NOT_CUSTOMIZED');
            break;
          default:
            break;
        }
      }
    }
  }

  return counts;
};
