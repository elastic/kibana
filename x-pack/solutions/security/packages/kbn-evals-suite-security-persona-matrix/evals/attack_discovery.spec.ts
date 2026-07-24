/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Co-located Attack Discovery suite (Chrysalis kill-chain corpus).
 *
 * This spec lives in the persona-matrix package as a deliberate exception so the
 * whole security-persona report set is produced from one job. It reuses the
 * canonical Attack Discovery evaluate fixture + evaluators + dataset loader from
 * @kbn/evals-suite-attack-discovery (deep import, established cross-suite pattern)
 * and feeds them a bundled JSONL of 95 real alerts pulled from the kill-chain
 * cluster (top-risk across every kill-chain host), anonymized to match the
 * reference dataset shape. The corpus is capped at 95 — bundledAlerts mode
 * applies no size limit, so we mirror Attack Discovery's production 100-alert
 * ceiling (and Chrysalis's original 95) here to keep a single coherent generation
 * that fits the model context.
 *
 * It runs under its own attack_discovery.playwright.config.ts (testIgnore keeps it
 * separate from persona_matrix.spec.ts) so it can use the evals_tracing server
 * config for trace-based evaluators. Runs the capped corpus as a single
 * bundledAlerts example (Chrysalis single-generation style), graded by
 * AttackDiscoveryBasic / Criteria / Rubric + trace metrics.
 */

import { tags } from '@kbn/scout';
import { restoreAlertsSnapshot } from '@kbn/security-evals-alerts-snapshot';
import { evaluate } from '@kbn/evals-suite-attack-discovery/src/evaluate';
import { loadAttackDiscoveryBundledAlertsJsonlDataset } from '@kbn/evals-suite-attack-discovery/src/dataset/load_attack_discovery_jsonl';

// __dirname is .../evals; the committed dataset lives one level up under data/.
const CHRYSALIS_DATASET_JSONL = `${__dirname}/../data/eval_dataset_attack_discovery_chrysalis_killchains.jsonl`;

// GCS-hosted, deduped 95-alert Attack Discovery corpus (exactly Chrysalis's 95 unique
// kill-chain signals, one per kibana.alert.original_event.id). Stored as an ES
// snapshot in the shared security-ai-datasets bucket so the suite has no
// repo-committed dataset and no runtime dedup logic — just restore and run.
// Overridable via ATTACK_DISCOVERY_95_SNAPSHOT_{BUCKET,BASE_PATH,NAME}.
const CHRYSALIS_95_SNAPSHOT = {
  bucket: process.env.ATTACK_DISCOVERY_95_SNAPSHOT_BUCKET ?? 'security-ai-datasets',
  basePath:
    process.env.ATTACK_DISCOVERY_95_SNAPSHOT_BASE_PATH ??
    'attack-discovery/oh-my-malware-95-deduped/2026-07-24',
  snapshotName: process.env.ATTACK_DISCOVERY_95_SNAPSHOT_NAME ?? 'alerts-snapshot',
};

evaluate.describe(
  'Attack Discovery (Chrysalis kill-chains)',
  { tag: tags.stateful.classic },
  () => {
    evaluate('bundled alerts (chrysalis kill-chain corpus)', async ({ evaluateDataset }) => {
      const jsonlPath = process.env.ATTACK_DISCOVERY_DATASET_JSONL_PATH || CHRYSALIS_DATASET_JSONL;
      const dataset = await loadAttackDiscoveryBundledAlertsJsonlDataset({ jsonlPath });
      await evaluateDataset({ dataset });
    });

    // Async `generateApi` variant — reproduces Chrysalis's run_attack_discovery.py
    // against the *same* alert corpus he used:
    //
    //   1. Restore the deduped 95-alert Attack Discovery corpus from its ES
    //      snapshot in GCS (security-ai-datasets/attack-discovery/
    //      oh-my-malware-95-deduped) — exactly Chrysalis's 95 unique kill-chain signals
    //      (one per kibana.alert.original_event.id). No repo-committed dataset, no
    //      runtime dedup logic. ES reads GCS via its own repository-gcs plugin, so
    //      no GCS client credentials are needed at eval time.
    //   2. POST /api/attack_discovery/_generate with a request body identical to
    //      Chrysalis's (anonymizationFields, apiConfig, size, window, subAction
    //      invokeAI), then poll generations/{uuid} until terminal.
    //
    // The poll-based generate API is used instead of bundledAlerts (a single long
    // synchronous /internal/inference/prompt call whose keep-alive socket drops
    // mid-flight on long generations such as Opus ~500-680s). Gated behind
    // ATTACK_DISCOVERY_GENERATE_API so the default weekly run keeps the bundled
    // path. NOTE: Attack Discovery's _generate exposes no temperature/seed, so the
    // discovery *count* varies run-to-run on identical input — the alert corpus is
    // byte-reproducible; the model's grouping is not.
    if (process.env.ATTACK_DISCOVERY_GENERATE_API === '1') {
      evaluate(
        'generate API (chrysalis kill-chain corpus, GCS 95-alert snapshot)',
        async ({ evaluateDataset, connector, esClient, log }) => {
          await restoreAlertsSnapshot({ esClient, log, config: CHRYSALIS_95_SNAPSHOT });
          const count = await esClient.count({ index: '.alerts-security.alerts-default' });
          log.info(`[attack-discovery] corpus ready: ${count.count} alerts (reference: 95)`);

          const dataset = {
            name: 'Attack Discovery All Scenarios (generate API)',
            description:
              'Chrysalis kill-chain corpus via the production _generate API against the deduped ' +
              '95-alert Attack Discovery snapshot in GCS ' +
              '(security-ai-datasets/attack-discovery/oh-my-malware-95-deduped).',
            examples: [
              {
                input: {
                  mode: 'generateApi' as const,
                  connectorId: connector.id,
                  alertsIndexPattern: '.alerts-security.alerts-default',
                  size: 100,
                  // The restored alerts keep their original 2026-03 timestamps; the
                  // client defaults to now-24h which would select 0 alerts. Pin an
                  // explicit window covering the corpus.
                  start: '2026-03-01T00:00:00.000Z',
                  end: '2026-04-01T00:00:00.000Z',
                },
                output: { attackDiscoveries: [] },
                metadata: {},
              },
            ],
          };
          await evaluateDataset({ dataset });
        }
      );
    }
  }
);
