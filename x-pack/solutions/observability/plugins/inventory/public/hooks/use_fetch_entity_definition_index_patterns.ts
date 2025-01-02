/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInventoryAbortableAsync } from './use_inventory_abortable_async';
import { useKibana } from './use_kibana';

export const useFetchEntityDefinitionIndexPattern = (type: string) => {
  const {
    services: { inventoryAPIClient },
  } = useKibana();

  const { value = { definitionIndexPatterns: [] }, loading } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entity/definitions/sources', {
        params: {
          query: {
            type,
          },
        },
        signal,
      });
    },
    [inventoryAPIClient]
  );

  return {
    entityDefinitionIndexPatterns: value?.definitionIndexPatterns,
    isEntityDefinitionIndexPatternsLoading: loading,
  };
};
