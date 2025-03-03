/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { getEsQueryConfig } from '@kbn/data-plugin/common';

import { buildEsQuery } from '@kbn/es-query';
import { dataViewSpecToViewBase } from '../../../../common/lib/kuery';
import { AlertsByStatus } from '../../../../overview/components/detection_response/alerts_by_status';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { LastEventIndexKey } from '../../../../../common/search_strategy';
import type { FlowTargetSourceDest } from '../../../../../common/search_strategy';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { FiltersGlobal } from '../../../../common/components/filters_global';
import { HeaderPage } from '../../../../common/components/header_page';
import { LastEventTime } from '../../../../common/components/last_event_time';
import { useAnomaliesTableData } from '../../../../common/components/ml/anomaly/use_anomalies_table_data';
import { networkToCriteria } from '../../../../common/components/ml/criteria/network_to_criteria';
import { scoreIntervalToDateTime } from '../../../../common/components/ml/score/score_interval_to_datetime';
import { manageQuery } from '../../../../common/components/page/manage_query';
import { FlowTargetSelectConnected } from '../../components/flow_target_select_connected';
import type { IpOverviewProps } from '../../components/details';
import { IpOverview } from '../../components/details';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useNetworkDetails, ID } from '../../containers/details';
import { useKibana } from '../../../../common/lib/kibana';
import { decodeIpv6 } from '../../../../common/lib/helpers';
import { inputsSelectors } from '../../../../common/store';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { setNetworkDetailsTablesActivePageToZero } from '../../store/actions';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { networkModel } from '../../store';
import { SecurityPageName } from '../../../../app/types';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useInvalidFilterQuery } from '../../../../common/hooks/use_invalid_filter_query';
import { EmptyPrompt } from '../../../../common/components/empty_prompt';
import { TabNavigation } from '../../../../common/components/navigation/tab_navigation';
import { getNetworkDetailsPageFilter } from '../../../../common/components/visualization_actions/utils';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { AlertCountByRuleByStatus } from '../../../../common/components/alert_count_by_status';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { navTabsNetworkDetails } from './nav_tabs';
import { NetworkDetailsTabs } from './details_tabs';
import { useInstalledSecurityJobNameById } from '../../../../common/components/ml/hooks/use_installed_security_jobs';
import {
  SecurityCellActions,
  CellActionsMode,
  SecurityCellActionsTrigger,
} from '../../../../common/components/cell_actions';
import { SourcererScopeName } from '../../../../sourcerer/store/model';

const NetworkDetailsManage = manageQuery(IpOverview);

