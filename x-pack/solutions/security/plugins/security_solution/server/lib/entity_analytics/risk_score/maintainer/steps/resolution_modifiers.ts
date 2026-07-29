/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityLevel } from '@kbn/entity-store/common';
import type { ParsedResolutionScore } from './parse_esql_row';
import type { RiskScoreModifierEntity } from './pipeline_types';

const criticalityRank: Partial<Record<AssetCriticalityLevel, number>> = {
  low_impact: 1,
  medium_impact: 2,
  high_impact: 3,
  extreme_impact: 4,
};

const getHigherCriticality = (
  left?: AssetCriticalityLevel | null,
  right?: AssetCriticalityLevel | null
): AssetCriticalityLevel | undefined | null => {
  if (!left) return right;
  if (!right) return left;
  return (criticalityRank[left] ?? 0) >= (criticalityRank[right] ?? 0) ? left : right;
};

export const buildResolutionModifierEntity = ({
  score,
  memberEntities,
}: {
  score: ParsedResolutionScore;
  memberEntities: Map<string, RiskScoreModifierEntity>;
}): RiskScoreModifierEntity => {
  const memberIds = [
    score.resolution_target_id,
    ...score.related_entities.map((entity) => entity.entity_id),
  ];

  let maxCriticality: AssetCriticalityLevel | null | undefined;
  let contributorEUID: string | undefined;
  const watchlists = new Set<string>();

  for (const memberId of memberIds) {
    const entity = memberEntities.get(memberId);
    const raised = getHigherCriticality(maxCriticality, entity?.asset?.criticality);
    // Attribute the level to the member that raised it, so score documents can
    // report which entity drove the criticality modifier. Ties keep the earlier
    // member (`getHigherCriticality` returns the left operand on equal rank).
    if (raised && raised !== maxCriticality) {
      contributorEUID = memberId;
    }
    maxCriticality = raised;

    const memberWatchlists = entity?.entity?.attributes?.watchlists ?? [];
    for (const watchlistId of memberWatchlists) {
      watchlists.add(watchlistId);
    }
  }

  return {
    entity: {
      id: score.resolution_target_id,
      attributes: {
        watchlists: [...watchlists],
      },
    },
    asset: {
      criticality: maxCriticality,
    },
    ...(contributorEUID !== undefined && { criticalityContributorEUID: contributorEUID }),
  };
};
