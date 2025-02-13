/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { ManagedUserHits } from '../../../../../common/search_strategy/security_solution/users/managed_details';
import { useIntegrations } from '../../../../detections/components/rules/related_integrations/use_integrations';
import { UsersQueries } from '../../../../../common/api/search_strategy';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import {
  ENTRA_ID_PACKAGE_NAME,
  OKTA_PACKAGE_NAME,
  getEntraUserIndex,
  getOktaUserIndex,
  MANAGED_USER_QUERY_ID,
} from '../constants';
import * as i18n from '../translations';

const packages = [ENTRA_ID_PACKAGE_NAME, OKTA_PACKAGE_NAME];

interface ManagedUserData {
  data: ManagedUserHits;
  isLoading: boolean;
  isIntegrationEnabled: boolean;
}

export const useManagedUser = (
  userName: string,
  email: string[] | undefined,
  isLoading?: boolean
): ManagedUserData => {
  const skip = !useIsExperimentalFeatureEnabled('newUserDetailsFlyoutManagedUser');
  const { to, from, isInitializing, deleteQuery, setQuery } = useGlobalTime();
  const spaceId = useSpaceId();
  const {
    loading: loadingManagedUser,
    result: { users: managedUserData },
    search,
    refetch,
    inspect,
  } = useSearchStrategy<UsersQueries.managedDetails>({
    factoryQueryType: UsersQueries.managedDetails,
    initialResult: {
      users: {},
    },
    errorMessage: i18n.FAIL_MANAGED_USER,
  });

  const defaultIndex = useMemo(
    () => (spaceId ? [getEntraUserIndex(spaceId), getOktaUserIndex(spaceId)] : []),
    [spaceId]
  );

  useEffect(() => {
    if (!isInitializing && defaultIndex.length > 0 && !isLoading && userName && !skip) {
      search({
        defaultIndex,
        userEmail: email,
        userName,
      });
    }
  }, [from, search, to, isInitializing, defaultIndex, userName, isLoading, email, skip]);

  const { data: integrations, isLoading: loadingIntegrations } = useIntegrations({
    skip,
  });

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId: MANAGED_USER_QUERY_ID,
    loading: loadingManagedUser,
  });

  const isIntegrationEnabled = useMemo(
    () =>
      !!integrations?.some(
        ({ package_name: packageName, is_enabled: isEnabled }) =>
          isEnabled && packages.includes(packageName)
      ),
    [integrations]
  );

  return useMemo(
    () => ({
      data: managedUserData,
      isLoading: skip ? false : loadingManagedUser || loadingIntegrations,
      isIntegrationEnabled,
    }),
    [isIntegrationEnabled, loadingIntegrations, loadingManagedUser, managedUserData, skip]
  );
};
