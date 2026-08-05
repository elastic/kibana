/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiSpacer, useEuiTheme } from '@elastic/eui';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import type { ESQuery } from '../../../../../common/typed_json';
import { buildEntityNameFilter, type RiskSeverity } from '../../../../../common/search_strategy';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { FLYOUT_ORIGIN, FLYOUT_TYPE, type FlyoutOrigin } from '../../../../common/lib/telemetry';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useUpdateAssetCriticality } from '../../../../entity_analytics/api/hooks/use_update_asset_criticality';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { useEntityRiskScoreRecalculation } from '../../../../entity_analytics/api/hooks/use_entity_risk_score_recalculation';
import type { IdentityFields } from '../../../../flyout/document_details/shared/utils';
import {
  EntityDetailsLeftPanelTab,
  RiskScoreLeftPanelSubTab,
  type EntityDetailsPath,
} from '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { useEntityFromStore } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { getRiskFromEntityRecord } from '../../../../flyout/entity_details/shared/entity_store_risk_utils';
import {
  useEntityPanelTabs,
  TABLE_TAB_ID,
} from '../../../../flyout/entity_details/shared/hooks/use_entity_panel_tabs';
import { EntityPanelHeaderTabs } from '../../../../flyout/entity_details/shared/components/entity_panel_tabs';
import { EntityStoreTableTab } from '../../../../flyout/entity_details/shared/components/entity_store_table_tab';
import { EntitySummaryGrid } from '../../../../flyout/entity_details/shared/components/entity_summary_grid';
import { FlyoutBody } from '../../../../flyout/shared/components/flyout_body';
import { SERVICE_PANEL_RISK_SCORE_QUERY_ID } from '../../../../flyout/entity_details/service_right';
import { ServicePanelContent } from '../../../../flyout/entity_details/service_right/content';
import { ServicePanelHeader } from '../../../../flyout/entity_details/service_right/header';
import { ServicePanelFooter } from '../../../../flyout/entity_details/service_right/footer';
import { useObservedService } from '../../../../flyout/entity_details/service_right/hooks/use_observed_service';
import { useFlyoutApi } from '../../../use_flyout_api';

