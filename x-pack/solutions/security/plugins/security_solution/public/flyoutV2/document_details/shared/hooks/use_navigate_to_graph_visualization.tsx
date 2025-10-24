/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/flyout';
import { useFlyoutApi } from '@kbn/flyout';
import type { Maybe } from '@kbn/timelines-plugin/common/search_strategy/common';
import { DocumentDetailsGraphPanelKeyV2 } from '../constants/panel_keys';

export interface UseNavigateToGraphVisualizationParams {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Name of the index used in the parent's page
   */
  indexName: Maybe<string> | undefined;
  /**
   * Scope id of the page
   */
  scopeId: string;
}

export interface UseNavigateToGraphVisualizationResult {
  /**
   * Callback to open analyzer in visualize tab
   */
  navigateToGraphVisualization: () => void;
}

/**
 * Hook that returns a callback to navigate to the graph visualization in the flyout
 */
export const useNavigateToGraphVisualization = ({
  eventId,
  indexName,
  scopeId,
}: UseNavigateToGraphVisualizationParams): UseNavigateToGraphVisualizationResult => {
  const { openMainPanel } = useFlyoutApi();

  const panel: FlyoutPanelProps = useMemo(
    () => ({
      id: DocumentDetailsGraphPanelKeyV2,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    }),
    [eventId, indexName, scopeId]
  );

  const navigateToGraphVisualization = useCallback(() => {
    openMainPanel(panel, 'm');
  }, [openMainPanel, panel]);

  return useMemo(() => ({ navigateToGraphVisualization }), [navigateToGraphVisualization]);
};
