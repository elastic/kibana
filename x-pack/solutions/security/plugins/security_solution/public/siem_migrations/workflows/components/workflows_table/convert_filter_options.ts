/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterOptionsBase } from '../../../common/types';
import { StatusFilterBase } from '../../../common/types';
import type { SiemMigrationFilters } from '../../../../../common/siem_migrations/types';

// Installing workflows is not available yet, so there is no "installed" filter
const STATUS_FILTERS: Partial<Record<StatusFilterBase, SiemMigrationFilters>> = {
  [StatusFilterBase.FAILED]: { failed: true },
  [StatusFilterBase.TRANSLATED]: { fullyTranslated: true, failed: false },
  [StatusFilterBase.PARTIALLY_TRANSLATED]: { partiallyTranslated: true, failed: false },
  [StatusFilterBase.UNTRANSLATABLE]: { untranslatable: true, failed: false },
};

export const convertFilterOptions = (filterOptions?: FilterOptionsBase): SiemMigrationFilters => {
  const filters: SiemMigrationFilters = {};
  if (filterOptions?.status) {
    Object.assign(filters, STATUS_FILTERS[filterOptions.status]);
  }
  return filters;
};
