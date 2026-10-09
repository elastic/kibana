/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../../src/evaluate';
import { buildLabels } from '../../src/datasets/labels';
import { loadManifest, loadSamples } from '../../src/fixtures/load_corpus';
import { buildReportSpecs } from '../../src/fixtures/report_documents';
import { HUNT_REPORTS_PER_PHASE, phaseOrder } from '../../src/harness/phases';
import { createCleanValidityEvaluator } from '../../src/evaluators/clean_validity';
import {
  createSeededHitRecallTier1Evaluator,
  createSeededHitRecallTier2Evaluator,
  createFalseHitRateEvaluator,
  type HuntRunRecord,
} from '../../src/evaluators/recall_false_hits';
import type { CoordinatorRun } from '../../src/types';

const GREP_TITLE =
  'hunt watch seeded-recall sweep runs E0, E+ and E- through the production Worker';

/**
 * The live Hunt Watch sweep. One stack per (model, rep): reports are ingested
 * through the production route with fresh ES-minted ids per phase, the Worker
 * is triggered manually with reportIds (batches of 10, serialized — its
 * concurrency is drop/max 1), and each hunt's coordinator output is read from
 * the run_hunt_coordinator step output of the child execution. M1 (T1 and T2
 * separately), M2 FalseHitRate and M3 CleanValidity are CODE evaluators; no
 * LLM judge is in the gate. Controls C1/C2/C3a/C3b gate the cell: a control
 * failure is an INVALID cell, never a shrunk denominator.
 *
 * The model under test drives the hunt because the Worker passes
 * tier2_when='always' (HUNT_WORKER_DEFAULTS) and Tier 2 binds to the pinned
 * model under test via the alertzero inference feature settings, so 2 model
 * families x 3 reps measures model-dependent Tier 2 extraction and query
 * generation. Tier 1 is deterministic IoC search and is reported once, never
 * in a model comparison.
 */

const toRunRecord = (
  spec: ReturnType<typeof buildReportSpecs>[number],
  phase: 'E0' | 'E+' | 'E-',
  run: CoordinatorRun
): HuntRunRecord => ({
  runKey: spec.runKey,
  phase,
  reportClass: spec.reportClass,
  sampleBase: spec.sampleBase,
  run,
  tier1HitIds: (run.tier1_hits ?? []).map((h) => h._id),
  tier2HitIds: (run.behaviours ?? []).flatMap((b) => (b.hits ?? []).map((x) => x._id)),
  tier1MatchedIocs: (run.tier1_matched_iocs ?? []).map((m) => ({
    value: m.value,
    hitIds: (m.hits ?? []).map((x) => x._id),
  })),
});

