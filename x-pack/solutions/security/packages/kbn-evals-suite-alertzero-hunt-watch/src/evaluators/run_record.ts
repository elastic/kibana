/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorpusLabels } from '../datasets/labels';
import type { CoordinatorRun, ReportClass } from '../types';

/** What the harness records per (report, phase) example for the code evaluators. */
export interface HuntRunRecord {
  runKey: string;
  phase: 'E0' | 'E+' | 'E-';
  reportClass: string;
  sampleBase?: string;
  /** The minted report id the Worker was asked to hunt. */
  reportId?: string;
  /**
   * Set when this cell cannot be scored (no coordinator output, a per-batch
   * candidates violation). The example is still emitted so the denominator is
   * always METRICS_EXAMPLE_COUNT; every evaluator scores it null/INVALID.
   */
  invalid?: string;
  /** Coordinator output read from the run_hunt_coordinator step output. Empty object when `invalid`. */
  run: CoordinatorRun;
  /** seeded hit `_id`s (ES _id space), per tier. */
  tier1HitIds: string[];
  tier2HitIds: string[];
  tier1MatchedIocs?: Array<{ value: string; hitIds: string[] }>;
}

/** Control failures that make a cell INVALID (C1/C2/C3a and per-batch route violations). */
export interface CellControls {
  failures: Array<{ control: string; detail: string }>;
}

export interface InvalidVerdict {
  score: null;
  label: 'INVALID';
  explanation: string;
}

/**
 * The one INVALID-cell rule, applied by all four evaluators before they read
 * anything else: a flagged record or a non-empty `metadata.controls.failures`
 * yields score null (excluded from the mean, never defaulted to 0 or 1).
 */
export const invalidCellVerdict = (
  record: Pick<HuntRunRecord, 'invalid'>,
  metadata: { controls?: CellControls } | null | undefined
): InvalidVerdict | null => {
  if (record.invalid !== undefined) {
    return { score: null, label: 'INVALID', explanation: record.invalid };
  }
  const failures = metadata?.controls?.failures ?? [];
  if (failures.length > 0) {
    return {
      score: null,
      label: 'INVALID',
      explanation: failures.map((f) => `${f.control}: ${f.detail}`).join('; '),
    };
  }
  return null;
};

/** Per-example metadata every evaluator reads (one shape, so no evaluator needs a cast). */
export interface HuntMetadata extends Record<string, unknown> {
  labels: CorpusLabels;
  report_class: ReportClass;
  phase: HuntRunRecord['phase'];
  noise: string[];
  twinChanged: string[];
  twinRetained: string[];
  foreign: string[];
  fixture: string[];
  controls: CellControls;
}

/** The example shape shared by all four evaluators: the task output IS the run record. */
export interface HuntExample {
  output: HuntRunRecord;
  metadata: HuntMetadata;
}
