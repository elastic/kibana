/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { EntityStoreRecord } from '../../shared/hooks/use_entity_from_store';
import {
  combineEntityGroupFilters,
  getEntityGroupLifecycle,
  getEntityGroupRecords,
  isEntityGroupView,
} from '../../shared/entity_store_group_utils';
import { inputsSelectors } from '../../../../common/store';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import type { ObservedEntityData } from '../../../../flyout_v2/entity/shared/components/observed_entity/types';
import type { ServiceItem } from '../../../../../common/search_strategy';
import { Direction, NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../common/search_strategy';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import { isActiveTimeline } from '../../../../helpers';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { useObservedServiceDetails } from './observed_service_details';

const getServiceNameFromEntityIdentifiers = (identityFields: Record<string, string>): string =>
  identityFields['service.name'] || Object.values(identityFields)[0] || '';

export interface ObservedServiceGroup {
  /** Entity Store record of the open service. */
  entityRecord: EntityStoreRecord | null | undefined;
  /** Resolution-group aliases of `entityRecord` (empty outside the group view). */
  aliasRecords: readonly EntityStoreRecord[] | undefined;
}

export const useObservedService = (
  identityFields: Record<string, string>,
  scopeId: string,
  /**
   * When the aliases are non-empty (resolution-group view) the observed query covers every service
   * of the group and first/last seen span the group's Entity Store lifecycle.
   */
  group?: ObservedServiceGroup
): Omit<ObservedEntityData<ServiceItem>, 'anomalies'> => {
  const timelineTime = useDeepEqualSelector((state) =>
    inputsSelectors.timelineTimeRangeSelector(state)
  );
  const globalTime = useGlobalTime();
  const isActiveTimelines = isActiveTimeline(scopeId);
  const { to, from } = isActiveTimelines ? timelineTime : globalTime;
  const { isInitializing, setQuery, deleteQuery } = globalTime;
  const serviceName = getServiceNameFromEntityIdentifiers(identityFields);
  const euidApi = useEntityStoreEuidApi();

  const { indexPatterns } = useSecurityDefaultPatterns();

  const isGroupView = isEntityGroupView(group?.aliasRecords);
  const groupRecords = useMemo(
    () => (isGroupView ? getEntityGroupRecords(group?.entityRecord, group?.aliasRecords) : []),
    [isGroupView, group?.entityRecord, group?.aliasRecords]
  );
  const groupFilterQuery = useMemo(
    () =>
      isGroupView
        ? combineEntityGroupFilters(groupRecords, (record) =>
            euidApi?.euid?.dsl.getEuidFilterBasedOnEntityRecord('service', record)
          )
        : undefined,
    [isGroupView, groupRecords, euidApi?.euid]
  );
  const groupLifecycle = useMemo(
    () => (isGroupView ? getEntityGroupLifecycle(groupRecords) : null),
    [isGroupView, groupRecords]
  );

  const [
    loadingObservedService,
    { serviceDetails: observedServiceDetails, inspect, refetch, id: queryId },
  ] = useObservedServiceDetails({
    endDate: to,
    startDate: from,
    serviceName,
    filterQuery: groupFilterQuery,
    indexNames: indexPatterns,
    skip: isInitializing,
  });

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId,
    loading: loadingObservedService,
  });

  // The first/last-seen search is scoped to one `service.name`; the group view reads the group's
  // Entity Store lifecycle instead.
  const [loadingFirstSeen, { firstSeen }] = useFirstLastSeen({
    field: 'service.name',
    value: serviceName,
    defaultIndex: indexPatterns,
    order: Direction.asc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: isGroupView,
  });

  const [loadingLastSeen, { lastSeen }] = useFirstLastSeen({
    field: 'service.name',
    value: serviceName,
    defaultIndex: indexPatterns,
    order: Direction.desc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    skip: isGroupView,
  });

  return useMemo(() => {
    if (groupLifecycle) {
      return {
        details: observedServiceDetails,
        isLoading: loadingObservedService,
        firstSeen: { date: groupLifecycle.firstSeen ?? undefined, isLoading: false },
        lastSeen: { date: groupLifecycle.lastSeen ?? undefined, isLoading: false },
      };
    }
    return {
      details: observedServiceDetails,
      isLoading: loadingObservedService || loadingLastSeen || loadingFirstSeen,
      firstSeen: {
        date: firstSeen,
        isLoading: loadingFirstSeen,
      },
      lastSeen: { date: lastSeen, isLoading: loadingLastSeen },
    };
  }, [
    groupLifecycle,
    firstSeen,
    lastSeen,
    loadingFirstSeen,
    loadingLastSeen,
    loadingObservedService,
    observedServiceDetails,
  ]);
};
