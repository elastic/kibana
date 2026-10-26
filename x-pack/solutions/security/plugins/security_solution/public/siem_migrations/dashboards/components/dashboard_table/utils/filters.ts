/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterOptionsBase } from '../../../../common/types';
import { StatusFilterBase } from '../../../../common/types';
import type { DashboardMigrationFilters } from '../../../../../../common/siem_migrations/dashboards/types';

const STATUS_FILTERS: Record<StatusFilterBase, DashboardMigrationFilters> = {
  [StatusFilterBase.FAILED]: { failed: true },
  [StatusFilterBase.INSTALLED]: { installed: true },
  [StatusFilterBase.TRANSLATED]: { installed: false, fullyTranslated: true, failed: false },
  [StatusFilterBase.PARTIALLY_TRANSLATED]: {
    installed: false,
    partiallyTranslated: true,
    failed: false,
  },
  [StatusFilterBase.UNTRANSLATABLE]: { untranslatable: true, failed: false },
};

export const convertFilterOptions = (filterOptions?: FilterOptionsBase) => {
  const filters: DashboardMigrationFilters = {};
  if (filterOptions?.status) {
    Object.assign(filters, STATUS_FILTERS[filterOptions.status]);
  }
  return filters;
};
