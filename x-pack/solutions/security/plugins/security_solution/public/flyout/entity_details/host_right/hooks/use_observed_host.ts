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
import { HOST_PANEL_OBSERVED_HOST_QUERY_ID } from '..';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import { isActiveTimeline } from '../../../../helpers';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { EngineDescriptor } from '../../../../../common/api/entity_analytics';
import { useEntityStoreStatus } from '../../../../entity_analytics/components/entity_store/hooks/use_entity_store';
import { useEntityFromStore } from '../../shared/hooks/use_entity_from_store';

export const useObservedHost = (
  entityIdentifiers: Record<string, string>,
  scopeId: string
): Omit<ObservedEntityData<HostItem>, 'anomalies'> => {
  const timelineTime = useDeepEqualSelector((state) =>
    inputsSelectors.timelineTimeRangeSelector(state)
  );
  const globalTime = useGlobalTime();
  const isActiveTimelines = isActiveTimeline(scopeId);
  const { to, from } = isActiveTimelines ? timelineTime : globalTime;
  const { isInitializing, setQuery, deleteQuery } = globalTime;

  const { data: entityStoreStatus } = useEntityStoreStatus();
  const isEntityStoreRunning = entityStoreStatus?.status === 'running';
  const hasHostEngine =
    isEntityStoreRunning &&
    entityStoreStatus?.engines?.some(
      (e: EngineDescriptor) => e.type === 'host' && e.status === 'started'
    );

  const entityFromStore = useEntityFromStore({
    entityIdentifiers,
    entityType: 'host',
    skip: isInitializing || !hasHostEngine,
  });

  const useRawIndicesFallback =
    !hasHostEngine || (entityFromStore.entity === null && !entityFromStore.isLoading);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const oldSecurityDefaultPatterns =
    useSelector(sourcererSelectors.defaultDataView)?.patternList ?? [];
  const { indexPatterns: experimentalSecurityDefaultIndexPatterns } = useSecurityDefaultPatterns();
  const securityDefaultPatterns = newDataViewPickerEnabled
    ? experimentalSecurityDefaultIndexPatterns
    : oldSecurityDefaultPatterns;

  const [isLoading, { hostDetails, inspect: inspectObservedHost }, refetch] = useHostDetails({
    endDate: to,
    entityIdentifiers,
    id: HOST_PANEL_OBSERVED_HOST_QUERY_ID,
    indexNames: securityDefaultPatterns,
    skip: isInitializing || !useRawIndicesFallback,
    startDate: from,
  });

  const effectiveInspect = entityFromStore.entity
    ? entityFromStore.inspect
    : inspectObservedHost;
  const effectiveRefetch = entityFromStore.entity ? entityFromStore.refetch : refetch;

  useQueryInspector({
    deleteQuery,
    inspect: effectiveInspect,
    loading: entityFromStore.entity ? entityFromStore.isLoading : isLoading,
    queryId: HOST_PANEL_OBSERVED_HOST_QUERY_ID,
    refetch: effectiveRefetch,
    setQuery,
  });

  const [loadingFirstSeen, { firstSeen: firstSeenFromRaw }] = useFirstLastSeen({
    entityIdentifiers,
    entityType: 'host',
    defaultIndex: securityDefaultPatterns,
    order: Direction.asc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: isInitializing || !useRawIndicesFallback,
  });

  const [loadingLastSeen, { lastSeen: lastSeenFromRaw }] = useFirstLastSeen({
    entityIdentifiers,
    entityType: 'host',
    defaultIndex: securityDefaultPatterns,
    order: Direction.desc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: isInitializing || !useRawIndicesFallback,
  });

  const details =
    entityFromStore.entity ?? hostDetails;
  const firstSeen = entityFromStore.entity
    ? entityFromStore.firstSeen
    : firstSeenFromRaw;
  const lastSeen = entityFromStore.entity
    ? entityFromStore.lastSeen
    : lastSeenFromRaw;
  const isLoadingDetails = entityFromStore.entity
    ? entityFromStore.isLoading
    : isLoading;
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
    [
      details,
      firstSeen,
      isLoadingDetails,
      lastSeen,
      isLoadingFirstSeen,
      isLoadingLastSeen,
    ]
  );
};
