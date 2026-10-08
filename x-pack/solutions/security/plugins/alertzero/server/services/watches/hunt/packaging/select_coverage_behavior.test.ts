/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageReportBehavior } from '../../../../../common/step_types/package_report';
import {
  MAX_VALIDATED_ESQL_CHARS,
  selectCoverageBehavior,
  toCoverageBehaviors,
} from './select_coverage_behavior';
import type { CoverageBehavior } from './types';

const ESQL = 'FROM logs-aws.cloudtrail-*\n| WHERE event.action == "ConsoleLogin"\n| LIMIT 25';

const behavior = (overrides: Partial<CoverageBehavior> = {}): CoverageBehavior => ({
  techniqueId: 'T1110.003',
  confidence: 0.92,
  validatedEsql: ESQL,
  rowCount: 0,
  hit: false,
  ...overrides,
});

const coordinatorBehavior = (
  overrides: Partial<PackageReportBehavior> = {}
): PackageReportBehavior => ({
  technique_id: 'T1110.003',
  confidence: 0.92,
  validated_esql: ESQL,
  execution: { executed: true, row_count: 0, hit: false },
  ...overrides,
});

describe('toCoverageBehaviors', () => {
  it('keeps a behavior that executed with a FROM', () => {
    expect(toCoverageBehaviors([coordinatorBehavior()])).toHaveLength(1);
  });

  it('drops a behavior that did not execute', () => {
    expect(
      toCoverageBehaviors([
        coordinatorBehavior({ execution: { executed: false, row_count: 0, hit: false } }),
      ])
    ).toEqual([]);
  });

  it('drops the unavailable placeholder, which has no FROM', () => {
    expect(
      toCoverageBehaviors([
        coordinatorBehavior({
          validated_esql: '// Grounded ES|QL generation unavailable for T1110.003',
        }),
      ])
    ).toEqual([]);
  });

  it('does not take a comment that says "from" for a FROM command', () => {
    expect(
      toCoverageBehaviors([
        coordinatorBehavior({ validated_esql: '// Generated from hunt.hunt_behavior\nROW a = 1' }),
      ])
    ).toEqual([]);
  });
});

describe('selectCoverageBehavior', () => {
  it('returns executed_no_rows for a behavior that matched nothing', () => {
    expect(selectCoverageBehavior({ behaviors: [behavior()] }).esqlStatus).toBe('executed_no_rows');
  });

  it('returns executed_hit for a behavior that matched', () => {
    expect(
      selectCoverageBehavior({ behaviors: [behavior({ hit: true, rowCount: 2 })] }).esqlStatus
    ).toBe('executed_hit');
  });

  it('returns the query unsliced', () => {
    expect(selectCoverageBehavior({ behaviors: [behavior()] }).validatedEsql).toBe(ESQL);
  });

  it('prefers the behavior with the most rows for a technique', () => {
    expect(
      selectCoverageBehavior({
        techniqueId: 'T1110.003',
        behaviors: [
          behavior({ validatedEsql: 'FROM a-* | LIMIT 1', rowCount: 1, confidence: 0.99 }),
          behavior({ validatedEsql: 'FROM b-* | LIMIT 1', rowCount: 5, confidence: 0.5 }),
        ],
      }).validatedEsql
    ).toBe('FROM b-* | LIMIT 1');
  });

  it('prefers the highest confidence for the report-scoped subject', () => {
    expect(
      selectCoverageBehavior({
        behaviors: [
          behavior({ techniqueId: 'T1110', validatedEsql: 'FROM a-* | LIMIT 1', confidence: 0.4 }),
          behavior({ techniqueId: 'T1110.003', validatedEsql: 'FROM b-* | LIMIT 1' }),
        ],
      }).validatedEsql
    ).toBe('FROM b-* | LIMIT 1');
  });

  it('returns none_executed for a technique with no behavior', () => {
    expect(
      selectCoverageBehavior({ techniqueId: 'T9999', behaviors: [behavior()] }).omittedReason
    ).toBe('none_executed');
  });

  it('omits rather than slices a query over the CE cap', () => {
    const tooLong = behavior({
      validatedEsql: `FROM a-*\n| WHERE x == "${'y'.repeat(MAX_VALIDATED_ESQL_CHARS)}"`,
    });
    expect(selectCoverageBehavior({ behaviors: [tooLong] }).omittedReason).toBe('too_long');
  });
});
