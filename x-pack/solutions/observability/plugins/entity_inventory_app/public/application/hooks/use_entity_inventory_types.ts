/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InventoryType } from '@kbn/entity-inventory-plugin/common';
import { getCategoryOfType } from '../utils/entity_categories';
import type { EntityInventoryTypeDefinition } from '../../inventory_api_types';
import { useEntityTypes } from '../context/entity_types_context';

const toDefinition = ({
  type,
  name,
  columns,
  sources,
  suggestedFilters,
}: InventoryType): EntityInventoryTypeDefinition => ({
  type,
  name,
  category: getCategoryOfType(type),
  sources: sources.map(({ indexPattern }) => ({ indexPattern })),
  attributes: columns
    .filter((column) => suggestedFilters.includes(column.name))
    .map(({ name: attributeName, label }) => ({ name: attributeName, label })),
  suggestedFilters,
});

export const useEntityInventoryTypes = () => {
  const { data, loading, error } = useEntityTypes();
  const types = useMemo(() => data.map(toDefinition), [data]);

  return { types, isLoading: loading, error };
};
