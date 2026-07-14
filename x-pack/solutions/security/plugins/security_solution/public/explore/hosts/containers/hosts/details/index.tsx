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
import type { EntityStoreRecord } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';

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
  /**
   * Resolved entity-store record. When entity store v2 is enabled it is used to build an
   * indexed-field identity filter (via the EUID API) instead of a runtime-field `entity_id` term.
   */
  entityRecord?: EntityStoreRecord | null;
  /**
   * When entity store v2 is enabled, indicates the entity-store record is *actively* being fetched
   * (react-query `isInitialLoading`, not raw `isLoading`). While `true` and no record is available
   * yet, the observed query is skipped so the entity-store record stays the base and the complementary
   * query runs once, correctly scoped (no broad `host.name` fallback flash first). A resolved
   * `entityRecord` always runs the scoped query regardless of this flag.
   */
  entityStoreInitialLoading?: boolean;
  id?: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useHostDetails = ({
  endDate,
  hostName,
  entityId,
  entityRecord,
  entityStoreInitialLoading = false,
  indexNames,
  id = ID,
  skip = false,
  startDate,
}: UseHostDetails): [boolean, HostDetailsArgs, inputsModel.Refetch] => {
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2);
  const euidApi = useEntityStoreEuidApi();

  // Only wait while the store is actively fetching AND we do not yet have a record to scope by.
  // Once a record is available we always run the scoped query (never blocked by a stale loading flag).
  const waitingForEntityStoreRecord = entityStoreInitialLoading && !entityRecord;

  const shouldSkip =
    skip ||
    (!entityStoreV2Enabled && isEmpty(hostName)) ||
    (entityStoreV2Enabled &&
      (!euidApi?.euid || waitingForEntityStoreRecord || (isEmpty(entityId) && isEmpty(hostName))));

  const euidFilter = useMemo(() => {
    if (shouldSkip) {
      return undefined;
    }

    if (!entityStoreV2Enabled) {
      // For legacy entity store, query by host.name
      return { term: { 'host.name': hostName } };
    }

    // For entity store v2, resolve the entity via an indexed-field identity filter built from the
    // entity-store record. This replaces the previous `entity_id` runtime field, which forced
    // Elasticsearch to run the EUID Painless script on every document in the time range.
    const recordFilter = euidApi?.euid?.dsl?.getEuidFilterBasedOnEntityRecord('host', entityRecord);
    if (recordFilter) {
      return recordFilter;
    }
    // Fall back to host.name when the record cannot yield an EUID identity filter.
    if (hostName) {
      return { term: { 'host.name': hostName } };
    }
  }, [entityStoreV2Enabled, shouldSkip, hostName, entityRecord, euidApi?.euid]);

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
