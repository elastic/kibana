/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { SupportedHostOsType } from '../../../../../../common/endpoint/constants';
import { SUPPORTED_HOST_OS_TYPE } from '../../../../../../common/endpoint/constants';
import type {
  ScriptLibraryAllowedFileType,
  ScriptTagKey,
} from '../../../../../../common/endpoint/service/script_library/constants';
import {
  SCRIPT_LIBRARY_ALLOWED_FILE_TYPES,
  SCRIPT_LIBRARY_SORTABLE_FIELDS,
  SORTED_SCRIPT_TAGS_KEYS,
} from '../../../../../../common/endpoint/service/script_library/constants';
import type {
  SortableScriptLibraryFields,
  SortDirection,
} from '../../../../../../common/endpoint/types';
import { useUrlParams } from '../../../../hooks/use_url_params';

export interface ScriptLibraryUrlParams {
  page?: number;
  pageSize?: number;
  sortField?: SortableScriptLibraryFields;
  sortDirection?: SortDirection;
  selectedScriptId?: string;
  show?: 'create' | 'delete' | 'details' | 'edit';
  os?: SupportedHostOsType[]; // maps to "platform" filter in the UI
  fileType?: ScriptLibraryAllowedFileType[]; // maps to "fileType" filter in the UI
  category?: ScriptTagKey[]; // maps to "tags" filter in the UI
  searchTerms?: string[]; // maps to the search input in the UI
}

interface ScriptLibraryUrlParamSetters {
  setUrlOsFilter: (platforms: string) => void;
  setUrlFileTypeFilter: (fileTypes: string) => void;
  setUrlCategoryFilter: (category: string) => void;
  setUrlSearchTermsFilter: (searchTerms: string) => void;
  setPagingAndSortingParams: (params: {
    page: number;
    pageSize: number;
    sortField: SortableScriptLibraryFields;
    sortDirection: SortDirection;
  }) => void;
}

const verifyIsValidItem = <T extends string>(item: string, validItems: readonly T[]): item is T => {
  return validItems.includes(item as T);
};

export const scriptLibraryFiltersFromUrlParams = (
  urlParams: Partial<ScriptLibraryUrlParams>
): ScriptLibraryUrlParams => {
  const scriptLibraryFilters: ScriptLibraryUrlParams = {
    os: [],
    fileType: [],
    category: [],
    searchTerms: [],
  };

  const page = urlParams.page && Number(urlParams.page) > 0 ? Number(urlParams.page) : undefined;
  scriptLibraryFilters.page = page;

  const pageSize =
    urlParams.pageSize && Number(urlParams.pageSize) > 0 ? Number(urlParams.pageSize) : undefined;
  scriptLibraryFilters.pageSize = pageSize;

  const urlFileTypeFilter = urlParams.fileType
    ? String(urlParams.fileType)
        .split(',')
        .filter((fileType) => verifyIsValidItem(fileType, SCRIPT_LIBRARY_ALLOWED_FILE_TYPES))
        .sort()
    : [];
  scriptLibraryFilters.fileType = urlFileTypeFilter as ScriptLibraryAllowedFileType[];

  const urlOsFilter = urlParams.os
    ? String(urlParams.os)
        .split(',')
        .filter((os) => verifyIsValidItem(os, SUPPORTED_HOST_OS_TYPE))
        .sort()
    : [];
  scriptLibraryFilters.os = urlOsFilter;

  const urlCategoryFilter = urlParams.category
    ? String(urlParams.category)
        .split(',')
        .filter((category) => verifyIsValidItem(category, SORTED_SCRIPT_TAGS_KEYS))
        .sort()
    : [];
  scriptLibraryFilters.category = urlCategoryFilter;

  const urlSearchTermsFilter = urlParams.searchTerms
    ? String(urlParams.searchTerms).split(',')
    : [];
  scriptLibraryFilters.searchTerms = urlSearchTermsFilter;

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

export const useScriptLibraryUrlParams = (): ScriptLibraryUrlParams &
  ScriptLibraryUrlParamSetters => {
  const location = useLocation();
  const history = useHistory();
  const { urlParams, toUrlParams } = useUrlParams();

  const getUrlScriptLibraryFilters = useCallback(
    () => scriptLibraryFiltersFromUrlParams(urlParams),
    [urlParams]
  );
  const [scriptLibraryFilters, setScriptLibraryFilters] = useState(getUrlScriptLibraryFilters);

  const setUrlFileTypeFilter = useCallback(
    (fileTypes: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          fileType: fileTypes.length ? fileTypes : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const setUrlOsFilter = useCallback(
    (platforms: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          os: platforms.length ? platforms : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const setUrlCategoryFilter = useCallback(
    (category: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          category: category.length ? category : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const setUrlSearchTermsFilter = useCallback(
    (searchTerms: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          searchTerms: searchTerms.length ? searchTerms : undefined,
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
    setScriptLibraryFilters((prevState) => {
      return {
        ...prevState,
        ...scriptLibraryFiltersFromUrlParams(urlParams),
      };
    });
  }, [setScriptLibraryFilters, urlParams]);

  return {
    ...scriptLibraryFilters,
    selectedScriptId: urlParams?.selectedScriptId as ScriptLibraryUrlParams['selectedScriptId'],
    show: urlParams?.show as ScriptLibraryUrlParams['show'],
    setUrlFileTypeFilter,
    setUrlOsFilter,
    setUrlCategoryFilter,
    setUrlSearchTermsFilter,
    setPagingAndSortingParams,
  };
};
