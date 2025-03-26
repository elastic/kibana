/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { type DataView } from '@kbn/data-views-plugin/public';
import has from 'lodash/has';

/**
 * TODO: DV_PICKER We may cache a data view service call after all... this needs to be investigated. Changing data view currently is very laggy and we need to optimize it somehow.
 */
export const dataViewCache: Record<string, Promise<DataView> | undefined> = {};

export const useInvalidateCache = () => {
  return useCallback(() => {
    for (const key in dataViewCache) {
      if (has(dataViewCache, key)) {
        delete dataViewCache[key];
      }
    }
  }, []);
};
