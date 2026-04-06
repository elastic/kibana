/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import type { FacetCounts } from '../../../../../../common/api/detection_engine/rule_management/granular_rules_contract.gen';
import type { PrebuiltReviewInstallFacetCategory } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_review_shared';

const bump = (out: Record<string, number>, key: string) => {
  out[key] = (out[key] ?? 0) + 1;
};

export const computePrebuiltInstallFacetCounts = (
  assets: PrebuiltRuleAsset[],
  categories: PrebuiltReviewInstallFacetCategory[]
): FacetCounts => {
  const counts: FacetCounts = {};
  for (const category of categories) {
    counts[category] = {};
  }

  for (const asset of assets) {
    for (const category of categories) {
      const bucket = counts[category];
      if (bucket) {
        switch (category) {
          case 'tags':
            for (const tag of asset.tags ?? []) {
              bump(bucket, tag);
            }
            break;
          case 'severity':
            if (asset.severity != null) {
              bump(bucket, String(asset.severity));
            }
            break;
          case 'risk_score':
            if (asset.risk_score != null) {
              bump(bucket, String(asset.risk_score));
            }
            break;
          case 'name':
            if (asset.name != null) {
              bump(bucket, asset.name);
            }
            break;
          case 'type':
            if (asset.type != null) {
              bump(bucket, asset.type);
            }
            break;
          default:
            break;
        }
      }
    }
  }

  return counts;
};
