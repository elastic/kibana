/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  took: 0,
  queries: [],
  errors: [],
  unavailableColumns: [],
};

export type UseEntityListResult = FetchResult<ListResponse>;

/** Loads the entities of the type with id `entityType` for the committed time range. */
export const useEntityList = (entityType: string): UseEntityListResult => {
  const {
    services: { inventoryApi },
  } = useKibana();
  // The query and filters are not applied until search lands (#6327).
  const { dateRange } = useEntityInventorySearch();

  const state = useAbortableAsync(
    ({ signal }) => {
      // Resolved here so a relative range is measured from when the request is sent.
      const range = toAbsoluteTimeRange(dateRange);
      if (!range) {
        throw new Error(`Invalid time range: ${dateRange.from} to ${dateRange.to}`);
      }
      return inventoryApi.getEntities(entityType, range, { signal });
    },
    [inventoryApi, entityType, dateRange],
    FETCH_OPTIONS
  );

  return toFetchResult(state, INITIAL_LIST_RESPONSE);
};
