/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import type { UserItem } from '../../../../../common/search_strategy';
import { Direction, NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../common/search_strategy';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import { isActiveTimeline } from '../../../../helpers';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { sourcererSelectors } from '../../../../sourcerer/store';
import { EntityIdentifierFields } from '../../../../../common/entity_analytics/types';
import type { EngineDescriptor } from '../../../../../common/api/entity_analytics';
import { useEntityStoreStatus } from '../../../../entity_analytics/components/entity_store/hooks/use_entity_store';
import { useEntityFromStore } from '../../shared/hooks/use_entity_from_store';
import {
  OBSERVED_USER_QUERY_ID,
  useObservedUserDetails,
} from '../../../../explore/users/containers/users/observed_details';

export const useObservedUser = (
  entityIdentifiers: Record<string, string>,
  scopeId: string
): Omit<ObservedEntityData<UserItem>, 'anomalies'> => {
  const timelineTime = useDeepEqualSelector((state) =>
    inputsSelectors.timelineTimeRangeSelector(state)
  );
  const globalTime = useGlobalTime();
  const isActiveTimelines = isActiveTimeline(scopeId);
  const { to, from } = isActiveTimelines ? timelineTime : globalTime;
  const { isInitializing, setQuery, deleteQuery } = globalTime;

  const userName =
    entityIdentifiers[EntityIdentifierFields.userName] || Object.values(entityIdentifiers)[0] || '';

  const { data: entityStoreStatus } = useEntityStoreStatus();
  const isEntityStoreRunning = entityStoreStatus?.status === 'running';
  const hasUserEngine =
    isEntityStoreRunning &&
    entityStoreStatus?.engines?.some(
      (e: EngineDescriptor) => e.type === 'user' && e.status === 'started'
    );

  const entityFromStore = useEntityFromStore({
    entityIdentifiers,
    entityType: 'user',
    skip: isInitializing || !hasUserEngine,
  });

  const useRawIndicesFallback =
    !hasUserEngine || (entityFromStore.entity === null && !entityFromStore.isLoading);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const oldSecurityDefaultPatterns =
    useSelector(sourcererSelectors.defaultDataView)?.patternList ?? [];
  const { indexPatterns: experimentalSecurityDefaultIndexPatterns } = useSecurityDefaultPatterns();
  const securityDefaultPatterns = newDataViewPickerEnabled
    ? experimentalSecurityDefaultIndexPatterns
    : oldSecurityDefaultPatterns;

  const [loadingObservedUser, { userDetails: observedUserDetails, inspect, refetch, id: queryId }] =
    useObservedUserDetails({
      endDate: to,
      startDate: from,
      userName,
      indexNames: securityDefaultPatterns,
      skip: isInitializing || !useRawIndicesFallback,
    });

  const effectiveInspect = entityFromStore.entity ? entityFromStore.inspect : inspect;
  const effectiveRefetch = entityFromStore.entity ? entityFromStore.refetch : refetch;

  useQueryInspector({
    deleteQuery,
    inspect: effectiveInspect,
    refetch: effectiveRefetch,
    setQuery,
    queryId: queryId ?? OBSERVED_USER_QUERY_ID,
    loading: entityFromStore.entity ? entityFromStore.isLoading : loadingObservedUser,
  });

  const [loadingFirstSeen, { firstSeen: firstSeenFromRaw }] = useFirstLastSeen({
    entityIdentifiers,
    entityType: 'user',
    defaultIndex: securityDefaultPatterns,
    order: Direction.asc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: isInitializing || !useRawIndicesFallback,
  });

  const [loadingLastSeen, { lastSeen: lastSeenFromRaw }] = useFirstLastSeen({
    entityIdentifiers,
    entityType: 'user',
    defaultIndex: securityDefaultPatterns,
    order: Direction.desc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: isInitializing || !useRawIndicesFallback,
  });

  const details = entityFromStore.entity ?? observedUserDetails;
  const firstSeen = entityFromStore.entity ? entityFromStore.firstSeen : firstSeenFromRaw;
  const lastSeen = entityFromStore.entity ? entityFromStore.lastSeen : lastSeenFromRaw;
  const isLoadingDetails = entityFromStore.entity ? entityFromStore.isLoading : loadingObservedUser;
  const isLoadingFirstSeen = entityFromStore.entity ? false : loadingFirstSeen;
  const isLoadingLastSeen = entityFromStore.entity ? false : loadingLastSeen;

  return useMemo(
    () => ({
      details,
      isLoading: isLoadingDetails || isLoadingLastSeen || isLoadingFirstSeen,
      firstSeen: {
        date: firstSeen,
        isLoading: isLoadingFirstSeen,
      },
      lastSeen: { date: lastSeen, isLoading: isLoadingLastSeen },
    }),
    [details, firstSeen, isLoadingDetails, lastSeen, isLoadingFirstSeen, isLoadingLastSeen]
  );
};
