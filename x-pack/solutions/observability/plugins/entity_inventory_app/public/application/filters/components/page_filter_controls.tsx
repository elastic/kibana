/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEntityInventorySearch } from '../../context/search_context';
import { EntityInventoryFilterControls } from './entity_inventory_filter_controls';
import { useEntityTypes } from '../../context/entity_types_context';

export function EntityInventoryPageFilterControls() {
  const { entityCategory, dateRange, filterControls, setFilterControls } =
    useEntityInventorySearch();
  const { data: types, loading, error } = useEntityTypes();
  const pageCategory = entityCategory === 'all' ? undefined : entityCategory;

  return (
    <EntityInventoryFilterControls
      typeDefinitions={types}
      isLoading={loading}
      error={error}
      pageCategory={pageCategory}
      timeRange={dateRange}
      selection={filterControls}
      onSelectionChange={setFilterControls}
    />
  );
}
