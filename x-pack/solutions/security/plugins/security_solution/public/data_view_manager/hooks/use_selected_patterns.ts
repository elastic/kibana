/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';

const emptyArray: string[] = [];

/**
 * Returns the list of index patterns for the provided dataView.
 * The dataView should be retrieved once via the useDataView hook and passed in here.
 */
export const useSelectedPatterns = (dataView: DataView): string[] => {
  const indexPattern = dataView?.getIndexPattern?.() ?? '';

  return useMemo(
    () => (indexPattern.length ? indexPattern.split(',') : emptyArray),
    [indexPattern]
  );
};
