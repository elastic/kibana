/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getEntityAnalyticsEntityTypes } from '../../../common/entity_analytics/utils';

export const useStoreEntityTypes = () => {
  return useMemo(() => getEntityAnalyticsEntityTypes(), []);
};

export const useRiskEngineEntityTypes = () => {
  return useMemo(() => getEntityAnalyticsEntityTypes(), []);
};

export const useAssetCriticalityEntityTypes = () => {
  return useMemo(() => getEntityAnalyticsEntityTypes(), []);
};
