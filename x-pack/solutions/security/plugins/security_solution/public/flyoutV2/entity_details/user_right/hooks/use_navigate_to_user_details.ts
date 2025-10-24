/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useFlyoutApi } from '@kbn/flyout';
import type { EntityDetailsPath } from '../../shared/components/left_panel/left_panel_header';
import { UserDetailsPanelKeyV2 } from '../../user_details_left';
import { UserPanelKeyV2 } from '../../shared/constants';

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

export const useNavigateToUserDetails = ({
  userName,
  email,
  scopeId,
  contextID,
  isRiskScoreExist,
  hasMisconfigurationFindings,
  hasNonClosedAlerts,
  isPreviewMode,
}: UseNavigateToUserDetailsParams): ((path: EntityDetailsPath) => void) => {
  const { openFlyout, openChildPanel } = useFlyoutApi();

  return useCallback(
    (path: EntityDetailsPath) => {
      const left = {
        id: UserDetailsPanelKeyV2,
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
        id: UserPanelKeyV2,
        params: {
          contextID,
          userName,
          scopeId,
        },
      };

      if (isPreviewMode) {
        openFlyout(
          {
            main: right,
            child: left,
          },
          { mainSize: 's', childSize: 'm' }
        );
      } else {
        openChildPanel(left, 's');
      }
    },
    [
      isRiskScoreExist,
      scopeId,
      userName,
      email,
      hasMisconfigurationFindings,
      hasNonClosedAlerts,
      contextID,
      isPreviewMode,
      openFlyout,
      openChildPanel,
    ]
  );

  return { openDetailsPanel, isLinkEnabled };
};
