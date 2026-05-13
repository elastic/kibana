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
import type { HostItem } from '../../../../../../common/search_strategy/security_solution/hosts';
import { HostsQueries } from '../../../../../../common/search_strategy/security_solution/hosts';

import * as i18n from './translations';
import type { InspectResponse } from '../../../../../types';
import { useSearchStrategy } from '../../../../../common/containers/use_search_strategy';
import { useUiSetting } from '../../../../../common/lib/kibana';

export const ID = 'hostsDetailsQuery';

export interface HostDetailsArgs {
  id: string;
  inspect: InspectResponse;
  hostDetails: HostItem;
  refetch: inputsModel.Refetch;
  startDate: string;
  endDate: string;
}

interface UseHostDetails {
  endDate: string;
  /** When missing or empty, the host details search is not run (avoids invalid strategy requests). */
  hostName: string;
  entityId?: string;
  id?: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useHostDetails = ({
  endDate,
  hostName,
  entityId,
  indexNames,
  id = ID,
  skip = false,
  startDate,
}: UseHostDetails): [boolean, HostDetailsArgs, inputsModel.Refetch] => {
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);
  const euidApi = useEntityStoreEuidApi();

  const shouldSkip =
    skip ||
    (!entityStoreV2Enabled && isEmpty(hostName)) ||
    (entityStoreV2Enabled && (!euidApi?.euid || (isEmpty(entityId) && isEmpty(hostName))));

  const euidFilter = useMemo(() => {
    if (shouldSkip) {
      return undefined;
    }

    if (!entityStoreV2Enabled) {
      // For legacy entity store, query by host.name
      return { term: { 'host.name': hostName } };
    } else {
      // For entity store v2, query by entity_id (runtime field)
      if (entityId) {
        return { term: { entity_id: entityId } };
      } else if (hostName) {
        // If entityId is not available, fall back to host.name for querying
        return { term: { 'host.name': hostName } };
      }
    }
  }, [entityStoreV2Enabled, shouldSkip, hostName, entityId]);

  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<HostsQueries.details>({
    factoryQueryType: HostsQueries.details,
    initialResult: {
      hostDetails: {},
    },
    errorMessage: i18n.FAIL_HOST_OVERVIEW,
    abort: shouldSkip,
  });

  const hostDetailsResponse = useMemo(
    () => ({
      endDate,
      hostDetails: response.hostDetails,
      id,
      inspect,
      isInspected: false,
      refetch,
      startDate,
    }),
    [endDate, response.hostDetails, id, inspect, refetch, startDate]
  );

  const hostDetailsRequest = useMemo(() => {
    if (!euidFilter) {
      return null;
    }
    return {
      defaultIndex: indexNames,
      factoryQueryType: HostsQueries.details,
      hostName,
      filterQuery: JSON.stringify(euidFilter),
      entityStoreV2: entityStoreV2Enabled || false,
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
    };
  }, [endDate, entityStoreV2Enabled, euidFilter, indexNames, startDate, hostName]);

  useEffect(() => {
    if (!shouldSkip && hostDetailsRequest != null) {
      search(hostDetailsRequest);
    }
  }, [hostDetailsRequest, search, shouldSkip]);

  return [loading, hostDetailsResponse, refetch];
};
