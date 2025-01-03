/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { EntityType, getAllEntityTypes } from '../../../common/entity_analytics/types';
import { useIsExperimentalFeatureEnabled } from './use_experimental_features';

export const useEnabledEntityTypes = () => {
  const isServiceEntityStoreEnabled = useIsExperimentalFeatureEnabled('serviceEntityStoreEnabled');
  const allEntityTypes = getAllEntityTypes();

  const entityTypes = useMemo(
    () =>
      isServiceEntityStoreEnabled
        ? allEntityTypes
        : allEntityTypes.filter((value) => value !== EntityType.service),
    [isServiceEntityStoreEnabled, allEntityTypes]
  );

  return entityTypes;
};
