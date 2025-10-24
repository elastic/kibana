/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useFlyoutApi } from '@kbn/flyout';
import type { EntityDetailsPath } from '../../shared/components/left_panel/left_panel_header';
import { ServiceDetailsPanelKeyV2 } from '../../service_details_left';
import { ServicePanelKeyV2 } from '../../shared/constants';

interface UseNavigateToServiceDetailsParams {
  serviceName: string;
  email?: string[];
  scopeId: string;
  contextID: string;
  isRiskScoreExist: boolean;
  isPreviewMode?: boolean;
}

interface UseNavigateToServiceDetailsResult {
  /**
   * Opens the service details panel
   */
  openDetailsPanel: (path: EntityDetailsPath) => void;
  /**
   * Whether the link is enabled
   */
  isLinkEnabled: boolean;
}

export const useNavigateToServiceDetails = ({
  serviceName,
  scopeId,
  contextID,
  isRiskScoreExist,
  isPreviewMode,
}: UseNavigateToServiceDetailsParams): ((path: EntityDetailsPath) => void) => {
  const { openFlyout, openChildPanel } = useFlyoutApi();

  return useCallback(
    (path: EntityDetailsPath) => {
      const left = {
        id: ServiceDetailsPanelKeyV2,
        params: {
          isRiskScoreExist,
          scopeId,
          service: {
            name: serviceName,
          },
          path,
        },
      };

      const right = {
        id: ServicePanelKeyV2,
        params: {
          contextID,
          serviceName,
          scopeId,
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
    [contextID, isPreviewMode, isRiskScoreExist, openFlyout, openChildPanel, scopeId, serviceName]
  );
};
