/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import deepmerge from 'deepmerge';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import type { inputsModel } from '../../../../../common/store';
import { inputsSelectors } from '../../../../../common/store';
import { useHostDetails } from '../../../../../explore/hosts/containers/hosts/details';
import { useFirstLastSeen } from '../../../../../common/containers/use_first_last_seen';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { getScopeFlyoutTimeRange } from '../../../../../entity_analytics/common/scope_time_ranges';
import type { HostItem } from '../../../../../../common/search_strategy';
import { Direction, NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../../common/search_strategy';
import { HOST_PANEL_OBSERVED_HOST_QUERY_ID, HOST_PANEL_RISK_SCORE_QUERY_ID } from '../constants';
import { useQueryInspector } from '../../../../../common/components/page/manage_query';
import type { InspectResponse } from '../../../../../types';
import type {
  EntityFromStoreResult,
  EntityStoreRecord,
} from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import {
  getEntityGroupLifecycle,
  getEntityGroupRecords,
  isEntityGroupView,
  mergeEntityGroupDetails,
} from '../../../../../flyout/entity_details/shared/entity_store_group_utils';
import type { ObservedEntityData } from '../../../shared/components/observed_entity/types';
import { isActiveTimeline } from '../../../../../helpers';
import { useSecurityDefaultPatterns } from '../../../../../data_view_manager/hooks/use_security_default_patterns';

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
  const flyoutTimeRange = getScopeFlyoutTimeRange(scopeId);
  const isActiveTimelines = isActiveTimeline(scopeId);
  // A scope that pins a time range wins over timeline / global time.
  const { to, from } = flyoutTimeRange ?? (isActiveTimelines ? timelineTime : globalTime);
  const { isInitializing, setQuery, deleteQuery } = globalTime;

  const { indexPatterns } = useSecurityDefaultPatterns();

  // Use `isInitialLoading` (react-query v4 `isLoading && isFetching`), not raw `isLoading`: an idle or
  // disabled store query reports `isLoading: true` forever in v4, which would otherwise skip the
  // observed query and hang the panel spinner permanently.
  const entityStoreInitialLoading = Boolean(entityFromStore?.isInitialLoading);
  const hasEntityStoreRecord = Boolean(entityFromStore?.entityRecord ?? entityFromStore?.entity);
  // While the entity-store record is actively resolving, keep the entity-store branch (base) so the
  // observed query is skipped and does not flash the broad `host.name` fallback before the scoped query.
  const useEntityStoreObservedData =
    Boolean(entityFromStore) && (entityStoreInitialLoading || hasEntityStoreRecord);

  // Resolution-group aliases (empty outside the group view): the observed query covers them too.
  const aliasRecords = entityFromStore?.aliasRecords;

  const [isLoading, { hostDetails, inspect: inspectObservedHost, refetch: refetchHostDetails }] =
    useHostDetails({
      endDate: to,
      hostName,
      entityId: hasEntityStoreRecord ? entityFromStore?.entityRecord?.entity?.id : undefined,
      entityRecord: hasEntityStoreRecord ? entityFromStore?.entityRecord : undefined,
      aliasRecords: hasEntityStoreRecord ? aliasRecords : undefined,
      entityStoreInitialLoading,
      indexNames: indexPatterns,
      id: HOST_PANEL_RISK_SCORE_QUERY_ID,
      skip: isInitializing,
      startDate: from,
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
    defaultIndex: indexPatterns,
    order: Direction.asc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: useEntityStoreObservedData,
  });

  const [loadingLastSeen, { lastSeen }] = useFirstLastSeen({
    field: 'host.name',
    value: hostName,
    defaultIndex: indexPatterns,
    order: Direction.desc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: useEntityStoreObservedData,
  });

  return useMemo((): ObservedHostResult => {
    if (useEntityStoreObservedData && entityFromStore) {
      // merge with entity store record; deduplicate arrays because both sources
      // derive from the same events and would otherwise duplicate scalar fields
      // like host.ip and host.mac.
      const targetDetails = deepmerge(hostDetails, entityFromStore.entityRecord ?? {}, {
        arrayMerge: (target, source) => [...new Set([...target, ...source])],
      });
      const isGroupView = isEntityGroupView(aliasRecords);
      // Group view: the activity window spans every member of the group.
      const groupLifecycle = isGroupView
        ? getEntityGroupLifecycle(getEntityGroupRecords(entityFromStore.entityRecord, aliasRecords))
        : null;
      return {
        // Group view: alias attributes are unioned in; scalars that disagree become arrays.
        details: isGroupView ? mergeEntityGroupDetails(targetDetails, aliasRecords) : targetDetails,
        isLoading: isLoading || entityFromStore.isLoading,
        firstSeen: {
          date:
            (groupLifecycle ? groupLifecycle.firstSeen : entityFromStore.firstSeen) ?? undefined,
          isLoading: entityFromStore.isLoading,
        },
        lastSeen: {
          date: (groupLifecycle ? groupLifecycle.lastSeen : entityFromStore.lastSeen) ?? undefined,
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
    aliasRecords,
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
