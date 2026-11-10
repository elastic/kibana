/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getEsQueryConfig } from '@kbn/data-service';
import { useAbortableAsync } from '@kbn/react-hooks';
import { ENTITY_INVENTORY_LIST_LIMIT } from '../../inventory_api/client';
import type { InventoryEntityType, InventoryListResponse } from '../../inventory_api/types';
import { useKibana } from '../../hooks/use_kibana';
import { useEntityInventorySearch } from '../context/search_context';
import { buildDocumentFilter } from '../utils/build_document_filter';
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
    services: { inventoryApi, uiSettings },
  } = useKibana();
  const { dateRange, query, filters, filterControls, refreshToken } = useEntityInventorySearch();

  const search = useMemo(
    () => ({
      dateRange,
      documentFilter: buildDocumentFilter({
        query,
        filters,
        attributes: filterControls.attributes,
        esQueryConfig: getEsQueryConfig(uiSettings),
      }),
      refreshToken,
    }),
    [dateRange, query, filters, filterControls.attributes, uiSettings, refreshToken]
  );

  const { value, loading, error, refresh } = useAbortableAsync(
    async ({ signal }) => {
      const { dateRange: committedRange, documentFilter } = search;
      // Resolved here so a relative range is measured from when the request is sent.
      const range = toAbsoluteTimeRange(committedRange);
      if (!range) {
        throw new Error(`Invalid time range: ${committedRange.from} to ${committedRange.to}`);
      }

      // Both requests start together. The type lookup is judged first, so an unknown type is
      // reported even when the list request failed as well.
      const [typesResult, listResult] = await Promise.allSettled([
        inventoryApi.getTypes({ signal }),
        inventoryApi.getEntities(
          entityType,
          {
            ...range,
            limit: ENTITY_INVENTORY_LIST_LIMIT,
            ...(documentFilter && { documentFilter }),
          },
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
    [inventoryApi, entityType, search],
    { clearValueOnNext: false }
  );

  return { entityType: value?.entityType, list: value?.list, loading, error, refresh };
};