export interface ServiceProps {
  /** Display name from the source row / document (typically `service.name`). */
  serviceName: string;
  /** Canonical Entity Store v2 id (`entity.id`) when already resolved. */
  entityId?: string;
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
  entityId,
  scopeId = '',
  contextID,
}) {
  const { euiTheme } = useEuiTheme();
  const {
    openServiceFlyoutAsChild,
    openEntityDetailsAsChild,
    openEntityRiskInputs,
    openEntityGraphView,
    openEntityResolution,
  } = useFlyoutApi();

  const safeContextID = contextID ?? scopeId ?? 'service-panel';

  const serviceStoreIdentityFields = useMemo(
    () => (!entityId && serviceName ? { 'service.name': serviceName } : undefined),
    [entityId, serviceName]
  );
  const entityFromStoreResult = useEntityFromStore({
    entityId,
    identityFields: serviceStoreIdentityFields,
    entityType: 'service',
    skip: false,
  });

  const euidApi = useEntityStoreEuidApi();
  const documentEntityIdentifiers = useMemo<IdentityFields>(() => {
    return (
      euidApi?.euid?.getEntityIdentifiersFromDocument(
        'service',
        entityFromStoreResult.entityRecord ?? {}
      ) ?? {}
    );
  }, [entityFromStoreResult.entityRecord, euidApi?.euid]);

  const serviceNameFilterQuery = useMemo(
    () => (serviceName ? buildEntityNameFilter(EntityType.service, [serviceName]) : undefined),
    [serviceName]
  );
  const riskScoreState = useRiskScore({
    riskEntity: EntityType.service,
    filterQuery: serviceNameFilterQuery as unknown as ESQuery | undefined,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: true,
  });

  const { inspect, loading } = riskScoreState;
  const { setQuery, deleteQuery } = useGlobalTime();
  const observedService = useObservedService(documentEntityIdentifiers, scopeId);

  const { entityRiskScores, recalculatingScore, calculateEntityRiskScore } =
    useEntityRiskScoreRecalculation({
      entityType: EntityType.service,
      identifier: serviceName,
      entityId: entityFromStoreResult.entityRecord?.entity?.id,
      entityStoreV2Enabled: true,
      entityFromStoreResult,
      riskScoreState,
    });

  const onAssetCriticalityChanged = useCallback(() => {
    calculateEntityRiskScore();
  }, [calculateEntityRiskScore]);

  const { updateAssetCriticalityLevel } = useUpdateAssetCriticality('service', {
    onSuccess: onAssetCriticalityChanged,
  });

  useQueryInspector({
    deleteQuery,
    inspect,
    loading,
    queryId: SERVICE_PANEL_RISK_SCORE_QUERY_ID,
    refetch: riskScoreState.refetch,
    setQuery,
  });

  const entityStoreEntityId = entityFromStoreResult.entityRecord?.entity?.id;

  const onCriticalitySave = entityFromStoreResult.entityRecord
    ? (level: CriticalityLevelWithUnassigned) =>
        updateAssetCriticalityLevel(level, entityFromStoreResult.entityRecord)
    : undefined;

  const onShowService = useCallback(() => {
    openServiceFlyoutAsChild({
      serviceName,
      entityId,
      scopeId,
      title: serviceName,
      origin: FLYOUT_ORIGIN.TOOL_HEADER_TITLE,
    });
  }, [openServiceFlyoutAsChild, serviceName, entityId, scopeId]);

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
        title: params.entityName ?? params.entityId,
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
            onShowEntity: onShowService,
            title: serviceName,
            origin:
              path.subTab === RiskScoreLeftPanelSubTab.RESOLUTION
                ? FLYOUT_ORIGIN.RISK_SUMMARY_RESOLUTION
                : FLYOUT_ORIGIN.RISK_SUMMARY_ENTITY,
          });
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
            onShowEntity: onShowService,
            onShowRelatedEntity: onShowRelatedEntityFromResolution,
            title: serviceName,
            origin: FLYOUT_ORIGIN.RESOLUTION_SECTION,
          });
      }
    },
    [
      openEntityRiskInputs,
      openEntityGraphView,
      openEntityResolution,
      serviceName,
      scopeId,
      entityStoreEntityId,
      onShowService,
      onShowRelatedEntityFromGraph,
      onShowRelatedEntityFromResolution,
    ]
  );

  const { tabs, selectedTabId, setSelectedTabId } = useEntityPanelTabs({
    entityRecord: entityFromStoreResult.entityRecord ?? null,
  });

  const tabsNode = tabs ? (
    <EntityPanelHeaderTabs
      tabs={tabs}
      selectedTabId={selectedTabId}
      setSelectedTabId={setSelectedTabId}
    />
  ) : undefined;

  return (
    <>
      <ServicePanelHeader
        serviceName={serviceName}
        observedService={observedService}
        isEntityInStore={!!entityFromStoreResult.entityRecord}
        flyoutHeaderProps={{
          css: css`
            padding-block: ${euiTheme.size.s} !important;
          `,
          panelProps: { paddingSize: 'none' },
        }}
        riskLevel={
          entityFromStoreResult.entityRecord
            ? ((getRiskFromEntityRecord(entityFromStoreResult.entityRecord)?.calculated_level ??
                'Unknown') as RiskSeverity)
            : undefined
        }
      />
      <FlyoutBody panelProps={{ paddingSize: 'none' }}>
        {entityFromStoreResult.entityRecord && (
          <EntitySummaryGrid
            entityRecord={entityFromStoreResult.entityRecord}
            criticalityLevel={entityFromStoreResult.entityRecord?.asset?.criticality}
            onCriticalitySave={onCriticalitySave}
          />
        )}
        {tabsNode}
        {tabs && <EuiSpacer size="l" />}
        {tabs && selectedTabId === TABLE_TAB_ID && entityFromStoreResult.entityRecord ? (
          <EntityStoreTableTab entityRecord={entityFromStoreResult.entityRecord} />
        ) : (
          <ServicePanelContent
            entityRecord={entityFromStoreResult.entityRecord ?? undefined}
            serviceName={serviceName}
            observedService={observedService}
            riskScoreState={riskScoreState}
            entityRiskScores={entityRiskScores}
            recalculatingScore={recalculatingScore}
            onAssetCriticalityChange={onAssetCriticalityChanged}
            contextID={safeContextID}
            scopeId={scopeId}
            openDetailsPanel={openDetailsPanel}
            isPreviewMode={false}
            entityStoreEntityId={entityStoreEntityId}
            onShowEntity={onShowRelatedEntityFromResolution}
            riskScoreQueryId={SERVICE_PANEL_RISK_SCORE_QUERY_ID}
          />
        )}
      </FlyoutBody>
      <ServicePanelFooter
        serviceName={serviceName}
        identityFields={documentEntityIdentifiers}
        entity={entityFromStoreResult.entityRecord ?? undefined}
        flyoutFooterProps={{
          css: css`
            padding-block: ${euiTheme.size.s} !important;
          `,
        }}
        panelProps={{ paddingSize: 'none' }}
      />
    </>
  );
});

Service.displayName = 'Service';
