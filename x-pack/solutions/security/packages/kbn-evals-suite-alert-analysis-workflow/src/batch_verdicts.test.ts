/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import {
  analyzeBatchVerdicts,
  integrityChecks,
  uniqueMarkers,
  type BatchAlertRef,
  type RawVerdictLike,
} from './batch_verdicts';
import {
  batchClassificationAccuracy,
  batchVerdictCoverage,
  batchVerdictCorrespondence,
  batchVerdictIntegrity,
  type BatchTaskOutput,
} from './evaluators';

const ALERTS: BatchAlertRef[] = [
  { id: 'a-1', expected: 'true_positive', markers: ['ws-fin-01', 'badbin1.exe'] },
  { id: 'a-2', expected: 'false_positive', markers: ['ws-dev-02', 'scan-02.zip'] },
  { id: 'a-3', expected: 'true_positive', markers: ['ws-eng-03', 'badbin3.exe'] },
];

const verdict = (id: string, classification: string, rationale: string): RawVerdictLike => ({
  id,
  classification,
  rationale,
});

/** One clean verdict per alert, each naming only its own alert's evidence. */
const CLEAN: RawVerdictLike[] = [
  verdict('a-1', 'true_positive', 'Unsigned badbin1.exe on ws-fin-01 injected into a process.'),
  verdict('a-2', 'false_positive', 'Signed Defender scan of scan-02.zip on ws-dev-02.'),
  verdict('a-3', 'true_positive', 'Unsigned badbin3.exe on ws-eng-03 spawned from Office.'),
];

const outputOf = (rawVerdicts: RawVerdictLike[]): BatchTaskOutput => ({
  alerts: ALERTS,
  rawVerdicts,
  executionId: 'exec-1',
  executionStatus: ExecutionStatus.COMPLETED,
  classificationMethod: 'agent',
});

const score = async (evaluator: typeof batchVerdictIntegrity, rawVerdicts: RawVerdictLike[]) =>
  evaluator.evaluate({ output: outputOf(rawVerdicts) } as never);

describe('analyzeBatchVerdicts', () => {
  it('reports a clean set with no anomalies', () => {
    const d = analyzeBatchVerdicts(ALERTS, CLEAN);
    expect(d.rawVerdictCount).toBe(3);
    expect(d.overGeneratedBy).toBe(0);
    expect(d.foreignIds).toEqual([]);
    expect(d.duplicateIds).toEqual([]);
    expect(d.missingIds).toEqual([]);
    expect(d.coverage).toBe(1);
    expect(d.orderMismatchCount).toBe(0);
    expect(d.contentMismatches).toEqual([]);
    expect(d.accuracy).toBe(1);
  });

  it('detects a duplicate id and over-generation', () => {
    const d = analyzeBatchVerdicts(ALERTS, [...CLEAN, CLEAN[0]]);
    expect(d.duplicateIds).toEqual(['a-1']);
    expect(d.rawVerdictCount).toBe(4);
    expect(d.overGeneratedBy).toBe(1);
  });

  it('pairs the FIRST verdict of a repeated id, as the workflow does', () => {
    const conflicting = [
      verdict('a-1', 'true_positive', 'badbin1.exe on ws-fin-01'),
      CLEAN[1],
      CLEAN[2],
      verdict('a-1', 'false_positive', 'badbin1.exe on ws-fin-01'),
    ];
    const d = analyzeBatchVerdicts(ALERTS, conflicting);
    expect(d.predictions['a-1']).toBe('true_positive');
    expect(d.accuracy).toBe(1);
  });

  it('detects a foreign id', () => {
    const d = analyzeBatchVerdicts(ALERTS, [
      ...CLEAN.slice(0, 2),
      verdict('zzz', 'true_positive', ''),
    ]);
    expect(d.foreignIds).toEqual(['zzz']);
    expect(d.missingIds).toEqual(['a-3']);
  });

  it('detects a missing alert and reports partial coverage', () => {
    const d = analyzeBatchVerdicts(ALERTS, CLEAN.slice(0, 2));
    expect(d.missingIds).toEqual(['a-3']);
    expect(d.coverage).toBeCloseTo(2 / 3);
  });

  it('flags a verdict whose id is a REAL sibling but whose text describes another alert', () => {
    // The id swapped to a-2 while the rationale still describes alert a-1's evidence.
    const swapped = [
      verdict('a-2', 'true_positive', 'Unsigned badbin1.exe on ws-fin-01 injected into a process.'),
      CLEAN[1],
      CLEAN[2],
    ];
    const d = analyzeBatchVerdicts(ALERTS, swapped);
    // The id-membership check still passes: this is exactly the case it cannot see.
    expect(d.foreignIds).toEqual([]);
    expect(d.contentMismatches).toEqual([{ id: 'a-2', describedOtherAlertIds: ['a-1'] }]);
  });

  it('records verdict order versus alert order', () => {
    const d = analyzeBatchVerdicts(ALERTS, [CLEAN[1], CLEAN[0], CLEAN[2]]);
    expect(d.orderMismatchCount).toBe(2);
  });

  it('does not decide correspondence for a verdict that names no alert evidence', () => {
    const d = analyzeBatchVerdicts(ALERTS, [
      verdict('a-1', 'true_positive', 'Looks malicious.'),
      CLEAN[1],
      CLEAN[2],
    ]);
    expect(d.contentMismatches).toEqual([]);
    expect(d.undeterminedVerdicts).toBe(1);
  });

  it('ignores markers shared between alerts', () => {
    const shared: BatchAlertRef[] = [
      { id: 's-1', expected: 'true_positive', markers: ['msmpeng.exe', 'host-1'] },
      { id: 's-2', expected: 'true_positive', markers: ['msmpeng.exe', 'host-2'] },
    ];
    expect(uniqueMarkers(shared)).toEqual([
      { id: 's-1', markers: ['host-1'] },
      { id: 's-2', markers: ['host-2'] },
    ]);
  });
});

