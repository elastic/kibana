/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertIndexNoResults } from '../../../mock/pattern_rollup/mock_alerts_pattern_rollup';
import {
  auditbeatNoResults,
  auditbeatWithAllResults,
} from '../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import {
  packetbeatNoResults,
  packetbeatWithSomeErrors,
} from '../../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import { DataQualityCheckResult, PatternRollup } from '../../../types';
import {
  getErrorSummaries,
  getErrorSummariesForRollup,
  getErrorSummary,
} from './get_error_summaries';

describe('getErrorSummary', () => {
  test('it returns the expected error summary', () => {
    const resultWithError: DataQualityCheckResult = {
      docsCount: 1630289,
      error:
        'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
      ilmPhase: 'hot',
      incompatible: undefined,
      indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
      markdownComments: ['foo', 'bar', 'baz'],
      pattern: 'packetbeat-*',
      sameFamily: 0,
      checkedAt: Date.now(),
    };

    expect(getErrorSummary(resultWithError)).toEqual({
      error:
        'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
      indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
      pattern: 'packetbeat-*',
    });
  });
});

describe('getErrorSummariesForRollup', () => {
  test('it returns the expected array of `ErrorSummary` when the `PatternRollup` contains errors', () => {
    expect(getErrorSummariesForRollup(packetbeatWithSomeErrors)).toEqual([
      {
        error:
          'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        pattern: 'packetbeat-*',
      },
    ]);
  });

  test('it returns the an empty array of `ErrorSummary` when the `PatternRollup` contains all results, with NO errors', () => {
    expect(getErrorSummariesForRollup(auditbeatWithAllResults)).toEqual([]);
  });

  test('it returns the an empty array of `ErrorSummary` when the `PatternRollup` has NO results', () => {
    expect(getErrorSummariesForRollup(auditbeatNoResults)).toEqual([]);
  });

  test('it returns the an empty array of `ErrorSummary` when the `PatternRollup` is undefined', () => {
    expect(getErrorSummariesForRollup(undefined)).toEqual([]);
  });

  test('it returns BOTH the expected (root) pattern-level error, and an index-level error when `PatternRollup` has both', () => {
    const withPatternLevelError: PatternRollup = {
      ...packetbeatWithSomeErrors,
      error: 'This is a pattern-level error',
    };

    expect(getErrorSummariesForRollup(withPatternLevelError)).toEqual([
      {
        error: 'This is a pattern-level error',
        indexName: null,
        pattern: 'packetbeat-*',
      },
      {
        error:
          'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        pattern: 'packetbeat-*',
      },
    ]);
  });

  test('it returns the expected (root) pattern-level error when there are no index-level results', () => {
    const withPatternLevelError: PatternRollup = {
      ...auditbeatNoResults,
      error: 'This is a pattern-level error',
    };

    expect(getErrorSummariesForRollup(withPatternLevelError)).toEqual([
      {
        error: 'This is a pattern-level error',
        indexName: null,
        pattern: 'auditbeat-*',
      },
    ]);
  });
});

describe('getErrorSummaries', () => {
  test('it returns an empty array when patternRollups is empty', () => {
    expect(getErrorSummaries({})).toEqual([]);
  });

  test('it returns an empty array when none of the patternRollups have errors', () => {
    expect(
      getErrorSummaries({
        '.alerts-security.alerts-default': alertIndexNoResults,
        'auditbeat-*': auditbeatWithAllResults,
        'packetbeat-*': packetbeatNoResults,
      })
    ).toEqual([]);
  });

  test('it returns the expected array of `ErrorSummary` when some of the `PatternRollup` contain errors', () => {
    expect(
      getErrorSummaries({
        '.alerts-security.alerts-default': alertIndexNoResults,
        'auditbeat-*': auditbeatWithAllResults,
        'packetbeat-*': packetbeatWithSomeErrors, // <-- has errors
      })
    ).toEqual([
      {
        error:
          'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        pattern: 'packetbeat-*',
      },
    ]);
  });

  test('it returns the expected array of `ErrorSummary` when there are both pattern-level and index-level errors', () => {
    const withPatternLevelError: PatternRollup = {
      ...auditbeatNoResults,
      error: 'This is a pattern-level error',
    };

    expect(
      getErrorSummaries({
        '.alerts-security.alerts-default': alertIndexNoResults,
        'auditbeat-*': withPatternLevelError, // <-- has pattern-level errors
        'packetbeat-*': packetbeatWithSomeErrors, // <-- has index-level errors
      })
    ).toEqual([
      {
        error: 'This is a pattern-level error',
        indexName: null,
        pattern: 'auditbeat-*',
      },
      {
        error:
          'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        pattern: 'packetbeat-*',
      },
    ]);
  });

  test('it returns the expected array of `ErrorSummary` when there are just pattern-level errors', () => {
    const withPatternLevelError: PatternRollup = {
      ...auditbeatNoResults,
      error: 'This is a pattern-level error',
    };

    expect(
      getErrorSummaries({
        '.alerts-security.alerts-default': alertIndexNoResults,
        'auditbeat-*': withPatternLevelError, // <-- has pattern-level errors
        'packetbeat-*': packetbeatNoResults,
      })
    ).toEqual([
      {
        error: 'This is a pattern-level error',
        indexName: null,
        pattern: 'auditbeat-*',
      },
    ]);
  });
});
