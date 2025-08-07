/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UnifiedSearchBar } from '../../../../components/shared/unified_search_bar';
import { useWaffleFiltersContext } from '../hooks/use_waffle_filters';

export const SearchBar = () => {
  const { applyFilterQuery } = useWaffleFiltersContext();

  return <UnifiedSearchBar onQuerySubmit={applyFilterQuery} />;
};
