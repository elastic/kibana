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
  id?: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useObservedUserDetails = ({
  endDate,
  userName,
  entityId,
  indexNames,
  id = OBSERVED_USER_QUERY_ID,
  skip = false,
  startDate,
}: UseUserDetails): [boolean, UserDetailsArgs] => {
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);
  const euidApi = useEntityStoreEuidApi();

  const shouldSkip =
    skip ||
    (!entityStoreV2Enabled && isEmpty(userName)) ||
    (entityStoreV2Enabled && (!euidApi?.euid || (isEmpty(entityId) && isEmpty(userName))));

  const euidFilter = useMemo(() => {
    if (shouldSkip) {
      return undefined;
    }

    if (!entityStoreV2Enabled) {
      // For legacy entity store, query by user.name
      return { term: { 'user.name': userName } };
    } else {
      // For entity store v2, query by entity_id (runtime field)
      if (entityId) {
        return { term: { entity_id: entityId } };
      } else if (userName) {
        // If entityId is not available, fall back to user.name for querying
        return { term: { 'user.name': userName } };
      }
    }
  }, [entityStoreV2Enabled, shouldSkip, userName, entityId]);

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
