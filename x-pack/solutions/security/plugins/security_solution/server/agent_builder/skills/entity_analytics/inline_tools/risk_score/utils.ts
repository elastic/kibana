/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '@kbn/entity-store/common';

export const intervalToEsql = (interval: string) => {
  const match = interval.match(/^(\d+)([smhdwM])$/);
  if (match == null) {
    throw new Error(`Invalid interval format: ${interval}`);
  }

  const [, value, unit] = match;
  const unitMap: Record<string, string> = {
    s: 'second',
    m: 'minute',
    h: 'hour',
    d: 'day',
    w: 'week',
    M: 'month',
  };
  const unitLabel = unitMap[unit];
  if (unitLabel == null) {
    throw new Error(`Unsupported interval unit: ${unit}`);
  }

  const numericValue = Number(value);
  const intervalUnit = numericValue === 1 ? unitLabel : `${unitLabel}s`;
  return `NOW() - ${numericValue} ${intervalUnit}`;
};

export const getRiskFieldPaths = (entityType: EntityType) => {
  const riskBasePath = `${entityType}.risk`;
  const scoreField = `${riskBasePath}.calculated_score_norm`;
  const levelField = `${riskBasePath}.calculated_level`;
  const idValueField = `${riskBasePath}.id_value`;
  const idFieldField = `${riskBasePath}.id_field`;
  const inputsField = `${riskBasePath}.inputs`;
  const calculatedScoreField = `${riskBasePath}.calculated_score`;
  const notesField = `${riskBasePath}.notes`;
  const criticalityModifierField = `${riskBasePath}.criticality_modifier`;
  const criticalityLevelField = `${riskBasePath}.criticality_level`;
  const modifiersField = `${riskBasePath}.modifiers`;

  return {
    scoreField,
    levelField,
    idValueField,
    idFieldField,
    inputsField,
    calculatedScoreField,
    notesField,
    criticalityModifierField,
    criticalityLevelField,
    modifiersField,
  };
};
