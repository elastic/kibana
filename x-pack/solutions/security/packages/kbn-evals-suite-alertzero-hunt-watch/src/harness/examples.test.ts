/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildLabels } from '../datasets/labels';
import { createCleanValidityEvaluator } from '../evaluators/clean_validity';
import {
  METRICS_EXAMPLE_COUNT,
  createFalseHitRateEvaluator,
  createSeededHitRecallTier1Evaluator,
  createSeededHitRecallTier2Evaluator,
} from '../evaluators/recall_false_hits';
import type { HuntRunRecord } from '../evaluators/run_record';
import { loadManifest, loadSamples } from '../fixtures/load_corpus';
import type { CoordinatorRun, Phase } from '../types';
import {
  buildExamples,
  c3aFailure,
  c3bHolds,
  cellKey,
  foreignHitIds,
  leakAuditFailures,
  toInvalidRecord,
  toRunRecord,
  type ControlFailure,
} from './examples';
import type { ReportSpec } from '../fixtures/report_documents';
import { PHASES } from './phases';

const labels = buildLabels({ manifest: loadManifest(), samples: loadSamples() });
interface Buckets {
  noise: string[];
  twinChanged: string[];
  twinRetained: string[];
  fixture: string[];
}
const emptyBuckets = (): Buckets => ({ noise: [], twinChanged: [], twinRetained: [], fixture: [] });
const buckets: Record<Phase, Buckets> = {
  E0: emptyBuckets(),
  'E+': emptyBuckets(),
  'E-': emptyBuckets(),
};

const SEEDED_INDEX = `.ds-${labels.seededStreams[0]}-default-2026.10.09-000001`;

const cleanRun: CoordinatorRun = {
  tier1_status: 'no_environment_hits',
  behaviours: [],
  completeness: 'complete',
};

const spec = (runKey: string, reportClass: ReportSpec['reportClass'] = 'R-ioc') => ({
  runKey,
  reportClass,
  sampleBase: '00140285',
});

/** 14 reports x 3 phases, every cell with a valid E0-clean-looking run. */
const fullRecords = (): HuntRunRecord[] =>
  PHASES.flatMap((phase) =>
    Array.from({ length: 14 }, (_, i) =>
      toRunRecord(spec(`R-ioc[${i}]`), phase, `id-${phase}-${i}`, cleanRun)
    )
  );

const evaluators = () => [
  createSeededHitRecallTier1Evaluator(),
  createSeededHitRecallTier2Evaluator(),
  createFalseHitRateEvaluator(),
  createCleanValidityEvaluator(),
];

describe('buildExamples', () => {
  it('emits exactly METRICS_EXAMPLE_COUNT examples for a full run', () => {
    expect(METRICS_EXAMPLE_COUNT).toBe(42);
    expect(
      buildExamples({ records: fullRecords(), labels, buckets, failures: [], c3b: true })
    ).toHaveLength(42);
  });

  it('throws instead of shrinking the denominator when a cell is missing', () => {
    expect(() =>
      buildExamples({ records: fullRecords().slice(1), labels, buckets, failures: [], c3b: true })
    ).toThrow(/expected 42 examples, got 41/);
  });

  it('attaches only the control failures whose cells include the example', () => {
    const failures: ControlFailure[] = [
      { control: 'C3a', detail: 'd', cells: [cellKey('E+', 'R-ioc[0]')] },
    ];
    const examples = buildExamples({
      records: fullRecords(),
      labels,
      buckets,
      failures,
      c3b: false,
    });
    const hit = examples.find((e) => e.output.phase === 'E+' && e.output.runKey === 'R-ioc[0]');
    const miss = examples.find((e) => e.output.phase === 'E0' && e.output.runKey === 'R-ioc[0]');
    expect(hit?.metadata.controls.failures).toEqual([{ control: 'C3a', detail: 'd' }]);
    expect(miss?.metadata.controls.failures).toEqual([]);
  });
});

describe('INVALID cells score null on every evaluator', () => {
  const evalAll = async (record: HuntRunRecord, failures: ControlFailure[] = []) => {
    const records = fullRecords();
    records[0] = record;
    const examples = buildExamples({ records, labels, buckets, failures, c3b: true });
    const ex = examples[0];
    return Promise.all(
      evaluators().map((e) =>
        e.evaluate({
          output: ex.output,
          metadata: ex.metadata,
          input: undefined,
          expected: ex.output,
        })
      )
    );
  };

  it('a missing coordinator output (invalid record) is INVALID for all 4 evaluators', async () => {
    const results = await evalAll(
      toInvalidRecord(spec('R-ioc[0]'), 'E0', 'id', 'missing-coordinator-output')
    );
    expect(results).toHaveLength(4);
    for (const r of results) {
      expect(r.score).toBeNull();
      expect(r.label).toBe('INVALID');
    }
  });

  it('a C3a control failure on an otherwise valid record is INVALID for all 4 evaluators', async () => {
    const results = await evalAll(toRunRecord(spec('R-ioc[0]'), 'E0', 'id', cleanRun), [
      { control: 'C3a', detail: 'no executed t2', cells: [cellKey('E0', 'R-ioc[0]')] },
    ]);
    for (const r of results) {
      expect(r.score).toBeNull();
      expect(r.label).toBe('INVALID');
      expect(r.explanation).toContain('C3a');
    }
  });

  it('a per-batch-candidates failure is INVALID for all 4 evaluators', async () => {
    const results = await evalAll(toRunRecord(spec('R-ioc[0]'), 'E0', 'id', cleanRun), [
      { control: 'per-batch-candidates', detail: 'ids 9/10', cells: [cellKey('E0', 'R-ioc[0]')] },
    ]);
    for (const r of results) expect(r.label).toBe('INVALID');
  });

  it('control: the same valid record with no failures is NOT INVALID (M3 clean in E0)', async () => {
    const results = await evalAll(toRunRecord(spec('R-ioc[0]'), 'E0', 'id', cleanRun));
    expect(results.some((r) => r.label === 'INVALID')).toBe(false);
    expect(results[3].score).toBe(1);
  });
});

