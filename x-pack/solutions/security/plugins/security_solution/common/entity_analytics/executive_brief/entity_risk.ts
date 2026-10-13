/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity, EntityRiskLevels } from '@kbn/entity-store/common';
import { getRiskLevel } from '../risk_engine/risk_levels';

export interface EntityRisk {
  /** Normalized score, 0-100. */
  score: number;
  level: EntityRiskLevels;
}

/** An entity's risk: its resolution group's when scored, otherwise its own. */
export const getEntityRisk = ({ entity }: Entity): EntityRisk | undefined => {
  const groupRisk = entity?.relationships?.resolution?.risk;
  const risk = groupRisk?.calculated_score_norm !== undefined ? groupRisk : entity?.risk;
  const score = risk?.calculated_score_norm;
  if (score === undefined || !Number.isFinite(score)) {
    return undefined;
  }
  return { score, level: risk?.calculated_level ?? getRiskLevel(score) };
};
