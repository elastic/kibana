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
import { UserPanelKey } from '../../shared/constants';

interface UseNavigateToUserDetailsParams {
  userName: string;
  email?: string[];
  scopeId: string;
  contextID: string;
  isRiskScoreExist: boolean;
  hasMisconfigurationFindings: boolean;
  hasNonClosedAlerts: boolean;
  isPreviewMode: boolean;
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
  const { telemetry } = useKibana().services;
  const { openLeftPanel, openFlyout } = useExpandableFlyoutApi();

  return useCallback(
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

      if (isPreviewMode) {
        openFlyout({ right, left });
      } else {
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
      isPreviewMode,
      openFlyout,
      contextID,
    ]
  );
};
