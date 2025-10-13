/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiWindowEvent,
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { PageScope } from '../../../../data_view_manager/constants';
import type { NarrowDateRange } from '../../../../common/components/ml/types';
import { useCalculateEntityRiskScore } from '../../../../entity_analytics/api/hooks/use_calculate_entity_risk_score';
import {
  useAssetCriticalityData,
  useAssetCriticalityPrivileges,
} from '../../../../entity_analytics/components/asset_criticality/use_asset_criticality';
import {
  AssetCriticalitySelector,
  AssetCriticalityTitle,
} from '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import { AlertsByStatus } from '../../../../overview/components/detection_response/alerts_by_status';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { type HostItem, LastEventIndexKey } from '../../../../../common/search_strategy';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { SecurityPageName } from '../../../../app/types';
import { FiltersGlobal } from '../../../../common/components/filters_global';
import { HeaderPage } from '../../../../common/components/header_page';
import { LastEventTime } from '../../../../common/components/last_event_time';
import { AnomalyTableProvider } from '../../../../common/components/ml/anomaly/anomaly_table_provider';
import { hostToCriteria } from '../../../../common/components/ml/criteria/host_to_criteria';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { scoreIntervalToDateTime } from '../../../../common/components/ml/score/score_interval_to_datetime';
import { TabNavigation } from '../../../../common/components/navigation/tab_navigation';
import {
  HOST_OVERVIEW_RISK_SCORE_QUERY_ID,
  HostOverview,
} from '../../../../overview/components/host_overview';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useKibana } from '../../../../common/lib/kibana';
import { inputsSelectors } from '../../../../common/store';
import { setHostDetailsTablesActivePageToZero } from '../../store/actions';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { HostDetailsTabs } from './details_tabs';
import { navTabsHostDetails } from './nav_tabs';
import type { HostDetailsProps } from './types';
import { HostsType } from '../../store/model';
import { getHostDetailsPageFilters } from './helpers';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';
import { Display } from '../display';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { ID, useHostDetails } from '../../containers/hosts/details';
import { manageQuery } from '../../../../common/components/page/manage_query';
import { useInvalidFilterQuery } from '../../../../common/hooks/use_invalid_filter_query';
import { EmptyPrompt } from '../../../../common/components/empty_prompt';
import { AlertCountByRuleByStatus } from '../../../../common/components/alert_count_by_status';
import { useLicense } from '../../../../common/hooks/use_license';
import { ResponderActionButton } from '../../../../common/components/endpoint/responder';
import { useRefetchOverviewPageRiskScore } from '../../../../entity_analytics/api/hooks/use_refetch_overview_page_risk_score';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { PageLoader } from '../../../../common/components/page_loader';

const ES_HOST_FIELD = 'host.name';
const HostOverviewManage = manageQuery(HostOverview);