describe('batch evaluators', () => {
  it('integrity passes a clean set', async () => {
    expect((await score(batchVerdictIntegrity, CLEAN)).score).toBe(1);
  });

  it('integrity fails on a duplicate id', async () => {
    const result = await score(batchVerdictIntegrity, [...CLEAN, CLEAN[0]]);
    expect(result.score).toBe(0);
    expect(result.label).toContain('noDuplicates');
    expect(result.label).toContain('countMatches');
  });

  it('integrity fails on a foreign id', async () => {
    const result = await score(batchVerdictIntegrity, [
      ...CLEAN.slice(0, 2),
      verdict('zzz', 'true_positive', ''),
    ]);
    expect(result.score).toBe(0);
    expect(result.label).toContain('noForeignIds');
  });

  it('integrity fails on a missing verdict', async () => {
    const result = await score(batchVerdictIntegrity, CLEAN.slice(0, 2));
    expect(result.score).toBe(0);
    expect(result.label).toContain('fullCoverage');
  });

  it('integrity fails on an empty verdict array instead of returning N/A', async () => {
    expect((await score(batchVerdictIntegrity, [])).score).toBe(0);
  });

  it('coverage is the fraction of alerts answered', async () => {
    expect((await score(batchVerdictCoverage, CLEAN)).score).toBe(1);
    expect((await score(batchVerdictCoverage, CLEAN.slice(0, 1))).score).toBeCloseTo(1 / 3);
  });

  it('correspondence passes a clean set and fails a sibling-id swap', async () => {
    expect((await score(batchVerdictCorrespondence, CLEAN)).score).toBe(1);
    const swapped = [
      verdict('a-2', 'true_positive', 'Unsigned badbin1.exe on ws-fin-01 injected.'),
      CLEAN[1],
      CLEAN[2],
    ];
    const result = await score(batchVerdictCorrespondence, swapped);
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ contentMismatchCount: 1 });
  });

  it('accuracy is the fraction of alerts carrying the golden label', async () => {
    const wrong = [verdict('a-1', 'false_positive', 'badbin1.exe'), CLEAN[1], CLEAN[2]];
    expect((await score(batchClassificationAccuracy, wrong)).score).toBeCloseTo(2 / 3);
  });
});

describe('integrityChecks', () => {
  it('names each failed check independently', () => {
    const base = analyzeBatchVerdicts(ALERTS, CLEAN);
    expect(integrityChecks(base)).toEqual({
      countMatches: true,
      noDuplicates: true,
      noForeignIds: true,
      fullCoverage: true,
    });
    expect(integrityChecks(analyzeBatchVerdicts(ALERTS, [...CLEAN, CLEAN[0]])).noDuplicates).toBe(
      false
    );
  });
});
