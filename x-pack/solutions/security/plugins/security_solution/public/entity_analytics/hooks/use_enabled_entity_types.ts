/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getAssetCriticalityEntityTypes } from '../../../common/entity_analytics/asset_criticality/utils';
import { getRiskEngineEntityTypes } from '../../../common/entity_analytics/risk_engine/utils';
import { getEnabledStoreEntityTypes } from '../../../common/entity_analytics/entity_store/utils';
import { useEnableExperimental } from '../../common/hooks/use_experimental_features';

export const useStoreEntityTypes = () => {
  const experimentalFeatures = useEnableExperimental();

  return useMemo(() => getEnabledStoreEntityTypes(experimentalFeatures), [experimentalFeatures]);
};

export const useRiskEngineEntityTypes = () => {
  const experimentalFeatures = useEnableExperimental();

  return useMemo(() => getRiskEngineEntityTypes(experimentalFeatures), [experimentalFeatures]);
};

export const useAssetCriticalityEntityTypes = () => {
  const experimentalFeatures = useEnableExperimental();

  return useMemo(
    () => getAssetCriticalityEntityTypes(experimentalFeatures),
    [experimentalFeatures]
  );
};
