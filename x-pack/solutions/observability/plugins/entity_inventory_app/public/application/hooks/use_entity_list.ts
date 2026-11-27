/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { ListResponse } from '@kbn/entity-inventory-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { useEntityInventorySearch } from '../context/search_context';
import { toAbsoluteTimeRange } from '../utils/to_absolute_time_range';
import type { FetchResult } from '../utils/to_fetch_result';
import { FETCH_OPTIONS, toFetchResult } from '../utils/to_fetch_result';

/** The list response the app renders before the first one arrives, and after a failed load. */
export const INITIAL_LIST_RESPONSE: ListResponse = {
  columns: [],
  rows: [],
  provenance: {},
  truncated: false,
  queries: [],
  probes: [],
  timings: {
    definitionMs: 0,
    planningMs: 0,
    probesMs: 0,
    queriesMs: 0,
    processingMs: 0,
    totalMs: 0,
  },
  errors: [],
  unavailableColumns: [],
};

export type EntityListResult = FetchResult<ListResponse>;

export interface UseEntityListOptions {
  /**
   * Whether the list may be requested now. While false, nothing is requested, and a change of the
   * range waits until it turns true. A list that was loaded keeps its rows until then.
   */
  enabled?: boolean;
}

interface FetchInputs {
  dateRange: ReturnType<typeof useEntityInventorySearch>['dateRange'];
  refreshToken: ReturnType<typeof useEntityInventorySearch>['refreshToken'];
}

/** Loads the entities of the type with id `entityType` for the committed time range. */
export const useEntityList = (
  entityType: string,
  { enabled = true }: UseEntityListOptions = {}
): EntityListResult => {
  const {
    services: { inventoryApi },
  } = useKibana();
  // The query and filters are not applied until search lands (#6327).
  const { dateRange, refreshToken } = useEntityInventorySearch();

  // The inputs of the last request this list was allowed to make. They follow the search only
  // while `enabled`, so a disabled list won't start a request or drop its rows when the range
  // changes, and it catches up with the search once it is enabled again.
  const [fetchInputs, setFetchInputs] = useState<FetchInputs | undefined>(
    enabled ? { dateRange, refreshToken } : undefined
  );
  if (
    enabled &&
    (fetchInputs?.dateRange !== dateRange || fetchInputs?.refreshToken !== refreshToken)
  ) {
    setFetchInputs({ dateRange, refreshToken });
  }

  const state = useAbortableAsync<ListResponse | undefined>(
    ({ signal }) => {
      if (!fetchInputs) {
        return undefined;
      }
      // Resolved here so a relative range is measured from when the request is sent.
      const range = toAbsoluteTimeRange(fetchInputs.dateRange);
      if (!range) {
        throw new Error(
          `Invalid time range: ${fetchInputs.dateRange.from} to ${fetchInputs.dateRange.to}`
        );
      }
      return inventoryApi.getEntities(entityType, range, { signal });
    },
    // `refreshToken` is intentionally included to fetch again when the same relative range is
    // submitted again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inventoryApi, entityType, fetchInputs?.dateRange, fetchInputs?.refreshToken],
    FETCH_OPTIONS
  );

  return toFetchResult(state, INITIAL_LIST_RESPONSE);
};
