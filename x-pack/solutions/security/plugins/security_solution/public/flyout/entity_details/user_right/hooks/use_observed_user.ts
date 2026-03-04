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
import type { EntityStoreRecord } from '../../shared/hooks/use_entity_from_store';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import type { UserItem } from '../../../../../common/search_strategy';
import { Direction, NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../common/search_strategy';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import { isActiveTimeline } from '../../../../helpers';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { sourcererSelectors } from '../../../../sourcerer/store';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../../common/entity_analytics/entity_store/constants';
import { useUiSetting } from '../../../../common/lib/kibana';
import { useEntityFromStore } from '../../shared/hooks/use_entity_from_store';

export type ObservedUserResult = Omit<ObservedEntityData<UserItem>, 'anomalies'> & {
  entityRecord?: EntityStoreRecord | null;
  /** Refetch from entity store (when entity store v2 is enabled). */
  refetchEntityStore?: () => void;
};

export const useObservedUser = (
  entityIdentifiers: Record<string, string>,
  scopeId: string
): ObservedUserResult => {
  const timelineTime = useDeepEqualSelector((state) =>
    inputsSelectors.timelineTimeRangeSelector(state)
  );
  const globalTime = useGlobalTime();
  const isActiveTimelines = isActiveTimeline(scopeId);
  const { to, from } = isActiveTimelines ? timelineTime : globalTime;
  const { isInitializing, setQuery, deleteQuery } = globalTime;
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const oldSecurityDefaultPatterns =
    useSelector(sourcererSelectors.defaultDataView)?.patternList ?? [];
  const { indexPatterns: experimentalSecurityDefaultIndexPatterns } = useSecurityDefaultPatterns();
  const securityDefaultPatterns = newDataViewPickerEnabled
    ? experimentalSecurityDefaultIndexPatterns
    : oldSecurityDefaultPatterns;

  const entityFromStore = useEntityFromStore({
    entityIdentifiers,
    entityType: 'user',
    skip: !entityStoreV2Enabled || isInitializing,
  });

  const userName = useMemo(
    () => entityIdentifiers['user.name'] || Object.values(entityIdentifiers)[0] || '',
    [entityIdentifiers]
  );

  const [loadingObservedUser, { userDetails: observedUserDetails, inspect, refetch, id: queryId }] =
    useObservedUserDetails({
      endDate: to,
      startDate: from,
      entityIdentifiers,
      indexNames: securityDefaultPatterns,
      skip: isInitializing || entityStoreV2Enabled,
    });

  useQueryInspector({
    deleteQuery,
    inspect: entityStoreV2Enabled ? entityFromStore.inspect : inspect,
    refetch: entityStoreV2Enabled ? entityFromStore.refetch : refetch,
    setQuery,
    queryId,
    loading: entityStoreV2Enabled ? entityFromStore.isLoading : loadingObservedUser,
  });

  const [loadingFirstSeen, { firstSeen }] = useFirstLastSeen({
    field: 'user.name',
    value: userName,
    defaultIndex: securityDefaultPatterns,
    order: Direction.asc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: entityStoreV2Enabled,
  });

  const [loadingLastSeen, { lastSeen }] = useFirstLastSeen({
    field: 'user.name',
    value: userName,
    defaultIndex: securityDefaultPatterns,
    order: Direction.desc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: entityStoreV2Enabled,
  });

  return useMemo((): ObservedUserResult => {
    if (entityStoreV2Enabled) {
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
      };
    }
    return {
      details: observedUserDetails,
      isLoading: loadingObservedUser || loadingLastSeen || loadingFirstSeen,
      firstSeen: {
        date: firstSeen,
        isLoading: loadingFirstSeen,
      },
      lastSeen: { date: lastSeen, isLoading: loadingLastSeen },
    };
  }, [
    entityStoreV2Enabled,
    entityFromStore.entity,
    entityFromStore.entityRecord,
    entityFromStore.firstSeen,
    entityFromStore.isLoading,
    entityFromStore.lastSeen,
    firstSeen,
    lastSeen,
    loadingFirstSeen,
    loadingLastSeen,
    loadingObservedUser,
    observedUserDetails,
  ]);
};
