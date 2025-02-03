/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationRetryFilter } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationFilters } from '../../../../../../common/siem_migrations/types';

const RETRY_FILTERS: Record<RuleMigrationRetryFilter, RuleMigrationFilters> = {
  failed: { failed: true },
  not_fully_translated: { fullyTranslated: false },
};

export const getRetryFilter = (retryFilter: RuleMigrationRetryFilter): RuleMigrationFilters => {
  return RETRY_FILTERS[retryFilter];
};
