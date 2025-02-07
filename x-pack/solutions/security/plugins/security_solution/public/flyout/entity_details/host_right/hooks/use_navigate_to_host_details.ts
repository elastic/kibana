/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EntityType } from '../../../../../common/search_strategy';
import { useKibana } from '../../../../common/lib/kibana';
import { HostDetailsPanelKey } from '../../host_details_left';
import type { EntityDetailsPath } from '../../shared/components/left_panel/left_panel_header';
import { EntityEventTypes } from '../../../../common/lib/telemetry';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { HostPanelKey } from '../../shared/constants';

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

interface UseNavigateToHostDetailsResult {
  openDetailsPanel: (path: EntityDetailsPath) => void;
  isLinkEnabled: boolean;
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
}: UseNavigateToHostDetailsParams): UseNavigateToHostDetailsResult => {
  const { telemetry } = useKibana().services;
  const { openLeftPanel, openFlyout } = useExpandableFlyoutApi();
  const isNewNavigationEnabled = useIsExperimentalFeatureEnabled(
    'newExpandableFlyoutNavigationEnabled'
  );

  telemetry.reportEvent(EntityEventTypes.RiskInputsExpandedFlyoutOpened, {
    entity: EntityType.host,
  });

  const isLinkEnabled = useMemo(() => {
    return !isPreviewMode || (isNewNavigationEnabled && isPreviewMode);
  }, [isNewNavigationEnabled, isPreviewMode]);

  const openDetailsPanel = useCallback(
    (path?: EntityDetailsPath) => {
      const left = {
        id: HostDetailsPanelKey,
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
        id: HostPanelKey,
        params: {
          contextID,
          scopeId,
          hostName,
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
      isNewNavigationEnabled,
      isPreviewMode,
      openFlyout,
      openLeftPanel,
      hostName,
      scopeId,
      isRiskScoreExist,
      hasMisconfigurationFindings,
      hasVulnerabilitiesFindings,
      hasNonClosedAlerts,
      contextID,
    ]
  );

  return { openDetailsPanel, isLinkEnabled };
};
