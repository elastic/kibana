/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';

export type RiskScoreType = NonNullable<EntityRiskScoreRecord['score_type']>;

/**
 * Filter clauses restricting risk documents under `riskPath` to one `score_type`; `base` also
 * matches documents written before the field existed.
 */
export const toScoreTypeFilter = (
  riskPath: string,
  scoreType: string | undefined
): Array<Record<string, unknown>> => {
  if (scoreType === undefined) {
    return [];
  }

  // documents written before score_type was introduced have no field — treat as base
  if (scoreType === 'base') {
    return [
      {
        bool: {
          should: [
            { term: { [`${riskPath}.score_type`]: 'base' } },
            { bool: { must_not: { exists: { field: `${riskPath}.score_type` } } } },
          ],
          minimum_should_match: 1,
        },
      },
    ];
  }

  return [{ term: { [`${riskPath}.score_type`]: scoreType } }];
};
