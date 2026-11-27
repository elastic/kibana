/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityTypeToIdentifierField, EntityType } from '../../../../entity_analytics/types';
import type { ESQuery } from '../../../../typed_json';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../entity_analytics/risk_engine';

export const getRiskIndex = (spaceId: string, onlyLatest: boolean = true): string => {
  return onlyLatest ? getRiskScoreLatestIndex(spaceId) : getRiskScoreTimeSeriesIndex(spaceId);
};

export const buildHostNamesFilter = (hostNames: string[]) => {
  return buildEntityNameFilter(EntityType.host, hostNames);
};

export const buildUserNamesFilter = (userNames: string[]) => {
  return buildEntityNameFilter(EntityType.user, userNames);
};

/** Agent risk documents keep the agent's entity ID in `ai_agent.name`, as host documents keep `host.name`. */
const getRiskNameField = (riskEntity: EntityType): string =>
  riskEntity === EntityType.ai_agent ? 'ai_agent.name' : EntityTypeToIdentifierField[riskEntity];

export const buildEntityNameFilter = (riskEntity: EntityType, entityNames: string[]): ESQuery => {
  return { terms: { [getRiskNameField(riskEntity)]: entityNames } };
};

export { EntityType };
