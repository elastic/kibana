/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PatternRollup } from '../../../../types';
import { alertIndexWithAllResults } from '../../../../mock/pattern_rollup/mock_alerts_pattern_rollup';
import { auditbeatWithAllResults } from '../../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { packetbeatNoResults } from '../../../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import { getPatternSizeInBytes } from './stats';

const patternRollups: Record<string, PatternRollup> = {
  '.alerts-security.alerts-default': alertIndexWithAllResults,
  'auditbeat-*': auditbeatWithAllResults,
  'packetbeat-*': packetbeatNoResults,
};

/** a valid `PatternRollup` that has an undefined `sizeInBytes` */
const noSizeInBytes: Record<string, PatternRollup> = {
  'valid-*': {
    docsCount: 19127,
    error: null,
    ilmExplain: null,
    ilmExplainPhaseCounts: {
      hot: 1,
      warm: 0,
      cold: 0,
      frozen: 0,
      unmanaged: 2,
    },
    indices: 3,
    pattern: 'valid-*',
    results: undefined,
    sizeInBytes: undefined, // <--
    stats: null,
  },
};

describe('getPatternSizeInBytes', () => {
  test('it returns the expected size when the pattern exists in the rollup', () => {
    const pattern = 'auditbeat-*';

    expect(getPatternSizeInBytes({ pattern, patternRollups })).toEqual(
      auditbeatWithAllResults.sizeInBytes
    );
  });

  test('it returns undefined when the pattern exists in the rollup, but does not have a sizeInBytes', () => {
    const pattern = 'valid-*';

    expect(getPatternSizeInBytes({ pattern, patternRollups: noSizeInBytes })).toBeUndefined();
  });

  test('it returns undefined when the pattern does NOT exist in the rollup', () => {
    const pattern = 'does-not-exist-*';

    expect(getPatternSizeInBytes({ pattern, patternRollups })).toBeUndefined();
  });
});