describe('M3 scope (B7)', () => {
  it('scores null with "n/a: not E0" outside E0, and reads record.run, not the record', async () => {
    const ex = buildExamples({ records: fullRecords(), labels, buckets, failures: [], c3b: true });
    const m3 = createCleanValidityEvaluator();
    const e0 = ex.find((e) => e.output.phase === 'E0')!;
    const ePlus = ex.find((e) => e.output.phase === 'E+')!;
    const r0 = await m3.evaluate({
      output: e0.output,
      metadata: e0.metadata,
      input: undefined,
      expected: e0.output,
    });
    const rp = await m3.evaluate({
      output: ePlus.output,
      metadata: ePlus.metadata,
      input: undefined,
      expected: ePlus.output,
    });
    expect(r0.score).toBe(1);
    expect(rp).toMatchObject({ score: null, label: 'n/a: not E0' });
  });
});

describe('controls', () => {
  it('C3a fires when E+ R-beh-A reports have no executed behaviour, and is silent when one executed', () => {
    const mk = (executed: boolean) =>
      toRunRecord(spec('R-beh[x]', 'R-beh-A'), 'E+', 'id', {
        ...cleanRun,
        tier1_status: 'environment_hits_found',
        behaviours: [
          {
            executed,
            hit: executed,
            technique_id: 'T1',
            hits: [{ _id: 'a#0#positive', _index: 'i' }],
          },
        ],
      });
    expect(c3aFailure([mk(false)])?.control).toBe('C3a');
    expect(c3aFailure([mk(true)])).toBeNull();
    expect(c3aFailure([])).toBeNull();
  });

  it('C3a ignores INVALID records', () => {
    expect(
      c3aFailure([toInvalidRecord(spec('R-beh[x]', 'R-beh-A'), 'E+', 'id', 'boom')])
    ).toBeNull();
  });

  it('C3b needs an executed hit with a technique id and hit refs', () => {
    const run = (b: CoordinatorRun['behaviours'][number]) =>
      toRunRecord(spec('R-beh[x]', 'R-beh-A'), 'E+', 'id', { ...cleanRun, behaviours: [b] });
    expect(
      c3bHolds([
        run({ executed: true, hit: true, technique_id: 'T1', hits: [{ _id: 'a', _index: 'i' }] }),
      ])
    ).toBe(true);
    expect(c3bHolds([run({ executed: true, hit: true, technique_id: 'T1', hits: [] })])).toBe(
      false
    );
    expect(c3bHolds([run({ executed: true, hit: true, hits: [{ _id: 'a', _index: 'i' }] })])).toBe(
      false
    );
  });

  it('C2 leak audit fails an R-beh report that carries an E+ host token, and passes a clean one', () => {
    const positives = [{ host: { name: 'victim-host-01' } }];
    const reports = [
      {
        runKey: 'R-beh[leaky]',
        reportClass: 'R-beh-A' as const,
        document: { text: 'seen on victim-host-01' },
      },
      {
        runKey: 'R-beh[clean]',
        reportClass: 'R-beh-A' as const,
        document: { text: 'generic text' },
      },
      {
        runKey: 'R-ioc[leaky]',
        reportClass: 'R-ioc' as const,
        document: { text: 'victim-host-01' },
      },
    ];
    const failures = leakAuditFailures(reports, positives, PHASES);
    expect(failures.map((f) => f.control)).toEqual(['C2']);
    expect(failures[0].detail).toContain('R-beh[leaky]');
    expect(failures[0].cells).toHaveLength(3);
  });
});

describe('foreignHitIds', () => {
  it('flags hits from an index that backs no seeded stream, in any tier', () => {
    const run: CoordinatorRun = {
      ...cleanRun,
      tier1_hits: [
        { _id: 'good', _index: SEEDED_INDEX },
        { _id: 'alien', _index: '.ds-logs-someone-elses-default-1' },
      ],
      behaviours: [
        {
          executed: true,
          hit: true,
          hits: [{ _id: 'alien2', _index: 'metrics-elsewhere-default' }],
        },
      ],
    };
    expect(foreignHitIds(run, 'E+', labels)).toEqual(['alien', 'alien2']);
  });
});
