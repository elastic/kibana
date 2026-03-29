/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHasGraphVisualizationLicense } from '../../../common/hooks/use_has_graph_visualization_license';
import { useEntityStoreStatus } from '../../../entity_analytics/components/entity_store/hooks/use_entity_store';

/**
 * Hook to determine if the graph visualization should be shown in the alert, event or entity flyout.
 */
export const useShouldShowGraph = (): boolean => {
  // Check if user license is high enough to access graph visualization
  const hasRequiredLicense = useHasGraphVisualizationLicense();

  // Check if entity store is running
  const { data: entityStoreStatus } = useEntityStoreStatus();
  const isEntityStoreRunning = entityStoreStatus?.status === 'running';

  return hasRequiredLicense && isEntityStoreRunning;
};
