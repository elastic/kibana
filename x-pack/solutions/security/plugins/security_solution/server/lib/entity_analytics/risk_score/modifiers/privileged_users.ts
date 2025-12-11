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

import type { PrivmonUserCrudService } from '../../privilege_monitoring/users/privileged_users_crud';

import type { ExperimentalFeatures } from '../../../../../common';
import type { Modifier } from './types';

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
  experimentalFeatures: ExperimentalFeatures;
  globalWeight?: number;
}

// QUESTION: This should take labels/sources/roles into account?
export const PRIVILEGED_USER_MODIFIER = 1.5;

export const applyPrivmonModifier = async ({
  page: { buckets, identifierField, bounds },
  deps,
  globalWeight,
  experimentalFeatures,
}: ApplyCriticalityModifierParams) => {
  if (buckets.length === 0) {
    return [];
  }

  if (!experimentalFeatures.enableRiskScorePrivmonModifier) {
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

    return buildModifier(isPrivilegedUser, globalWeight);
  });
};

const buildModifier = (
  isPrivilegedUser: boolean,
  globalWeight?: number
): Modifier<'watchlist'> | undefined => {
  if (!isPrivilegedUser) {
    return;
  }

  const weightedModifier =
    globalWeight !== undefined ? PRIVILEGED_USER_MODIFIER * globalWeight : PRIVILEGED_USER_MODIFIER;
  // const weightedNormalizedScore =
  //   globalWeight !== undefined ? normalizedBaseScore * globalWeight : normalizedBaseScore;

  // const updatedNormalizedScore = bayesianUpdate({
  //   modifier: PRIVILEGED_USER_MODIFIER,
  //   score: weightedNormalizedScore,
  // });

  // const contribution = updatedNormalizedScore - weightedNormalizedScore;

  return {
    type: 'watchlist',
    subtype: 'privmon',
    modifier_value: weightedModifier,
    metadata: {
      is_privileged_user: true,
    },
  };
};
