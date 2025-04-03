/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataViewManagerScopeName } from '../constants';
import { useDataViewSpec } from './use_data_view_spec';

export const useSelectedPatterns = (scope: DataViewManagerScopeName): string[] => {
  const { dataViewSpec } = useDataViewSpec(scope);

  return useMemo(() => dataViewSpec?.title?.split(',') ?? [], [dataViewSpec?.title]);
};
