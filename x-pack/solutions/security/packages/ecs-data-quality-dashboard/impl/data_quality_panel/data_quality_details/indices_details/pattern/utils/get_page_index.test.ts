/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDataQualityCheckResult } from '../../../../mock/data_quality_check_result/mock_index';
import { IndexSummaryTableItem } from '../../../../types';
import { getIndexIncompatible } from '../../../../utils/stats';
import { getPageIndex } from './get_page_index';

describe('helpers', () => {
  const indexName = '.ds-packetbeat-8.6.1-2023.02.04-000001';
  describe('getIndexIncompatible', () => {
    test('it returns undefined when `results` is undefined', () => {
      expect(
        getIndexIncompatible({
          indexName,
          results: undefined, // <--
        })
      ).toBeUndefined();
    });

    test('it returns undefined when `indexName` is not in the `results`', () => {
      expect(
        getIndexIncompatible({
          indexName: 'not_in_the_results', // <--
          results: mockDataQualityCheckResult,
        })
      ).toBeUndefined();
    });

    test('it returns the expected count', () => {
      expect(
        getIndexIncompatible({
          indexName: 'auditbeat-custom-index-1',
          results: mockDataQualityCheckResult,
        })
      ).toEqual(3);
    });
  });

  describe('getPageIndex', () => {
    const getPageIndexArgs: {
      indexName: string;
      items: IndexSummaryTableItem[];
      pageSize: number;
    } = {
      indexName: 'auditbeat-7.17.9-2023.04.09-000001', // <-- on page 2 of 3 (page index 1)
      items: [
        {
          docsCount: 48077,
          incompatible: undefined,
          indexName: 'auditbeat-7.14.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 43357342,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 48068,
          incompatible: undefined,
          indexName: 'auditbeat-7.3.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 32460397,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 48064,
          incompatible: undefined,
          indexName: 'auditbeat-7.11.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 42782794,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47868,
          incompatible: undefined,
          indexName: 'auditbeat-7.6.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 31575964,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47827,
          incompatible: 20,
          indexName: 'auditbeat-7.15.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 44130657,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47642,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.4.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 42412521,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47545,
          incompatible: undefined,
          indexName: 'auditbeat-7.16.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41423244,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47531,
          incompatible: undefined,
          indexName: 'auditbeat-7.5.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 32394133,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47530,
          incompatible: undefined,
          indexName: 'auditbeat-7.12.1-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 43015519,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47520,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.0.1-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 42230604,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47496,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.2.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41710968,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47486,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.5.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 42295944,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47486,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.3.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41761321,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47460,
          incompatible: undefined,
          indexName: 'auditbeat-7.2.1-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 30481198,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47439,
          incompatible: undefined,
          indexName: 'auditbeat-7.17.9-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41554041,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47395,
          incompatible: undefined,
          indexName: 'auditbeat-7.9.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 42815907,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47394,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.7.0-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41157112,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47372,
          incompatible: undefined,
          indexName: 'auditbeat-7.4.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 31626792,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47369,
          incompatible: undefined,
          indexName: 'auditbeat-7.13.4-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41828969,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47348,
          incompatible: undefined,
          indexName: 'auditbeat-7.7.1-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 40010773,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47339,
          incompatible: undefined,
          indexName: 'auditbeat-7.10.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 43480570,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47325,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.1.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41822475,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47294,
          incompatible: undefined,
          indexName: 'auditbeat-7.8.0-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 43018490,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 24276,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.6.1-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 23579440,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 4,
          incompatible: undefined,
          indexName: 'auditbeat-custom-index-1',
          ilmPhase: 'unmanaged',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 28409,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 0,
          incompatible: undefined,
          indexName: 'auditbeat-custom-empty-index-1',
          ilmPhase: 'unmanaged',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 247,
          checkedAt: 1706526408000,
        },
      ],
      pageSize: 10,
    };

    test('it returns the expected page index', () => {
      expect(getPageIndex(getPageIndexArgs)).toEqual(1);
    });

    test('it returns the expected page index for the first item', () => {
      const firstItemIndexName = 'auditbeat-7.14.2-2023.04.09-000001';

      expect(
        getPageIndex({
          ...getPageIndexArgs,
          indexName: firstItemIndexName,
        })
      ).toEqual(0);
    });

    test('it returns the expected page index for the last item', () => {
      const lastItemIndexName = 'auditbeat-custom-empty-index-1';

      expect(
        getPageIndex({
          ...getPageIndexArgs,
          indexName: lastItemIndexName,
        })
      ).toEqual(2);
    });

    test('it returns null when the index cannot be found', () => {
      expect(
        getPageIndex({
          ...getPageIndexArgs,
          indexName: 'does_not_exist', // <-- this index is not in the items
        })
      ).toBeNull();
    });

    test('it returns null when `pageSize` is zero', () => {
      expect(
        getPageIndex({
          ...getPageIndexArgs,
          pageSize: 0, // <-- invalid
        })
      ).toBeNull();
    });
  });
});
