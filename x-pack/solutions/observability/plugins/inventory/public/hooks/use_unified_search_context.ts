/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import createContainer from 'constate';
import { useMemo, useState } from 'react';
import { Subject } from 'rxjs';
import { useAdHocDataView } from './use_adhoc_data_view';
import { useInventoryDecodedQueryParams } from './use_inventory_decoded_query_params';
import { useInventoryAbortableAsync } from './use_inventory_abortable_async';
import { groupEntityTypesByStatus } from '../utils/group_entity_types_by_status';
import { useKibana } from './use_kibana';
import { useInventoryParams } from './use_inventory_params';

function useUnifiedSearch() {
  const {
    services: { inventoryAPIClient },
  } = useKibana();
  const {
    query: { kuery },
  } = useInventoryParams('/');
  const { entityTypes } = useInventoryDecodedQueryParams();

  const { value, refresh, loading } = useInventoryAbortableAsync(
    ({ signal }) => {
      const { entityTypesOff, entityTypesOn } = groupEntityTypesByStatus(entityTypes);
      return inventoryAPIClient.fetch('GET /internal/inventory/entities/types', {
        params: {
          query: {
            includeEntityTypes: entityTypesOn.length ? JSON.stringify(entityTypesOn) : undefined,
            excludeEntityTypes: entityTypesOff.length ? JSON.stringify(entityTypesOff) : undefined,
            kuery,
          },
        },
        signal,
      });
    },
    [entityTypes, inventoryAPIClient, kuery]
  );

  const entityTypeIds = useMemo(
    () => (value?.entityTypes.map((entityType) => entityType.id) ?? []).join(','),
    [value?.entityTypes]
  );

  const {
    value: definitionIndexPatterns = { definitionIndexPatterns: {} },
    loading: isEntityDefinitionIndexPatternsLoading,
  } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entity/definitions/sources', {
        params: {
          query: {
            types: entityTypeIds,
          },
        },
        signal,
      });
    },
    [inventoryAPIClient, entityTypeIds]
  );

  const allDefinitionIndexPatterns = useMemo(
    () =>
      Object.values(definitionIndexPatterns.definitionIndexPatterns)
        .flatMap((pattern) => pattern)
        .join(','),
    [definitionIndexPatterns]
  );

  const { dataView } = useAdHocDataView(allDefinitionIndexPatterns ?? '');
  const [refreshSubject$] = useState<Subject<void>>(new Subject());

  return {
    dataView,
    definitionIndexPatterns,
    refreshSubject$,
    loading: loading || isEntityDefinitionIndexPatternsLoading,
    refresh,
    value,
  };
}

const UnifiedSearch = createContainer(useUnifiedSearch);
export const [UnifiedSearchProvider, useUnifiedSearchContext] = UnifiedSearch;
