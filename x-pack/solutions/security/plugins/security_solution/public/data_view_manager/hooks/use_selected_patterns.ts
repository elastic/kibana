/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { DataViewManagerScopeName } from '../constants';
import { useDataView } from './use_data_view';

export const useSelectedPatterns = (
  scope: DataViewManagerScopeName = DataViewManagerScopeName.default
): string[] => {
  const { dataView } = useDataView(scope);
  const indexPattern = dataView?.getIndexPattern?.() ?? '';

  return useMemo(() => (indexPattern.length ? indexPattern.split(',') : []), [indexPattern]);
};
