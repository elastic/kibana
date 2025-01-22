/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityTypeToIdentifierField, EntityType } from '../../../../entity_analytics/types';
import type { ESQuery } from '../../../../typed_json';
import { RISKY_HOSTS_INDEX_PREFIX, RISKY_USERS_INDEX_PREFIX } from '../../../../constants';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../entity_analytics/risk_engine';

/**
 * Make sure this aligns with the index in step 6, 9 in
 * prebuilt_dev_tool_content/console_templates/enable_host_risk_score.console
 */
export const getHostRiskIndex = (
  spaceId: string,
  onlyLatest: boolean = true,
  isNewRiskScoreModuleInstalled: boolean
): string => {
  if (isNewRiskScoreModuleInstalled) {
    return getRiskIndex(spaceId, onlyLatest);
  } else {
    return `${RISKY_HOSTS_INDEX_PREFIX}${onlyLatest ? 'latest_' : ''}${spaceId}`;
  }
};

export const getUserRiskIndex = (
  spaceId: string,
  onlyLatest: boolean = true,
  isNewRiskScoreModuleInstalled: boolean
): string => {
  if (isNewRiskScoreModuleInstalled) {
    return getRiskIndex(spaceId, onlyLatest);
  } else {
    return `${RISKY_USERS_INDEX_PREFIX}${onlyLatest ? 'latest_' : ''}${spaceId}`;
  }
};

/**
 * This implementation doesn't support the deprecated risk score module.
 */
export const getRiskIndex = (spaceId: string, onlyLatest: boolean = true): string => {
  return onlyLatest ? getRiskScoreLatestIndex(spaceId) : getRiskScoreTimeSeriesIndex(spaceId);
};

export const buildHostNamesFilter = (hostNames: string[]) => {
  return buildEntityNameFilter(EntityType.host, hostNames);
};

export const buildUserNamesFilter = (userNames: string[]) => {
  return buildEntityNameFilter(EntityType.user, userNames);
};

export const buildEntityNameFilter = (riskEntity: EntityType, entityNames: string[]): ESQuery => {
  return { terms: { [EntityTypeToIdentifierField[riskEntity]]: entityNames } };
};

export { EntityType };
