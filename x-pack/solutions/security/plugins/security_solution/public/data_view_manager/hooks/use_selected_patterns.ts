/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { PageScope } from '../constants';
import { useDataView } from './use_data_view';

const emptyArray: string[] = [];

export const useSelectedPatterns = (scope: PageScope = PageScope.default): string[] => {
  const { dataView } = useDataView(scope);
  const indexPattern = dataView?.getIndexPattern?.() ?? '';

  return useMemo(
    () => (indexPattern.length ? indexPattern.split(',') : emptyArray),
    [indexPattern]
  );
};
