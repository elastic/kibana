/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { noop } from 'lodash/fp';
import { EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiSpacer } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import { buildEntityNameFilter, type ServiceItem } from '../../../../../common/search_strategy';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { FLYOUT_ORIGIN, FLYOUT_TYPE, type FlyoutOrigin } from '../../../../common/lib/telemetry';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useUpdateAssetCriticality } from '../../../../entity_analytics/api/hooks/use_update_asset_criticality';
import { useAssetCriticalityPrivileges } from '../../../../entity_analytics/components/asset_criticality/use_asset_criticality';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { useEntityRiskScoreRecalculation } from '../../../../entity_analytics/api/hooks/use_entity_risk_score_recalculation';
import { useUiSetting, useKibana } from '../../../../common/lib/kibana';
import {
  mergeLegacyIdentityWhenStoreEntityMissing,
  type IdentityFields,
} from '../../../../flyout/document_details/shared/utils';
import {
  CspInsightLeftPanelSubTab,
  EntityDetailsLeftPanelTab,
  RiskScoreLeftPanelSubTab,
  type EntityDetailsPath,
} from '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import {
  useEntityFromStore,
  type EntityStoreRecord,
} from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import {
  buildRiskScoreStateFromEntityRecord,
  getHeaderRiskLevel,
} from '../../../../flyout/entity_details/shared/entity_store_risk_utils';
import { isEntityGroupView } from '../../../../flyout/entity_details/shared/entity_store_group_utils';
import {
  useEntityPanelTabs,
  TABLE_TAB_ID,
} from '../../../../flyout/entity_details/shared/hooks/use_entity_panel_tabs';
import { EntityPanelHeaderTabs } from '../../../../flyout/entity_details/shared/components/entity_panel_tabs';
import { EntityStoreTableTab } from '../../../../flyout/entity_details/shared/components/entity_store_table_tab';
import { EntitySummaryGrid } from '../../../../flyout/entity_details/shared/components/entity_summary_grid';
import { useFlyoutApi } from '../../../use_flyout_api';
import { Header } from './header';
import { Content } from './content';
import { Footer } from './footer';
import { ENABLE_ASSET_INVENTORY_SETTING } from '../../../../../common/constants';
import { useObservedService } from './hooks/use_observed_service';
import { SERVICE_PANEL_RISK_SCORE_QUERY_ID } from './constants';
import { useNewEntityAnalyticsPage } from '../../../../entity_analytics/hooks/use_new_entity_analytics_page';
import type { EntityViewMode } from '../../../../../common/entity_analytics/entity_store/resolution_group';

export interface ServiceProps {
  /** Display name from the source row / document (typically `service.name`). */
  serviceName: string;
  /**
   * The source document record. When provided, entityId is computed from the document's service
   * identity fields using the EUID API. Falls back to the `entityId` prop if the EUID API returns
   * no value.
   */
  hit?: DataTableRecord;
  /**
   * Canonical Entity Store v2 id (`entity.id`) when already resolved. Used directly when `hit` is
   * not provided, or as a fallback when EUID resolution from `hit` yields no value.
   */
  entityId?: string;
  /**
   * `single` (default) shows the `entityId` record only. `resolved` also loads every record that
   * resolves to `entityId`; when aliases exist the flyout renders the group view: summary fields
   * are aggregated across the group and asset criticality is read-only.
   */
  mode?: EntityViewMode;
  /** Scope id (timeline id, table id, etc.) — used for downstream containers and queries. */
  scopeId?: string;
  /** Stable identifier for the service panel context (defaults to `scopeId` or a static fallback). */
  contextID?: string;
}

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

/**
 * Standalone service details flyout content (for use with the entity flyout API).
 *
 * Runs the same data hooks as the v1 `ServicePanel`, but without the expandable-flyout navigation
 * or preview-mode handling. Detail panels (risk inputs, graph view, resolution) open as separate
 * system flyouts via `useFlyoutApi`.
 */
