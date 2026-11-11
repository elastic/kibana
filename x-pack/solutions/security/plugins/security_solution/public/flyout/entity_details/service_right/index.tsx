/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { TableId } from '@kbn/securitysolution-data-table';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { EuiSpacer } from '@elastic/eui';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import type { ESQuery } from '../../../../common/typed_json';
import {
  buildEntityNameFilter,
  type RiskSeverity,
  type ServiceItem,
} from '../../../../common/search_strategy';
import { useUpdateAssetCriticality } from '../../../entity_analytics/api/hooks/use_update_asset_criticality';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { useEntityRiskScoreRecalculation } from '../../../entity_analytics/api/hooks/use_entity_risk_score_recalculation';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { FlyoutLoading } from '../../../flyout_v2/shared/components/flyout_loading';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { Content } from '../../../flyout_v2/entity/service/main/content';
import { Header } from '../../../flyout_v2/entity/service/main/header';
import { Footer } from '../../../flyout_v2/entity/service/main/footer';
import { useObservedService } from '../../../flyout_v2/entity/service/main/hooks/use_observed_service';
import { SERVICE_PANEL_RISK_SCORE_QUERY_ID } from '../../../flyout_v2/entity/service/main/constants';
import { EntityType } from '../../../../common/entity_analytics/types';
import {
  mergeLegacyIdentityWhenStoreEntityMissing,
  type IdentityFields,
} from '../../document_details/shared/utils';
import { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';
import { useNavigateToServiceDetails } from './hooks/use_navigate_to_service_details';
import { useAlertTimeRange } from '../../../entity_analytics/hooks/use_alert_time_range';
import { useNonClosedAlerts } from '../../../cloud_security_posture/hooks/use_non_closed_alerts';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../../overview/components/detection_response/alerts_by_status/types';
import { useEntityFromStore } from '../shared/hooks/use_entity_from_store';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../common/utils/execution_context';
import { getRiskFromEntityRecord } from '../shared/entity_store_risk_utils';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { FlyoutFooter } from '../../shared/components/flyout_footer';
import { useEntityPanelTabs, TABLE_TAB_ID } from '../shared/hooks/use_entity_panel_tabs';
import { EntityPanelHeaderTabs } from '../shared/components/entity_panel_tabs';
import { EntityStoreTableTab } from '../shared/components/entity_store_table_tab';
import { EntitySummaryGrid } from '../shared/components/entity_summary_grid';

export interface ServicePanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  entityId: string;
  serviceName: string;
  isPreviewMode?: boolean;
}

export interface ServicePanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'service-panel';
  params: ServicePanelProps;
}

const SERVICE_ENTITY_FROM_STORE_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.ENTITY_DETAILS_FLYOUT,
  'service_entity_from_store'
);

