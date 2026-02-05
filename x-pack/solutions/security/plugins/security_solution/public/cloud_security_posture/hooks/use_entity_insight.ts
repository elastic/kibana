/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useCallback, useMemo } from 'react';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { UserDetailsPanelKey } from '../../flyout/entity_details/user_details_left';
import { HostDetailsPanelKey } from '../../flyout/entity_details/host_details_left';
import { EntityDetailsLeftPanelTab } from '../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../overview/components/detection_response/alerts_by_status/types';
import { useNonClosedAlerts } from './use_non_closed_alerts';
import { useHasRiskScore } from './use_risk_score_data';
import type { EntityIdentifiers } from '../../flyout/document_details/shared/utils';

export const useNavigateEntityInsight = ({
  entityIdentifiers,
  subTab,
  queryIdExtension,
}: {
  entityIdentifiers: EntityIdentifiers;
  subTab: string;
  queryIdExtension: string;
}) => {
  const isHostNameField = 'host.name' in entityIdentifiers;
  const { to, from } = useGlobalTime();

  const { hasNonClosedAlerts } = useNonClosedAlerts({
    entityIdentifiers,
    to,
    from,
    queryId: `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}${queryIdExtension}`,
  });

  const { hasVulnerabilitiesFindings } = useHasVulnerabilities(entityIdentifiers);

  const primaryField = useMemo(() => {
    if (entityIdentifiers['host.name']) return 'host.name';
    if (entityIdentifiers['user.name']) return 'user.name';
    return Object.keys(entityIdentifiers)[0] || '';
  }, [entityIdentifiers]);

  const value = useMemo(() => {
    return entityIdentifiers[primaryField] || Object.values(entityIdentifiers)[0] || '';
  }, [entityIdentifiers, primaryField]);

  const { hasRiskScore } = useHasRiskScore({
    field: primaryField,
    value,
  });
  const { hasMisconfigurationFindings } = useHasMisconfigurations(entityIdentifiers);
  const { openLeftPanel } = useExpandableFlyoutApi();

  const goToEntityInsightTab = useCallback(() => {
    openLeftPanel({
      id: isHostNameField ? HostDetailsPanelKey : UserDetailsPanelKey,
      params: isHostNameField
        ? {
            name: value,
            isRiskScoreExist: hasRiskScore,
            hasMisconfigurationFindings,
            hasVulnerabilitiesFindings,
            hasNonClosedAlerts,
            path: {
              tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
              subTab,
            },
          }
        : {
            user: { name: value },
            isRiskScoreExist: hasRiskScore,
            hasMisconfigurationFindings,
            hasNonClosedAlerts,
            path: {
              tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
              subTab,
            },
          },
    });
  }, [
    openLeftPanel,
    isHostNameField,
    value,
    hasRiskScore,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    subTab,
  ]);

  return { goToEntityInsightTab };
};
