/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../../../../../../../../common/lib/kibana';

type UseDataViewParams =
  | { indexPatterns: string[]; dataViewId?: never }
  | { indexPatterns?: never; dataViewId: string };

interface UseDataViewResult {
  dataView: DataView | undefined;
  isLoading: boolean;
}

export function useDataView(indexPatternsOrDataViewId: UseDataViewParams): UseDataViewResult {
  const {
    data: { dataViews: dataViewsService },
  } = useKibana().services;
  const [dataView, setDataView] = useState<DataView | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    (async () => {
      try {
        if (indexPatternsOrDataViewId.indexPatterns) {
          const indexPatternsDataView = await dataViewsService.create({
            title: indexPatternsOrDataViewId.indexPatterns.join(','),
            allowNoIndex: true,
          });

          setDataView(indexPatternsDataView);
          return;
        }

        if (indexPatternsOrDataViewId.dataViewId) {
          const ruleDataView = await dataViewsService.get(indexPatternsOrDataViewId.dataViewId);

          setDataView(ruleDataView);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [
    dataViewsService,
    indexPatternsOrDataViewId.indexPatterns,
    indexPatternsOrDataViewId.dataViewId,
  ]);

  return { dataView, isLoading };
}
