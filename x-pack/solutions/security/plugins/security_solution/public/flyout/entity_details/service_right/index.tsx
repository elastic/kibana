/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { TableId } from '@kbn/securitysolution-data-table';
import { noop } from 'lodash/fp';
import { useEntityStoreEuidApi, FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/public';
import type { ESQuery } from '../../../../common/typed_json';
import { buildEntityNameFilter } from '../../../../common/search_strategy';
import { useUiSetting } from '../../../common/lib/kibana';
import { useRefetchQueryById } from '../../../entity_analytics/api/hooks/use_refetch_query_by_id';
import type { Refetch } from '../../../common/types';
import { RISK_INPUTS_TAB_QUERY_ID } from '../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import { useCalculateEntityRiskScore } from '../../../entity_analytics/api/hooks/use_calculate_entity_risk_score';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { ServicePanelContent } from './content';
import { ServicePanelHeader } from './header';
import { useObservedService } from './hooks/use_observed_service';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IdentityFields } from '../../document_details/shared/utils';
import { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';
import { useNavigateToServiceDetails } from './hooks/use_navigate_to_service_details';
import { useEntityFromStore } from '../shared/hooks/use_entity_from_store';

export interface ServicePanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  entityId: string;
  serviceName: string;
}

export interface ServicePanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'service-panel';
  params: ServicePanelProps;
}

export const SERVICE_PANEL_RISK_SCORE_QUERY_ID = 'servicePanelRiskScoreQuery';
const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const ServicePanel = ({ contextID, scopeId, entityId, serviceName }: ServicePanelProps) => {
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);
  const serviceStoreIdentityFields = useMemo(
    () => (!entityId && serviceName ? { 'service.name': serviceName } : undefined),
    [entityId, serviceName]
  );
  const entityFromStoreResult = useEntityFromStore({
    entityId,
    identityFields: serviceStoreIdentityFields,
    entityType: 'service',
    skip: !entityStoreV2Enabled,
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
    skip: entityStoreV2Enabled,
  });

  const { inspect, refetch, loading } = riskScoreState;
  const { setQuery, deleteQuery } = useGlobalTime();
  const observedService = useObservedService(documentEntityIdentifiers, scopeId);
  const { data: serviceRisk } = riskScoreState;
  const serviceRiskData = serviceRisk && serviceRisk.length > 0 ? serviceRisk[0] : undefined;
  const isRiskScoreExist = !!serviceRiskData?.service.risk;

  const refetchRiskInputsTab = useRefetchQueryById(RISK_INPUTS_TAB_QUERY_ID) ?? noop;
  const refetchRiskScore = useCallback(() => {
    refetch();
    (refetchRiskInputsTab as Refetch)();
  }, [refetch, refetchRiskInputsTab]);

  const { isLoading: recalculatingScore, calculateEntityRiskScore } = useCalculateEntityRiskScore(
    EntityType.service,
    serviceName,
    { onSuccess: refetchRiskScore }
  );

  useQueryInspector({
    deleteQuery,
    inspect,
    loading,
    queryId: SERVICE_PANEL_RISK_SCORE_QUERY_ID,
    refetch,
    setQuery,
  });

  const entityStoreEntityId = entityStoreV2Enabled
    ? entityFromStoreResult.entityRecord?.entity?.id
    : undefined;

  const openDetailsPanel = useNavigateToServiceDetails({
    serviceName,
    entityId,
    scopeId,
    isRiskScoreExist,
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

  if (observedService.isLoading) {
    return <FlyoutLoading />;
  }

  return (
    <>
      <FlyoutNavigation
        flyoutIsExpandable={isRiskScoreExist || !!entityStoreEntityId}
        expandDetails={openPanelFirstTab}
        isRulePreview={scopeId === TableId.rulePreview}
      />
      <ServicePanelHeader serviceName={serviceName} observedService={observedService} />
      <ServicePanelContent
        entityRecord={entityFromStoreResult.entityRecord ?? undefined}
        serviceName={serviceName}
        observedService={observedService}
        riskScoreState={riskScoreState}
        recalculatingScore={recalculatingScore}
        onAssetCriticalityChange={calculateEntityRiskScore}
        contextID={contextID}
        scopeId={scopeId}
        openDetailsPanel={openDetailsPanel}
        entityStoreEntityId={entityStoreEntityId}
      />
    </>
  );
};

ServicePanel.displayName = 'ServicePanel';