export const Service: FC<ServiceProps> = memo(function Service({
  serviceName,
  hit,
  entityId: entityIdProp,
  mode: requestedMode = 'single',
  scopeId = '',
  contextID,
}) {
  const { services } = useKibana();
  const { uiSettings } = services;
  const euidApi = useEntityStoreEuidApi();
  const isNewEntityAnalyticsPage = useNewEntityAnalyticsPage();
  // Resolution-group view is only available on the new Entity Analytics page; otherwise fall back
  // to the single-entity view so the header, summary grid and copy link stay consistent.
  const mode: EntityViewMode = isNewEntityAnalyticsPage ? requestedMode : 'single';
  const {
    openServiceFlyoutAsChild,
    openEntityDetailsAsChild,
    openEntityRiskInputs,
    openEntityAlertsInsights,
    openEntityGraphView,
    openEntityResolution,
  } = useFlyoutApi();

  // Compute entityId from hit when provided; fall back to the prop when the hit yields no EUID
  const entityId = useMemo(
    () =>
      (hit
        ? euidApi?.euid?.getEuidFromObject(
            euidApi.getBuiltInEntityDefinition('service'),
            hit.flattened
          )
        : undefined) ?? entityIdProp,
    [hit, euidApi, entityIdProp]
  );
  const assetInventoryEnabled = uiSettings.get(ENABLE_ASSET_INVENTORY_SETTING, true);
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2);

  const safeContextID = contextID ?? scopeId ?? 'service-panel';
  const { setQuery, deleteQuery, isInitializing } = useGlobalTime();

  const serviceStoreIdentityFields = useMemo(
    () => (!entityId && serviceName ? { 'service.name': serviceName } : undefined),
    [entityId, serviceName]
  );

  const entityFromStoreResult = useEntityFromStore<ServiceItem>({
    entityId,
    mode,
    identityFields: serviceStoreIdentityFields,
    entityType: 'service',
    skip: !entityStoreV2Enabled || isInitializing,
  });
  const { aliasRecords, aliasCount } = entityFromStoreResult;
  const isGroupView = isEntityGroupView(aliasRecords);

  const documentEntityIdentifiers = useMemo<IdentityFields>(() => {
    const legacyFields: IdentityFields =
      serviceName != null && serviceName !== '' ? { 'service.name': serviceName } : {};
    if (entityStoreV2Enabled) {
      const fromStore =
        euidApi?.euid?.getEntityIdentifiersFromDocument(
          euidApi.getBuiltInEntityDefinition('service'),
          entityFromStoreResult.entityRecord
        ) ?? {};
      return mergeLegacyIdentityWhenStoreEntityMissing(fromStore, legacyFields);
    }
    return legacyFields;
  }, [entityStoreV2Enabled, entityFromStoreResult.entityRecord, euidApi, serviceName]);

  const serviceNameFilterQuery = useMemo(
    () => (serviceName ? buildEntityNameFilter(EntityType.service, [serviceName]) : undefined),
    [serviceName]
  );

  const riskScoreState = useRiskScore({
    riskEntity: EntityType.service,
    filterQuery: serviceNameFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: entityStoreV2Enabled,
  });

  const { inspect: inspectRiskScore, refetch, loading } = riskScoreState;

  const observedService = useObservedService(
    serviceName,
    scopeId,
    entityStoreV2Enabled ? entityFromStoreResult : undefined
  );

  const { entityRiskScores, recalculatingScore, calculateEntityRiskScore } =
    useEntityRiskScoreRecalculation({
      entityType: EntityType.service,
      identifier: serviceName,
      entityId: entityStoreV2Enabled ? observedService.entityRecord?.entity?.id : undefined,
      entityStoreV2Enabled,
      entityFromStoreResult,
      riskScoreState,
      isGroupView,
    });

  const onAssetCriticalityChanged = useCallback(() => {
    calculateEntityRiskScore();
  }, [calculateEntityRiskScore]);

  const { updateAssetCriticalityLevel } = useUpdateAssetCriticality('service', {
    onSuccess: onAssetCriticalityChanged,
  });

  const assetCriticalityPrivileges = useAssetCriticalityPrivileges(entityId ?? serviceName);

  const panelDisplayEntityId = useMemo(
    () => (entityStoreV2Enabled ? observedService.entityRecord?.entity?.id : entityId),
    [entityId, entityStoreV2Enabled, observedService.entityRecord?.entity?.id]
  );

  const useEntityStoreInspectForRisk = entityStoreV2Enabled && observedService.entityRecord != null;

  useQueryInspector({
    deleteQuery,
    inspect: useEntityStoreInspectForRisk
      ? entityFromStoreResult?.inspect ?? null
      : inspectRiskScore,
    loading: useEntityStoreInspectForRisk ? entityFromStoreResult?.isLoading ?? false : loading,
    queryId: SERVICE_PANEL_RISK_SCORE_QUERY_ID,
    refetch: useEntityStoreInspectForRisk ? entityFromStoreResult?.refetch ?? noop : refetch,
    setQuery,
  });

  const entityFromStore: EntityStoreRecord | undefined = entityStoreV2Enabled
    ? observedService.entityRecord ?? undefined
    : undefined;

  const riskScoreStateFromStore =
    entityStoreV2Enabled && observedService.entityRecord
      ? buildRiskScoreStateFromEntityRecord(EntityType.service, observedService.entityRecord, {
          refetch: observedService.refetchEntityStore ?? noop,
          isLoading: observedService.isLoading,
          error: null,
          inspect: entityFromStoreResult?.inspect,
        })
      : null;

  const effectiveRiskScoreState = riskScoreStateFromStore ?? riskScoreState;

  // Group view is read-only: a single criticality edit can't target every member.
  const onCriticalitySave =
    !isGroupView &&
    !!assetCriticalityPrivileges.data?.has_write_permissions &&
    entityFromStoreResult.entityRecord
      ? (level: CriticalityLevelWithUnassigned) =>
          updateAssetCriticalityLevel(level, observedService.entityRecord)
      : undefined;

  const entityStoreEntityId = entityStoreV2Enabled
    ? observedService.entityRecord?.entity?.id
    : undefined;

  const noEntityInStore =
    entityStoreV2Enabled && !entityFromStoreResult.isLoading && !observedService.entityRecord;

  const { tabs, selectedTabId, setSelectedTabId } = useEntityPanelTabs({
    entityRecord: observedService.entityRecord ?? null,
    isGroupView,
  });

  const tabsNode = tabs ? (
    <EntityPanelHeaderTabs
      tabs={tabs}
      selectedTabId={selectedTabId}
      setSelectedTabId={setSelectedTabId}
    />
  ) : undefined;

  const onShowService = useCallback(() => {
    openServiceFlyoutAsChild({
      serviceName,
      entityId,
      mode,
      scopeId,
      title: serviceName,
      origin: FLYOUT_ORIGIN.TOOL_HEADER_TITLE,
    });
  }, [openServiceFlyoutAsChild, serviceName, entityId, mode, scopeId]);

  const onShowRelatedEntity = useCallback(
    (
      params: {
        engineType: string | undefined;
        entityId: string;
        entityName: string | undefined;
      },
      origin: FlyoutOrigin
    ) =>
      openEntityDetailsAsChild({
        engineType: params.engineType,
        entityId: params.entityId,
        entityName: params.entityName,
        scopeId,
        origin,
      }),
    [openEntityDetailsAsChild, scopeId]
  );

  const onShowRelatedEntityFromGraph = useCallback(
    (params: {
      engineType: string | undefined;
      entityId: string;
      entityName: string | undefined;
    }) => onShowRelatedEntity(params, FLYOUT_ORIGIN.GRAPH_NODE),
    [onShowRelatedEntity]
  );

  const onShowRelatedEntityFromResolution = useCallback(
    (params: {
      engineType: string | undefined;
      entityId: string;
      entityName: string | undefined;
    }) => onShowRelatedEntity(params, FLYOUT_ORIGIN.RESOLUTION_ENTITY_LINK),
    [onShowRelatedEntity]
  );

  const openDetailsPanel = useCallback(
    (path: EntityDetailsPath) => {
      switch (path.tab) {
        case EntityDetailsLeftPanelTab.RISK_INPUTS:
          return openEntityRiskInputs({
            entityType: EntityType.service,
            entityName: serviceName,
            entityId: entityStoreEntityId,
            scopeId,
            onShowEntity: onShowService,
            title: serviceName,
            subTab: path.subTab as RiskScoreLeftPanelSubTab | undefined,
            origin:
              path.subTab === RiskScoreLeftPanelSubTab.RESOLUTION
                ? FLYOUT_ORIGIN.RISK_SUMMARY_RESOLUTION
                : FLYOUT_ORIGIN.RISK_SUMMARY_ENTITY,
          });
        case EntityDetailsLeftPanelTab.CSP_INSIGHTS:
          switch (path.subTab) {
            // Services only have the alerts insight; misconfigurations and vulnerabilities never apply.
            case CspInsightLeftPanelSubTab.VULNERABILITIES:
            case CspInsightLeftPanelSubTab.MISCONFIGURATIONS:
              return;
            case CspInsightLeftPanelSubTab.ALERTS:
              return openEntityAlertsInsights({
                entityType: EntityType.service,
                value: serviceName,
                entityId: panelDisplayEntityId,
                mode,
                scopeId,
                onShowEntity: onShowService,
                title: serviceName,
                origin: FLYOUT_ORIGIN.INSIGHTS_ALERTS,
              });
          }
          return;
        case EntityDetailsLeftPanelTab.GRAPH_VIEW:
          if (!entityStoreEntityId) return;
          return openEntityGraphView({
            entityId: entityStoreEntityId,
            scopeId,
            entityName: serviceName,
            onShowEntity: onShowRelatedEntityFromGraph,
            onShowOriginatingEntity: onShowService,
            title: serviceName,
            flyoutType: FLYOUT_TYPE.SERVICE,
            origin: FLYOUT_ORIGIN.VISUALIZATIONS_GRAPH,
          });
        case EntityDetailsLeftPanelTab.RESOLUTION_GROUP:
          if (!entityStoreEntityId) return;
          return openEntityResolution({
            entityId: entityStoreEntityId,
            entityType: 'service',
            entityName: serviceName,
            scopeId,
            mode,
            onShowEntity: onShowService,
            onShowRelatedEntity: onShowRelatedEntityFromResolution,
            title: serviceName,
            origin: FLYOUT_ORIGIN.RESOLUTION_SECTION,
          });
      }
    },
    [
      openEntityRiskInputs,
      openEntityAlertsInsights,
      openEntityGraphView,
      openEntityResolution,
      serviceName,
      scopeId,
      panelDisplayEntityId,
      mode,
      entityStoreEntityId,
      onShowService,
      onShowRelatedEntityFromGraph,
      onShowRelatedEntityFromResolution,
    ]
  );

  // Group view shows the resolution-group risk level; a lone target shows its own.
  const riskLevel = getHeaderRiskLevel(observedService.entityRecord, isGroupView);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <Header
          serviceName={serviceName}
          lastSeen={observedService.lastSeen}
          entityId={panelDisplayEntityId}
          aliasRecords={aliasRecords}
          aliasCount={aliasCount}
          mode={mode}
          isEntityInStore={!!observedService.entityRecord}
          riskLevel={riskLevel}
          scopeId={scopeId}
          showEntityAnalyticsCopyLink
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {observedService.entityRecord && (
          <EntitySummaryGrid
            entityRecord={observedService.entityRecord}
            aliasRecords={aliasRecords}
            criticalityLevel={entityFromStoreResult.entityRecord?.asset?.criticality}
            onCriticalitySave={onCriticalitySave}
          />
        )}
        {isGroupView && !tabs && <EuiSpacer size="l" />}
        {tabsNode}
        {tabs && <EuiSpacer size="l" />}
        {tabs && selectedTabId === TABLE_TAB_ID && observedService.entityRecord ? (
          <EntityStoreTableTab entityRecord={observedService.entityRecord} />
        ) : (
          <Content
            identityFields={documentEntityIdentifiers}
            observedService={observedService}
            riskScoreState={effectiveRiskScoreState}
            entityRiskScores={entityRiskScores}
            contextID={safeContextID}
            scopeId={scopeId}
            openDetailsPanel={openDetailsPanel}
            recalculatingScore={recalculatingScore}
            onAssetCriticalityChange={onAssetCriticalityChanged}
            isPreviewMode={false}
            entityRecord={
              entityStoreV2Enabled ? observedService.entityRecord ?? undefined : undefined
            }
            aliasRecords={aliasRecords}
            noEntityInStore={noEntityInStore}
            isEntityRecordLoading={entityStoreV2Enabled && entityFromStoreResult.isLoading}
            entityStoreV2Enabled={entityStoreV2Enabled}
            entityStoreEntityId={entityStoreEntityId}
            mode={mode}
            onShowEntity={onShowRelatedEntityFromResolution}
            hideHeaderIcons
            showInsights
            riskScoreQueryId={SERVICE_PANEL_RISK_SCORE_QUERY_ID}
            isGroupView={isGroupView}
          />
        )}
      </EuiFlyoutBody>
      {assetInventoryEnabled && (
        <EuiFlyoutFooter>
          <Footer
            serviceName={serviceName}
            identityFields={documentEntityIdentifiers}
            entity={entityFromStore}
          />
        </EuiFlyoutFooter>
      )}
    </>
  );
});

Service.displayName = 'Service';
