/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSearchBar, Query } from '@elastic/eui';
import { useCallback, useState } from 'react';

export type FilterGroups = Record<string, string[]>;

export const useQueryAndFilters = () => {
  const [query, setQuery] = useState<Query | undefined>(EuiSearchBar.Query.MATCH_ALL);
  const [filterGroups, setFilterGroups] = useState<FilterGroups>({});

  const changeFilterGroups = useCallback(
    (nextFilterGroups: FilterGroups) => {
      setFilterGroups({
        ...filterGroups,
        ...nextFilterGroups,
      });
    },
    [filterGroups]
  );

  return {
    query,
    setQuery,
    filterGroups,
    changeFilterGroups,
  };
};

export type SchemaEditorQueryAndFiltersState = ReturnType<typeof useQueryAndFilters>;
export type ChangeFilterGroups = ReturnType<typeof useQueryAndFilters>['changeFilterGroups'];
