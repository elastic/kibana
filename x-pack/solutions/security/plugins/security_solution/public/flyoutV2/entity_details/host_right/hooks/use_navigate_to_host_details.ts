/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useFlyoutApi } from '@kbn/flyout';
import { HostDetailsPanelKeyV2 } from '../../host_details_left';
import type { EntityDetailsPath } from '../../shared/components/left_panel/left_panel_header';
import { HostPanelKeyV2 } from '../../shared/constants';

interface UseNavigateToHostDetailsParams {
  hostName: string;
  scopeId: string;
  isRiskScoreExist: boolean;
  hasMisconfigurationFindings: boolean;
  hasVulnerabilitiesFindings: boolean;
  hasNonClosedAlerts: boolean;
  isPreviewMode?: boolean;
  contextID: string;
}

export const useNavigateToHostDetails = ({
  hostName,
  scopeId,
  isRiskScoreExist,
  hasMisconfigurationFindings,
  hasVulnerabilitiesFindings,
  hasNonClosedAlerts,
  isPreviewMode,
  contextID,
}: UseNavigateToHostDetailsParams): ((path: EntityDetailsPath) => void) => {
  const { openFlyout, openChildPanel } = useFlyoutApi();

  return useCallback(
    (path?: EntityDetailsPath) => {
      const left = {
        id: HostDetailsPanelKeyV2,
        params: {
          name: hostName,
          scopeId,
          isRiskScoreExist,
          path,
          hasMisconfigurationFindings,
          hasVulnerabilitiesFindings,
          hasNonClosedAlerts,
        },
      };

      const right = {
        id: HostPanelKeyV2,
        params: {
          contextID,
          scopeId,
          hostName,
        },
      };

      if (isPreviewMode) {
        openFlyout({
          main: right,
          child: left,
        });
      } else {
        openChildPanel(left);
      }
    },
    [
      hostName,
      scopeId,
      isRiskScoreExist,
      hasMisconfigurationFindings,
      hasVulnerabilitiesFindings,
      hasNonClosedAlerts,
      contextID,
      isPreviewMode,
      openFlyout,
      openChildPanel,
    ]
  );
};
