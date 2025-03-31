/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';

import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { TableId } from '@kbn/securitysolution-data-table';
import { useNonClosedAlerts } from '../../../cloud_security_posture/hooks/use_non_closed_alerts';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../../overview/components/detection_response/alerts_by_status/types';
import { useRefetchQueryById } from '../../../entity_analytics/api/hooks/use_refetch_query_by_id';
import { RISK_INPUTS_TAB_QUERY_ID } from '../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import type { Refetch } from '../../../common/types';
import { useCalculateEntityRiskScore } from '../../../entity_analytics/api/hooks/use_calculate_entity_risk_score';
import { hostToCriteria } from '../../../common/components/ml/criteria/host_to_criteria';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import type { HostItem } from '../../../../common/search_strategy';
import { buildHostNamesFilter } from '../../../../common/search_strategy';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { HostPanelContent } from './content';
import { HostPanelHeader } from './header';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';
import { useObservedHost } from './hooks/use_observed_host';
import { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';
import { HostPreviewPanelFooter } from '../host_preview/footer';
import { useNavigateToHostDetails } from './hooks/use_navigate_to_host_details';
import { EntityIdentifierFields, EntityType } from '../../../../common/entity_analytics/types';

export interface HostPanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  hostName: string;
  isPreviewMode?: boolean;
}

export interface HostPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'host-panel' | 'host-preview-panel';
  params: HostPanelProps;
}

export const HostPreviewPanelKey: HostPanelExpandableFlyoutProps['key'] = 'host-preview-panel';
export const HOST_PANEL_RISK_SCORE_QUERY_ID = 'HostPanelRiskScoreQuery';
export const HOST_PANEL_OBSERVED_HOST_QUERY_ID = 'HostPanelObservedHostQuery';

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const HostPanel = ({ contextID, scopeId, hostName, isPreviewMode }: HostPanelProps) => {
  const { to, from, isInitializing, setQuery, deleteQuery } = useGlobalTime();
  const hostNameFilterQuery = useMemo(
    () => (hostName ? buildHostNamesFilter([hostName]) : undefined),
    [hostName]
  );

  const riskScoreState = useRiskScore({
    riskEntity: EntityType.host,
    filterQuery: hostNameFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
  });

  const { data: hostRisk, inspect: inspectRiskScore, refetch, loading } = riskScoreState;
  const hostRiskData = hostRisk && hostRisk.length > 0 ? hostRisk[0] : undefined;
  const isRiskScoreExist = !!hostRiskData?.host.risk;

  const refetchRiskInputsTab = useRefetchQueryById(RISK_INPUTS_TAB_QUERY_ID);
  const refetchRiskScore = useCallback(() => {
    refetch();
    (refetchRiskInputsTab as Refetch | null)?.();
  }, [refetch, refetchRiskInputsTab]);

  const { isLoading: recalculatingScore, calculateEntityRiskScore } = useCalculateEntityRiskScore(
    EntityType.host,
    hostName,
    { onSuccess: refetchRiskScore }
  );

  const { hasMisconfigurationFindings } = useHasMisconfigurations('host.name', hostName);

  const { hasVulnerabilitiesFindings } = useHasVulnerabilities('host.name', hostName);

  const { hasNonClosedAlerts } = useNonClosedAlerts({
    field: EntityIdentifierFields.hostName,
    value: hostName,
    to,
    from,
    queryId: `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}HOST_NAME_RIGHT`,
  });

  useQueryInspector({
    deleteQuery,
    inspect: inspectRiskScore,
    loading,
    queryId: HOST_PANEL_RISK_SCORE_QUERY_ID,
    refetch,
    setQuery,
  });

  const { openDetailsPanel, isLinkEnabled } = useNavigateToHostDetails({
    hostName,
    scopeId,
    isRiskScoreExist,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    isPreviewMode,
    contextID,
  });

  const openDefaultPanel = useCallback(
    () =>
      openDetailsPanel({
        tab: isRiskScoreExist
          ? EntityDetailsLeftPanelTab.RISK_INPUTS
          : EntityDetailsLeftPanelTab.CSP_INSIGHTS,
      }),
    [isRiskScoreExist, openDetailsPanel]
  );

  const observedHost = useObservedHost(hostName, scopeId);

  if (observedHost.isLoading) {
    return <FlyoutLoading />;
  }

  return (
    <AnomalyTableProvider
      criteriaFields={hostToCriteria(observedHost.details)}
      startDate={from}
      endDate={to}
      skip={isInitializing}
    >
      {({ isLoadingAnomaliesData, anomaliesData, jobNameById }) => {
        const observedHostWithAnomalies: ObservedEntityData<HostItem> = {
          ...observedHost,
          anomalies: {
            isLoading: isLoadingAnomaliesData,
            anomalies: anomaliesData,
            jobNameById,
          },
        };

        return (
          <>
            <FlyoutNavigation
              flyoutIsExpandable={
                isRiskScoreExist ||
                hasMisconfigurationFindings ||
                hasVulnerabilitiesFindings ||
                hasNonClosedAlerts
              }
              expandDetails={openDefaultPanel}
              isPreviewMode={isPreviewMode}
              isPreview={scopeId === TableId.rulePreview}
            />
            <HostPanelHeader hostName={hostName} observedHost={observedHostWithAnomalies} />
            <HostPanelContent
              hostName={hostName}
              observedHost={observedHostWithAnomalies}
              riskScoreState={riskScoreState}
              contextID={contextID}
              scopeId={scopeId}
              openDetailsPanel={openDetailsPanel}
              isLinkEnabled={isLinkEnabled}
              recalculatingScore={recalculatingScore}
              onAssetCriticalityChange={calculateEntityRiskScore}
              isPreviewMode={isPreviewMode}
            />
            {isPreviewMode && (
              <HostPreviewPanelFooter hostName={hostName} contextID={contextID} scopeId={scopeId} />
            )}
          </>
        );
      }}
    </AnomalyTableProvider>
  );
};

HostPanel.displayName = 'HostPanel';
