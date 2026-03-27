/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/public';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors, type inputsModel } from '../../../../common/store';
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
import { useUiSetting } from '../../../../common/lib/kibana';
import type { InspectResponse } from '../../../../types';
import { useEntityFromStore } from '../../shared/hooks/use_entity_from_store';

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
  entityId?: string
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

  const identityFieldsForStoreLookup = useMemo(
    () => (!entityId && userName ? { 'user.name': userName } : undefined),
    [entityId, userName]
  );

  const entityFromStore = useEntityFromStore({
    entityId,
    identityFields: identityFieldsForStoreLookup,
    entityType: 'user',
    skip: !entityStoreV2Enabled || isInitializing,
  });

  const useEntityStoreData =
    entityStoreV2Enabled && (entityFromStore.entityRecord ?? entityFromStore.entity);

  const [loadingObservedUser, { userDetails: observedUserDetails, inspect, refetch, id: queryId }] =
    useObservedUserDetails({
      endDate: to,
      startDate: from,
      userName,
      indexNames: securityDefaultPatterns,
      skip: isInitializing,
    });

  useQueryInspector({
    deleteQuery,
    inspect: useEntityStoreData ? entityFromStore.inspect : inspect,
    refetch: useEntityStoreData ? entityFromStore.refetch : refetch,
    setQuery,
    queryId,
    loading: useEntityStoreData ? entityFromStore.isLoading : loadingObservedUser,
  });

  const [loading, { firstSeen, lastSeen }] = useFirstLastSeen({
    field: 'user.name',
    value: userName,
    defaultIndex: securityDefaultPatterns,
    order: Direction.asc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: !!useEntityStoreData,
  });

  return useMemo((): ObservedUserResult => {
    if (useEntityStoreData) {
      const entityDetails = (entityFromStore.entity ?? {}) as UserItem;
      const fromAggregation = observedUserDetails ?? {};
      const mergedDetails: UserItem = {
        ...entityDetails,
        user: {
          ...entityDetails.user,
          id: entityDetails.user?.id ?? fromAggregation.user?.id,
          domain: entityDetails.user?.domain ?? fromAggregation.user?.domain,
          email: entityDetails.user?.email ?? fromAggregation.user?.email,
          full_name: entityDetails.user?.full_name ?? fromAggregation.user?.full_name,
          name: entityDetails.user?.name ?? fromAggregation.user?.name,
          hash: entityDetails.user?.hash ?? fromAggregation.user?.hash,
        },
        host: entityDetails.host ?? fromAggregation.host,
      };
      return {
        details: mergedDetails,
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
        observedDetailsInspect: inspect,
        refetchObservedDetails: refetch,
      };
    }
    return {
      details: observedUserDetails,
      isLoading: loadingObservedUser || loading,
      firstSeen: {
        date: firstSeen,
        isLoading: loading,
      },
      lastSeen: { date: lastSeen, isLoading: loading },
      entityRecord: null,
      refetchEntityStore: entityStoreV2Enabled ? entityFromStore.refetch : undefined,
      observedDetailsInspect: inspect,
      refetchObservedDetails: refetch,
    };
  }, [
    useEntityStoreData,
    observedUserDetails,
    loadingObservedUser,
    loading,
    firstSeen,
    lastSeen,
    entityStoreV2Enabled,
    entityFromStore.refetch,
    entityFromStore.entity,
    entityFromStore.isLoading,
    entityFromStore.firstSeen,
    entityFromStore.lastSeen,
    entityFromStore.entityRecord,
    inspect,
    refetch,
  ]);
};
