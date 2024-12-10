/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { safeParseResult } from '@kbn/zod-helpers';
import { useGetInitialUrlParamValue } from '../../../../../common/utils/global_query_string/helpers';
import { RULES_TABLE_MAX_PAGE_SIZE } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { RULES_TABLE_STATE_STORAGE_KEY } from '../constants';
import type {
  RulesTableStorageSavedState,
  RulesTableUrlSavedState,
} from './rules_table_saved_state';
import {
  RulesTableSavedFilter,
  RulesTableStorageSavedPagination,
  RulesTableUrlSavedPagination,
  RulesTableSavedSorting,
} from './rules_table_saved_state';

function readStorageState(storage: Storage): RulesTableStorageSavedState | null {
  try {
    return storage.get(RULES_TABLE_STATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useRulesTableSavedState(): {
  filter?: RulesTableSavedFilter;
  sorting?: RulesTableSavedSorting;
  pagination?: RulesTableUrlSavedPagination;
} {
  const getUrlParam = useGetInitialUrlParamValue<RulesTableUrlSavedState>(URL_PARAM_KEY.rulesTable);
  const {
    services: { sessionStorage },
  } = useKibana();

  const urlState = getUrlParam();
  const storageState = readStorageState(sessionStorage);

  if (!urlState && !storageState) {
    return {};
  }

  const [filter, sorting, pagination] = validateState(urlState, storageState);

  return { filter, sorting, pagination };
}

function validateState(
  urlState: RulesTableUrlSavedState | null,
  storageState: RulesTableStorageSavedState | null
): [RulesTableSavedFilter, RulesTableSavedSorting, RulesTableUrlSavedPagination] {
  const filterFromUrl = safeParseResult(urlState, RulesTableSavedFilter);
  const filterFromStorage = safeParseResult(storageState, RulesTableSavedFilter);
  // We have to expose filter, sorting and pagination objects by explicitly specifying each field
  // since urlState and/or storageState may contain unnecessary fields (e.g. outdated or explicitly added by user)
  // and validateNonExact doesn't truncate fields not included in the type RulesTableSavedFilter and etc.
  const filter: RulesTableSavedFilter = {
    searchTerm: filterFromUrl?.searchTerm ?? filterFromStorage?.searchTerm,
    source: filterFromUrl?.source ?? filterFromStorage?.source,
    tags: filterFromUrl?.tags ?? filterFromStorage?.tags,
    enabled: filterFromUrl?.enabled ?? filterFromStorage?.enabled,
    ruleExecutionStatus:
      filterFromUrl?.ruleExecutionStatus ?? filterFromStorage?.ruleExecutionStatus,
  };

  const sortingFromUrl = safeParseResult(urlState, RulesTableSavedSorting);
  const sortingFromStorage = safeParseResult(storageState, RulesTableSavedSorting);
  const sorting = {
    field: sortingFromUrl?.field ?? sortingFromStorage?.field,
    order: sortingFromUrl?.order ?? sortingFromStorage?.order,
  } as const;

  const paginationFromUrl = safeParseResult(urlState, RulesTableUrlSavedPagination);
  const paginationFromStorage = safeParseResult(storageState, RulesTableStorageSavedPagination);
  const pagination = {
    page: paginationFromUrl?.page, // We don't persist page number in the session storage since it may be outdated when restored
    perPage: paginationFromUrl?.perPage ?? paginationFromStorage?.perPage,
  };

  if (
    pagination.perPage &&
    (pagination.perPage < 0 || pagination.perPage > RULES_TABLE_MAX_PAGE_SIZE)
  ) {
    delete pagination.perPage;
  }

  return [filter, sorting, pagination];
}
