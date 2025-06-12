/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationFilters } from '../../../../../../common/siem_migrations/types';
import type { FilterOptions } from '../../../types';
import { AuthorFilter, StatusFilter } from '../../../types';

const AUTHOR_FILTERS: Record<AuthorFilter, RuleMigrationFilters> = {
  [AuthorFilter.ELASTIC]: { prebuilt: true },
  [AuthorFilter.CUSTOM]: { prebuilt: false },
};

const STATUS_FILTERS: Record<StatusFilter, RuleMigrationFilters> = {
  [StatusFilter.FAILED]: { failed: true },
  [StatusFilter.INSTALLED]: { installed: true },
  [StatusFilter.TRANSLATED]: { installed: false, fullyTranslated: true },
  [StatusFilter.PARTIALLY_TRANSLATED]: { partiallyTranslated: true },
  [StatusFilter.UNTRANSLATABLE]: { untranslatable: true },
};

export const convertFilterOptions = (filterOptions?: FilterOptions) => {
  const filters: RuleMigrationFilters = {};
  if (filterOptions?.author) {
    Object.assign(filters, AUTHOR_FILTERS[filterOptions.author]);
  }
  if (filterOptions?.status) {
    Object.assign(filters, STATUS_FILTERS[filterOptions.status]);
  }
  return filters;
};
