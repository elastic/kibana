/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHasGraphVisualizationLicense } from '../../../common/hooks/use_has_graph_visualization_license';
import { useIsEntityStoreV2Available } from './use_is_entity_store_v2_available';

/**
 * Hook to determine if the graph visualization should be shown in the alert, event or entity flyout.
 */
export const useShouldShowGraph = (): boolean => {
  // Check if user license is high enough to access graph visualization
  const hasRequiredLicense = useHasGraphVisualizationLicense();

  // Check if entity store v2 entities index exists
  const { data: entitiesIndexExists } = useIsEntityStoreV2Available();
  const isEntityStoreRunning = entitiesIndexExists?.indexExists === true;

  return hasRequiredLicense && isEntityStoreRunning;
};
