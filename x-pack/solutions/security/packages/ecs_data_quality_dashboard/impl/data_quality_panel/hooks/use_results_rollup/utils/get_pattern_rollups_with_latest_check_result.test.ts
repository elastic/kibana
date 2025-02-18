/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';

import { getPatternRollupsWithLatestCheckResult } from './get_pattern_rollups_with_latest_check_result';
import { mockPacketbeatPatternRollup } from '../../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import { MeteringStatsIndex, PatternRollup } from '../../../types';
import { EMPTY_STAT } from '../../../constants';
import { mockPartitionedFieldMetadata } from '../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import { EcsVersion } from '@elastic/ecs';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

let originalFetch: (typeof global)['fetch'];

beforeAll(() => {
  originalFetch = global.fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('updateResultOnCheckCompleted', () => {
  const packetbeatStats861: MeteringStatsIndex =
    mockPacketbeatPatternRollup.stats != null
      ? mockPacketbeatPatternRollup.stats['.ds-packetbeat-8.6.1-2023.02.04-000001']
      : ({} as MeteringStatsIndex);
  const packetbeatStats853: MeteringStatsIndex =
    mockPacketbeatPatternRollup.stats != null
      ? mockPacketbeatPatternRollup.stats['.ds-packetbeat-8.5.3-2023.02.04-000001']
      : ({} as MeteringStatsIndex);

  test('it returns the updated rollups', () => {
    expect(
      getPatternRollupsWithLatestCheckResult({
        error: null,
        formatBytes,
        formatNumber,
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        isILMAvailable: true,
        partitionedFieldMetadata: mockPartitionedFieldMetadata,
        pattern: 'packetbeat-*',
        patternRollups: {
          'packetbeat-*': mockPacketbeatPatternRollup,
        },
      })
    ).toEqual({
      'packetbeat-*': {
        docsCount: 3258632,
        error: null,
        ilmExplain: {
          '.ds-packetbeat-8.6.1-2023.02.04-000001': {
            index: '.ds-packetbeat-8.6.1-2023.02.04-000001',
            managed: true,
            policy: 'packetbeat',
            index_creation_date_millis: 1675536751379,
            time_since_index_creation: '25.26d',
            lifecycle_date_millis: 1675536751379,
            age: '25.26d',
            phase: 'hot',
            phase_time_millis: 1675536751809,
            action: 'rollover',
            action_time_millis: 1675536751809,
            step: 'check-rollover-ready',
            step_time_millis: 1675536751809,
            phase_execution: {
              policy: 'packetbeat',
              version: 1,
              modified_date_in_millis: 1675536751205,
            },
          },
          '.ds-packetbeat-8.5.3-2023.02.04-000001': {
            index: '.ds-packetbeat-8.5.3-2023.02.04-000001',
            managed: true,
            policy: 'packetbeat',
            index_creation_date_millis: 1675536774084,
            time_since_index_creation: '25.26d',
            lifecycle_date_millis: 1675536774084,
            age: '25.26d',
            phase: 'hot',
            phase_time_millis: 1675536774416,
            action: 'rollover',
            action_time_millis: 1675536774416,
            step: 'check-rollover-ready',
            step_time_millis: 1675536774416,
            phase_execution: {
              policy: 'packetbeat',
              version: 1,
              modified_date_in_millis: 1675536751205,
            },
          },
        },
        ilmExplainPhaseCounts: {
          hot: 2,
          warm: 0,
          cold: 0,
          frozen: 0,
          unmanaged: 0,
        },
        indices: 2,
        pattern: 'packetbeat-*',
        results: {
          '.ds-packetbeat-8.6.1-2023.02.04-000001': {
            docsCount: 1628343,
            error: null,
            ilmPhase: 'hot',
            incompatible: 3,
            indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
            markdownComments: [
              '### .ds-packetbeat-8.6.1-2023.02.04-000001\n',
              '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | .ds-packetbeat-8.6.1-2023.02.04-000001 | 1,628,343 (50.0%) | 3 | `hot` | 697.7MB |\n\n',
              '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
              `#### 3 incompatible fields\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.\n\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n`,
              '\n#### Incompatible field mappings - .ds-packetbeat-8.6.1-2023.02.04-000001\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text` |\n| source.ip | `ip` | `text` |\n\n#### Incompatible field values - .ds-packetbeat-8.6.1-2023.02.04-000001\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2), `theory` (1) |\n\n',
            ],
            pattern: 'packetbeat-*',
            sameFamily: 0,
            checkedAt: expect.any(Number),
          },
        },
        sizeInBytes: 1464758182,
        stats: {
          '.ds-packetbeat-8.6.1-2023.02.04-000001': packetbeatStats861,
          '.ds-packetbeat-8.5.3-2023.02.04-000001': packetbeatStats853,
        },
      },
    });
  });

  test('it returns the expected results when `patternRollup` does NOT have a `docsCount`', () => {
    const noDocsCount = {
      ...mockPacketbeatPatternRollup,
      docsCount: undefined, // <--
    };

    expect(
      getPatternRollupsWithLatestCheckResult({
        error: null,
        formatBytes,
        formatNumber,
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        isILMAvailable: true,
        partitionedFieldMetadata: mockPartitionedFieldMetadata,
        pattern: 'packetbeat-*',
        patternRollups: {
          'packetbeat-*': noDocsCount,
        },
      })
    ).toEqual({
      'packetbeat-*': {
        docsCount: undefined, // <--
        error: null,
        ilmExplain: {
          '.ds-packetbeat-8.6.1-2023.02.04-000001': {
            index: '.ds-packetbeat-8.6.1-2023.02.04-000001',
            managed: true,
            policy: 'packetbeat',
            index_creation_date_millis: 1675536751379,
            time_since_index_creation: '25.26d',
            lifecycle_date_millis: 1675536751379,
            age: '25.26d',
            phase: 'hot',
            phase_time_millis: 1675536751809,
            action: 'rollover',
            action_time_millis: 1675536751809,
            step: 'check-rollover-ready',
            step_time_millis: 1675536751809,
            phase_execution: {
              policy: 'packetbeat',
              version: 1,
              modified_date_in_millis: 1675536751205,
            },
          },
          '.ds-packetbeat-8.5.3-2023.02.04-000001': {
            index: '.ds-packetbeat-8.5.3-2023.02.04-000001',
            managed: true,
            policy: 'packetbeat',
            index_creation_date_millis: 1675536774084,
            time_since_index_creation: '25.26d',
            lifecycle_date_millis: 1675536774084,
            age: '25.26d',
            phase: 'hot',
            phase_time_millis: 1675536774416,
            action: 'rollover',
            action_time_millis: 1675536774416,
            step: 'check-rollover-ready',
            step_time_millis: 1675536774416,
            phase_execution: {
              policy: 'packetbeat',
              version: 1,
              modified_date_in_millis: 1675536751205,
            },
          },
        },
        ilmExplainPhaseCounts: {
          hot: 2,
          warm: 0,
          cold: 0,
          frozen: 0,
          unmanaged: 0,
        },
        indices: 2,
        pattern: 'packetbeat-*',
        results: {
          '.ds-packetbeat-8.6.1-2023.02.04-000001': {
            docsCount: 1628343,
            error: null,
            ilmPhase: 'hot',
            incompatible: 3,
            indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
            markdownComments: [
              '### .ds-packetbeat-8.6.1-2023.02.04-000001\n',
              '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | .ds-packetbeat-8.6.1-2023.02.04-000001 | 1,628,343 | 3 | `hot` | 697.7MB |\n\n',
              '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
              `#### 3 incompatible fields\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.\n\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n`,
              '\n#### Incompatible field mappings - .ds-packetbeat-8.6.1-2023.02.04-000001\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text` |\n| source.ip | `ip` | `text` |\n\n#### Incompatible field values - .ds-packetbeat-8.6.1-2023.02.04-000001\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2), `theory` (1) |\n\n',
            ],
            pattern: 'packetbeat-*',
            sameFamily: 0,
            checkedAt: expect.any(Number),
          },
        },
        sizeInBytes: 1464758182,
        stats: {
          '.ds-packetbeat-8.6.1-2023.02.04-000001': packetbeatStats861,
          '.ds-packetbeat-8.5.3-2023.02.04-000001': packetbeatStats853,
        },
      },
    });
  });

  test('it returns the expected results when `partitionedFieldMetadata` is null', () => {
    expect(
      getPatternRollupsWithLatestCheckResult({
        error: null,
        formatBytes,
        formatNumber,
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        isILMAvailable: true,
        partitionedFieldMetadata: null, // <--
        pattern: 'packetbeat-*',
        patternRollups: {
          'packetbeat-*': mockPacketbeatPatternRollup,
        },
      })
    ).toEqual({
      'packetbeat-*': {
        docsCount: 3258632,
        error: null,
        ilmExplain: {
          '.ds-packetbeat-8.6.1-2023.02.04-000001': {
            index: '.ds-packetbeat-8.6.1-2023.02.04-000001',
            managed: true,
            policy: 'packetbeat',
            index_creation_date_millis: 1675536751379,
            time_since_index_creation: '25.26d',
            lifecycle_date_millis: 1675536751379,
            age: '25.26d',
            phase: 'hot',
            phase_time_millis: 1675536751809,
            action: 'rollover',
            action_time_millis: 1675536751809,
            step: 'check-rollover-ready',
            step_time_millis: 1675536751809,
            phase_execution: {
              policy: 'packetbeat',
              version: 1,
              modified_date_in_millis: 1675536751205,
            },
          },
          '.ds-packetbeat-8.5.3-2023.02.04-000001': {
            index: '.ds-packetbeat-8.5.3-2023.02.04-000001',
            managed: true,
            policy: 'packetbeat',
            index_creation_date_millis: 1675536774084,
            time_since_index_creation: '25.26d',
            lifecycle_date_millis: 1675536774084,
            age: '25.26d',
            phase: 'hot',
            phase_time_millis: 1675536774416,
            action: 'rollover',
            action_time_millis: 1675536774416,
            step: 'check-rollover-ready',
            step_time_millis: 1675536774416,
            phase_execution: {
              policy: 'packetbeat',
              version: 1,
              modified_date_in_millis: 1675536751205,
            },
          },
        },
        ilmExplainPhaseCounts: {
          hot: 2,
          warm: 0,
          cold: 0,
          frozen: 0,
          unmanaged: 0,
        },
        indices: 2,
        pattern: 'packetbeat-*',
        results: {
          '.ds-packetbeat-8.6.1-2023.02.04-000001': {
            docsCount: 1628343,
            error: null,
            ilmPhase: 'hot',
            incompatible: undefined,
            indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
            markdownComments: [],
            pattern: 'packetbeat-*',
            checkedAt: undefined,
          },
        },
        sizeInBytes: 1464758182,
        stats: {
          '.ds-packetbeat-8.6.1-2023.02.04-000001': packetbeatStats861,
          '.ds-packetbeat-8.5.3-2023.02.04-000001': packetbeatStats853,
        },
      },
    });
  });

  test('it returns the updated rollups when there is no `partitionedFieldMetadata`', () => {
    const noIlmExplain = {
      ...mockPacketbeatPatternRollup,
      ilmExplain: null,
    };

    expect(
      getPatternRollupsWithLatestCheckResult({
        error: null,
        formatBytes,
        formatNumber,
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        isILMAvailable: true,
        partitionedFieldMetadata: mockPartitionedFieldMetadata,
        pattern: 'packetbeat-*',
        patternRollups: {
          'packetbeat-*': noIlmExplain,
        },
      })
    ).toEqual({
      'packetbeat-*': {
        docsCount: 3258632,
        error: null,
        ilmExplain: null,
        ilmExplainPhaseCounts: {
          hot: 2,
          warm: 0,
          cold: 0,
          frozen: 0,
          unmanaged: 0,
        },
        indices: 2,
        pattern: 'packetbeat-*',
        results: {
          '.ds-packetbeat-8.6.1-2023.02.04-000001': {
            docsCount: 1628343,
            error: null,
            ilmPhase: undefined,
            incompatible: 3,
            indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
            markdownComments: [
              '### .ds-packetbeat-8.6.1-2023.02.04-000001\n',
              '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | .ds-packetbeat-8.6.1-2023.02.04-000001 | 1,628,343 (50.0%) | 3 | -- | 697.7MB |\n\n',
              '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
              `#### 3 incompatible fields\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.\n\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n`,
              '\n#### Incompatible field mappings - .ds-packetbeat-8.6.1-2023.02.04-000001\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text` |\n| source.ip | `ip` | `text` |\n\n#### Incompatible field values - .ds-packetbeat-8.6.1-2023.02.04-000001\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2), `theory` (1) |\n\n',
            ],
            pattern: 'packetbeat-*',
            sameFamily: 0,
            checkedAt: expect.any(Number),
          },
        },
        sizeInBytes: 1464758182,
        stats: {
          '.ds-packetbeat-8.6.1-2023.02.04-000001': packetbeatStats861,
          '.ds-packetbeat-8.5.3-2023.02.04-000001': packetbeatStats853,
        },
      },
    });
  });

  test('it returns the unmodified rollups when `pattern` is not a member of `patternRollups`', () => {
    const shouldNotBeModified: Record<string, PatternRollup> = {
      'packetbeat-*': mockPacketbeatPatternRollup,
    };

    expect(
      getPatternRollupsWithLatestCheckResult({
        error: null,
        formatBytes,
        formatNumber,
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        isILMAvailable: true,
        partitionedFieldMetadata: mockPartitionedFieldMetadata,
        pattern: 'this-pattern-is-not-in-pattern-rollups', // <--
        patternRollups: shouldNotBeModified,
      })
    ).toEqual(shouldNotBeModified);
  });
});
