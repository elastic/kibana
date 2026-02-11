/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationFilters } from '../../../../../../common/siem_migrations/rules/types';

export const validateSelection = (
  selection: Pick<RuleMigrationFilters, 'ids'>
): RuleMigrationFilters => {
  if ('ids' in selection && selection.ids && selection.ids.length > 0) {
    return { ids: selection.ids };
  }
  throw new Error('Invalid selection: ids must be a non-empty array');
};
