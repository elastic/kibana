/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors, sourcererSelectors } from '../../../../common/store';
import { useHostDetails } from '../../../../explore/hosts/containers/hosts/details';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import type { HostItem } from '../../../../../common/search_strategy';
import { Direction, NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../common/search_strategy';
import { HOST_PANEL_OBSERVED_HOST_QUERY_ID, HOST_PANEL_RISK_SCORE_QUERY_ID } from '..';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import { isActiveTimeline } from '../../../../helpers';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { useEnableExperimental } from '../../../../common/hooks/use_experimental_features';

export const useObservedHost = (
  hostName: string,
  scopeId: string
): Omit<ObservedEntityData<HostItem>, 'anomalies'> => {
  const timelineTime = useDeepEqualSelector((state) =>
    inputsSelectors.timelineTimeRangeSelector(state)
  );
  const globalTime = useGlobalTime();
  const isActiveTimelines = isActiveTimeline(scopeId);
  const { to, from } = isActiveTimelines ? timelineTime : globalTime;
  const { isInitializing, setQuery, deleteQuery } = globalTime;

  const { newDataViewPickerEnabled } = useEnableExperimental();
  const oldSecurityDefaultPatterns =
    useSelector(sourcererSelectors.defaultDataView)?.patternList ?? [];
  const { indexPatterns: experimentalSecurityDefaultIndexPatterns } = useSecurityDefaultPatterns();
  const securityDefaultPatterns = newDataViewPickerEnabled
    ? experimentalSecurityDefaultIndexPatterns
    : oldSecurityDefaultPatterns;

  const [isLoading, { hostDetails, inspect: inspectObservedHost }, refetch] = useHostDetails({
    endDate: to,
    hostName,
    indexNames: securityDefaultPatterns,
    id: HOST_PANEL_RISK_SCORE_QUERY_ID,
    skip: isInitializing,
    startDate: from,
  });

  useQueryInspector({
    deleteQuery,
    inspect: inspectObservedHost,
    loading: isLoading,
    queryId: HOST_PANEL_OBSERVED_HOST_QUERY_ID,
    refetch,
    setQuery,
  });

  const [loadingFirstSeen, { firstSeen }] = useFirstLastSeen({
    field: 'host.name',
    value: hostName,
    defaultIndex: securityDefaultPatterns,
    order: Direction.asc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
  });

  const [loadingLastSeen, { lastSeen }] = useFirstLastSeen({
    field: 'host.name',
    value: hostName,
    defaultIndex: securityDefaultPatterns,
    order: Direction.desc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
  });

  return useMemo(
    () => ({
      details: hostDetails,
      isLoading: isLoading || loadingLastSeen || loadingFirstSeen,
      firstSeen: {
        date: firstSeen,
        isLoading: loadingFirstSeen,
      },
      lastSeen: { date: lastSeen, isLoading: loadingLastSeen },
    }),
    [firstSeen, hostDetails, isLoading, lastSeen, loadingFirstSeen, loadingLastSeen]
  );
};
