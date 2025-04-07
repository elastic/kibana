/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Query } from '@kbn/es-query';
import { useKibana } from '../../../common/lib/kibana';
import type { AssetsBaseURLQuery } from './use_asset_inventory_url_state';

export const usePersistedQuery = <T>(getter: ({ filters, query }: AssetsBaseURLQuery) => T) => {
  const {
    data: {
      query: { filterManager, queryString },
    },
  } = useKibana().services;

  return useCallback(
    () =>
      getter({
        filters: filterManager.getAppFilters(),
        query: queryString.getQuery() as Query,
      }),
    [getter, filterManager, queryString]
  );
};
