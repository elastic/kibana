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
  DocumentDetailsMainSessionViewPanelKey,
  DocumentDetailsRightPanelKey,
} from '../constants/panel_keys';

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
  isChild?: boolean;
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
  isChild,
}: UseNavigateToSessionViewParams): UseNavigateToSessionViewResult => {
  const { openFlyout } = useFlyoutApi();

  const navigateToSessionView = useCallback(() => {
    openFlyout(
      {
        main: {
          id: DocumentDetailsMainSessionViewPanelKey,
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

  return useMemo(() => ({ navigateToSessionView }), [navigateToSessionView]);
};
