/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { OS_TITLES } from '../../../../../common/translations';
import {
  SCRIPT_LIBRARY_ALLOWED_FILE_TYPES,
  SCRIPT_TAGS,
  SORTED_SCRIPT_TAGS_KEYS,
} from '../../../../../../../common/endpoint/service/script_library/constants';
import { SUPPORTED_HOST_OS_TYPE } from '../../../../../../../common/endpoint/constants';
import { type FILTER_NAMES, FILTER_PLACEHOLDERS } from './translations';
import { useScriptLibraryUrlParams } from '../script_library_url_params';

export type FilterName = keyof typeof FILTER_NAMES;

export type FilterItems = Array<{
  key?: string;
  label: string;
  checked?: 'on' | undefined;
  disabled?: boolean;
  searchableLabel?: string;
  'data-test-subj'?: string;
}>;

export const useScriptLibraryFilter = (
  filterName: FilterName
): {
  items: FilterItems;
  hasActiveFilters: boolean;
  numActiveFilters: number;
  numFilters: number;
  setUrlOsFilter: ReturnType<typeof useScriptLibraryUrlParams>['setUrlOsFilter'];
  setUrlFileTypeFilter: ReturnType<typeof useScriptLibraryUrlParams>['setUrlFileTypeFilter'];
  setUrlCategoryFilter: ReturnType<typeof useScriptLibraryUrlParams>['setUrlCategoryFilter'];
} => {
  const { os, fileType, category, setUrlOsFilter, setUrlFileTypeFilter, setUrlCategoryFilter } =
    useScriptLibraryUrlParams();

  const isFileTypeFilter = filterName === 'fileType';
  const isPlatformFilter = filterName === 'platform';
  const isTagsFilter = filterName === 'tags';

  const items = useMemo<FilterItems>(() => {
    return isFileTypeFilter
      ? SCRIPT_LIBRARY_ALLOWED_FILE_TYPES.map((key) => ({
          key,
          label: FILTER_PLACEHOLDERS.fileType[key],
          checked: fileType?.includes(key) ? 'on' : undefined,
          'data-test-subj': `${filterName}-filter-option`,
        }))
      : isPlatformFilter
      ? [...SUPPORTED_HOST_OS_TYPE].sort().map((key) => ({
          key,
          label: OS_TITLES[key],
          searchableLabel: OS_TITLES[key],
          checked: os?.includes(key) ? 'on' : undefined,
          'data-test-subj': `${filterName}-filter-option`,
        }))
      : isTagsFilter
      ? SORTED_SCRIPT_TAGS_KEYS.map((key) => ({
          key,
          label: SCRIPT_TAGS[key],
          searchableLabel: SCRIPT_TAGS[key],
          checked: category?.includes(key) ? 'on' : undefined,
          'data-test-subj': `${filterName}-filter-option`,
        }))
      : [];
  }, [filterName, fileType, os, category, isFileTypeFilter, isPlatformFilter, isTagsFilter]);

  const filterOptions = useMemo(() => {
    items.unshift({
      label: FILTER_PLACEHOLDERS.getFilterOptionsLabel(items.length),
      disabled: true,
    });
    return items;
  }, [items]);

  const hasActiveFilters = useMemo(() => !!items.find((item) => item.checked === 'on'), [items]);
  const numActiveFilters = useMemo(
    () => items.filter((item) => item.checked === 'on').length,
    [items]
  );
  const numFilters = useMemo(
    () => items.filter((item) => item.key && item.checked !== 'on').length,
    [items]
  );

  return {
    items: filterOptions,
    hasActiveFilters,
    numActiveFilters,
    numFilters,
    setUrlOsFilter,
    setUrlFileTypeFilter,
    setUrlCategoryFilter,
  };
};
