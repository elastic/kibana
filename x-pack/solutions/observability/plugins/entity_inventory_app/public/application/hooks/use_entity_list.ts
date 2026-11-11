/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { InventoryListResponse } from '../../inventory_api/types';
import { useKibana } from '../../hooks/use_kibana';
import { useEntityInventorySearch } from '../context/search_context';
import { toAbsoluteTimeRange } from '../utils/to_absolute_time_range';

export interface UseEntityListResult {
  list?: InventoryListResponse;
  loading: boolean;
  error?: Error;
  refresh: () => void;
}

/** Loads the entities of the type with id `entityType` for the committed time range. */
export const useEntityList = (entityType: string): UseEntityListResult => {
  const {
    services: { inventoryApi },
  } = useKibana();
  // The query and filters are not applied until search lands (#6327).
  const { dateRange } = useEntityInventorySearch();

  const { value, loading, error, refresh } = useAbortableAsync(
    ({ signal }) => {
      // Resolved here so a relative range is measured from when the request is sent.
      const range = toAbsoluteTimeRange(dateRange);
      if (!range) {
        throw new Error(`Invalid time range: ${dateRange.from} to ${dateRange.to}`);
      }
      return inventoryApi.getEntities(entityType, range, { signal });
    },
    [inventoryApi, entityType, dateRange],
    { clearValueOnNext: false }
  );

  return { list: value, loading, error, refresh };
};