const HostDetailsComponent: React.FC<HostDetailsProps> = ({ detailName, hostDetailsPagePath }) => {
  const dispatch = useDispatch();
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { globalFullScreen } = useGlobalFullScreen();
  const { signalIndexName } = useSignalIndex();

  const capabilities = useMlCapabilities();
  const {
    services: { uiSettings },
  } = useKibana();

  const hostDetailsPageFilters: Filter[] = useMemo(
    () => getHostDetailsPageFilters(detailName),
    [detailName]
  );

  const isEnterprisePlus = useLicense().isEnterprise();

  const narrowDateRange = useCallback<NarrowDateRange>(
    (score, interval) => {
      const fromTo = scoreIntervalToDateTime(score, interval);
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: fromTo.from,
          to: fromTo.to,
        })
      );
    },
    [dispatch]
  );

  const { dataView, status } = useDataView(PageScope.explore);
  const selectedPatterns = useSelectedPatterns(PageScope.explore);
  const indicesExist = !!dataView.matchedIndices?.length;

  const [loading, { inspect, hostDetails: hostOverview, id, refetch }] = useHostDetails({
    endDate: to,
    startDate: from,
    hostName: detailName,
    indexNames: selectedPatterns,
    skip: selectedPatterns.length === 0,
  });

  const [rawFilteredQuery, kqlError] = useMemo(() => {
    try {
      return [
        buildEsQuery(
          dataView,
          [query],
          [...hostDetailsPageFilters, ...globalFilters],
          getEsQueryConfig(uiSettings)
        ),
      ];
    } catch (e) {
      return [undefined, e];
    }
  }, [dataView, query, hostDetailsPageFilters, globalFilters, uiSettings]);

  const stringifiedAdditionalFilters = JSON.stringify(rawFilteredQuery);
  useInvalidFilterQuery({
    id: ID,
    filterQuery: stringifiedAdditionalFilters,
    kqlError,
    query,
    startDate: from,
    endDate: to,
  });

  useEffect(() => {
    dispatch(setHostDetailsTablesActivePageToZero());
  }, [dispatch, detailName]);

  const { hasAlertsRead, hasIndexRead } = useAlertsPrivileges();
  const canReadAlerts = hasAlertsRead && hasIndexRead;

  const entityFilter = useMemo(
    () => ({
      field: ES_HOST_FIELD,
      value: detailName,
    }),
    [detailName]
  );

  const additionalFilters = useMemo(
    () => (rawFilteredQuery ? [rawFilteredQuery] : []),
    [rawFilteredQuery]
  );

  const entity = useMemo(
    () => ({ type: EntityType.host as const, name: detailName }),
    [detailName]
  );
  const privileges = useAssetCriticalityPrivileges(entity.name);

  const refetchRiskScore = useRefetchOverviewPageRiskScore(HOST_OVERVIEW_RISK_SCORE_QUERY_ID);
  const { calculateEntityRiskScore } = useCalculateEntityRiskScore(EntityType.host, detailName, {
    onSuccess: refetchRiskScore,
  });

  const canReadAssetCriticality = !!privileges.data?.has_read_permissions;
  const criticality = useAssetCriticalityData({
    entity,
    enabled: canReadAssetCriticality,
    onChange: calculateEntityRiskScore,
  });

  if (status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <>
      {indicesExist ? (
        <>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal>
            <SiemSearchBar dataView={dataView} id={InputsModelId.global} />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper
            noPadding={globalFullScreen}
            data-test-subj="hostDetailsPage"
          >
            <Display show={!globalFullScreen}>
              <HeaderPage
                border
                subtitle={
                  <LastEventTime
                    indexKey={LastEventIndexKey.hostDetails}
                    hostName={detailName}
                    indexNames={selectedPatterns}
                  />
                }
                title={detailName}
                rightSideItems={[
                  hostOverview.endpoint?.hostInfo?.metadata.elastic.agent.id && (
                    <ResponderActionButton
                      agentId={hostOverview.endpoint?.hostInfo?.metadata.elastic.agent.id}
                      agentType="endpoint"
                    />
                  ),
                ]}
              />
              {canReadAssetCriticality && (
                <>
                  <AssetCriticalityTitle />
                  <EuiSpacer size="s" />
                  <AssetCriticalitySelector compressed criticality={criticality} entity={entity} />
                  <EuiHorizontalRule margin="m" />
                </>
              )}
              <AnomalyTableProvider
                criteriaFields={hostToCriteria(hostOverview)}
                startDate={from}
                endDate={to}
                skip={isInitializing}
              >
                {({ isLoadingAnomaliesData, anomaliesData, jobNameById }) => (
                  <HostOverviewManage
                    id={id}
                    isInDetailsSidePanel={false}
                    data={hostOverview as HostItem}
                    anomaliesData={anomaliesData}
                    isLoadingAnomaliesData={isLoadingAnomaliesData}
                    loading={loading}
                    startDate={from}
                    endDate={to}
                    narrowDateRange={narrowDateRange}
                    setQuery={setQuery}
                    refetch={refetch}
                    inspect={inspect}
                    hostName={detailName}
                    indexNames={selectedPatterns}
                    jobNameById={jobNameById}
                    scopeId={PageScope.explore}
                  />
                )}
              </AnomalyTableProvider>
              <EuiHorizontalRule />
              <EuiSpacer />

              {canReadAlerts && (
                <>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <AlertsByStatus
                        signalIndexName={signalIndexName}
                        entityFilter={entityFilter}
                        additionalFilters={additionalFilters}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <AlertCountByRuleByStatus
                        entityFilter={entityFilter}
                        signalIndexName={signalIndexName}
                        additionalFilters={additionalFilters}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer />
                </>
              )}

              <TabNavigation
                navTabs={navTabsHostDetails({
                  hasMlUserPermissions: hasMlUserPermissions(capabilities),
                  hostName: detailName,
                  isEnterprise: isEnterprisePlus,
                })}
              />

              <EuiSpacer />
            </Display>

            <HostDetailsTabs
              indexNames={selectedPatterns}
              isInitializing={isInitializing}
              deleteQuery={deleteQuery}
              hostDetailsFilter={hostDetailsPageFilters}
              to={to}
              from={from}
              detailName={detailName}
              type={HostsType.details}
              setQuery={setQuery}
              filterQuery={stringifiedAdditionalFilters}
              hostDetailsPagePath={hostDetailsPagePath}
            />
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.hosts} />
    </>
  );
};

HostDetailsComponent.displayName = 'HostDetailsComponent';

export const HostDetails = React.memo(HostDetailsComponent);
