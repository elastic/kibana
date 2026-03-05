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
import { euid } from '@kbn/entity-store/public';
import type { ESQuery } from '../../../../common/typed_json';
import { buildEntityFlyoutPreviewCspOptions } from '../../../cloud_security_posture/utils/entity_flyout_preview_options';
import { useNonClosedAlerts } from '../../../cloud_security_posture/hooks/use_non_closed_alerts';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../../overview/components/detection_response/alerts_by_status/types';
import { useRefetchQueryById } from '../../../entity_analytics/api/hooks/use_refetch_query_by_id';
import { RISK_INPUTS_TAB_QUERY_ID } from '../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import type { Refetch } from '../../../common/types';
import { useCalculateEntityRiskScore } from '../../../entity_analytics/api/hooks/use_calculate_entity_risk_score';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { buildHostNamesFilter } from '../../../../common/search_strategy';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common/entity_analytics/entity_store/constants';
import { useUiSetting, useKibana } from '../../../common/lib/kibana';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { HostPanelFooter } from './footer';
import { HostPanelContent } from './content';
import { HostPanelHeader } from './header';
import { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';
import { HostPreviewPanelFooter } from '../host_preview/footer';
import { useNavigateToHostDetails } from './hooks/use_navigate_to_host_details';
import { EntityType } from '../../../../common/entity_analytics/types';
import { useObservedHost } from './hooks/use_observed_host';
import {
  buildRiskScoreStateFromEntityRecord,
  getRiskFromEntityRecord,
} from '../shared/entity_store_risk_utils';
import { useEntityFromStore, type EntityStoreRecord } from '../shared/hooks/use_entity_from_store';
import { useEntityAnalyticsRoutes } from '../../../entity_analytics/api/api';
import { ENABLE_ASSET_INVENTORY_SETTING } from '../../../../common/constants';
import type { EntityIdentifiers } from '../../document_details/shared/utils';

export interface HostPanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  isPreviewMode: boolean;
  /**
   * Entity identifiers for the host (following entity store EUID logic)
   */
  entityIdentifiers: EntityIdentifiers;
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

export const HostPanel = ({
  contextID,
  scopeId,
  isPreviewMode = false,
  entityIdentifiers,
}: HostPanelProps) => {
  const { uiSettings } = useKibana().services;
  const assetInventoryEnabled = uiSettings.get(ENABLE_ASSET_INVENTORY_SETTING, true);
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  const safeContextID = contextID ?? scopeId ?? 'host-panel';
  const hasValidIdentifiers = entityIdentifiers && Object.keys(entityIdentifiers).length > 0;

  // Extract hostName from entityIdentifiers
  // Priority: entityIdentifiers['host.name'] > entityIdentifiers[first key]
  const effectiveHostName = useMemo<string>(() => {
    if (!hasValidIdentifiers) return '';
    const hostNameFromIdentifiers =
      entityIdentifiers['host.name'] || Object.values(entityIdentifiers)[0];
    return (hostNameFromIdentifiers as string) ?? '';
  }, [entityIdentifiers, hasValidIdentifiers]);

  const { to, from, setQuery, deleteQuery, isInitializing } = useGlobalTime();
  const entityFromStoreResult = useEntityFromStore({
    entityIdentifiers,
    entityType: 'host',
    skip: !entityStoreV2Enabled || isInitializing,
  });
  const hostFilterQuery = useMemo(
    () =>
      euid.getEuidDslFilterBasedOnDocument('host', entityIdentifiers) ??
      (effectiveHostName ? buildHostNamesFilter([effectiveHostName]) : undefined),
    [entityIdentifiers, effectiveHostName]
  );

  // Risk score index is keyed by host.name; use host name filter so the API finds the host
  const riskScoreFilterQuery = useMemo(
    () =>
      effectiveHostName
        ? (buildHostNamesFilter([effectiveHostName]) as ESQuery)
        : (hostFilterQuery as ESQuery),
    [effectiveHostName, hostFilterQuery]
  );

  const riskScoreState = useRiskScore({
    riskEntity: EntityType.host,
    filterQuery: riskScoreFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: entityStoreV2Enabled,
  });

  const { data: hostRisk, inspect: inspectRiskScore, refetch, loading } = riskScoreState;
  const hostRiskData = hostRisk && hostRisk.length > 0 ? hostRisk[0] : undefined;

  const refetchRiskInputsTab = useRefetchQueryById(RISK_INPUTS_TAB_QUERY_ID);
  const refetchRiskScore = useCallback(() => {
    refetch();
    (refetchRiskInputsTab as Refetch | null)?.();
  }, [refetch, refetchRiskInputsTab]);

  const { isLoading: recalculatingScore, calculateEntityRiskScore } = useCalculateEntityRiskScore(
    EntityType.host,
    effectiveHostName,
    { onSuccess: refetchRiskScore }
  );

  const { hasMisconfigurationFindings } = useHasMisconfigurations(
    buildEntityFlyoutPreviewCspOptions(entityIdentifiers)
  );

  const { hasVulnerabilitiesFindings } = useHasVulnerabilities(
    buildEntityFlyoutPreviewCspOptions(entityIdentifiers)
  );

  const { hasNonClosedAlerts } = useNonClosedAlerts({
    entityIdentifiers,
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

  const observedHost = useObservedHost(
    entityIdentifiers,
    scopeId,
    entityStoreV2Enabled ? entityFromStoreResult : undefined
  );

  // When entity store v2 is enabled, use the first entity from the store that matches entityIdentifiers
  const entityFromStore: EntityStoreRecord | undefined = entityStoreV2Enabled
    ? observedHost.entityRecord ?? undefined
    : undefined;
  const { upsertEntity } = useEntityAnalyticsRoutes();

  const riskScoreStateFromStore =
    entityStoreV2Enabled && observedHost.entityRecord
      ? buildRiskScoreStateFromEntityRecord(EntityType.host, observedHost.entityRecord, {
          refetch: observedHost.refetchEntityStore ?? (() => {}),
          isLoading: observedHost.isLoading,
          error: null,
        })
      : null;

  const effectiveRiskScoreState = riskScoreStateFromStore ?? riskScoreState;
  const isRiskScoreExist =
    entityStoreV2Enabled && observedHost.entityRecord
      ? !!getRiskFromEntityRecord(observedHost.entityRecord)
      : !!hostRiskData?.host?.risk;

  const handleSaveAssetCriticalityViaEntityStore = useCallback(
    async (updatedRecord: Parameters<typeof upsertEntity>[0]['body']) => {
      await upsertEntity({ entityType: 'host', body: updatedRecord, force: true });
      observedHost.refetchEntityStore?.();
      calculateEntityRiskScore();
    },
    [upsertEntity, observedHost, calculateEntityRiskScore]
  );

  const openDetailsPanel = useNavigateToHostDetails({
    entityIdentifiers,
    scopeId,
    isRiskScoreExist,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    isPreviewMode,
    contextID: safeContextID,
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
        isRulePreview={scopeId === TableId.rulePreview}
      />
      <HostPanelHeader
        entityIdentifiers={entityIdentifiers}
        lastSeen={observedHost.lastSeen}
        entity={entityFromStore}
      />
      <HostPanelContent
        entityIdentifiers={entityIdentifiers}
        observedHost={observedHost}
        riskScoreState={effectiveRiskScoreState}
        contextID={safeContextID}
        scopeId={scopeId}
        openDetailsPanel={openDetailsPanel}
        recalculatingScore={recalculatingScore}
        onAssetCriticalityChange={calculateEntityRiskScore}
        isPreviewMode={isPreviewMode}
        entity={entityFromStore}
        entityRecord={entityStoreV2Enabled ? observedHost.entityRecord ?? undefined : undefined}
        criticalityFromEntityStore={
          entityStoreV2Enabled && observedHost.entityRecord?.asset?.criticality
            ? observedHost.entityRecord.asset.criticality
            : undefined
        }
        onSaveAssetCriticalityViaEntityStore={
          entityStoreV2Enabled && observedHost.entityRecord
            ? handleSaveAssetCriticalityViaEntityStore
            : undefined
        }
      />
      {isPreviewMode && (
        <HostPreviewPanelFooter
          entityIdentifiers={entityIdentifiers}
          contextID={safeContextID}
          scopeId={scopeId}
          entity={entityFromStore}
        />
      )}
      {!isPreviewMode && assetInventoryEnabled && (
        <HostPanelFooter entityIdentifiers={entityIdentifiers} entity={entityFromStore} />
      )}
    </>
  );
};

HostPanel.displayName = 'HostPanel';
