/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusFilterBase } from '../../../../common/types';
import type { RuleMigrationFilters } from '../../../../../../common/siem_migrations/rules/types';
import type { RulesFilterOptions, RulesStatusFilter } from '../../../types';
import { AuthorFilter, RulesSpecificStatusFilter } from '../../../types';

const AUTHOR_FILTERS: Record<AuthorFilter, RuleMigrationFilters> = {
  [AuthorFilter.ELASTIC]: { prebuilt: true },
  [AuthorFilter.CUSTOM]: { prebuilt: false },
};

const STATUS_FILTERS: Record<RulesStatusFilter, RuleMigrationFilters> = {
  [StatusFilterBase.FAILED]: { failed: true },
  [StatusFilterBase.INSTALLED]: { installed: true },
  [StatusFilterBase.TRANSLATED]: { installed: false, fullyTranslated: true, failed: false },
  [StatusFilterBase.PARTIALLY_TRANSLATED]: { partiallyTranslated: true, failed: false },
  [StatusFilterBase.UNTRANSLATABLE]: { untranslatable: true, failed: false },
  [RulesSpecificStatusFilter.INDEX_PATTERN_MISSING]: { missingIndex: true },
};

export const convertFilterOptions = (filterOptions?: RulesFilterOptions) => {
  const filters: RuleMigrationFilters = {};
  if (filterOptions?.author) {
    Object.assign(filters, AUTHOR_FILTERS[filterOptions.author]);
  }
  if (filterOptions?.status) {
    Object.assign(filters, STATUS_FILTERS[filterOptions.status]);
  }
  return filters;
};