evaluate(GREP_TITLE, async ({ executorClient, huntWatchClient, log }) => {
  const manifest = loadManifest();
  const samples = loadSamples();
  const labels = buildLabels({ manifest, samples });
  const specs = buildReportSpecs(manifest, samples, 'A');
  const phaseList = phaseOrder();

  if (specs.length !== HUNT_REPORTS_PER_PHASE) {
    throw new Error(`report plan has ${specs.length} reports, expected ${HUNT_REPORTS_PER_PHASE}`);
  }

  const runRecords: HuntRunRecord[] = [];
  const controlFailures: Array<{ control: string; detail: string }> = [];

  // Phases run in a fixed order (design v3 §4): E0, then E+, then E-.
  for (const phase of phaseList) {
    log.info(`[hunt-watch] phase ${phase}: ingesting ${specs.length} reports`);
    const phaseRuns: HuntRunRecord[] = [];

    for (const spec of specs) {
      const { reportId } = await huntWatchClient.ingestThreatReport(spec.document);
      log.info(`[hunt-watch] ${phase} ${spec.runKey} -> report ${reportId}`);
      phaseRuns.push({
        runKey: spec.runKey,
        phase,
        reportClass: spec.reportClass,
        sampleBase: spec.sampleBase,
        run: {} as CoordinatorRun, // filled from the Worker sweep below
        tier1HitIds: [],
        tier2HitIds: [],
        tier1MatchedIocs: [],
      });
      // keep the minted id on the record
      (phaseRuns[phaseRuns.length - 1] as HuntRunRecord & { reportId?: string }).reportId =
        reportId;
    }

    const reportIds = phaseRuns.map(
      (r) => (r as HuntRunRecord & { reportId?: string }).reportId as string
    );

    const { runs, invalidBatches } = await huntWatchClient.runHunts(reportIds, {
      onCandidates: (batch, response) => {
        if (response.ids.length !== batch.length || response.skipped.length > 0) {
          log.error(
            `[hunt-watch] ${phase} per-batch candidates violation: ids=${response.ids.length}/${
              batch.length
            } skipped=${JSON.stringify(response.skipped)}`
          );
        }
      },
    });

    // Per-batch route assertion (design v6 §4a): any violation is an INVALID cell.
    for (const violation of invalidBatches) {
      controlFailures.push({
        control: 'per-batch-candidates',
        detail: `phase ${phase}: ids ${violation.response.ids.length}/${
          violation.batch.length
        }, skipped ${JSON.stringify(violation.response.skipped)}`,
      });
    }

    for (let i = 0; i < phaseRuns.length; i++) {
      const reportId = reportIds[i];
      const run = runs.get(reportId);
      const spec = specs[i];
      if (run) {
        runRecords.push(toRunRecord(spec, phase, run));
      } else {
        // No coordinator output for this report: INVALID cell, never a skip.
        controlFailures.push({
          control: 'missing-coordinator-output',
          detail: `phase ${phase} ${spec.runKey}: no run_hunt_coordinator step output for report ${reportId}`,
        });
      }
    }
  }

  // C3a (infra, E+): >=1 behaviour with executed == true on the T1218.005
  // canary chain's R-beh report. A failure is an INVALID cell.
  const ePlusBeh = runRecords.filter((r) => r.phase === 'E+' && r.reportClass === 'R-beh-A');
  if (
    ePlusBeh.length > 0 &&
    !ePlusBeh.some((r) => (r.run.behaviours ?? []).some((b) => b.executed))
  ) {
    controlFailures.push({
      control: 'C3a',
      detail: 'E+ produced no executed Tier 2 behaviour on any R-beh report',
    });
  }
  // C3b (detection, E+): reported separately from the metrics (design v3 §4).
  const c3bHolds = ePlusBeh.some((r) =>
    (r.run.behaviours ?? []).some(
      (b) => b.executed && b.hit && (b.technique_id ?? '') !== '' && (b.hits ?? []).length > 0
    )
  );

  await executorClient.runExperiment(
    {
      name: 'hunt_watch: seeded-recall sweep',
      datasets: [
        {
          name: 'hunt_watch: seeded-recall',
          description:
            'ad2-v1 seeded-recall corpus. CODE-scored: M1 seeded-hit recall (T1/T2 separate), M2 false-hit rate, M3 clean validity.',
          examples: runRecords.map((record, i) => ({
            id: `${record.phase}-${record.runKey}-${i}`,
            output: record,
            metadata: {
              labels,
              noise: [],
              twinChanged: [],
              twinRetained: [],
              foreign: [],
              fixture: labels.fixtureStreams,
              phase: record.phase,
              report_class: record.reportClass,
              controls: { c3b: c3bHolds, failures: controlFailures },
            },
          })),
        },
      ],
      metadata: {
        phases: phaseList,
        control_failures: controlFailures,
        c3b: c3bHolds,
        corpus_version: 'ad2-v1',
      },
      task: async ({ output }) => output as unknown as CoordinatorRun,
    },
    [
      createSeededHitRecallTier1Evaluator(),
      createSeededHitRecallTier2Evaluator(),
      createFalseHitRateEvaluator(),
      createCleanValidityEvaluator(),
      // The four evaluators share the HuntRunRecord example shape; the
      // experiment-level generic cannot express a heterogeneous evaluator
      // list, so the checked types meet here.
    ] as never
  );
});
