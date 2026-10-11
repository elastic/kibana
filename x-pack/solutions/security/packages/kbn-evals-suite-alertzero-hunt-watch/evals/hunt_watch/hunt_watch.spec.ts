/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { buildLabels } from '../../src/datasets/labels';
import { loadManifest, loadSamples } from '../../src/fixtures/load_corpus';
import { buildReportSpecs } from '../../src/fixtures/report_documents';
import {
  HUNT_REPORTS_PER_PHASE,
  corpusGateAlertsMustBeZero,
  phaseOrder,
} from '../../src/harness/phases';
import { PhaseSeeder, type PhaseBuckets } from '../../src/harness/seeder';
import {
  buildExamples,
  c3aFailure,
  c3bHolds,
  cellKey,
  leakAuditFailures,
  toInvalidRecord,
  toRunRecord,
  type ControlFailure,
} from '../../src/harness/examples';
import { createCleanValidityEvaluator } from '../../src/evaluators/clean_validity';
import {
  createSeededHitRecallTier1Evaluator,
  createSeededHitRecallTier2Evaluator,
  createFalseHitRateEvaluator,
} from '../../src/evaluators/recall_false_hits';
import type { HuntRunRecord } from '../../src/evaluators/run_record';
import type { Phase } from '../../src/types';

const GREP_TITLE =
  'hunt watch seeded-recall sweep runs E0, E+ and E- through the production Worker';

const ALERTS_INDEX = '.alerts-security.alerts-default';

/**
 * The live Hunt Watch sweep. One stack per (model, rep). Per phase the seeded
 * indices are reset and that phase's environment is bulk-indexed with the
 * label-space `_id`s (E0 = base environment, E+ = E0 + positive docs, E- =
 * E0 + negative twins); reports are then ingested through the production route
 * with fresh ES-minted ids, the Worker is triggered manually with reportIds
 * (batches of 10, serialized — its concurrency is drop/max 1), and each
 * hunt's coordinator output is read from the `run_hunt_coordinator` step
 * output of the child execution. M1 (T1 and T2 separately), M2 FalseHitRate
 * and M3 CleanValidity are CODE evaluators; no LLM judge is in the gate.
 *
 * The model under test drives the hunt: the `modelSettingsForHuntWatch` auto
 * fixture pins the alertzero fast/reasoning inference features to the
 * connector under test, and Tier 2 resolves its model from the reasoning
 * feature first. The Worker passes tier2_when='always' (HUNT_WORKER_DEFAULTS).
 *
 * INVALID cells: the experiment always has METRICS_EXAMPLE_COUNT examples. A
 * report with no coordinator output, a per-batch candidates violation, or a
 * failed C1/C2/C3a control makes the affected cells INVALID — every evaluator
 * returns score null for them — and never shrinks the denominator.
 */
evaluate(
  GREP_TITLE,
  { tag: tags.stateful.classic },
  async ({ executorClient, huntWatchClient, esClient, log }) => {
    const manifest = loadManifest();
    const samples = loadSamples();
    const labels = buildLabels({ manifest, samples });
    const specs = buildReportSpecs(manifest, samples, 'A');
    const phaseList = phaseOrder();
    const seeder = new PhaseSeeder(esClient, samples);

    if (specs.length !== HUNT_REPORTS_PER_PHASE) {
      throw new Error(
        `report plan has ${specs.length} reports, expected ${HUNT_REPORTS_PER_PHASE}`
      );
    }

    const records: HuntRunRecord[] = [];
    const failures: ControlFailure[] = [];
    const buckets = {} as Record<Phase, PhaseBuckets>;

    // Phases run in a fixed order (design v3 §4): E0, then E+, then E-.
    for (const phase of phaseList) {
      log.info(`[hunt-watch] phase ${phase}: seeding environment`);
      const plan = await seeder.seed(phase);
      buckets[phase] = plan.buckets;
      log.info(`[hunt-watch] phase ${phase}: seeded ${plan.docs.length} docs`);

      if (phase === 'E0') {
        // C1 (corpus gate): the clean environment must not already alert.
        const counted = await esClient.count({ index: ALERTS_INDEX, ignore_unavailable: true });
        const c1 = corpusGateAlertsMustBeZero(counted.count);
        if (c1) {
          failures.push({
            control: c1.control,
            detail: c1.detail,
            cells: specs.map((s) => cellKey('E0', s.runKey)),
          });
        }
      }

      log.info(`[hunt-watch] phase ${phase}: ingesting ${specs.length} reports`);
      const reportIds: string[] = [];
      for (const spec of specs) {
        const { reportId } = await huntWatchClient.ingestThreatReport(spec.document);
        log.info(`[hunt-watch] ${phase} ${spec.runKey} -> report ${reportId}`);
        reportIds.push(reportId);
      }

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

      // Per-batch route assertion (design v6 §4a): a violation invalidates the batch's cells.
      const batchOf = new Map<string, (typeof invalidBatches)[number]>();
      for (const violation of invalidBatches) {
        for (const id of violation.batch) batchOf.set(id, violation);
        failures.push({
          control: 'per-batch-candidates',
          detail: `phase ${phase}: ids ${violation.response.ids.length}/${
            violation.batch.length
          }, skipped ${JSON.stringify(violation.response.skipped)}`,
          cells: violation.batch.map((id) => cellKey(phase, specs[reportIds.indexOf(id)].runKey)),
        });
      }

      specs.forEach((spec, i) => {
        const reportId = reportIds[i];
        const run = runs.get(reportId);
        if (run) {
          records.push(toRunRecord(spec, phase, reportId, run));
        } else if (batchOf.has(reportId)) {
          records.push(toInvalidRecord(spec, phase, reportId, 'per-batch candidates violation'));
        } else {
          records.push(
            toInvalidRecord(
              spec,
              phase,
              reportId,
              `missing-coordinator-output: no run_hunt_coordinator step output for report ${reportId}`
            )
          );
        }
      });
    }

    // C2 (leak audit): R-beh report text must carry no token that appears in the E+ positives.
    const positiveDocs = Object.values(samples).flatMap((s) =>
      (s.positive?.docs ?? []).map((d) => d.doc)
    );
    failures.push(...leakAuditFailures(specs, positiveDocs, phaseList));

    // C3a (infra, E+) invalidates its cells; C3b (detection) is reported separately.
    const c3a = c3aFailure(records);
    if (c3a) failures.push(c3a);
    const c3b = c3bHolds(records);

    const examples = buildExamples({ records, labels, buckets, failures, c3b });

    await executorClient.runExperiment(
      {
        name: 'hunt_watch: seeded-recall sweep',
        datasets: [
          {
            name: 'hunt_watch: seeded-recall',
            description:
              'ad2-v1 seeded-recall corpus. CODE-scored: M1 seeded-hit recall (T1/T2 separate), M2 false-hit rate, M3 clean validity (E0 only). Always 42 examples; INVALID cells score null.',
            examples,
          },
        ],
        metadata: {
          grep_title: GREP_TITLE,
          phases: phaseList,
          control_failures: failures.map(({ control, detail }) => ({ control, detail })),
          c3b,
          corpus_version: 'ad2-v1',
        },
        task: async ({ output }) => output as HuntRunRecord,
      },
      [
        createSeededHitRecallTier1Evaluator(),
        createSeededHitRecallTier2Evaluator(),
        createFalseHitRateEvaluator(),
        createCleanValidityEvaluator(),
      ]
    );
  }
);
