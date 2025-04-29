/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TablesAdapter } from '@kbn/expressions-plugin/common';

import { getTotalCountFromTables } from './get_total_count_from_tables';

const createTablesAdapter = ({ repeatTimes = 1 } = {}): TablesAdapter => {
  return {
    tables: {
      ...Array.from({ length: repeatTimes }, (_, i) => ({
        [`layer-id-${i}`]: {
          meta: {
            statistics: {
              totalCount: 10,
            },
          },
        },
      })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
    },
  } as unknown as TablesAdapter;
};

describe('getTotalCountFromTables', () => {
  describe('when tablesAdapter is undefined', () => {
    it('returns undefined', () => {
      const result = getTotalCountFromTables();
      expect(result).toBeUndefined();
    });
  });

  describe('when tables is present', () => {
    it('returns the total count from all layers', () => {
      const result = getTotalCountFromTables(createTablesAdapter({ repeatTimes: 2 }));
      expect(result).toEqual(20);
    });
  });
});
