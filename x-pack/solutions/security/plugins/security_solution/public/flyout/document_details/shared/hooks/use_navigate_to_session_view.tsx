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
import { LeftPanelVisualizeTab } from '../../left';
import { useKibana } from '../../../../common/lib/kibana';
import { SESSION_VIEW_ID } from '../../left/components/session_view';
import { DocumentDetailsLeftPanelKey, DocumentDetailsRightPanelKey } from '../constants/panel_keys';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

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
  const { telemetry } = useKibana().services;
  const { openLeftPanel, openFlyout } = useExpandableFlyoutApi();

  const isNewNavigationEnabled = !useIsExperimentalFeatureEnabled(
    'newExpandableFlyoutNavigationDisabled'
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
        tab: LeftPanelVisualizeTab,
        subTab: SESSION_VIEW_ID,
      },
    }),
    [eventId, indexName, scopeId]
  );

  const navigateToSessionView = useCallback(() => {
    // open left panel if not in preview mode
    if (isFlyoutOpen && !isPreviewMode) {
      openLeftPanel(left);
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutTabClicked, {
        location: scopeId,
        panel: 'left',
        tabId: LeftPanelVisualizeTab,
      });
    }
    // if flyout is not currently open, open flyout with right and left panels
    // if new navigation is enabled and in preview mode, open flyout with right and left panels
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

  return useMemo(() => ({ navigateToSessionView }), [navigateToSessionView]);
};
