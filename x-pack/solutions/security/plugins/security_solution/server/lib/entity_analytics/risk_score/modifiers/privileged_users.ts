/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { RiskScoreBucket } from '../../types';

import { max10DecimalPlaces } from '../helpers';
import { bayesianUpdate } from '../../asset_criticality/helpers';
import type { PrivmonUserCrudService } from '../../privilege_monitoring/users/privileged_users_crud';

export interface PrivmonRiskFields {
  category_3_score: number;
  category_3_count: number;
  is_privileged_user?: boolean;
  privileged_user_modifier?: number;
}

interface ApplyCriticalityModifierParams {
  page: {
    buckets: RiskScoreBucket[];
    identifierField: string;
    bounds: {
      lower?: string;
      upper?: string;
    };
  };

  deps: {
    privmonUserCrudService: PrivmonUserCrudService;
    logger: Logger;
  };
  globalWeight?: number;
}

// TODO: Tune modifier value
// QUESTION: This should take labels/sources/roles into account?
const PRIVILEGED_USER_MODIFIER = 2;

export const applyPrivmonModifier = async ({
  page: { buckets, identifierField, bounds },
  deps,
  globalWeight,
}: ApplyCriticalityModifierParams) => {
  if (buckets.length === 0) {
    return [];
  }

  const lower = bounds?.lower ? `${identifierField} > ${bounds.lower}` : undefined;
  const upper = bounds?.upper ? `${identifierField} <= ${bounds.upper}` : undefined;
  if (!lower && !upper) {
    throw new Error('Either lower or upper after key must be provided for pagination');
  }
  const rangeClauseKQL =
    !lower && !upper ? undefined : [lower, upper].filter(Boolean).join(' and ');

  const users = await deps.privmonUserCrudService.list(rangeClauseKQL).catch((error) => {
    deps.logger.warn(
      `Error retrieving privileged users: ${error}. Scoring will proceed without privileged user information.`
    );
    return [];
  });
  return buckets.map((bucket) => {
    const isPrivilegedUser = users.some(
      ({ user }) => user?.name === bucket.key[identifierField] && user?.is_privileged
    );

    return calculateScoreAndContributions(
      bucket.top_inputs.risk_details.value.normalized_score,
      isPrivilegedUser,
      globalWeight
    );
  });
};

const calculateScoreAndContributions = (
  normalizedBaseScore: number,
  isPrivilegedUser: boolean,
  globalWeight?: number
): PrivmonRiskFields => {
  if (!isPrivilegedUser) {
    return {
      category_3_score: 0,
      category_3_count: 0,
    };
  }

  const weightedNormalizedScore =
    globalWeight !== undefined ? normalizedBaseScore * globalWeight : normalizedBaseScore;

  const updatedNormalizedScore = bayesianUpdate({
    modifier: PRIVILEGED_USER_MODIFIER,
    score: weightedNormalizedScore,
  });

  const contribution = updatedNormalizedScore - weightedNormalizedScore;

  return {
    category_3_score: max10DecimalPlaces(contribution),
    category_3_count: 1, // modifier exists, so count as 1
    is_privileged_user: true,
    privileged_user_modifier: PRIVILEGED_USER_MODIFIER,
  };
};
