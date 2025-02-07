/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { Maybe } from '@kbn/timelines-plugin/common/search_strategy/common';
import { useKibana } from '../../../../common/lib/kibana';
import { ANALYZE_GRAPH_ID } from '../../left/components/analyze_graph';
import { DocumentDetailsLeftPanelKey, DocumentDetailsRightPanelKey } from '../constants/panel_keys';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

export interface UseNavigateToAnalyzerParams {
  /**
   * When flyout is already open, call open left panel only
   * When flyout is not open, open a new flyout
   */
  isFlyoutOpen: boolean;
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
  /**
   * Whether the preview mode is enabled
   */
  isPreviewMode?: boolean;
}

export interface UseNavigateToAnalyzerResult {
  /**
   * Callback to open analyzer in visualize tab
   */
  navigateToAnalyzer: () => void;
}

/**
 * Hook that returns a callback to navigate to the analyzer in the flyout
 */
export const useNavigateToAnalyzer = ({
  isFlyoutOpen,
  eventId,
  indexName,
  scopeId,
  isPreviewMode,
}: UseNavigateToAnalyzerParams): UseNavigateToAnalyzerResult => {
  const { telemetry } = useKibana().services;
  const { openLeftPanel, openFlyout } = useExpandableFlyoutApi();

  const isNewNavigationEnabled = useIsExperimentalFeatureEnabled(
    'newExpandableFlyoutNavigationEnabled'
  );

  const right: FlyoutPanelProps = useMemo(
    () => ({
      id: DocumentDetailsRightPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    }),
    [eventId, indexName, scopeId]
  );

  const left: FlyoutPanelProps = useMemo(
    () => ({
      id: DocumentDetailsLeftPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
      path: {
        tab: 'visualize',
        subTab: ANALYZE_GRAPH_ID,
      },
    }),
    [eventId, indexName, scopeId]
  );

  const navigateToAnalyzer = useCallback(() => {
    // open left panel and preview panel if not in preview mode
    if (isFlyoutOpen && !isPreviewMode) {
      openLeftPanel(left);
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutTabClicked, {
        location: scopeId,
        panel: 'left',
        tabId: 'visualize',
      });
    }
    // if flyout is not currently open, open flyout with right, left and preview panel
    // if new navigation is enabled and in preview mode, open flyout with right, left and preview panel
    else if (!isFlyoutOpen || (isNewNavigationEnabled && isPreviewMode)) {
      openFlyout({
        right,
        left,
      });
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: scopeId,
        panel: 'left',
      });
    }
  }, [
    openFlyout,
    openLeftPanel,
    right,
    left,
    scopeId,
    telemetry,
    isFlyoutOpen,
    isNewNavigationEnabled,
    isPreviewMode,
  ]);

  return useMemo(() => ({ navigateToAnalyzer }), [navigateToAnalyzer]);
};
