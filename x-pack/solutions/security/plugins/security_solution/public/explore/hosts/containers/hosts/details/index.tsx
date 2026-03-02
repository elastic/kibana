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

interface UseHostDetailsBase {
  endDate: string;
  id?: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

interface UseHostDetailsWithHostName extends UseHostDetailsBase {
  hostName: string;
  entityIdentifiers?: never;
}

interface UseHostDetailsWithEntityIdentifiers extends UseHostDetailsBase {
  entityIdentifiers: Record<string, string>;
  hostName?: never;
}

type UseHostDetails = UseHostDetailsWithHostName | UseHostDetailsWithEntityIdentifiers;

const getStableEntityIdentifiersKey = (identifiers: Record<string, string>): string =>
  JSON.stringify(
    Object.fromEntries(Object.entries(identifiers).sort(([a], [b]) => a.localeCompare(b)))
  );

export const useHostDetails = (
  props: UseHostDetails
): [boolean, HostDetailsArgs, inputsModel.Refetch] => {
  const { endDate, indexNames, id = ID, skip = false, startDate } = props;

  const entityIdentifiersKey =
    'entityIdentifiers' in props &&
    props.entityIdentifiers &&
    Object.keys(props.entityIdentifiers).length > 0
      ? getStableEntityIdentifiersKey(props.entityIdentifiers)
      : null;
  const hostNameFromProps = 'hostName' in props ? props.hostName : '';

  const requestEntityIdentifiers = useMemo((): Record<string, string> | null => {
    if (entityIdentifiersKey !== null) {
      return JSON.parse(entityIdentifiersKey) as Record<string, string>;
    }
    const trimmed = hostNameFromProps?.trim();
    return trimmed ? { 'host.name': trimmed } : null;
  }, [entityIdentifiersKey, hostNameFromProps]);

  const hasValidParams = Boolean(
    requestEntityIdentifiers && Object.keys(requestEntityIdentifiers).length > 0
  );
  const effectiveSkip = skip || !hasValidParams;

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
    abort: effectiveSkip,
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

  const hostDetailsRequest = useMemo(
    () =>
      hasValidParams && requestEntityIdentifiers
        ? {
            defaultIndex: indexNames,
            entityIdentifiers: requestEntityIdentifiers,
            factoryQueryType: HostsQueries.details,
            timerange: {
              interval: '12h',
              from: startDate,
              to: endDate,
            },
          }
        : null,
    [endDate, hasValidParams, indexNames, requestEntityIdentifiers, startDate]
  );

  useEffect(() => {
    if (!effectiveSkip && hostDetailsRequest) {
      search(hostDetailsRequest);
    }
  }, [effectiveSkip, hostDetailsRequest, search]);

  return [loading, hostDetailsResponse, refetch];
};
