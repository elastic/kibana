/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import type { FilterOptions } from '../components/all_inference_endpoints/types';

import { DEFAULT_FILTER_OPTIONS } from '../components/all_inference_endpoints/constants';

interface UseAllInferenceEndpointsStateReturn {
  filterOptions: FilterOptions;
  setFilterOptions: (filterOptions: Partial<FilterOptions>) => void;
}

export function useAllInferenceEndpointsState(): UseAllInferenceEndpointsStateReturn {
  const [filterOptions, setFilterOptionsState] = useState<FilterOptions>(DEFAULT_FILTER_OPTIONS);

  const setFilterOptions = useCallback((newFilterOptions: Partial<FilterOptions>) => {
    setFilterOptionsState((prev) => ({ ...prev, ...newFilterOptions }));
  }, []);

  return {
    filterOptions,
    setFilterOptions,
  };
}
