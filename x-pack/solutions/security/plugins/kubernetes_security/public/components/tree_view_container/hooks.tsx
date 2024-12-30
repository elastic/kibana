/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { KubernetesCollectionMap } from '../../types';
import { LOCAL_STORAGE_TREE_NAV_KEY } from '../../../common/constants';
import { addTimerangeAndDefaultFilterToQuery } from '../../utils/add_timerange_and_default_filter_to_query';
import { addTreeNavSelectionToFilterQuery } from './helpers';
import { IndexPattern, GlobalFilter } from '../../types';

export type UseTreeViewProps = {
  globalFilter: GlobalFilter;
  indexPattern?: IndexPattern;
};

export const useTreeView = ({ globalFilter, indexPattern }: UseTreeViewProps) => {
  const [noResults, setNoResults] = useState(false);
  const [treeNavSelection = {}, setTreeNavSelection] = useLocalStorage<
    Partial<KubernetesCollectionMap>
  >(LOCAL_STORAGE_TREE_NAV_KEY, {});
  const filterQueryWithTimeRange = useMemo(() => {
    return JSON.parse(
      addTimerangeAndDefaultFilterToQuery(
        globalFilter.filterQuery,
        globalFilter.startDate,
        globalFilter.endDate
      )
    );
  }, [globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate]);

  const onTreeNavSelect = useCallback(
    (selection: Partial<KubernetesCollectionMap>) => {
      setTreeNavSelection(selection);
    },
    [setTreeNavSelection]
  );

  const sessionViewFilter = useMemo(
    () => addTreeNavSelectionToFilterQuery(globalFilter.filterQuery, treeNavSelection),
    [globalFilter.filterQuery, treeNavSelection]
  );

  return {
    noResults,
    setNoResults,
    filterQueryWithTimeRange,
    indexPattern: indexPattern?.title || '',
    onTreeNavSelect,
    treeNavSelection,
    setTreeNavSelection,
    sessionViewFilter,
  };
};
