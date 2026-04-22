/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import deepmerge from 'deepmerge';
import { useSelector } from 'react-redux';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors, sourcererSelectors } from '../../../../common/store';
import { useHostDetails } from '../../../../explore/hosts/containers/hosts/details';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import type { HostItem } from '../../../../../common/search_strategy';
import { Direction, NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../common/search_strategy';
import { HOST_PANEL_OBSERVED_HOST_QUERY_ID, HOST_PANEL_RISK_SCORE_QUERY_ID } from '../constants';
import type { inputsModel } from '../../../../common/store';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import type { InspectResponse } from '../../../../types';
import type {
  EntityStoreRecord,
  EntityFromStoreResult,
} from '../../shared/hooks/use_entity_from_store';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import { isActiveTimeline } from '../../../../helpers';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

export type ObservedHostResult = Omit<ObservedEntityData<HostItem>, 'anomalies'> & {
  entityRecord?: EntityStoreRecord | null;
  /** Refetch from entity store (when entity store v2 is enabled). */
  refetchEntityStore?: () => void;
  /** Inspect/refetch for the observed-host search strategy (security default indices). */
  observedDetailsInspect?: InspectResponse;
  refetchObservedDetails?: inputsModel.Refetch;
};

export const useObservedHost = (
  hostName: string,
  scopeId: string,
  entityFromStore?: EntityFromStoreResult<HostItem> | null
): ObservedHostResult => {
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

  const [isLoading, { hostDetails, inspect: inspectObservedHost, refetch: refetchHostDetails }] =
    useHostDetails({
      endDate: to,
      startDate: from,
      hostName,
      entityId: useEntityStoreObservedData ? entityFromStore?.entityRecord?.entity?.id : undefined,
      indexNames: securityDefaultPatterns,
      id: HOST_PANEL_RISK_SCORE_QUERY_ID,
      skip: isInitializing,
    });

  useQueryInspector({
    deleteQuery,
    inspect: inspectObservedHost,
    loading: isLoading,
    queryId: HOST_PANEL_OBSERVED_HOST_QUERY_ID,
    refetch: refetchHostDetails,
    setQuery,
  });

  const [loadingFirstSeen, { firstSeen }] = useFirstLastSeen({
    field: 'host.name',
    value: hostName,
    defaultIndex: securityDefaultPatterns,
    order: Direction.asc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: useEntityStoreObservedData,
  });

  const [loadingLastSeen, { lastSeen }] = useFirstLastSeen({
    field: 'host.name',
    value: hostName,
    defaultIndex: securityDefaultPatterns,
    order: Direction.desc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: useEntityStoreObservedData,
  });

  return useMemo((): ObservedHostResult => {
    if (useEntityStoreObservedData && entityFromStore) {
      return {
        // merge with entity store record
        details: deepmerge(hostDetails, entityFromStore.entityRecord ?? {}),
        isLoading: isLoading || entityFromStore.isLoading,
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
        observedDetailsInspect: inspectObservedHost,
        refetchObservedDetails: refetchHostDetails,
      };
    }
    return {
      details: hostDetails,
      isLoading: isLoading || loadingLastSeen || loadingFirstSeen,
      firstSeen: {
        date: firstSeen,
        isLoading: loadingFirstSeen,
      },
      lastSeen: { date: lastSeen, isLoading: loadingLastSeen },
      observedDetailsInspect: inspectObservedHost,
      refetchObservedDetails: refetchHostDetails,
    };
  }, [
    useEntityStoreObservedData,
    entityFromStore,
    hostDetails,
    isLoading,
    loadingLastSeen,
    loadingFirstSeen,
    firstSeen,
    lastSeen,
    inspectObservedHost,
    refetchHostDetails,
  ]);
};
