/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityRiskLevels } from '../../api/entity_analytics/common';
import { EntityRiskLevelsEnum } from '../../api/entity_analytics/common';

export const RISK_LEVEL_RANGES = {
  [EntityRiskLevelsEnum.Unknown]: { start: 0, stop: 20 },
  [EntityRiskLevelsEnum.Low]: { start: 20, stop: 40 },
  [EntityRiskLevelsEnum.Moderate]: { start: 40, stop: 70 },
  [EntityRiskLevelsEnum.High]: { start: 70, stop: 90 },
  [EntityRiskLevelsEnum.Critical]: { start: 90, stop: 100 },
};

export const getRiskLevel = (riskScore: number): EntityRiskLevels => {
  if (riskScore >= RISK_LEVEL_RANGES[EntityRiskLevelsEnum.Critical].start) {
    return EntityRiskLevelsEnum.Critical;
  } else if (riskScore >= RISK_LEVEL_RANGES[EntityRiskLevelsEnum.High].start) {
    return EntityRiskLevelsEnum.High;
  } else if (riskScore >= RISK_LEVEL_RANGES[EntityRiskLevelsEnum.Moderate].start) {
    return EntityRiskLevelsEnum.Moderate;
  } else if (riskScore >= RISK_LEVEL_RANGES[EntityRiskLevelsEnum.Low].start) {
    return EntityRiskLevelsEnum.Low;
  } else {
    return EntityRiskLevelsEnum.Unknown;
  }
};
