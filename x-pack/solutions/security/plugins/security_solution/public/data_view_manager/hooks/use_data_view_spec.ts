/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataViewManagerScopeName } from '../constants';
import { useFullDataView } from './use_full_data_view';

/**
 * Returns data view selection for given scopeName
 */
export const useDataViewSpec = (scopeName: DataViewManagerScopeName) => {
  const { dataView, status } = useFullDataView(scopeName);

  return useMemo(() => {
    // NOTE: remove this after we are ready for undefined (lazy) data view everywhere in the app
    // https://github.com/elastic/security-team/issues/11959
    if (!dataView) {
      return {
        dataViewSpec: {
          id: '',
          title: '',
        },
        status,
      };
    }

    return { status, dataViewSpec: dataView?.toSpec?.() };
  }, [dataView, status]);
};
