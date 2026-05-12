/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { noop } from 'lodash/fp';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiSpacer } from '@elastic/eui';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useUpdateAssetCriticality } from '../../../../entity_analytics/api/hooks/use_update_asset_criticality';
import { useRefetchQueryById } from '../../../../entity_analytics/api/hooks/use_refetch_query_by_id';
import { RISK_INPUTS_TAB_QUERY_ID } from '../../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import type { Refetch } from '../../../../common/types';
import { useCalculateEntityRiskScore } from '../../../../entity_analytics/api/hooks/use_calculate_entity_risk_score';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { buildHostNamesFilter, type RiskSeverity } from '../../../../../common/search_strategy';
import { useUiSetting, useKibana } from '../../../../common/lib/kibana';
import { Header } from './header';
import { Content } from './content';
import { Footer } from './footer';
import { useObservedHost } from './hooks/use_observed_host';
import { EntityType } from '../../../../../common/entity_analytics/types';
import {
  buildRiskScoreStateFromEntityRecord,
  getRiskFromEntityRecord,
} from '../../../../flyout/entity_details/shared/entity_store_risk_utils';
import {
  useEntityFromStore,
  type EntityStoreRecord,
} from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import { ENABLE_ASSET_INVENTORY_SETTING } from '../../../../../common/constants';
import {
  mergeLegacyIdentityWhenStoreEntityMissing,
  type IdentityFields,
} from '../../../../flyout/document_details/shared/utils';
import { HOST_PANEL_RISK_SCORE_QUERY_ID } from './constants';
import {
  useEntityPanelTabs,
  TABLE_TAB_ID,
} from '../../../../flyout/entity_details/shared/hooks/use_entity_panel_tabs';
import { EntityPanelHeaderTabs } from '../../../../flyout/entity_details/shared/components/entity_panel_tabs';
import { EntityStoreTableTab } from '../../../../flyout/entity_details/shared/components/entity_store_table_tab';
import { EntitySummaryGrid } from '../../../../flyout/entity_details/shared/components/entity_summary_grid';

export interface HostProps {
  /**
   * Display name from the source row / document (typically `host.name`).
   */
  hostName: string;
  /**
   * Canonical Entity Store v2 id (`entity.id`) when already resolved (e.g. from alerts/events table).
   */
  entityId?: string;
  /**
   * Scope id (timeline id, table id, etc.) — used for downstream containers and queries.
   */
  scopeId?: string;
  /**
   * Stable identifier for the host panel context (defaults to `scopeId` or a static fallback).
   */
  contextID?: string;
}

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

/**
 * Standalone host details flyout content (for use with `overlays.openSystemFlyout`).
 *
 * Runs the same data hooks as the v1 `HostPanel`, but without the expandable-flyout
 * navigation, preview-mode handling, or host_details_left expansion.
 */
