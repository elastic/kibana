/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_INTERNAL_MISSING_PRIVILEGES,
} from '@kbn/elastic-assistant-common';
import type { GetAttackDiscoveryMissingPrivilegesInternalResponse } from '@kbn/elastic-assistant-common';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { KibanaServices } from '../../../common/lib/kibana';
import * as i18n from './translations';

const ONE_MINUTE = 60000;

const DEFAULT_QUERY_OPTIONS = {
  refetchIntervalInBackground: false,
  staleTime: ONE_MINUTE * 5,
  retry: false,
};

/** Retrieves the attack discovery schedule. */
const getMissingIndexPrivileges = async (
  signal?: AbortSignal
): Promise<GetAttackDiscoveryMissingPrivilegesInternalResponse> => {
  const version = API_VERSIONS.internal.v1;
  return KibanaServices.get().http.get<GetAttackDiscoveryMissingPrivilegesInternalResponse>(
    ATTACK_DISCOVERY_INTERNAL_MISSING_PRIVILEGES,
    {
      version,
      signal,
    }
  );
};

export const useGetMissingIndexPrivileges = () => {
  const { addError } = useAppToasts();

  return useQuery(
    ['GET', ATTACK_DISCOVERY_INTERNAL_MISSING_PRIVILEGES],
    async ({ signal }) => getMissingIndexPrivileges(signal),
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.GET_ATTACK_DISCOVERY_MISSING_PRIVILEGES_FAILURE });
      },
    }
  );
};
