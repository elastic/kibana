/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TablesAdapter } from '@kbn/expressions-plugin/common';

export function getTotalCountFromTables(tables: TablesAdapter['tables']): number {
  return Object.values(tables).reduce((acc, table) => {
    if (table?.meta?.statistics?.totalCount != null) {
      return acc + table.meta.statistics.totalCount;
    }
    return acc;
  }, 0);
}
