/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultSort } from '../constants';
import { mockIlmExplain } from '../mock/ilm_explain/mock_ilm_explain';
import { mockStats } from '../mock/stats/mock_stats';
import { DataQualityCheckResult } from '../types';
import { getSummaryTableItems } from './get_summary_table_items';

describe('getSummaryTableItems', () => {
  const indexNames = [
    '.ds-packetbeat-8.6.1-2023.02.04-000001',
    '.ds-packetbeat-8.5.3-2023.02.04-000001',
    'auditbeat-custom-index-1',
  ];
  const pattern = 'auditbeat-*';
  const patternDocsCount = 4;
  const results: Record<string, DataQualityCheckResult> = {
    'auditbeat-custom-index-1': {
      docsCount: 4,
      error: null,
      ilmPhase: 'unmanaged',
      incompatible: 3,
      indexName: 'auditbeat-custom-index-1',
      markdownComments: [
        '### auditbeat-custom-index-1\n',
        '| Result | Index | Docs | Incompatible fields | ILM Phase |\n|--------|-------|------|---------------------|-----------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` |\n\n',
        '### **Incompatible fields** `3` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
        "#### 3 incompatible fields, 0 fields with mappings in the same family\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version 8.6.1.\n\nIncompatible fields with mappings in the same family have exactly the same search behavior but may have different space usage or performance characteristics.\n\nWhen an incompatible field is not in the same family:\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n",
        '\n#### Incompatible field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text`  |\n| source.ip | `ip` | `text`  |\n\n#### Incompatible field values - auditbeat-custom-index-1\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2),\n`theory` (1) |\n\n',
      ],
      pattern: 'auditbeat-*',
      sameFamily: 0,
      checkedAt: 1706526408000,
    },
  };
  const isILMAvailable = true;

  test('it returns the expected summary table items', () => {
    expect(
      getSummaryTableItems({
        ilmExplain: mockIlmExplain,
        indexNames,
        isILMAvailable,
        pattern,
        patternDocsCount,
        results,
        sortByColumn: defaultSort.sort.field,
        sortByDirection: defaultSort.sort.direction,
        stats: mockStats,
      })
    ).toEqual([
      {
        docsCount: 1630289,
        ilmPhase: 'hot',
        incompatible: undefined,
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        pattern: 'auditbeat-*',
        patternDocsCount: 4,
        sizeInBytes: 733175040,
        checkedAt: undefined,
      },
      {
        docsCount: 1628343,
        ilmPhase: 'hot',
        incompatible: undefined,
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        pattern: 'auditbeat-*',
        patternDocsCount: 4,
        sizeInBytes: 731583142,
        checkedAt: undefined,
      },
      {
        docsCount: 4,
        ilmPhase: 'unmanaged',
        incompatible: 3,
        indexName: 'auditbeat-custom-index-1',
        pattern: 'auditbeat-*',
        patternDocsCount: 4,
        sizeInBytes: 28413,
        checkedAt: 1706526408000,
      },
    ]);
  });

  test('it returns the expected summary table items when isILMAvailable is false', () => {
    expect(
      getSummaryTableItems({
        ilmExplain: mockIlmExplain,
        indexNames,
        isILMAvailable: false,
        pattern,
        patternDocsCount,
        results,
        sortByColumn: defaultSort.sort.field,
        sortByDirection: defaultSort.sort.direction,
        stats: mockStats,
      })
    ).toEqual([
      {
        docsCount: 1630289,
        ilmPhase: undefined,
        incompatible: undefined,
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        pattern: 'auditbeat-*',
        patternDocsCount: 4,
        sizeInBytes: 733175040,
        checkedAt: undefined,
      },
      {
        docsCount: 1628343,
        ilmPhase: undefined,
        incompatible: undefined,
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        pattern: 'auditbeat-*',
        patternDocsCount: 4,
        sizeInBytes: 731583142,
        checkedAt: undefined,
      },
      {
        docsCount: 4,
        ilmPhase: undefined,
        incompatible: 3,
        indexName: 'auditbeat-custom-index-1',
        pattern: 'auditbeat-*',
        patternDocsCount: 4,
        sizeInBytes: 28413,
        checkedAt: 1706526408000,
      },
    ]);
  });

  test('it returns the expected summary table items when `sortByDirection` is ascending', () => {
    expect(
      getSummaryTableItems({
        ilmExplain: mockIlmExplain,
        indexNames,
        isILMAvailable,
        pattern,
        patternDocsCount,
        results,
        sortByColumn: defaultSort.sort.field,
        sortByDirection: 'asc', // <-- ascending
        stats: mockStats,
      })
    ).toEqual([
      {
        docsCount: 4,
        ilmPhase: 'unmanaged',
        incompatible: 3,
        indexName: 'auditbeat-custom-index-1',
        pattern: 'auditbeat-*',
        patternDocsCount: 4,
        sizeInBytes: 28413,
        checkedAt: 1706526408000,
      },
      {
        docsCount: 1628343,
        ilmPhase: 'hot',
        incompatible: undefined,
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        pattern: 'auditbeat-*',
        patternDocsCount: 4,
        sizeInBytes: 731583142,
        checkedAt: undefined,
      },
      {
        docsCount: 1630289,
        ilmPhase: 'hot',
        incompatible: undefined,
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        pattern: 'auditbeat-*',
        patternDocsCount: 4,
        sizeInBytes: 733175040,
        checkedAt: undefined,
      },
    ]);
  });

  test('it returns the expected summary table items when data is unavailable', () => {
    expect(
      getSummaryTableItems({
        ilmExplain: null, // <-- no data
        indexNames,
        isILMAvailable,
        pattern,
        patternDocsCount,
        results: undefined, // <-- no data
        sortByColumn: defaultSort.sort.field,
        sortByDirection: defaultSort.sort.direction,
        stats: null, // <-- no data
      })
    ).toEqual([
      {
        docsCount: 0,
        ilmPhase: undefined,
        incompatible: undefined,
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        pattern: 'auditbeat-*',
        patternDocsCount: 4,
        sizeInBytes: undefined,
        checkedAt: undefined,
      },
      {
        docsCount: 0,
        ilmPhase: undefined,
        incompatible: undefined,
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        pattern: 'auditbeat-*',
        patternDocsCount: 4,
        sizeInBytes: undefined,
        checkedAt: undefined,
      },
      {
        docsCount: 0,
        ilmPhase: undefined,
        incompatible: undefined,
        indexName: 'auditbeat-custom-index-1',
        pattern: 'auditbeat-*',
        patternDocsCount: 4,
        sizeInBytes: undefined,
        checkedAt: undefined,
      },
    ]);
  });
});
