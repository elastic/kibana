/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { SCRIPT_LIBRARY_SORTABLE_FIELDS } from '../../../../../../common/endpoint/service/scripts_library/constants';
import type {
  SortableScriptLibraryFields,
  SortDirection,
} from '../../../../../../common/endpoint/types';
import { useUrlParams } from '../../../../hooks/use_url_params';

export interface ScriptsLibraryUrlParams {
  kuery?: string;
  page?: number;
  pageSize?: number;
  sortField?: SortableScriptLibraryFields;
  sortDirection?: SortDirection;
  selectedScriptId?: string;
  show?: 'create' | 'delete' | 'details' | 'edit';
}

interface ScriptLibraryUrlParamSetters {
  setUrlKueryParam: (kuery: string) => void;
  setPagingAndSortingParams: (params: {
    page: number;
    pageSize: number;
    sortField: SortableScriptLibraryFields;
    sortDirection: SortDirection;
  }) => void;
}

export const scriptsLibraryFiltersFromUrlParams = (
  urlParams: Partial<ScriptsLibraryUrlParams>
): ScriptsLibraryUrlParams => {
  const scriptLibraryFilters: ScriptsLibraryUrlParams = {
    kuery: '',
  };

  const page = urlParams.page && Number(urlParams.page) > 0 ? Number(urlParams.page) : undefined;
  scriptLibraryFilters.page = page;

  const pageSize =
    urlParams.pageSize && Number(urlParams.pageSize) > 0 ? Number(urlParams.pageSize) : undefined;
  scriptLibraryFilters.pageSize = pageSize;

  const urlKuery = urlParams.kuery ? String(urlParams.kuery) : undefined;
  scriptLibraryFilters.kuery = urlKuery;

  const urlSortField =
    urlParams.sortField && SCRIPT_LIBRARY_SORTABLE_FIELDS.includes(urlParams.sortField)
      ? urlParams.sortField
      : undefined;
  scriptLibraryFilters.sortField = urlSortField;

  const urlSortDirection =
    urlParams.sortDirection && ['asc', 'desc'].includes(urlParams.sortDirection)
      ? urlParams.sortDirection
      : undefined;
  scriptLibraryFilters.sortDirection = urlSortDirection;

  return scriptLibraryFilters;
};

export const useScriptsLibraryUrlParams = (): ScriptsLibraryUrlParams &
  ScriptLibraryUrlParamSetters => {
  const location = useLocation();
  const history = useHistory();
  const { urlParams, toUrlParams } = useUrlParams();

  const getUrlScriptsLibraryFilters = useCallback(
    () => scriptsLibraryFiltersFromUrlParams(urlParams),
    [urlParams]
  );
  const [scriptLibraryFilters, setScriptsLibraryFilters] = useState(getUrlScriptsLibraryFilters);

  const setUrlKueryParam = useCallback(
    (kuery: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          kuery: kuery.length ? kuery : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const setPagingAndSortingParams = useCallback(
    (pagingParams: {
      page: number;
      pageSize: number;
      sortField: SortableScriptLibraryFields;
      sortDirection: SortDirection;
    }) => {
      const search = toUrlParams({
        ...urlParams,
        page: pagingParams.page,
        pageSize: pagingParams.pageSize,
        sortField: pagingParams.sortField?.length ? pagingParams.sortField : undefined,
        sortDirection: pagingParams.sortDirection?.length ? pagingParams.sortDirection : undefined,
      });

      history.push({
        ...location,
        search,
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  useEffect(() => {
    setScriptsLibraryFilters((prevState) => {
      return {
        ...prevState,
        ...scriptsLibraryFiltersFromUrlParams(urlParams),
      };
    });
  }, [setScriptsLibraryFilters, urlParams]);

  return {
    ...scriptLibraryFilters,
    selectedScriptId: urlParams?.selectedScriptId as ScriptsLibraryUrlParams['selectedScriptId'],
    show: urlParams?.show as ScriptsLibraryUrlParams['show'],
    setUrlKueryParam,
    setPagingAndSortingParams,
  };
};
