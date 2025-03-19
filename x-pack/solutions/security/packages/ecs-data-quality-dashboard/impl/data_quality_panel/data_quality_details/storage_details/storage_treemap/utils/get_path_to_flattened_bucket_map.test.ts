/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PatternRollup } from '../../../../types';
import { getFlattenedBuckets } from '../../utils/get_flattened_buckets';
import { getPathToFlattenedBucketMap } from './get_path_to_flattened_bucket_map';
import { alertIndexWithAllResults } from '../../../../mock/pattern_rollup/mock_alerts_pattern_rollup';
import { auditbeatWithAllResults } from '../../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { packetbeatNoResults } from '../../../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';

const ilmPhases = ['hot', 'warm', 'unmanaged'];

const patternRollups: Record<string, PatternRollup> = {
  '.alerts-security.alerts-default': alertIndexWithAllResults,
  'auditbeat-*': auditbeatWithAllResults,
  'packetbeat-*': packetbeatNoResults,
};

describe('helpers', () => {
  describe('getPathToFlattenedBucketMap', () => {
    test('it returns the expected map', () => {
      const flattenedBuckets = getFlattenedBuckets({
        ilmPhases,
        isILMAvailable: true,
        patternRollups,
      });

      expect(getPathToFlattenedBucketMap(flattenedBuckets)).toEqual({
        '.alerts-security.alerts-default.internal.alerts-security.alerts-default-000001': {
          pattern: '.alerts-security.alerts-default',
          indexName: '.internal.alerts-security.alerts-default-000001',
          ilmPhase: 'hot',
          incompatible: 0,
          sizeInBytes: 0,
          docsCount: 26093,
        },
        'auditbeat-*.ds-auditbeat-8.6.1-2023.02.07-000001': {
          pattern: 'auditbeat-*',
          indexName: '.ds-auditbeat-8.6.1-2023.02.07-000001',
          ilmPhase: 'hot',
          incompatible: 0,
          sizeInBytes: 18791790,
          docsCount: 19123,
        },
        'auditbeat-*auditbeat-custom-empty-index-1': {
          pattern: 'auditbeat-*',
          indexName: 'auditbeat-custom-empty-index-1',
          ilmPhase: 'unmanaged',
          incompatible: 1,
          sizeInBytes: 247,
          docsCount: 0,
        },
        'auditbeat-*auditbeat-custom-index-1': {
          pattern: 'auditbeat-*',
          indexName: 'auditbeat-custom-index-1',
          ilmPhase: 'unmanaged',
          incompatible: 3,
          sizeInBytes: 28409,
          docsCount: 4,
        },
        'packetbeat-*.ds-packetbeat-8.6.1-2023.02.04-000001': {
          pattern: 'packetbeat-*',
          indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
          ilmPhase: 'hot',
          sizeInBytes: 512194751,
          docsCount: 1628343,
        },
        'packetbeat-*.ds-packetbeat-8.5.3-2023.02.04-000001': {
          docsCount: 1630289,
          pattern: 'packetbeat-*',
          indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
          ilmPhase: 'hot',
          sizeInBytes: 584326147,
        },
      });
    });
  });
});
