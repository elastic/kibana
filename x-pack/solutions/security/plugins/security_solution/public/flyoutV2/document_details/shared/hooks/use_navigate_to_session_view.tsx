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
import { DocumentDetailsMainSessionViewPanelKeyV2 } from '../constants/panel_keys';

export interface UseNavigateToSessionViewParams {
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

export interface UseNavigateToSessionViewResult {
  /**
   * Callback to open session view in visualize tab
   */
  navigateToSessionView: () => void;
}

/**
 * Hook that returns a callback to navigate to session view in the flyout
 */
export const useNavigateToSessionView = ({
  isFlyoutOpen,
  eventId,
  indexName,
  scopeId,
  isPreviewMode,
}: UseNavigateToSessionViewParams): UseNavigateToSessionViewResult => {
  const { openMainPanel } = useFlyoutApi();

  const panel: FlyoutPanelProps = useMemo(
    () => ({
      id: DocumentDetailsMainSessionViewPanelKeyV2,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    }),
    [eventId, indexName, scopeId]
  );

  const navigateToSessionView = useCallback(() => {
    // open left panel if not in preview mode
    if (isFlyoutOpen && !isPreviewMode) {
      openMainPanel(panel, 'm');
    }
    // if flyout is not currently open, open flyout with right and left panels
    // if new navigation is enabled and in preview mode, open flyout with right and left panels
    else {
      openMainPanel(panel, 'm');
    }
  }, [isFlyoutOpen, isPreviewMode, openMainPanel, panel]);

  return useMemo(() => ({ navigateToSessionView }), [navigateToSessionView]);
};