const SERVICE_RISK_SCORE_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.ENTITY_DETAILS_FLYOUT,
  'service_risk_score'
);

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const ServicePanel = memo(function ServicePanel({
  contextID,
  scopeId,
  entityId,
  serviceName,
  isPreviewMode = false,
}: ServicePanelProps) {
  const safeContextID = contextID ?? scopeId ?? 'service-panel';
  const serviceStoreIdentityFields = useMemo(
    () => (!entityId && serviceName ? { 'service.name': serviceName } : undefined),
    [entityId, serviceName]
  );
  const entityFromStoreResult = useEntityFromStore<ServiceItem>({
    entityId,
    identityFields: serviceStoreIdentityFields,
    entityType: 'service',
    skip: false,
    executionContext: SERVICE_ENTITY_FROM_STORE_CONTEXT,
  });

  const euidApi = useEntityStoreEuidApi();
  const documentEntityIdentifiers = useMemo<IdentityFields>(() => {
    const legacyFields: IdentityFields =
      serviceName != null && serviceName !== '' ? { 'service.name': serviceName } : {};
    const fromStore =
      euidApi?.euid?.getEntityIdentifiersFromDocument(
        euidApi.getBuiltInEntityDefinition('service'),
        entityFromStoreResult.entityRecord ?? {}
      ) ?? {};
    return mergeLegacyIdentityWhenStoreEntityMissing(fromStore, legacyFields);
  }, [entityFromStoreResult.entityRecord, euidApi, serviceName]);

  const { from: alertFrom, to: alertTo } = useAlertTimeRange(scopeId);
  const { hasNonClosedAlerts } = useNonClosedAlerts({
    identityFields: documentEntityIdentifiers,
    entityType: EntityType.service,
    entityRecord: entityFromStoreResult.entityRecord,
    to: alertTo,
    from: alertFrom,
    queryId: `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}SERVICE_NAME_RIGHT`,
  });

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
    executionContext: SERVICE_RISK_SCORE_CONTEXT,
  });

  const { inspect, loading, data: serviceRisk } = riskScoreState;
  const { setQuery, deleteQuery } = useGlobalTime();
  const observedService = useObservedService(serviceName, scopeId);
  const serviceRiskData = serviceRisk && serviceRisk.length > 0 ? serviceRisk[0] : undefined;
  const isRiskScoreExist = !!serviceRiskData?.service.risk;

  const entityStoreV2Enabled = true;
  const { entityRiskScores, recalculatingScore, calculateEntityRiskScore } =
    useEntityRiskScoreRecalculation({
      entityType: EntityType.service,
      identifier: serviceName,
      entityId: entityFromStoreResult.entityRecord?.entity?.id,
      entityStoreV2Enabled,
      entityFromStoreResult,
      riskScoreState,
    });

  const onAssetCriticalityChanged = useCallback(() => {
    calculateEntityRiskScore();
  }, [calculateEntityRiskScore]);

  const { updateAssetCriticalityLevel } = useUpdateAssetCriticality('service', {
    onSuccess: calculateEntityRiskScore,
    refetchEntityRecord: entityFromStoreResult.refetch,
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

  const openDetailsPanel = useNavigateToServiceDetails({
    serviceName,
    entityId,
    scopeId,
    contextID: safeContextID,
    isRiskScoreExist,
    identityFields: documentEntityIdentifiers,
    isPreviewMode,
    hasNonClosedAlerts,
    entityStoreEntityId,
  });

  const defaultTab = useMemo(() => {
    if (isRiskScoreExist) return EntityDetailsLeftPanelTab.RISK_INPUTS;
    if (entityStoreEntityId) return EntityDetailsLeftPanelTab.RESOLUTION_GROUP;
    return EntityDetailsLeftPanelTab.RISK_INPUTS;
  }, [isRiskScoreExist, entityStoreEntityId]);

  const openPanelFirstTab = useCallback(
    () =>
      openDetailsPanel({
        tab: defaultTab,
      }),
    [openDetailsPanel, defaultTab]
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

  if (observedService.isLoading) {
    return <FlyoutLoading />;
  }

  return (
    <>
      <FlyoutNavigation
        flyoutIsExpandable={isRiskScoreExist || !!entityStoreEntityId}
        expandDetails={openPanelFirstTab}
        isPreviewMode={isPreviewMode}
        isRulePreview={scopeId === TableId.rulePreview}
      />
      <FlyoutHeader>
        <Header
          serviceName={serviceName}
          lastSeen={observedService.lastSeen}
          isEntityInStore={!!entityFromStoreResult.entityRecord}
          riskLevel={
            entityFromStoreResult.entityRecord
              ? ((getRiskFromEntityRecord(entityFromStoreResult.entityRecord)?.calculated_level ??
                  'Unknown') as RiskSeverity)
              : undefined
          }
        />
      </FlyoutHeader>
      <FlyoutBody>
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
          <Content
            entityRecord={entityFromStoreResult.entityRecord ?? undefined}
            refetchEntityRecord={entityFromStoreResult.refetch}
            identityFields={documentEntityIdentifiers}
            observedService={observedService}
            riskScoreState={riskScoreState}
            entityRiskScores={entityRiskScores}
            recalculatingScore={recalculatingScore}
            onAssetCriticalityChange={onAssetCriticalityChanged}
            contextID={safeContextID}
            scopeId={scopeId}
            openDetailsPanel={openDetailsPanel}
            isPreviewMode={isPreviewMode}
            entityStoreV2Enabled={entityStoreV2Enabled}
            entityStoreEntityId={entityStoreEntityId}
            riskScoreQueryId={SERVICE_PANEL_RISK_SCORE_QUERY_ID}
          />
        )}
      </FlyoutBody>
      {!isPreviewMode && (
        <FlyoutFooter>
          <Footer
            serviceName={serviceName}
            identityFields={documentEntityIdentifiers}
            entity={
              entityStoreV2Enabled ? entityFromStoreResult.entityRecord ?? undefined : undefined
            }
          />
        </FlyoutFooter>
      )}
    </>
  );
});

ServicePanel.displayName = 'ServicePanel';
