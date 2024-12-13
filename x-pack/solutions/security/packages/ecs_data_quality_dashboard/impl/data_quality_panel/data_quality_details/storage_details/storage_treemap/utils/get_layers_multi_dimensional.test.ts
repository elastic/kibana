/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';

import { auditbeatWithAllResults } from '../../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { getFlattenedBuckets } from '../../utils/get_flattened_buckets';
import { getGroupFromPath, getLayersMultiDimensional } from './get_layers_multi_dimensional';
import { getPathToFlattenedBucketMap } from './get_path_to_flattened_bucket_map';
import { alertIndexWithAllResults } from '../../../../mock/pattern_rollup/mock_alerts_pattern_rollup';
import { packetbeatNoResults } from '../../../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import { PatternRollup } from '../../../../types';
import { EMPTY_STAT } from '../../../../constants';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const ilmPhases = ['hot', 'warm', 'unmanaged'];

const patternRollups: Record<string, PatternRollup> = {
  '.alerts-security.alerts-default': alertIndexWithAllResults,
  'auditbeat-*': auditbeatWithAllResults,
  'packetbeat-*': packetbeatNoResults,
};

describe('getGroupFromPath', () => {
  it('returns the expected group from the path', () => {
    expect(
      getGroupFromPath([
        {
          index: 0,
          value: '__null_small_multiples_key__',
        },
        {
          index: 0,
          value: '__root_key__',
        },
        {
          index: 0,
          value: 'auditbeat-*',
        },
        {
          index: 1,
          value: 'auditbeat-custom-empty-index-1',
        },
      ])
    ).toEqual('auditbeat-*');
  });

  it('returns undefined when path is an empty array', () => {
    expect(getGroupFromPath([])).toBeUndefined();
  });

  it('returns undefined when path is an array with only one value', () => {
    expect(getGroupFromPath([{ index: 0, value: '__null_small_multiples_key__' }])).toBeUndefined();
  });
});

describe('getLayersMultiDimensional', () => {
  const layer0FillColor = 'transparent';
  const flattenedBuckets = getFlattenedBuckets({
    ilmPhases,
    isILMAvailable: true,
    patternRollups,
  });
  const pathToFlattenedBucketMap = getPathToFlattenedBucketMap(flattenedBuckets);

  it('returns the expected number of layers', () => {
    expect(
      getLayersMultiDimensional({
        valueFormatter: formatBytes,
        layer0FillColor,
        pathToFlattenedBucketMap,
      }).length
    ).toEqual(2);
  });

  it('returns the expected fillLabel valueFormatter function', () => {
    getLayersMultiDimensional({
      valueFormatter: formatBytes,
      layer0FillColor,
      pathToFlattenedBucketMap,
    }).forEach((x) => expect(x.fillLabel.valueFormatter(123)).toEqual('123B'));
  });
});
