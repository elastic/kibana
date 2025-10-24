/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useFlyoutApi } from '@kbn/flyout';
import type { EntityDetailsPath } from '../../shared/components/left_panel/left_panel_header';
import { UserDetailsPanelKey } from '../../user_details_left';
import { UserPanelKey } from '../../shared/constants';

interface UseNavigateToUserDetailsParams {
  userName: string;
  email?: string[];
  scopeId: string;
  contextID: string;
  isRiskScoreExist: boolean;
  hasMisconfigurationFindings: boolean;
  hasNonClosedAlerts: boolean;
  isChild?: boolean;
}

export const useNavigateToUserDetails = ({
  userName,
  email,
  scopeId,
  contextID,
  isRiskScoreExist,
  hasMisconfigurationFindings,
  hasNonClosedAlerts,
  isChild,
}: UseNavigateToUserDetailsParams): ((path: EntityDetailsPath) => void) => {
  const { openFlyout, openMainPanel } = useFlyoutApi();

  return useCallback(
    (path: EntityDetailsPath) => {
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
          isChild: true,
        },
      };

      const right = {
        id: UserPanelKey,
        params: {
          contextID,
          userName,
          scopeId,
          isChild: false,
        },
      };

      if (isChild) {
        openFlyout(
          {
            main: right,
            child: left,
          },
          { mainSize: 's', childSize: 'm' }
        );
      } else {
        openMainPanel(left, 's');
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
      isChild,
      openFlyout,
      openMainPanel,
    ]
  );
};
