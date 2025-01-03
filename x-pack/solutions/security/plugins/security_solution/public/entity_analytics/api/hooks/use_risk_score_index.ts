/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../common/entity_analytics/risk_engine';
import { EntityType, getHostRiskIndex, getUserRiskIndex } from '../../../../common/search_strategy';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useIsNewRiskScoreModuleInstalled } from './use_risk_engine_status';

export const useEntityRiskIndex = (riskEntity: EntityType, onlyLatest: boolean = true) => {
  const spaceId = useSpaceId();
  const { installed: isNewRiskScoreModuleInstalled, isLoading: riskScoreStatusLoading } =
    useIsNewRiskScoreModuleInstalled();

  if (spaceId && !riskScoreStatusLoading && isNewRiskScoreModuleInstalled !== undefined) {
    if (isNewRiskScoreModuleInstalled) {
      return onlyLatest ? getRiskScoreLatestIndex(spaceId) : getRiskScoreTimeSeriesIndex(spaceId);
    }

    // TODO Delete this when the old risk score module is removed https://github.com/elastic/kibana/pull/201810
    return riskEntity === EntityType.host
      ? getHostRiskIndex(spaceId, onlyLatest, isNewRiskScoreModuleInstalled)
      : getUserRiskIndex(spaceId, onlyLatest, isNewRiskScoreModuleInstalled);
  }

  return undefined;
};
