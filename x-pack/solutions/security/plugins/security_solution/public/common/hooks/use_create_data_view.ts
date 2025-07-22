/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { useEffect, useState } from 'react';
import { useKibana } from '../lib/kibana';

interface UseCreateDataViewParams {
  /**
   * The data view spec to create the data view from.
   */
  dataViewSpec: DataViewSpec;
  /**
   * Whether the fetch index pattern is loading.
   */
  loading?: boolean;
  /**
   * Whether to skip the data view creation.
   */
  skip: boolean;
}

interface UseCreateDataViewResults {
  /**
   * The data view created from the data view spec.
   */
  dataView: DataView | undefined;
  /**
   * Whether the data view is loading.
   */
  loading: boolean;
}

/**
 * This hook is used to create a data view from a data view spec.
 * It is used in the attack discovery pages and AI4DSOC pages to create a data view.
 * When skip is true, it does not create a data view.
 */
export const useCreateDataView = ({
  dataViewSpec,
  loading = false,
  skip,
}: UseCreateDataViewParams): UseCreateDataViewResults => {
  const { dataViews } = useKibana().services;
  const [dataView, setDataView] = useState<DataView | undefined>(undefined);
  const [dataViewLoading, setDataViewLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    async function createDataView() {
      if (!loading) {
        try {
          const dv = await dataViews.create(dataViewSpec);

          if (active) {
            setDataView(dv);
            setDataViewLoading(false);
          }
        } catch {
          if (active) {
            setDataView(undefined);
            setDataViewLoading(false);
          }
        }
      }
    }
    if (!skip) {
      createDataView();
    }

    return () => {
      active = false;
    };
  }, [dataViewSpec, dataViews, loading, skip]);

  return { dataView, loading: dataViewLoading };
};
