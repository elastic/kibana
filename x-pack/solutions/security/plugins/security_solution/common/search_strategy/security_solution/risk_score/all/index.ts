/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';

import { EntityIdentifierFields, EntityType } from '../../../../entity_analytics/types';
import { EntityRiskLevelsEnum } from '../../../../api/entity_analytics/common';
import type {
  EntityRiskScoreRecord,
  EntityRiskLevels,
} from '../../../../api/entity_analytics/common';
import type { Inspect, Maybe, SortField } from '../../../common';

export interface RiskScoreStrategyResponse<T extends EntityType> extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  totalCount: number;
  data: Array<EntityRiskScore<T>> | undefined;
}

export interface RiskStats extends EntityRiskScoreRecord {
  rule_risks: RuleRisk[];
  multipliers: string[];
}

export const RiskSeverity = EntityRiskLevelsEnum;
export type RiskSeverity = EntityRiskLevels;

export type EntityRiskScore<T extends EntityType> = {
  '@timestamp': string;
  alertsCount?: number;
  oldestAlertTimestamp?: string;
} & Record<T, { name: string; risk: RiskStats }>;

export type HostRiskScore = EntityRiskScore<EntityType.host>;
export type UserRiskScore = EntityRiskScore<EntityType.user>;
export type ServiceRiskScore = EntityRiskScore<EntityType.service>;

export interface RuleRisk {
  rule_name: string;
  rule_risk: number;
  rule_id: string;
}

export type RiskScoreSortField = SortField<RiskScoreFields>;

export enum RiskScoreFields {
  timestamp = '@timestamp',
  hostName = EntityIdentifierFields.hostName,
  hostRiskScore = 'host.risk.calculated_score_norm',
  hostRisk = 'host.risk.calculated_level',
  userName = EntityIdentifierFields.userName,
  userRiskScore = 'user.risk.calculated_score_norm',
  userRisk = 'user.risk.calculated_level',
  serviceName = EntityIdentifierFields.serviceName,
  serviceRiskScore = 'service.risk.calculated_score_norm',
  serviceRisk = 'service.risk.calculated_level',
  alertsCount = 'alertsCount',
  unsupported = 'unsupported', // Temporary value used while we don't support the universal entity
}

export interface RiskScoreItem {
  _id?: Maybe<string>;
  [RiskScoreFields.hostName]: Maybe<string>;
  [RiskScoreFields.userName]: Maybe<string>;
  [RiskScoreFields.serviceName]: Maybe<string>;

  [RiskScoreFields.timestamp]: Maybe<string>;

  [RiskScoreFields.hostRisk]: Maybe<EntityRiskLevels>;
  [RiskScoreFields.userRisk]: Maybe<EntityRiskLevels>;
  [RiskScoreFields.serviceRisk]: Maybe<EntityRiskLevels>;

  [RiskScoreFields.hostRiskScore]: Maybe<number>;
  [RiskScoreFields.userRiskScore]: Maybe<number>;
  [RiskScoreFields.serviceRiskScore]: Maybe<number>;

  [RiskScoreFields.alertsCount]: Maybe<number>;
}

export const EMPTY_SEVERITY_COUNT = {
  [EntityRiskLevelsEnum.Critical]: 0,
  [EntityRiskLevelsEnum.High]: 0,
  [EntityRiskLevelsEnum.Low]: 0,
  [EntityRiskLevelsEnum.Moderate]: 0,
  [EntityRiskLevelsEnum.Unknown]: 0,
};

export const EntityTypeToLevelField: Record<EntityType, RiskScoreFields> = {
  [EntityType.host]: RiskScoreFields.hostRisk,
  [EntityType.user]: RiskScoreFields.userRisk,
  [EntityType.service]: RiskScoreFields.serviceRisk,
  [EntityType.universal]: RiskScoreFields.unsupported, // We don't calculate risk for the universal entity
};

export const EntityTypeToScoreField: Record<EntityType, RiskScoreFields> = {
  [EntityType.host]: RiskScoreFields.hostRiskScore,
  [EntityType.user]: RiskScoreFields.userRiskScore,
  [EntityType.service]: RiskScoreFields.serviceRiskScore,
  [EntityType.universal]: RiskScoreFields.unsupported, // We don't calculate risk for the universal entity
};
