/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { useEffect, useState } from 'react';

import { useKibana } from '../../../../../common/lib/kibana';

export const useDataView = ({
  dataViewSpec,
  loading,
}: {
  dataViewSpec: DataViewSpec;
  loading: boolean;
}): DataView | undefined => {
  const { dataViews } = useKibana().services;

  const [dataView, setDataView] = useState<DataView | undefined>(undefined);

  useEffect(() => {
    let active = true;

    async function createDataView() {
      if (!loading) {
        try {
          const dv = await dataViews.create(dataViewSpec);

          if (active) {
            setDataView(dv);
          }
        } catch {
          if (active) {
            setDataView(undefined);
          }
        }
      }
    }

    createDataView();

    return () => {
      active = false;
    };
  }, [dataViewSpec, dataViews, loading]);

  return dataView;
};
