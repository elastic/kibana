/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING } from '@kbn/management-settings-ids';
import {
  getEntityAnalyticsEntityTypes,
  getEnabledEntityTypes,
} from '../../../common/entity_analytics/utils';

export const useEntityStoreTypes = () => {
  const [genericEntityStoreEnabled] = useUiSetting$<boolean>(
    SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING
  );

  return useMemo(
    () => getEnabledEntityTypes(genericEntityStoreEnabled),
    [genericEntityStoreEnabled]
  );
};

export const useEntityAnalyticsTypes = () => {
  return useMemo(() => getEntityAnalyticsEntityTypes(), []);
};
