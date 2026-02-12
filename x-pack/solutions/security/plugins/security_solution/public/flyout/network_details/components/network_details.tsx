/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { PageScope } from '../../../data_view_manager/constants';
import { PageLoader } from '../../../common/components/page_loader';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import type { FlowTargetSourceDest } from '../../../../common/search_strategy';
import { IpOverview } from '../../../explore/network/components/details';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { networkToCriteria } from '../../../common/components/ml/criteria/network_to_criteria';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';
import { useKibana } from '../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../common/lib/kuery';
import { inputsSelectors } from '../../../common/store';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { useNetworkDetails } from '../../../explore/network/containers/details';
import { networkModel } from '../../../explore/network/store';
import { useAnomaliesTableData } from '../../../common/components/ml/anomaly/use_anomalies_table_data';
import { useInstalledSecurityJobNameById } from '../../../common/components/ml/hooks/use_installed_security_jobs';
import { EmptyPrompt } from '../../../common/components/empty_prompt';
import type { NarrowDateRange } from '../../../common/components/ml/types';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useSelectedPatterns } from '../../../data_view_manager/hooks/use_selected_patterns';

export interface NetworkDetailsProps {
  /**
   * IP value
   */
  ip: string;
  /**
   * Destination or source information
   */
  flowTarget: FlowTargetSourceDest;
}

/**
 * Component rendering all the network details for the expandable flyout
 */
export const NetworkDetails = ({ ip, flowTarget }: NetworkDetailsProps) => {
  const dispatch = useDispatch();
  const { to, from, isInitializing } = useGlobalTime();
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );

  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const type = networkModel.NetworkType.details;
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
  const {
    services: { uiSettings },
  } = useKibana();

  const { dataView, status } = useDataView();
  const selectedPatterns = useSelectedPatterns();
  const indicesExist = !!dataView.matchedIndices?.length;

  const [filterQuery, kqlError] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        dataView,
        queries: [query],
        filters,
      }),
    [uiSettings, dataView, query, filters]
  );

  const [loading, { id, networkDetails }] = useNetworkDetails({
    skip: isInitializing || filterQuery === undefined,
    filterQuery,
    indexNames: selectedPatterns,
    ip,
  });

  useInvalidFilterQuery({ id, filterQuery, kqlError, query, startDate: from, endDate: to });
  const { jobNameById } = useInstalledSecurityJobNameById();
  const jobIds = useMemo(() => Object.keys(jobNameById), [jobNameById]);
  const [isLoadingAnomaliesData, anomaliesData] = useAnomaliesTableData({
    criteriaFields: networkToCriteria(ip, flowTarget),
    startDate: from,
    endDate: to,
    skip: isInitializing,
    jobIds,
    aggregationInterval: 'auto',
  });

  if (status === 'pristine') {
    return <PageLoader />;
  }

  return indicesExist ? (
    <IpOverview
      contextID={undefined}
      id={id}
      ip={ip}
      data={networkDetails}
      anomaliesData={anomaliesData}
      loading={loading}
      isInDetailsSidePanel
      isLoadingAnomaliesData={isLoadingAnomaliesData}
      type={type}
      flowTarget={flowTarget}
      startDate={from}
      endDate={to}
      narrowDateRange={narrowDateRange}
      indexPatterns={selectedPatterns}
      jobNameById={jobNameById}
      scopeId={PageScope.default}
      isFlyoutOpen={true}
    />
  ) : (
    <EmptyPrompt />
  );
};
