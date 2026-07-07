/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';

interface UseDataViewsResult {
  data: DataViewListItem[];
  isFetching: boolean;
}

/**
 * Fetches known Kibana data views from the Data View Service.
 */
export function useDataViewListItems(): UseDataViewsResult {
  const {
    data: { dataViews: dataViewsService },
  } = useKibana().services;
  const { addError } = useAppToasts();

  const [isFetching, setIsFetching] = useState(false);
  const [dataViews, setDataViews] = useState<DataViewListItem[]>([]);

  useEffect(() => {
    setIsFetching(true);
    (async () => {
      try {
        setDataViews(await dataViewsService.getIdsWithTitle(true));
      } catch (e) {
        addError(e, { title: i18n.DATA_VIEWS_FETCH_ERROR });
      } finally {
        setIsFetching(false);
      }
    })();
  }, [dataViewsService, addError]);

  return { data: dataViews, isFetching };
}
