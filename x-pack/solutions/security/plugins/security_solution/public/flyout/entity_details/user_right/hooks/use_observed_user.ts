/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import type { UserItem } from '../../../../../common/search_strategy';
import { Direction, NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../common/search_strategy';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import { isActiveTimeline } from '../../../../helpers';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';

export const useObservedUser = (
  userName: string,
  scopeId: string
): Omit<ObservedEntityData<UserItem>, 'anomalies'> => {
  const timelineTime = useDeepEqualSelector((state) =>
    inputsSelectors.timelineTimeRangeSelector(state)
  );
  const globalTime = useGlobalTime();
  const isActiveTimelines = isActiveTimeline(scopeId);
  const { to, from } = isActiveTimelines ? timelineTime : globalTime;
  const { isInitializing, setQuery, deleteQuery } = globalTime;

  const { indexPatterns } = useSecurityDefaultPatterns();

  const [loadingObservedUser, { userDetails: observedUserDetails, inspect, refetch, id: queryId }] =
    useObservedUserDetails({
      endDate: to,
      startDate: from,
      userName,
      indexNames: indexPatterns,
      skip: isInitializing,
    });

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId,
    loading: loadingObservedUser,
  });

  const [loadingFirstSeen, { firstSeen }] = useFirstLastSeen({
    field: 'user.name',
    value: userName,
    defaultIndex: indexPatterns,
    order: Direction.asc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
  });

  const [loadingLastSeen, { lastSeen }] = useFirstLastSeen({
    field: 'user.name',
    value: userName,
    defaultIndex: indexPatterns,
    order: Direction.desc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
  });

  return useMemo(
    () => ({
      details: observedUserDetails,
      isLoading: loadingObservedUser || loadingLastSeen || loadingFirstSeen,
      firstSeen: {
        date: firstSeen,
        isLoading: loadingFirstSeen,
      },
      lastSeen: { date: lastSeen, isLoading: loadingLastSeen },
    }),
    [
      firstSeen,
      lastSeen,
      loadingFirstSeen,
      loadingLastSeen,
      loadingObservedUser,
      observedUserDetails,
    ]
  );
};
