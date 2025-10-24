/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useFlyoutApi } from '@kbn/flyout';
import type { Maybe } from '@kbn/timelines-plugin/common/search_strategy/common';
import {
  DocumentDetailsMainAnalyzerPanelKey,
  DocumentDetailsRightPanelKey,
} from '../constants/panel_keys';

export interface UseNavigateToAnalyzerParams {
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
  eventId,
  indexName,
  scopeId,
}: UseNavigateToAnalyzerParams): UseNavigateToAnalyzerResult => {
  const { openFlyout } = useFlyoutApi();

  const navigateToAnalyzer = useCallback(() => {
    openFlyout(
      {
        main: {
          id: DocumentDetailsMainAnalyzerPanelKey,
          params: {
            id: eventId,
            indexName,
            scopeId,
            isChild: false,
          },
        },
        child: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: eventId,
            indexName,
            scopeId,
            isChild: true,
            isPreview: false,
          },
        },
      },
      { mainSize: 'm' }
    );
  }, [eventId, indexName, openFlyout, scopeId]);

  return useMemo(() => ({ navigateToAnalyzer }), [navigateToAnalyzer]);
};
