/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { UniversalEntityFlyoutHeader } from './header';
import { UniversalEntityFlyoutContent } from './content';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';

export interface UniversalEntityPanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  serviceName: string;
  isDraggable?: boolean;
}

export interface UniversalEntityPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'universal-entity-panel';
  params: UniversalEntityPanelProps;
}

export const SERVICE_PANEL_RISK_SCORE_QUERY_ID = 'servicePanelRiskScoreQuery';

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const UniversalEntityPanel = (props: UniversalEntityPanelProps) => {
  console.log(props);

  const entity = props.params.entity;
  // const serviceNameFilterQuery = useMemo(
  //   () => (serviceName ? buildEntityNameFilter(EntityType.service, [serviceName]) : undefined),
  //   [serviceName]
  // );
  //
  // const riskScoreState = useRiskScore({
  //   riskEntity: EntityType.service,
  //   filterQuery: serviceNameFilterQuery,
  //   onlyLatest: false,
  //   pagination: FIRST_RECORD_PAGINATION,
  // });
  //
  // const { inspect, refetch, loading } = riskScoreState;
  // const { setQuery, deleteQuery } = useGlobalTime();
  // const observedService = useObservedService(serviceName, scopeId);
  // const { data: serviceRisk } = riskScoreState;
  // const serviceRiskData = serviceRisk && serviceRisk.length > 0 ? serviceRisk[0] : undefined;
  // const isRiskScoreExist = !!serviceRiskData?.service.risk;
  //
  // const refetchRiskInputsTab = useRefetchQueryById(RISK_INPUTS_TAB_QUERY_ID) ?? noop;
  // const refetchRiskScore = useCallback(() => {
  //   refetch();
  //   (refetchRiskInputsTab as Refetch)();
  // }, [refetch, refetchRiskInputsTab]);
  //
  // const { isLoading: recalculatingScore, calculateEntityRiskScore } = useCalculateEntityRiskScore(
  //   EntityType.service,
  //   serviceName,
  //   { onSuccess: refetchRiskScore }
  // );
  //
  // useQueryInspector({
  //   deleteQuery,
  //   inspect,
  //   loading,
  //   queryId: SERVICE_PANEL_RISK_SCORE_QUERY_ID,
  //   refetch,
  //   setQuery,
  // });
  //
  // const { openDetailsPanel, isLinkEnabled } = useNavigateToServiceDetails({
  //   serviceName,
  //   scopeId,
  //   contextID,
  //   isDraggable,
  //   isRiskScoreExist,
  // });
  //
  // const openPanelFirstTab = useCallback(
  //   () =>
  //     openDetailsPanel({
  //       tab: EntityDetailsLeftPanelTab.RISK_INPUTS,
  //     }),
  //   [openDetailsPanel]
  // );
  //
  // if (observedService.isLoading) {
  //   return <FlyoutLoading />;
  // }

  return (
    <>
      <FlyoutNavigation
        flyoutIsExpandable={true}
        // expandDetails={openPanelFirstTab}
        // isPreview={scopeId === TableId.rulePreview}
      />
      <UniversalEntityFlyoutHeader entity={entity} />
      <UniversalEntityFlyoutContent entity={entity} />
    </>
  );
};

UniversalEntityPanel.displayName = 'UniversalEntityPanel';
