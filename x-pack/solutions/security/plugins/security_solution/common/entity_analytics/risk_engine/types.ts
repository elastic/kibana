/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityRiskScoreRecord, RiskScoreInput } from '../../api/entity_analytics/common';
import { RiskScoreFields } from '../../search_strategy';

export enum RiskScoreEntityType {
  host = 'host',
  user = 'user',
  service = 'service',
}

export enum RiskScoreEntityNameField {
  host = RiskScoreFields.hostName,
  user = RiskScoreFields.userName,
  service = RiskScoreFields.serviceName,
}

export enum RiskScoreEntityLevelField {
  host = RiskScoreFields.hostRisk,
  user = RiskScoreFields.userRisk,
  service = RiskScoreFields.serviceRisk,
}

export enum RiskScoreEntityScoreField {
  host = RiskScoreFields.hostRiskScore,
  user = RiskScoreFields.userRiskScore,
  service = RiskScoreFields.serviceRiskScore,
}

export interface InitRiskEngineResult {
  legacyRiskEngineDisabled: boolean;
  riskEngineResourcesInstalled: boolean;
  riskEngineConfigurationCreated: boolean;
  riskEngineEnabled: boolean;
  errors: string[];
}
export interface EcsRiskScore {
  '@timestamp': string;
  host?: {
    name: string;
    risk: Omit<EntityRiskScoreRecord, '@timestamp'>;
  };
  user?: {
    name: string;
    risk: Omit<EntityRiskScoreRecord, '@timestamp'>;
  };
}

export type RiskInputs = RiskScoreInput[];
