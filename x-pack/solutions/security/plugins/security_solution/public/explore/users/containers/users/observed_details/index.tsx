/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import type { inputsModel } from '../../../../../common/store';
import * as i18n from './translations';
import type { InspectResponse } from '../../../../../types';
import { UsersQueries } from '../../../../../../common/search_strategy/security_solution/users';
import type { UserItem } from '../../../../../../common/search_strategy/security_solution/users/common';
import { NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../../common/search_strategy/security_solution/users/common';
import { useSearchStrategy } from '../../../../../common/containers/use_search_strategy';

export const OBSERVED_USER_QUERY_ID = 'observedUsersDetailsQuery';

export interface UserDetailsArgs {
  id: string;
  inspect: InspectResponse;
  userDetails: UserItem;
  refetch: inputsModel.Refetch;
  startDate: string;
  endDate: string;
}

export type EntityIdentifiers = Record<string, string>;

interface UseUserDetails {
  endDate: string;
  /** When provided (and non-empty), used for the query; otherwise entityIdentifiers are derived from userName. */
  entityIdentifiers?: EntityIdentifiers;
  id?: string;
  indexNames: string[];
  isExploreContext?: boolean;
  skip?: boolean;
  startDate: string;
  /** Required when entityIdentifiers is not provided. Used to build entityIdentifiers as { 'user.name': userName }. */
  userName?: string;
}

export const useObservedUserDetails = ({
  endDate,
  entityIdentifiers: entityIdentifiersProp,
  indexNames,
  id = OBSERVED_USER_QUERY_ID,
  isExploreContext = false,
  skip = false,
  startDate,
  userName,
}: UseUserDetails): [boolean, UserDetailsArgs] => {
  // Stabilize entityIdentifiers by content so that when the parent passes a new object reference
  // with the same key-value pairs (e.g. from getUserEntityIdentifiers), we don't create a new
  // userDetailsRequest every render and trigger the search effect in a loop (max update depth).
  const entityIdentifiersStableKey = useMemo(
    () =>
      entityIdentifiersProp != null && Object.keys(entityIdentifiersProp).length > 0
        ? JSON.stringify(
            Object.fromEntries(
              Object.entries(entityIdentifiersProp).sort(([a], [b]) => a.localeCompare(b))
            )
          )
        : userName != null && userName !== ''
        ? `userName:${userName}`
        : '',
    [entityIdentifiersProp, userName]
  );

  const entityIdentifiersRef = useRef<{ key: string; value: EntityIdentifiers }>({
    key: '',
    value: {},
  });
  const entityIdentifiers = useMemo((): EntityIdentifiers => {
    let value: EntityIdentifiers;
    if (entityIdentifiersProp != null && Object.keys(entityIdentifiersProp).length > 0) {
      value = entityIdentifiersProp;
    } else if (userName != null && userName !== '') {
      value = { 'user.name': userName };
    } else {
      value = {};
    }
    if (entityIdentifiersRef.current.key !== entityIdentifiersStableKey) {
      entityIdentifiersRef.current = { key: entityIdentifiersStableKey, value };
    }
    return entityIdentifiersRef.current.value;
  }, [entityIdentifiersStableKey, entityIdentifiersProp, userName]);

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
    abort: skip,
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

  const userDetailsRequest = useMemo(
    () => ({
      defaultIndex: indexNames,
      factoryQueryType: UsersQueries.observedDetails,
      entityIdentifiers,
      isExploreContext,
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
      filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
    }),
    [endDate, indexNames, startDate, entityIdentifiers, isExploreContext]
  );

  useEffect(() => {
    if (!skip) {
      search(userDetailsRequest);
    }
  }, [userDetailsRequest, search, skip]);

  return [loading, userDetailsResponse];
};
