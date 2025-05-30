/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { get } from 'lodash/fp';
import { CriticalityModifiers } from '../../../../common/entity_analytics/asset_criticality';
import type {
  AssetCriticalityRecord,
  AssetCriticalityUpsert,
  CriticalityLevel,
} from '../../../../common/entity_analytics/asset_criticality/types';
import { RISK_SCORING_NORMALIZATION_MAX } from '../risk_score/constants';
import { type CriticalityValues } from './constants';

/**
 * Retrieves the criticality modifier for a given criticality level.
 *
 * @param criticalityLevel The criticality level for which to get the modifier.
 * @returns The associated criticality modifier for the given criticality level.
 */
export const getCriticalityModifier = (criticalityLevel?: CriticalityLevel): number | undefined => {
  if (criticalityLevel == null) {
    return;
  }

  return CriticalityModifiers[criticalityLevel];
};

/**
 * Applies asset criticality to a normalized risk score using bayesian inference.
 * @param modifier - The criticality modifier to apply to the score.
 * @param score - The normalized risk score to which the criticality modifier is applied
 *
 * @returns The risk score with the criticality modifier applied.
 */
export const applyCriticalityToScore = ({
  modifier,
  score,
}: {
  modifier: number | undefined;
  score: number;
}): number => {
  if (modifier == null) {
    return score;
  }

  return bayesianUpdate({ max: RISK_SCORING_NORMALIZATION_MAX, modifier, score });
};

/**
 * Updates a score with the given modifier using bayesian inference.
 * @param modifier - The modifier to be applied to the score.
 * @param score - The score to modifiers are applied
 * @param max - The maximum value of the score.
 *
 * @returns The updated score with modifiers applied
 */
export const bayesianUpdate = ({
  max,
  modifier,
  score,
}: {
  max: number;
  modifier: number;
  score: number;
}) => {
  const priorProbability = score / (max - score);
  const newProbability = priorProbability * modifier;
  return (max * newProbability) / (1 + newProbability);
};

type AssetCriticalityUpsertWithDeleted = {
  [K in keyof AssetCriticalityUpsert]: K extends 'criticalityLevel'
    ? CriticalityValues
    : AssetCriticalityUpsert[K];
};

type AssetCriticalityRecordWithDeleted = {
  [K in keyof AssetCriticalityRecord]: K extends 'criticality_level'
    ? CriticalityValues
    : AssetCriticalityRecord[K];
};

const entityTypeByIdField = {
  'host.name': 'host',
  'user.name': 'user',
  'service.name': 'service',
  'entity.id': 'generic',
} as const;

/**
 * Returns the implicit Asset Criticality fields for the given entity according to the identifier field.
 */
export const getImplicitEntityFields = (
  record: AssetCriticalityUpsert
): Partial<AssetCriticalityRecord> => {
  const entityType = entityTypeByIdField[record.idField];

  // Generic entity has a different treatment since it uses entity.id as identifier
  if (entityType === 'generic') {
    return {
      entity: {
        asset: {
          criticality: record.criticalityLevel,
        },
        id: record.idValue,
      },
    };
  }

  return {
    [entityType]: {
      asset: {
        criticality: record.criticalityLevel,
      },
      name: record.idValue,
    },
  };
};

export const getImplicitEntityFieldsWithDeleted = (
  record: AssetCriticalityUpsertWithDeleted
): Partial<AssetCriticalityRecordWithDeleted> => {
  // Type assertion to satisfy the compiler as we know the deleted criticality handling is done correctly in the appropriate context
  return getImplicitEntityFields(
    record as AssetCriticalityUpsert
  ) as Partial<AssetCriticalityRecordWithDeleted>;
};

/**
 * Finds the mapping for a flatten field name
 *
 * @example
 *  const field = `user.asset.criticality`
 *  const mapping = {user: {properties: {asset: {properties: {criticality: {type: 'keyword'}}}}}};
 *  getMappingForFlattenedField(field, mapping) // returns {type: 'keyword'}
 *
 */
export const getMappingForFlattenedField = (
  field: string,
  mapping: Record<string, MappingProperty>
) => get(field.replaceAll('.', '.properties.'), mapping);
