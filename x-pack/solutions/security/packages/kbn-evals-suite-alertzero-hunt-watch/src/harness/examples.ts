/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorpusLabels } from '../datasets/labels';
import { METRICS_EXAMPLE_COUNT } from '../evaluators/recall_false_hits';
import type { CellControls, HuntMetadata, HuntRunRecord } from '../evaluators/run_record';
import type { ReportSpec } from '../fixtures/report_documents';
import type { CoordinatorRun, Phase } from '../types';
import { leakAuditHolds, leakAuditTokens } from './phases';
import { isForeignHitIndex } from './trigger';

export interface ControlFailure {
  control: string;
  detail: string;
  /** Cells the failure invalidates; each cell is `${phase}|${runKey}`. */
  cells: string[];
}

export const cellKey = (phase: Phase, runKey: string): string => `${phase}|${runKey}`;

/** A cell with a coordinator output. */
export const toRunRecord = (
  spec: Pick<ReportSpec, 'runKey' | 'reportClass' | 'sampleBase'>,
  phase: Phase,
  reportId: string,
  run: CoordinatorRun
): HuntRunRecord => ({
  runKey: spec.runKey,
  phase,
  reportClass: spec.reportClass,
  sampleBase: spec.sampleBase,
  reportId,
  run,
  tier1HitIds: (run.tier1_hits ?? []).map((h) => h._id),
  tier2HitIds: (run.behaviours ?? []).flatMap((b) => (b.hits ?? []).map((x) => x._id)),
  tier1MatchedIocs: (run.tier1_matched_iocs ?? []).map((m) => ({
    value: m.value,
    hitIds: (m.hits ?? []).map((x) => x._id),
  })),
});

/**
 * A cell that has no usable output. It is still emitted, so the dataset always
 * has METRICS_EXAMPLE_COUNT examples; every evaluator scores it null/INVALID.
 */
export const toInvalidRecord = (
  spec: Pick<ReportSpec, 'runKey' | 'reportClass' | 'sampleBase'>,
  phase: Phase,
  reportId: string | undefined,
  reason: string
): HuntRunRecord => ({
  runKey: spec.runKey,
  phase,
  reportClass: spec.reportClass,
  sampleBase: spec.sampleBase,
  reportId,
  invalid: reason,
  run: {} as CoordinatorRun,
  tier1HitIds: [],
  tier2HitIds: [],
  tier1MatchedIocs: [],
});

/** Hit ids whose concrete index backs no seeded stream (design v6 §6). */
export const foreignHitIds = (
  run: CoordinatorRun,
  phase: Phase,
  labels: Pick<CorpusLabels, 'seededStreams' | 'fixtureStreams'>
): string[] => {
  const hits = [...(run.tier1_hits ?? []), ...(run.behaviours ?? []).flatMap((b) => b.hits ?? [])];
  return [
    ...new Set(
      hits
        .filter((h) =>
          isForeignHitIndex(h._index, phase, labels.seededStreams, labels.fixtureStreams)
        )
        .map((h) => h._id)
    ),
  ];
};

/** `host.name: value` lines for every leaf of a nested doc, so the leak audit's dotted-key regex can see them. */
export const flattenDocText = (doc: unknown, prefix = ''): string => {
  if (Array.isArray(doc)) return doc.map((x) => flattenDocText(x, prefix)).join('\n');
  if (typeof doc === 'object' && doc !== null) {
    return Object.entries(doc)
      .map(([k, v]) => flattenDocText(v, prefix ? `${prefix}.${k}` : k))
      .join('\n');
  }
  return `${prefix}: ${String(doc)}`;
};

/** C2: an R-beh report must carry no host/user token that appears in the E+ positive docs. */
export const leakAuditFailures = (
  specs: Array<Pick<ReportSpec, 'runKey' | 'reportClass' | 'document'>>,
  positiveDocs: Array<Record<string, unknown>>,
  phases: readonly Phase[]
): ControlFailure[] => {
  const tokens = leakAuditTokens(positiveDocs.map((d) => flattenDocText(d)));
  const failures: ControlFailure[] = [];
  for (const spec of specs.filter((s) => s.reportClass.startsWith('R-beh'))) {
    const failure = leakAuditHolds(JSON.stringify(spec.document), tokens);
    if (failure) {
      failures.push({
        control: failure.control,
        detail: `${spec.runKey}: ${failure.detail}`,
        cells: phases.map((p) => cellKey(p, spec.runKey)),
      });
    }
  }
  return failures;
};

/** C3a (infra, E+): at least one executed Tier 2 behaviour on an R-beh report. */
export const c3aFailure = (records: HuntRunRecord[]): ControlFailure | null => {
  const cells = records.filter(
    (r) => r.phase === 'E+' && r.reportClass === 'R-beh-A' && r.invalid === undefined
  );
  if (cells.length === 0 || cells.some((r) => (r.run.behaviours ?? []).some((b) => b.executed))) {
    return null;
  }
  return {
    control: 'C3a',
    detail: 'E+ produced no executed Tier 2 behaviour on any R-beh report',
    cells: cells.map((r) => cellKey(r.phase, r.runKey)),
  };
};

/** C3b (detection, E+): reported separately from the metrics, never invalidates a cell. */
export const c3bHolds = (records: HuntRunRecord[]): boolean =>
  records
    .filter((r) => r.phase === 'E+' && r.reportClass === 'R-beh-A' && r.invalid === undefined)
    .some((r) =>
      (r.run.behaviours ?? []).some(
        (b) => b.executed && b.hit && (b.technique_id ?? '') !== '' && (b.hits ?? []).length > 0
      )
    );

export interface PhaseBuckets {
  twinChanged: string[];
  twinRetained: string[];
  fixture: string[];
  noise: string[];
}

export const buildExamples = ({
  records,
  labels,
  buckets,
  failures,
  c3b,
}: {
  records: HuntRunRecord[];
  labels: CorpusLabels;
  buckets: Record<Phase, PhaseBuckets>;
  failures: ControlFailure[];
  c3b: boolean;
}): Array<{ id: string; output: HuntRunRecord; metadata: HuntMetadata }> => {
  // The denominator is fixed: a shortfall is a harness bug, not a smaller experiment.
  if (records.length !== METRICS_EXAMPLE_COUNT) {
    throw new Error(
      `[hunt-watch] expected ${METRICS_EXAMPLE_COUNT} examples, got ${records.length}`
    );
  }
  return records.map((record, i) => {
    const key = cellKey(record.phase, record.runKey);
    const controls: CellControls & { c3b: boolean } = {
      c3b,
      failures: failures
        .filter((f) => f.cells.includes(key))
        .map(({ control, detail }) => ({ control, detail })),
    };
    const b = buckets[record.phase];
    return {
      id: `${record.phase}-${record.runKey}-${i}`,
      output: record,
      metadata: {
        labels,
        report_class: record.reportClass as HuntMetadata['report_class'],
        phase: record.phase,
        noise: b.noise,
        twinChanged: b.twinChanged,
        twinRetained: b.twinRetained,
        fixture: b.fixture,
        foreign:
          record.invalid === undefined ? foreignHitIds(record.run, record.phase, labels) : [],
        controls,
      },
    };
  });
};