const NetworkDetailsComponent: React.FC = () => {
  const dispatch = useDispatch();
  const capabilities = useMlCapabilities();
  const { to, from, setQuery, isInitializing } = useGlobalTime();
  const { detailName, flowTarget } = useParams<{
    detailName: string;
    flowTarget: FlowTargetSourceDest;
  }>();
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );

  const { signalIndexName } = useSignalIndex();
  const { hasKibanaREAD, hasIndexRead } = useAlertsPrivileges();
  const canReadAlerts = hasKibanaREAD && hasIndexRead;

  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const type = networkModel.NetworkType.details;
  const narrowDateRange = useCallback<IpOverviewProps['narrowDateRange']>(
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
  const {
    services: { uiSettings },
  } = useKibana();

  useEffect(() => {
    dispatch(setNetworkDetailsTablesActivePageToZero());
  }, [detailName, dispatch]);

  const { indicesExist, selectedPatterns, sourcererDataView } = useSourcererDataView();

  const ip = decodeIpv6(detailName);
  const networkDetailsFilter = useMemo(() => getNetworkDetailsPageFilter(ip), [ip]);

  const [rawFilteredQuery, kqlError] = useMemo(() => {
    try {
      return [
        buildEsQuery(
          dataViewSpecToViewBase(sourcererDataView),
          [query],
          [...networkDetailsFilter, ...globalFilters],
          getEsQueryConfig(uiSettings)
        ),
      ];
    } catch (e) {
      return [undefined, e];
    }
  }, [globalFilters, networkDetailsFilter, query, sourcererDataView, uiSettings]);

  const additionalFilters = useMemo(
    () => (rawFilteredQuery ? [rawFilteredQuery] : []),
    [rawFilteredQuery]
  );

  const stringifiedAdditionalFilters = JSON.stringify(rawFilteredQuery);
  useInvalidFilterQuery({
    id: ID,
    filterQuery: stringifiedAdditionalFilters,
    kqlError,
    query,
    startDate: from,
    endDate: to,
  });

  const [loading, { id, inspect, networkDetails, refetch }] = useNetworkDetails({
    skip: isInitializing,
    filterQuery: stringifiedAdditionalFilters,
    indexNames: selectedPatterns,
    ip,
  });

  const { jobNameById } = useInstalledSecurityJobNameById();
  const jobIds = useMemo(() => Object.keys(jobNameById), [jobNameById]);
  const [isLoadingAnomaliesData, anomaliesData] = useAnomaliesTableData({
    criteriaFields: networkToCriteria(detailName, flowTarget),
    startDate: from,
    endDate: to,
    skip: isInitializing,
    jobIds,
    aggregationInterval: 'auto',
  });

  const entityFilter = useMemo(
    () => ({
      field: `${flowTarget}.ip`,
      value: detailName,
    }),
    [detailName, flowTarget]
  );

  const indexPattern = useMemo(() => {
    return dataViewSpecToViewBase(sourcererDataView);
  }, [sourcererDataView]);

  return (
    <div data-test-subj="network-details-page">
      {indicesExist ? (
        <>
          <FiltersGlobal>
            <SiemSearchBar sourcererDataView={sourcererDataView} id={InputsModelId.global} />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper>
            <HeaderPage
              border
              data-test-subj="network-details-headline"
              subtitle={
                <LastEventTime
                  indexKey={LastEventIndexKey.ipDetails}
                  indexNames={selectedPatterns}
                  ip={ip}
                />
              }
              title={
                <SecurityCellActions
                  data={{
                    value: ip,
                    field: `${flowTarget}.ip`,
                  }}
                  mode={CellActionsMode.HOVER_DOWN}
                  visibleCellActions={5}
                  triggerId={SecurityCellActionsTrigger.DEFAULT}
                >
                  {ip}
                </SecurityCellActions>
              }
            >
              <FlowTargetSelectConnected flowTarget={flowTarget} />
            </HeaderPage>

            <NetworkDetailsManage
              id={id}
              inspect={inspect}
              ip={ip}
              isInDetailsSidePanel={false}
              data={networkDetails}
              anomaliesData={anomaliesData}
              loading={loading}
              isLoadingAnomaliesData={isLoadingAnomaliesData}
              type={type}
              flowTarget={flowTarget}
              refetch={refetch}
              setQuery={setQuery}
              startDate={from}
              endDate={to}
              narrowDateRange={narrowDateRange}
              indexPatterns={selectedPatterns}
              jobNameById={jobNameById}
              scopeId={SourcererScopeName.default}
            />

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
              navTabs={navTabsNetworkDetails(ip, hasMlUserPermissions(capabilities), flowTarget)}
            />
            <EuiSpacer />
            <NetworkDetailsTabs
              ip={ip}
              endDate={to}
              startDate={from}
              filterQuery={stringifiedAdditionalFilters}
              indexNames={selectedPatterns}
              skip={isInitializing || !!kqlError}
              setQuery={setQuery}
              indexPattern={indexPattern}
              flowTarget={flowTarget}
              networkDetailsFilter={networkDetailsFilter}
            />
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.network} />
    </div>
  );
};

NetworkDetailsComponent.displayName = 'NetworkDetailsComponent';

export const NetworkDetails = React.memo(NetworkDetailsComponent);
