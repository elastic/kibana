/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { EntitiesSummary } from '../../components/entities_summary';
import { EntityGroupAccordion } from '../../components/entity_group_accordion';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useInventoryDecodedQueryParams } from '../../hooks/use_inventory_decoded_query_params';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useKibana } from '../../hooks/use_kibana';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search_context';
import { GroupBySelector } from '../../components/group_by_selector';
import { groupEntityTypesByStatus } from '../../utils/group_entity_types_by_status';

export function InventoryPage() {
  const {
    services: { inventoryAPIClient },
  } = useKibana();
  const { refreshSubject$ } = useUnifiedSearchContext();
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

  useEffectOnce(() => {
    const refreshSubscription = refreshSubject$.subscribe(refresh);
    return () => refreshSubscription.unsubscribe();
  });

  return (
    <>
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EntitiesSummary
            totalEntities={value?.totalEntities}
            totalGroups={value?.entityTypes.length}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <GroupBySelector />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {value?.entityTypes.map((entityType) => {
        return (
          <EntityGroupAccordion
            key={`entity.type-${entityType.id}`}
            groupValue={entityType.id}
            groupLabel={entityType.display_name}
            groupCount={entityType.count}
            isLoading={loading}
          />
        );
      })}
    </>
  );
}
