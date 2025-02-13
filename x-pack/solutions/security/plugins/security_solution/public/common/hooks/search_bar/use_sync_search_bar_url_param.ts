/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useMemo, useEffect } from 'react';
import type { Filter, Query } from '@kbn/es-query';
import { isEmpty } from 'lodash/fp';
import { inputsSelectors } from '../../store';
import { useUpdateUrlParam } from '../../utils/global_query_string';
import { URL_PARAM_KEY } from '../use_url_state';

export const useSyncSearchBarUrlParams = () => {
  const updateSavedQueryUrlParam = useUpdateUrlParam<string>(URL_PARAM_KEY.savedQuery);
  const updateAppQueryUrlParam = useUpdateUrlParam<Query>(URL_PARAM_KEY.appQuery);
  const updateFilterUrlParam = useUpdateUrlParam<Filter[]>(URL_PARAM_KEY.filters);

  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalSavedQuerySelector = useMemo(() => inputsSelectors.globalSavedQuerySelector(), []);

  const query = useSelector(getGlobalQuerySelector);
  const filters = useSelector(getGlobalFiltersQuerySelector);
  const savedQuery = useSelector(getGlobalSavedQuerySelector);

  useEffect(() => {
    if (savedQuery != null && savedQuery.id !== '') {
      updateSavedQueryUrlParam(savedQuery?.id ?? null);
      updateAppQueryUrlParam(null);
      updateFilterUrlParam(null);
    } else {
      updateSavedQueryUrlParam(null);
      updateAppQueryUrlParam(isEmpty(query.query) ? null : query);
      updateFilterUrlParam(isEmpty(filters) ? null : filters);
    }
  }, [
    savedQuery,
    query,
    filters,
    updateSavedQueryUrlParam,
    updateAppQueryUrlParam,
    updateFilterUrlParam,
  ]);
};
