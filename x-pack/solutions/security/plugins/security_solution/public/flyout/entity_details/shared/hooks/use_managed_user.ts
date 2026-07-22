/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ManagedUserHits } from '../../../../../common/search_strategy/security_solution/users/managed_details';
import { UsersQueries } from '../../../../../common/api/search_strategy';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';
import { buildExecutionContext } from '../../../../entity_analytics/common';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { MANAGED_USER_QUERY_ID } from '../constants';

const MANAGED_USER_CONTEXT = buildExecutionContext(
  'entity_details_flyout-user_right',
  'user_managed_details'
);
import * as i18n from '../translations';

export interface ManagedUserData {
  data: ManagedUserHits;
}

export const useManagedUser = (): ManagedUserData => {
  const { deleteQuery, setQuery } = useGlobalTime();
  const {
    loading: loadingManagedUser,
    result: { users: managedUserData },
    refetch,
    inspect,
  } = useSearchStrategy<UsersQueries.managedDetails>({
    factoryQueryType: UsersQueries.managedDetails,
    initialResult: {
      users: {},
    },
    errorMessage: i18n.FAIL_MANAGED_USER,
    executionContext: MANAGED_USER_CONTEXT,
  });

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId: MANAGED_USER_QUERY_ID,
    loading: loadingManagedUser,
  });

  return useMemo(
    () => ({
      data: managedUserData,
    }),
    [managedUserData]
  );
};
