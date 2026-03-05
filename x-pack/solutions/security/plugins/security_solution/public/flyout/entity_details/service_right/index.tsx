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
import { euid } from '@kbn/entity-store/public';
import type { ESQuery } from '../../../../common/typed_json';
import { buildEntityNameFilter } from '../../../../common/search_strategy';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common/entity_analytics/entity_store/constants';
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
import type { EntityIdentifiers } from '../../document_details/shared/utils';
import { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';
import { useNavigateToServiceDetails } from './hooks/use_navigate_to_service_details';

export interface ServicePanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  entityIdentifiers: EntityIdentifiers;
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

const getServiceNameFromEntityIdentifiers = (entityIdentifiers: EntityIdentifiers): string =>
  entityIdentifiers['service.name'] || Object.values(entityIdentifiers)[0] || '';

export const ServicePanel = ({ contextID, scopeId, entityIdentifiers }: ServicePanelProps) => {
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);
  const serviceName = useMemo(
    () => getServiceNameFromEntityIdentifiers(entityIdentifiers ?? {}),
    [entityIdentifiers]
  );

  const serviceFilterQuery = useMemo(() => {
    if (entityStoreV2Enabled && Object.keys(entityIdentifiers ?? {}).length > 0) {
      return euid.getEuidDslFilterBasedOnDocument('service', entityIdentifiers ?? {}) ?? undefined;
    }
    return serviceName ? buildEntityNameFilter(EntityType.service, [serviceName]) : undefined;
  }, [entityStoreV2Enabled, entityIdentifiers, serviceName]);

  const riskScoreState = useRiskScore({
    riskEntity: EntityType.service,
    filterQuery: serviceFilterQuery as unknown as ESQuery | undefined,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: entityStoreV2Enabled,
  });

  const { inspect, refetch, loading } = riskScoreState;
  const { setQuery, deleteQuery } = useGlobalTime();
  const observedService = useObservedService(entityIdentifiers ?? {}, scopeId);
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

  const openDetailsPanel = useNavigateToServiceDetails({
    entityIdentifiers: entityIdentifiers ?? {},
    scopeId,
    isRiskScoreExist,
  });

  const openPanelFirstTab = useCallback(
    () =>
      openDetailsPanel({
        tab: EntityDetailsLeftPanelTab.RISK_INPUTS,
      }),
    [openDetailsPanel]
  );

  if (observedService.isLoading) {
    return <FlyoutLoading />;
  }

  return (
    <>
      <FlyoutNavigation
        flyoutIsExpandable={isRiskScoreExist}
        expandDetails={openPanelFirstTab}
        isRulePreview={scopeId === TableId.rulePreview}
      />
      <ServicePanelHeader serviceName={serviceName} observedService={observedService} />
      <ServicePanelContent
        entityIdentifiers={entityIdentifiers}
        serviceName={serviceName}
        observedService={observedService}
        riskScoreState={riskScoreState}
        recalculatingScore={recalculatingScore}
        onAssetCriticalityChange={calculateEntityRiskScore}
        contextID={contextID}
        scopeId={scopeId}
        openDetailsPanel={openDetailsPanel}
      />
    </>
  );
};

ServicePanel.displayName = 'ServicePanel';
