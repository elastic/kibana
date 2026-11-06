/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import { ENTITY_INVENTORY_LIST_LIMIT } from '../../inventory_api/client';
import type { InventoryEntityType, InventoryListResponse } from '../../inventory_api/types';
import { useKibana } from '../../hooks/use_kibana';
import { useEntityInventorySearch } from '../context/search_context';
import { toAbsoluteTimeRange } from '../utils/to_absolute_time_range';

/** Thrown when the requested entity type is not registered. */
export class EntityTypeNotFoundError extends Error {
  constructor(public readonly entityType: string) {
    super(`Entity type "${entityType}" is not registered`);
    this.name = 'EntityTypeNotFoundError';
  }
}

export interface UseEntityListResult {
  entityType?: InventoryEntityType;
  list?: InventoryListResponse;
  loading: boolean;
  error?: Error;
  refresh: () => void;
}

/** Loads the type description and the entities of `entityType` for the committed time range. */
export const useEntityList = (entityType: string): UseEntityListResult => {
  const {
    services: { inventoryApi },
  } = useKibana();
  // The query and filters are not applied until search lands (#6327).
  const { dateRange } = useEntityInventorySearch();

  const { value, loading, error, refresh } = useAbortableAsync(
    async ({ signal }) => {
      // Resolved here so a relative range is measured from when the request is sent.
      const range = toAbsoluteTimeRange(dateRange);
      if (!range) {
        throw new Error(`Invalid time range: ${dateRange.from} to ${dateRange.to}`);
      }

      // Both requests start together. The type lookup is judged first, so an unknown type is
      // reported even when the list request failed as well.
      const [typesResult, listResult] = await Promise.allSettled([
        inventoryApi.getTypes({ signal }),
        inventoryApi.getEntities(
          entityType,
          { ...range, limit: ENTITY_INVENTORY_LIST_LIMIT },
          { signal }
        ),
      ]);
      if (typesResult.status === 'rejected') {
        throw typesResult.reason;
      }
      const description = typesResult.value.types.find(({ type }) => type === entityType);
      if (!description) {
        throw new EntityTypeNotFoundError(entityType);
      }
      if (listResult.status === 'rejected') {
        throw listResult.reason;
      }
      return { entityType: description, list: listResult.value };
    },
    [inventoryApi, entityType, dateRange],
    { clearValueOnNext: false }
  );

  return { entityType: value?.entityType, list: value?.list, loading, error, refresh };
};
