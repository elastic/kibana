/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentEventTypes } from '../../../../common/lib/telemetry/types';
import { useKibana } from '../../../../common/lib/kibana';
import { DocumentDetailsLeftPanelKey, DocumentDetailsRightPanelKey } from '../constants/panel_keys';
import { useDocumentDetailsContext } from '../context';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
export interface UseNavigateToLeftPanelParams {
  /**
   * The tab to navigate to
   */
  tab: string;
  /**
   * Optional sub tab to navigate to
   */
  subTab?: string;
}

export interface UseNavigateToLeftPanelResult {
  /**
   * Callback to open analyzer in visualize tab
   */
  navigateToLeftPanel: () => void;
  /**
   * Whether the button should be disabled
   */
  isEnabled: boolean;
}

/**
 * Hook that returns the a callback to navigate to the analyzer in the flyout
 */
export const useNavigateToLeftPanel = ({
  tab,
  subTab,
}: UseNavigateToLeftPanelParams): UseNavigateToLeftPanelResult => {
  const { telemetry } = useKibana().services;
  const { openLeftPanel, openFlyout } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId, isPreviewMode } = useDocumentDetailsContext();

  const isNewNavigationEnabled = !useIsExperimentalFeatureEnabled(
    'newExpandableFlyoutNavigationDisabled'
  );

  const isEnabled = isNewNavigationEnabled || (!isNewNavigationEnabled && !isPreviewMode);

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
        tab,
        subTab,
      },
    }),
    [eventId, indexName, scopeId, tab, subTab]
  );

  const navigateToLeftPanel = useCallback(() => {
    if (!isPreviewMode) {
      openLeftPanel(left);
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutTabClicked, {
        location: scopeId,
        panel: 'left',
        tabId: tab,
      });
    } else if (isNewNavigationEnabled && isPreviewMode) {
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
    isPreviewMode,
    tab,
    isNewNavigationEnabled,
  ]);

  return useMemo(() => ({ navigateToLeftPanel, isEnabled }), [navigateToLeftPanel, isEnabled]);
};
