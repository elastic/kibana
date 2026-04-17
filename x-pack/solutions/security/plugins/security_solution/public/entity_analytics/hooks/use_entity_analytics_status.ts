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
  isEntityStoreV2Enabled: boolean;
  isMutationLoading?: boolean;
}

const isRiskEngineInstalled = (status?: RiskEngineStatus | null): boolean =>
  !!status && status !== RiskEngineStatusEnum.NOT_INSTALLED;

const isRiskEngineEnabled = (status?: RiskEngineStatus | null): boolean =>
  status === RiskEngineStatusEnum.ENABLED;

const isStoreInstalled = (status?: StoreStatus): boolean => !!status && status !== 'not_installed';

const deriveRiskEngineOnlyStatus = (
  riskEngineStatus?: RiskEngineStatus | null
): EntityAnalyticsStatus => {
  if (!isRiskEngineInstalled(riskEngineStatus)) {
    return 'not_installed';
  }
  return isRiskEngineEnabled(riskEngineStatus) ? 'enabled' : 'disabled';
};

const deriveEntityStoreOnlyStatus = (entityStoreStatus?: StoreStatus): EntityAnalyticsStatus => {
  if (!isStoreInstalled(entityStoreStatus)) {
    return 'not_installed';
  }
  if (entityStoreStatus === 'error') {
    return 'error';
  }
  return entityStoreStatus === 'running' ? 'enabled' : 'disabled';
};

const deriveCombinedStatus = (
  riskEngineStatus?: RiskEngineStatus | null,
  entityStoreStatus?: StoreStatus
): EntityAnalyticsStatus => {
  const riskOn = isRiskEngineEnabled(riskEngineStatus);
  const storeOn = entityStoreStatus === 'running';

  if (riskOn && storeOn) {
    return 'enabled';
  }

  const riskOff = !isRiskEngineInstalled(riskEngineStatus) || !riskOn;
  const storeOff = !isStoreInstalled(entityStoreStatus) || entityStoreStatus === 'stopped';

  if (riskOff && storeOff) {
    return !isRiskEngineInstalled(riskEngineStatus) && !isStoreInstalled(entityStoreStatus)
      ? 'not_installed'
      : 'disabled';
  }

  return 'partially_enabled';
};

export const deriveEntityAnalyticsStatus = ({
  riskEngineStatus,
  entityStoreStatus,
  isEntityStoreFeatureFlagDisabled,
  isEntityStoreV2Enabled,
  isMutationLoading,
}: UseEntityAnalyticsStatusParams): EntityAnalyticsStatus => {
  if (isMutationLoading) {
    return 'enabling';
  }

  if (isEntityStoreFeatureFlagDisabled) {
    return deriveRiskEngineOnlyStatus(riskEngineStatus);
  }

  if (entityStoreStatus === 'installing') {
    return 'enabling';
  }

  if (entityStoreStatus === 'error') {
    return 'error';
  }

  if (isEntityStoreV2Enabled) {
    return deriveEntityStoreOnlyStatus(entityStoreStatus);
  }

  return deriveCombinedStatus(riskEngineStatus, entityStoreStatus);
};

export const useEntityAnalyticsStatus = (
  params: UseEntityAnalyticsStatusParams
): EntityAnalyticsStatus => {
  const {
    riskEngineStatus,
    entityStoreStatus,
    isEntityStoreFeatureFlagDisabled,
    isEntityStoreV2Enabled,
    isMutationLoading,
  } = params;

  return useMemo(
    () =>
      deriveEntityAnalyticsStatus({
        riskEngineStatus,
        entityStoreStatus,
        isEntityStoreFeatureFlagDisabled,
        isEntityStoreV2Enabled,
        isMutationLoading,
      }),
    [
      riskEngineStatus,
      entityStoreStatus,
      isEntityStoreFeatureFlagDisabled,
      isEntityStoreV2Enabled,
      isMutationLoading,
    ]
  );
};
