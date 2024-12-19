/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityTypeToNameField, RiskScoreEntityType } from '../../../../entity_analytics/types';
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
    return onlyLatest ? getRiskScoreLatestIndex(spaceId) : getRiskScoreTimeSeriesIndex(spaceId);
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
    return onlyLatest ? getRiskScoreLatestIndex(spaceId) : getRiskScoreTimeSeriesIndex(spaceId);
  } else {
    return `${RISKY_USERS_INDEX_PREFIX}${onlyLatest ? 'latest_' : ''}${spaceId}`;
  }
};

export const buildHostNamesFilter = (hostNames: string[]) => {
  return buildEntityNameFilter(RiskScoreEntityType.host, hostNames);
};

export const buildUserNamesFilter = (hostNames: string[]) => {
  return buildEntityNameFilter(RiskScoreEntityType.user, hostNames);
};

export const buildEntityNamesFilter = (entityType: RiskScoreEntityType, names: string[]) => {};

export const buildEntityNameFilter = (
  riskEntity: RiskScoreEntityType,
  entityNames: string[]
): ESQuery => {
  return { terms: { [EntityTypeToNameField[riskEntity]]: entityNames } };
};

export { RiskScoreEntityType };
