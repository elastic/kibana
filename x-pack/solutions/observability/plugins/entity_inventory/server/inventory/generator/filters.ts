/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canonicalizeEsqlFilter as canonicalizeFilter } from '@kbn/entity-store/common';
import { InventoryDefinitionError } from './errors';

/**
 * Re-prints an author-written filter from its syntax tree; only that canonical text is ever placed
 * in a query. Registration groups metric filters by the same text.
 *
 * @throws InventoryDefinitionError naming `label` when the filter is not acceptable
 */
export const canonicalizeEsqlFilter = (filter: string, label: string = 'source filter'): string => {
  const canonical = canonicalizeFilter(filter, label);
  if (!canonical.ok) {
    throw new InventoryDefinitionError(canonical.message);
  }
  return canonical.filter;
};
