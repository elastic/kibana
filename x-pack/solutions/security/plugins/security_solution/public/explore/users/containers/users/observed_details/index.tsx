/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { isEmpty } from 'lodash';
import type { inputsModel } from '../../../../../common/store';
import * as i18n from './translations';
import type { InspectResponse } from '../../../../../types';
import { UsersQueries } from '../../../../../../common/search_strategy/security_solution/users';
import type { UserItem } from '../../../../../../common/search_strategy/security_solution/users/common';
import { NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../../common/search_strategy/security_solution/users/common';
import { useSearchStrategy } from '../../../../../common/containers/use_search_strategy';
import { useUiSetting } from '../../../../../common/lib/kibana';
import type { EntityStoreRecord } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';

export const OBSERVED_USER_QUERY_ID = 'observedUsersDetailsQuery';

export interface UserDetailsArgs {
  id: string;
  inspect: InspectResponse;
  userDetails: UserItem;
  refetch: inputsModel.Refetch;
  startDate: string;
  endDate: string;
}

interface UseUserDetails {
  endDate: string;
  userName: string;
  entityId?: string;
  /**
   * Resolved entity-store record. When entity store v2 is enabled it is used to build an
   * indexed-field identity filter (via the EUID API) instead of a runtime-field `entity_id` term.
   */
  entityRecord?: EntityStoreRecord | null;
  /**
   * When entity store v2 is enabled, indicates the entity-store record is *actively* being fetched
   * (react-query `isInitialLoading`, not raw `isLoading`). While `true` and no record is available
   * yet, the observed query is skipped so the entity-store record stays the base and the complementary
   * query runs once, correctly scoped (no broad `user.name` fallback flash first). A resolved
   * `entityRecord` always runs the scoped query regardless of this flag.
   */
  entityStoreInitialLoading?: boolean;
  id?: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useObservedUserDetails = ({
  endDate,
  userName,
  entityId,
  entityRecord,
  entityStoreInitialLoading = false,
  indexNames,
  id = OBSERVED_USER_QUERY_ID,
  skip = false,
  startDate,
}: UseUserDetails): [boolean, UserDetailsArgs] => {
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2);
  const euidApi = useEntityStoreEuidApi();

  // Only wait while the store is actively fetching AND we do not yet have a record to scope by.
  // Once a record is available we always run the scoped query (never blocked by a stale loading flag).
  const waitingForEntityStoreRecord = entityStoreInitialLoading && !entityRecord;

  const shouldSkip =
    skip ||
    (!entityStoreV2Enabled && isEmpty(userName)) ||
    (entityStoreV2Enabled &&
      (!euidApi?.euid || waitingForEntityStoreRecord || (isEmpty(entityId) && isEmpty(userName))));

  const euidFilter = useMemo(() => {
    if (shouldSkip) {
      return undefined;
    }

    if (!entityStoreV2Enabled) {
      // For legacy entity store, query by user.name
      return { term: { 'user.name': userName } };
    }

    // For entity store v2, resolve the entity via an indexed-field identity filter built from the
    // entity-store record. This replaces the previous `entity_id` runtime field, which forced
    // Elasticsearch to run the EUID Painless script on every document in the time range.
    const recordFilter = euidApi?.euid?.dsl?.getEuidFilterBasedOnEntityRecord('user', entityRecord);
    if (recordFilter) {
      return recordFilter;
    }
    // Fall back to user.name when the record cannot yield an EUID identity filter.
    if (userName) {
      return { term: { 'user.name': userName } };
    }
  }, [entityStoreV2Enabled, shouldSkip, userName, entityRecord, euidApi?.euid]);

  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<UsersQueries.observedDetails>({
    factoryQueryType: UsersQueries.observedDetails,
    initialResult: {
      userDetails: {},
    },
    errorMessage: i18n.FAIL_USER_DETAILS,
    abort: shouldSkip,
  });

  const userDetailsResponse = useMemo(
    () => ({
      endDate,
      userDetails: response.userDetails,
      id,
      inspect,
      refetch,
      startDate,
    }),
    [endDate, id, inspect, refetch, response.userDetails, startDate]
  );

  const userDetailsRequest = useMemo(() => {
    if (!euidFilter) {
      return null;
    }
    return {
      defaultIndex: indexNames,
      factoryQueryType: UsersQueries.observedDetails,
      userName,
      filterQuery: JSON.stringify(
        euidFilter
          ? { bool: { must: [euidFilter, NOT_EVENT_KIND_ASSET_FILTER] } }
          : NOT_EVENT_KIND_ASSET_FILTER
      ),
      entityStoreV2: entityStoreV2Enabled || false,
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
    };
  }, [endDate, entityStoreV2Enabled, euidFilter, indexNames, startDate, userName]);

  useEffect(() => {
    if (!shouldSkip && userDetailsRequest != null) {
      search(userDetailsRequest);
    }
  }, [userDetailsRequest, search, shouldSkip]);

  return [loading, userDetailsResponse];
};
