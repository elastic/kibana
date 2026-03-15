/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import type { inputsModel } from '../../../../../common/store';
import type { HostItem } from '../../../../../../common/search_strategy/security_solution/hosts';
import { HostsQueries } from '../../../../../../common/search_strategy/security_solution/hosts';

import * as i18n from './translations';
import type { InspectResponse } from '../../../../../types';
import { useSearchStrategy } from '../../../../../common/containers/use_search_strategy';

export const ID = 'hostsDetailsQuery';

export interface HostDetailsArgs {
  id: string;
  inspect: InspectResponse;
  hostDetails: HostItem;
  refetch: inputsModel.Refetch;
  startDate: string;
  endDate: string;
}

export type EntityIdentifiers = Record<string, string>;

interface UseHostDetails {
  endDate: string;
  /** When provided (and non-empty), used for the query; otherwise entityIdentifiers are derived from hostName. */
  entityIdentifiers?: EntityIdentifiers;
  id?: string;
  indexNames: string[];
  /** When true, use only host.name term filter (no EUID must_not). Used by explore host details page. */
  isExploreContext?: boolean;
  skip?: boolean;
  startDate: string;
  /** Required when entityIdentifiers is not provided. Used to build entityIdentifiers as { 'host.name': hostName }. */
  hostName?: string;
}

export const useHostDetails = ({
  endDate,
  entityIdentifiers: entityIdentifiersProp,
  indexNames,
  id = ID,
  isExploreContext = false,
  skip = false,
  startDate,
  hostName,
}: UseHostDetails): [boolean, HostDetailsArgs, inputsModel.Refetch] => {
  const entityIdentifiers = useMemo((): EntityIdentifiers => {
    if (entityIdentifiersProp != null && Object.keys(entityIdentifiersProp).length > 0) {
      return entityIdentifiersProp;
    }
    if (hostName != null && hostName !== '') {
      return { 'host.name': hostName };
    }
    return {};
  }, [entityIdentifiersProp, hostName]);

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
    abort: skip,
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
    const requestHostName =
      hostName ?? entityIdentifiers['host.name'] ?? Object.values(entityIdentifiers)[0] ?? '';
    return {
      defaultIndex: indexNames,
      factoryQueryType: HostsQueries.details,
      hostName: requestHostName,
      ...(Object.keys(entityIdentifiers).length > 0 ? { entityIdentifiers } : {}),
      ...(isExploreContext ? { isExploreContext: true } : {}),
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
    };
  }, [endDate, hostName, indexNames, startDate, entityIdentifiers, isExploreContext]);

  useEffect(() => {
    if (!skip) {
      search(hostDetailsRequest);
    }
  }, [hostDetailsRequest, search, skip]);

  return [loading, hostDetailsResponse, refetch];
};
