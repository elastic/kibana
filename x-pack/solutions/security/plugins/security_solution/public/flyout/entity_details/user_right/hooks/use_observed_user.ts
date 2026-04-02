/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors, sourcererSelectors, type inputsModel } from '../../../../common/store';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import type { UserItem } from '../../../../../common/search_strategy';
import { Direction, NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../common/search_strategy';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import { isActiveTimeline } from '../../../../helpers';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import type { InspectResponse } from '../../../../types';
import type {
  EntityStoreRecord,
  EntityFromStoreResult,
} from '../../shared/hooks/use_entity_from_store';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import { USER_PANEL_OBSERVED_USER_QUERY_ID, USER_PANEL_RISK_SCORE_QUERY_ID } from '..';

export type ObservedUserResult = Omit<ObservedEntityData<UserItem>, 'anomalies'> & {
  entityRecord?: EntityStoreRecord | null;
  /** Refetch from entity store (when entity store v2 is enabled). */
  refetchEntityStore?: () => void;
  /** Inspect/refetch for the observed-user search strategy (security default indices). */
  observedDetailsInspect?: InspectResponse;
  refetchObservedDetails?: inputsModel.Refetch;
};

export const useObservedUser = (
  userName: string,
  scopeId: string,
  entityFromStore?: EntityFromStoreResult<UserItem> | null
): ObservedUserResult => {
  const timelineTime = useDeepEqualSelector((state) =>
    inputsSelectors.timelineTimeRangeSelector(state)
  );
  const globalTime = useGlobalTime();
  const isActiveTimelines = isActiveTimeline(scopeId);
  const { to, from } = isActiveTimelines ? timelineTime : globalTime;
  const { isInitializing, setQuery, deleteQuery } = globalTime;

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const oldSecurityDefaultPatterns =
    useSelector(sourcererSelectors.defaultDataView)?.patternList ?? [];
  const { indexPatterns: experimentalSecurityDefaultIndexPatterns } = useSecurityDefaultPatterns();
  const securityDefaultPatterns = newDataViewPickerEnabled
    ? experimentalSecurityDefaultIndexPatterns
    : oldSecurityDefaultPatterns;

  const useEntityStoreObservedData = Boolean(
    entityFromStore?.entityRecord ?? entityFromStore?.entity
  );

  const [isLoading, { userDetails, inspect: inspectObservedUser, refetch: refetchUserDetails }] =
    useObservedUserDetails({
      endDate: to,
      startDate: from,
      userName,
      indexNames: securityDefaultPatterns,
      id: USER_PANEL_RISK_SCORE_QUERY_ID,
      skip: isInitializing || useEntityStoreObservedData,
    });

  useQueryInspector({
    deleteQuery,
    inspect: useEntityStoreObservedData ? entityFromStore?.inspect : inspectObservedUser,
    loading: useEntityStoreObservedData ? entityFromStore?.isLoading ?? false : isLoading,
    queryId: USER_PANEL_OBSERVED_USER_QUERY_ID,
    refetch: useEntityStoreObservedData
      ? entityFromStore?.refetch ?? (() => {})
      : refetchUserDetails,
    setQuery,
  });

  const [loadingFirstSeen, { firstSeen }] = useFirstLastSeen({
    field: 'user.name',
    value: userName,
    defaultIndex: securityDefaultPatterns,
    order: Direction.asc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: useEntityStoreObservedData,
  });

  const [loadingLastSeen, { lastSeen }] = useFirstLastSeen({
    field: 'user.name',
    value: userName,
    defaultIndex: securityDefaultPatterns,
    order: Direction.desc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: useEntityStoreObservedData,
  });

  return useMemo((): ObservedUserResult => {
    if (useEntityStoreObservedData && entityFromStore) {
      return {
        details: (entityFromStore.entity ?? {}) as UserItem,
        isLoading: entityFromStore.isLoading,
        firstSeen: {
          date: entityFromStore.firstSeen ?? undefined,
          isLoading: entityFromStore.isLoading,
        },
        lastSeen: {
          date: entityFromStore.lastSeen ?? undefined,
          isLoading: entityFromStore.isLoading,
        },
        entityRecord: entityFromStore.entityRecord ?? null,
        refetchEntityStore: entityFromStore.refetch,
        observedDetailsInspect: undefined,
        refetchObservedDetails: undefined,
      };
    }
    return {
      details: userDetails,
      isLoading: isLoading || loadingLastSeen || loadingFirstSeen,
      firstSeen: {
        date: firstSeen,
        isLoading: loadingFirstSeen,
      },
      lastSeen: { date: lastSeen, isLoading: loadingLastSeen },
      observedDetailsInspect: inspectObservedUser,
      refetchObservedDetails: refetchUserDetails,
    };
  }, [
    useEntityStoreObservedData,
    entityFromStore,
    userDetails,
    isLoading,
    loadingLastSeen,
    loadingFirstSeen,
    firstSeen,
    lastSeen,
    inspectObservedUser,
    refetchUserDetails,
  ]);
};
