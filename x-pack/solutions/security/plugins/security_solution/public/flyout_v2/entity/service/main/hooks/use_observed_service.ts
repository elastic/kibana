/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import deepmerge from 'deepmerge';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import type { inputsModel } from '../../../../../common/store';
import { inputsSelectors } from '../../../../../common/store';
import { useQueryInspector } from '../../../../../common/components/page/manage_query';
import type { ObservedEntityData } from '../../../shared/components/observed_entity/types';
import type { ServiceItem } from '../../../../../../common/search_strategy';
import { Direction, NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../../common/search_strategy';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { getScopeFlyoutTimeRange } from '../../../../../entity_analytics/common/scope_time_ranges';
import { useFirstLastSeen } from '../../../../../common/containers/use_first_last_seen';
import { isActiveTimeline } from '../../../../../helpers';
import { useSecurityDefaultPatterns } from '../../../../../data_view_manager/hooks/use_security_default_patterns';
import type { InspectResponse } from '../../../../../types';
import type {
  EntityFromStoreResult,
  EntityStoreRecord,
} from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import {
  combineEntityGroupFilters,
  getEntityGroupLifecycle,
  getEntityGroupRecords,
  isEntityGroupView,
  mergeEntityGroupDetails,
} from '../../../../../flyout/entity_details/shared/entity_store_group_utils';
import { useObservedServiceDetails } from './observed_service_details';
import { SERVICE_PANEL_OBSERVED_SERVICE_QUERY_ID } from '../constants';

export type ObservedServiceResult = Omit<ObservedEntityData<ServiceItem>, 'anomalies'> & {
  /** Entity store record backing the observed data, when the service is in the store. */
  entityRecord?: EntityStoreRecord | null;
  /** Refetch from the entity store (when an entity store result was provided). */
  refetchEntityStore?: () => void;
  /** Inspect/refetch for the observed-service search strategy (security default indices). */
  observedDetailsInspect?: InspectResponse;
  refetchObservedDetails?: inputsModel.Refetch;
};

export const useObservedService = (
  serviceName: string,
  scopeId: string,
  entityFromStore?: EntityFromStoreResult<ServiceItem> | null
): ObservedServiceResult => {
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
  const euidApi = useEntityStoreEuidApi();

  // `isInitialLoading` rather than `isLoading`: a disabled react-query v4 query reports
  // `isLoading: true` forever, which would otherwise skip the observed query permanently.
  const entityStoreInitialLoading = Boolean(entityFromStore?.isInitialLoading);
  const hasEntityStoreRecord = Boolean(entityFromStore?.entityRecord ?? entityFromStore?.entity);
  // While the store record is resolving, keep the store branch so the broad `service.name` query
  // does not flash before the scoped one.
  const useEntityStoreObservedData =
    Boolean(entityFromStore) && (entityStoreInitialLoading || hasEntityStoreRecord);

  // Resolution-group aliases (empty outside the group view): the observed query covers them too.
  const aliasRecords = entityFromStore?.aliasRecords;

  // Scope the observed query by the record identity (OR-ed across aliases in the group view).
  // Without a store record the query falls back to `service.name`.
  const entityRecord = hasEntityStoreRecord ? entityFromStore?.entityRecord : undefined;
  const filterQuery = useMemo(() => {
    if (!entityRecord) {
      return undefined;
    }
    const recordFilter = combineEntityGroupFilters(
      getEntityGroupRecords(entityRecord, aliasRecords),
      (record) =>
        euidApi?.euid?.dsl?.getEuidFilterBasedOnEntityRecord(
          euidApi.getBuiltInEntityDefinition('service'),
          record
        )
    );
    return recordFilter ? JSON.stringify(recordFilter) : undefined;
  }, [entityRecord, aliasRecords, euidApi]);

  const [
    isLoading,
    { serviceDetails, inspect: inspectObservedService, refetch: refetchServiceDetails },
  ] = useObservedServiceDetails({
    endDate: to,
    startDate: from,
    serviceName,
    filterQuery,
    indexNames: indexPatterns,
    id: SERVICE_PANEL_OBSERVED_SERVICE_QUERY_ID,
    // Wait for the store record so the broad `service.name` query does not flash first.
    skip: isInitializing || (entityStoreInitialLoading && !entityRecord),
  });

  useQueryInspector({
    deleteQuery,
    inspect: inspectObservedService,
    loading: isLoading,
    refetch: refetchServiceDetails,
    setQuery,
    queryId: SERVICE_PANEL_OBSERVED_SERVICE_QUERY_ID,
  });

  const [loadingFirstSeen, { firstSeen }] = useFirstLastSeen({
    field: 'service.name',
    value: serviceName,
    defaultIndex: indexPatterns,
    order: Direction.asc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: useEntityStoreObservedData,
  });

  const [loadingLastSeen, { lastSeen }] = useFirstLastSeen({
    field: 'service.name',
    value: serviceName,
    defaultIndex: indexPatterns,
    order: Direction.desc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: useEntityStoreObservedData,
  });

  return useMemo((): ObservedServiceResult => {
    if (useEntityStoreObservedData && entityFromStore) {
      // merge with entity store record; deduplicate arrays because both sources
      // derive from the same events
      const targetDetails = deepmerge(serviceDetails, entityFromStore.entityRecord ?? {}, {
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
        observedDetailsInspect: inspectObservedService,
        refetchObservedDetails: refetchServiceDetails,
      };
    }
    return {
      details: serviceDetails,
      isLoading: isLoading || loadingLastSeen || loadingFirstSeen,
      firstSeen: {
        date: firstSeen,
        isLoading: loadingFirstSeen,
      },
      lastSeen: { date: lastSeen, isLoading: loadingLastSeen },
      observedDetailsInspect: inspectObservedService,
      refetchObservedDetails: refetchServiceDetails,
    };
  }, [
    useEntityStoreObservedData,
    entityFromStore,
    serviceDetails,
    isLoading,
    loadingLastSeen,
    loadingFirstSeen,
    firstSeen,
    lastSeen,
    inspectObservedService,
    refetchServiceDetails,
    aliasRecords,
  ]);
};
