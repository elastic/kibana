/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useCallback } from 'react';
import { EntityType } from '../../../../../common/search_strategy';
import type { EntityDetailsPath } from '../../shared/components/left_panel/left_panel_header';
import { useKibana } from '../../../../common/lib/kibana';
import { EntityEventTypes } from '../../../../common/lib/telemetry';
import { UserDetailsPanelKey } from '../../user_details_left';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { UserPanelKey } from '../../shared/constants';

interface UseNavigateToUserDetailsParams {
  userName: string;
  email?: string[];
  scopeId: string;
  contextID: string;
  isRiskScoreExist: boolean;
  hasMisconfigurationFindings: boolean;
  hasNonClosedAlerts: boolean;
  isPreviewMode?: boolean;
}

interface UseNavigateToUserDetailsResult {
  /**
   * Opens the user details panel
   */
  openDetailsPanel: (path: EntityDetailsPath) => void;
  /**
   * Whether the link is enabled
   */
  isLinkEnabled: boolean;
}

export const useNavigateToUserDetails = ({
  userName,
  email,
  scopeId,
  contextID,
  isRiskScoreExist,
  hasMisconfigurationFindings,
  hasNonClosedAlerts,
  isPreviewMode,
}: UseNavigateToUserDetailsParams): UseNavigateToUserDetailsResult => {
  const { telemetry } = useKibana().services;
  const { openLeftPanel, openFlyout } = useExpandableFlyoutApi();
  const isNewNavigationEnabled = useIsExperimentalFeatureEnabled(
    'newExpandableFlyoutNavigationEnabled'
  );

  const isLinkEnabled = !isPreviewMode || (isNewNavigationEnabled && isPreviewMode);

  const openDetailsPanel = useCallback(
    (path: EntityDetailsPath) => {
      telemetry.reportEvent(EntityEventTypes.RiskInputsExpandedFlyoutOpened, {
        entity: EntityType.user,
      });

      const left = {
        id: UserDetailsPanelKey,
        params: {
          isRiskScoreExist,
          scopeId,
          user: {
            name: userName,
            email,
          },
          path,
          hasMisconfigurationFindings,
          hasNonClosedAlerts,
        },
      };

      const right = {
        id: UserPanelKey,
        params: {
          contextID,
          userName,
          scopeId,
        },
      };

      // When new navigation is enabled, nevigation in preview is enabled and open a new flyout
      if (isNewNavigationEnabled && isPreviewMode) {
        openFlyout({ right, left });
      }
      // When not in preview mode, open left panel as usual
      else if (!isPreviewMode) {
        openLeftPanel(left);
      }
    },
    [
      telemetry,
      openLeftPanel,
      isRiskScoreExist,
      scopeId,
      userName,
      email,
      hasMisconfigurationFindings,
      hasNonClosedAlerts,
      isNewNavigationEnabled,
      isPreviewMode,
      openFlyout,
      contextID,
    ]
  );

  return { openDetailsPanel, isLinkEnabled };
};
