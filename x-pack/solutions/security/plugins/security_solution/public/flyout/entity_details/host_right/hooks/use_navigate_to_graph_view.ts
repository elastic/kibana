/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useCallback } from 'react';
import { EntityType } from '../../../../../common/search_strategy';
import { EntityDetailsLeftPanelTab } from '../../shared/components/left_panel/left_panel_header';
import { useKibana } from '../../../../common/lib/kibana';
import { EntityEventTypes } from '../../../../common/lib/telemetry';
import { HostDetailsPanelKey } from '../../host_details_left';
import { HostPanelKey } from '../../shared/constants';

interface UseNavigateToGraphViewParams {
  hostName: string;
  entityId?: string;
  scopeId: string;
  contextID: string;
  isRiskScoreExist: boolean;
  hasMisconfigurationFindings: boolean;
  hasVulnerabilitiesFindings: boolean;
  hasNonClosedAlerts: boolean;
  isPreviewMode: boolean;
}

export const useNavigateToGraphView = ({
  hostName,
  entityId,
  scopeId,
  contextID,
  isRiskScoreExist,
  hasMisconfigurationFindings,
  hasVulnerabilitiesFindings,
  hasNonClosedAlerts,
  isPreviewMode,
}: UseNavigateToGraphViewParams): (() => void) => {
  const { telemetry } = useKibana().services;
  const { openLeftPanel, openFlyout } = useExpandableFlyoutApi();

  return useCallback(() => {
    telemetry.reportEvent(EntityEventTypes.RiskInputsExpandedFlyoutOpened, {
      entity: EntityType.host,
    });

    const left = {
      id: HostDetailsPanelKey,
      params: {
        hostName,
        isRiskScoreExist,
        scopeId,
        path: {
          tab: EntityDetailsLeftPanelTab.GRAPH_VIEW,
        },
        entityId,
        hasMisconfigurationFindings,
        hasVulnerabilitiesFindings,
        hasNonClosedAlerts,
      },
    };

    const right = {
      id: HostPanelKey,
      params: {
        contextID,
        hostName,
        entityId,
        scopeId,
      },
    };

    if (isPreviewMode) {
      openFlyout({ right, left });
    } else {
      openLeftPanel(left);
    }
  }, [
    telemetry,
    openLeftPanel,
    isRiskScoreExist,
    scopeId,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    isPreviewMode,
    openFlyout,
    contextID,
    hostName,
    entityId,
  ]);
};