export const Host: FC<HostProps> = memo(function Host({
  hostName,
  entityId,
  scopeId = '',
  contextID,
}) {
  const { uiSettings } = useKibana().services;
  const euidApi = useEntityStoreEuidApi();
  const assetInventoryEnabled = uiSettings.get(ENABLE_ASSET_INVENTORY_SETTING, true);
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  const safeContextID = contextID ?? scopeId ?? 'host-panel';
  const { setQuery, deleteQuery, isInitializing } = useGlobalTime();

  const hostStoreIdentityFields = useMemo(
    () => (!entityId && hostName ? { 'host.name': hostName } : undefined),
    [entityId, hostName]
  );

  const entityFromStoreResult = useEntityFromStore({
    entityId,
    identityFields: hostStoreIdentityFields,
    entityType: 'host',
    skip: !entityStoreV2Enabled || isInitializing,
  });

  const documentEntityIdentifiers = useMemo<IdentityFields>(() => {
    const legacyFields =
      hostName != null && hostName !== '' ? { 'host.name': hostName } : ({} as IdentityFields);
    if (entityStoreV2Enabled) {
      const fromStore =
        euidApi?.euid?.getEntityIdentifiersFromDocument(
          'host',
          entityFromStoreResult.entityRecord
        ) ?? {};
      return mergeLegacyIdentityWhenStoreEntityMissing(fromStore, legacyFields);
    }
    return legacyFields;
  }, [entityStoreV2Enabled, euidApi?.euid, entityFromStoreResult.entityRecord, hostName]);

  const hostNameFilterQuery = useMemo(
    () => (hostName ? buildHostNamesFilter([hostName]) : undefined),
    [hostName]
  );

  const riskScoreState = useRiskScore({
    riskEntity: EntityType.host,
    filterQuery: hostNameFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: entityStoreV2Enabled,
  });

  const { inspect: inspectRiskScore, refetch, loading } = riskScoreState;

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

  const { updateAssetCriticalityLevel } = useUpdateAssetCriticality('host', {
    onSuccess: calculateEntityRiskScore,
  });

  const observedHost = useObservedHost(
    hostName,
    scopeId,
    entityStoreV2Enabled ? entityFromStoreResult : undefined
  );

  const panelDisplayEntityId = useMemo(
    () => (entityStoreV2Enabled ? observedHost.entityRecord?.entity?.id : entityId),
    [entityId, entityStoreV2Enabled, observedHost.entityRecord?.entity?.id]
  );

  const useEntityStoreInspectForRisk = entityStoreV2Enabled && observedHost.entityRecord != null;

  useQueryInspector({
    deleteQuery,
    inspect: useEntityStoreInspectForRisk
      ? entityFromStoreResult?.inspect ?? null
      : inspectRiskScore,
    loading: useEntityStoreInspectForRisk ? entityFromStoreResult?.isLoading ?? false : loading,
    queryId: HOST_PANEL_RISK_SCORE_QUERY_ID,
    refetch: useEntityStoreInspectForRisk ? entityFromStoreResult?.refetch ?? noop : refetch,
    setQuery,
  });

  const entityFromStore: EntityStoreRecord | undefined = entityStoreV2Enabled
    ? observedHost.entityRecord ?? undefined
    : undefined;
  const riskScoreStateFromStore =
    entityStoreV2Enabled && observedHost.entityRecord
      ? buildRiskScoreStateFromEntityRecord(EntityType.host, observedHost.entityRecord, {
          refetch: observedHost.refetchEntityStore ?? noop,
          isLoading: observedHost.isLoading,
          error: null,
          inspect: entityFromStoreResult?.inspect,
        })
      : null;

  const effectiveRiskScoreState = riskScoreStateFromStore ?? riskScoreState;

  const onCriticalitySave =
    entityFromStoreResult.entityRecord && observedHost.entityRecord
      ? (level: CriticalityLevelWithUnassigned) =>
          updateAssetCriticalityLevel(level, observedHost.entityRecord)
      : undefined;

  const entityStoreEntityId = entityStoreV2Enabled
    ? observedHost.entityRecord?.entity?.id
    : undefined;

  const noEntityInStore =
    entityStoreV2Enabled && !entityFromStoreResult.isLoading && !observedHost.entityRecord;

  const { tabs, selectedTabId, setSelectedTabId } = useEntityPanelTabs({
    entityRecord: observedHost.entityRecord ?? null,
  });

  const tabsNode = tabs ? (
    <EntityPanelHeaderTabs
      tabs={tabs}
      selectedTabId={selectedTabId}
      setSelectedTabId={setSelectedTabId}
    />
  ) : undefined;

  // No expandable-flyout left panel exists in v2 yet — degrade gracefully.
  // TODO: wire `openDetailsPanel` once `host_details_left` migrates to v2.
  const openDetailsPanel = noop;

  const riskLevel = observedHost.entityRecord
    ? ((getRiskFromEntityRecord(observedHost.entityRecord)?.calculated_level ??
        'Unknown') as RiskSeverity)
    : undefined;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <Header
          hostName={hostName}
          lastSeen={observedHost.lastSeen}
          entityId={panelDisplayEntityId}
          identityFields={documentEntityIdentifiers}
          isEntityInStore={!!observedHost.entityRecord}
          riskLevel={riskLevel}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {observedHost.entityRecord && (
          <EntitySummaryGrid
            entityRecord={observedHost.entityRecord}
            criticalityLevel={entityFromStoreResult.entityRecord?.asset?.criticality}
            onCriticalitySave={onCriticalitySave}
          />
        )}
        {tabsNode}
        {tabs && <EuiSpacer size="l" />}
        {tabs && selectedTabId === TABLE_TAB_ID && observedHost.entityRecord ? (
          <EntityStoreTableTab entityRecord={observedHost.entityRecord} />
        ) : (
          <Content
            identityFields={documentEntityIdentifiers}
            observedHost={observedHost}
            riskScoreState={effectiveRiskScoreState}
            contextID={safeContextID}
            scopeId={scopeId}
            openDetailsPanel={openDetailsPanel}
            recalculatingScore={recalculatingScore}
            onAssetCriticalityChange={calculateEntityRiskScore}
            isPreviewMode={false}
            entityRecord={entityStoreV2Enabled ? observedHost.entityRecord ?? undefined : undefined}
            skipRiskAndCriticality={noEntityInStore}
            entityStoreEntityId={entityStoreEntityId}
          />
        )}
      </EuiFlyoutBody>
      {assetInventoryEnabled && (
        <Footer identityFields={documentEntityIdentifiers} entity={entityFromStore} />
      )}
    </>
  );
});

Host.displayName = 'Host';
