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
import type { EntityIdentifiers } from '../../../document_details/shared/utils';

interface UseNavigateToUserDetailsParams {
  entityIdentifiers: EntityIdentifiers;
  scopeId: string;
  contextID: string;
  isRiskScoreExist: boolean;
  hasMisconfigurationFindings: boolean;
  hasNonClosedAlerts: boolean;
  isPreviewMode: boolean;
}

export const useNavigateToUserDetails = ({
  entityIdentifiers,
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
          path,
          entityIdentifiers,
          hasMisconfigurationFindings,
          hasNonClosedAlerts,
        },
      };

      const right = {
        id: UserPanelKey,
        params: {
          contextID,
          entityIdentifiers,
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
      hasMisconfigurationFindings,
      hasNonClosedAlerts,
      isPreviewMode,
      openFlyout,
      contextID,
      entityIdentifiers,
    ]
  );
};
