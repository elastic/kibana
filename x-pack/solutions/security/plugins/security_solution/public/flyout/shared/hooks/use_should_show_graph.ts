/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHasGraphVisualizationLicense } from '../../../common/hooks/use_has_graph_visualization_license';

/**
 * Hook to determine if the graph visualization should be shown in the alert, event or entity flyout.
 *
 * License is required. Entity store is preferred for production enrichment, but is not required to
 * show the flyout preview (mock/dev graphs can render without it).
 */
export const useShouldShowGraph = (): boolean => {
  return useHasGraphVisualizationLicense();
};
