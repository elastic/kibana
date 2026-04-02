/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { RiskEngineStatusEnum } from '../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import type { RiskEngineStatus } from '../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import type { StoreStatus } from '../../../common/api/entity_analytics';

export type EntityAnalyticsStatus =
  | 'not_installed'
  | 'enabling'
  | 'enabled'
  | 'disabled'
  | 'partially_enabled'
  | 'error';

interface UseEntityAnalyticsStatusParams {
  riskEngineStatus?: RiskEngineStatus | null;
  entityStoreStatus?: StoreStatus;
  isEntityStoreFeatureFlagDisabled: boolean;
  isMutationLoading?: boolean;
}

export const deriveEntityAnalyticsStatus = ({
  riskEngineStatus,
  entityStoreStatus,
  isEntityStoreFeatureFlagDisabled,
  isMutationLoading,
}: UseEntityAnalyticsStatusParams): EntityAnalyticsStatus => {
  if (isMutationLoading) {
    return 'enabling';
  }

  if (isEntityStoreFeatureFlagDisabled) {
    if (!riskEngineStatus || riskEngineStatus === RiskEngineStatusEnum.NOT_INSTALLED) {
      return 'not_installed';
    }
    return riskEngineStatus === RiskEngineStatusEnum.ENABLED ? 'enabled' : 'disabled';
  }

  if (entityStoreStatus === 'installing') {
    return 'enabling';
  }

  if (entityStoreStatus === 'error') {
    return 'error';
  }

  const riskOff =
    !riskEngineStatus ||
    riskEngineStatus === RiskEngineStatusEnum.NOT_INSTALLED ||
    riskEngineStatus === RiskEngineStatusEnum.DISABLED;
  const storeOff =
    !entityStoreStatus || entityStoreStatus === 'not_installed' || entityStoreStatus === 'stopped';

  const riskOn = riskEngineStatus === RiskEngineStatusEnum.ENABLED;
  const storeOn = entityStoreStatus === 'running';

  if (riskOn && storeOn) {
    return 'enabled';
  }

  if (riskOff && storeOff) {
    const neitherInstalled =
      (!riskEngineStatus || riskEngineStatus === RiskEngineStatusEnum.NOT_INSTALLED) &&
      (!entityStoreStatus || entityStoreStatus === 'not_installed');
    return neitherInstalled ? 'not_installed' : 'disabled';
  }

  return 'partially_enabled';
};

export const useEntityAnalyticsStatus = (
  params: UseEntityAnalyticsStatusParams
): EntityAnalyticsStatus => {
  const {
    riskEngineStatus,
    entityStoreStatus,
    isEntityStoreFeatureFlagDisabled,
    isMutationLoading,
  } = params;

  return useMemo(
    () =>
      deriveEntityAnalyticsStatus({
        riskEngineStatus,
        entityStoreStatus,
        isEntityStoreFeatureFlagDisabled,
        isMutationLoading,
      }),
    [riskEngineStatus, entityStoreStatus, isEntityStoreFeatureFlagDisabled, isMutationLoading]
  );
};
