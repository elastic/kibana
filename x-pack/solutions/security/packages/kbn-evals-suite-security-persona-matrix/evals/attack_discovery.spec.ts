/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { restoreAlertsSnapshot } from '@kbn/security-evals-alerts-snapshot';
import { evaluate } from '@kbn/evals-suite-attack-discovery/src/evaluate';
import { resolveConcurrency } from '@kbn/evals-suite-attack-discovery/src/evaluate_dataset';
import { runAttackDiscovery } from '@kbn/evals-suite-attack-discovery/src/task/run_attack_discovery';
import type { AttackDiscoveryTaskOutput } from '@kbn/evals-suite-attack-discovery/src/types';
import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  CHRYSALIS_AD_DATASET_NAME,
  createChrysalisAdExperimentEvaluators,
} from '../src/attack_discovery_experiment';
import { assertAdDataGate } from '../src/attack_discovery_data_gate';

const CHRYSALIS_95_SNAPSHOT = {
  bucket: 'security-ai-datasets',
  basePath: 'attack-discovery/oh-my-malware-95-deduped/2026-07-24',
  snapshotName: 'alerts-snapshot',
};

const AD_ALERTS_INDEX = '.alerts-security.alerts-default';

// AD `_generate` exposes no temperature/seed, so the discovery count varies
// run-to-run on identical input. The alert corpus is byte-reproducible.
// The window below matches the SOURCE alerts' real @timestamp range
// (2026-03-19..26, from the original oh-my-malware/2026-03-26 snapshot) —
// the "2026-07-24" in the bucket path is only the dedup snapshot's creation
// date, not the alert data's timestamp. Don't "fix" this to a recent date;
// that would silently zero out the corpus (generateApi defaults to
// start:'now-24h', which selects nothing outside this window).
const CORPUS_WINDOW = { start: '2026-03-01T00:00:00.000Z', end: '2026-04-01T00:00:00.000Z' };

/** Every doc `_id` in the corpus window, paged via search_after. */
async function listWindowIds(
  esClient: EsClient,
  index: string,
  window: { start: string; end: string }
): Promise<string[]> {
  const ids: string[] = [];
  let searchAfter: string[] | undefined;
  for (;;) {
    const response = await esClient.search<{ _id: string; sort: string[] }>({
      index,
      size: 1000,
      sort: [{ _id: 'asc' }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
      query: { range: { '@timestamp': { gte: window.start, lt: window.end } } },
    });
    const hits = response.hits?.hits ?? [];
    if (hits.length === 0) break;
    for (const hit of hits) if (hit._id !== undefined) ids.push(hit._id);
    const last = hits[hits.length - 1];
    // Guard against a page that does not advance (bad sort payload): stop instead of looping.
    if (searchAfter && last._id === searchAfter[0]) break;
    searchAfter = last.sort as string[];
  }
  return ids;
}

evaluate.describe(
  'Attack Discovery (Chrysalis kill-chains)',
  { tag: tags.stateful.classic },
  () => {
    evaluate(
      'generate API (GCS 95-alert snapshot)',
      async ({
        connector,
        esClient,
        log,
        attackDiscoveryClient,
        generateApiClient,
        inferenceClient,
        evaluators,
        evaluationConnector,
        executorClient,
      }) => {
        await restoreAlertsSnapshot({ esClient, log, config: CHRYSALIS_95_SNAPSHOT });
        // Snapshot the restored corpus's document ids while the index holds ONLY
        // the restore's output: the data gate then counts positively-identified
        // corpus alerts, and any later non-Chrysalis writer fails as contamination
        // instead of covering a partial restore.
        const corpusIds = await listWindowIds(esClient, AD_ALERTS_INDEX, CORPUS_WINDOW);
        await assertAdDataGate({
          esClient,
          log,
          index: AD_ALERTS_INDEX,
          corpusIds,
          ...CORPUS_WINDOW,
        });

        const dataset = {
          name: CHRYSALIS_AD_DATASET_NAME,
          description:
            'Deduped 95-alert Attack Discovery corpus restored from the shared GCS snapshot ' +
            '(security-ai-datasets/attack-discovery/oh-my-malware-95-deduped) and evaluated ' +
            'via the production _generate API.',
          examples: [
            {
              input: {
                mode: 'generateApi' as const,
                connectorId: connector.id,
                alertsIndexPattern: AD_ALERTS_INDEX,
                size: 100,
                ...CORPUS_WINDOW,
              },
              output: { attackDiscoveries: [] },
              metadata: {},
            },
          ],
        };

        const experimentEvaluators = createChrysalisAdExperimentEvaluators({
          evaluators,
          evaluationInferenceClient: inferenceClient.bindTo({
            connectorId: evaluationConnector.id,
          }),
          log,
        });

        await executorClient.runExperiment(
          {
            datasets: [dataset],
            task: async ({ input }): Promise<AttackDiscoveryTaskOutput> => {
              if (!input) {
                return { insights: null, errors: ['Missing input'] };
              }
              return runAttackDiscovery({
                inferenceClient,
                attackDiscoveryClient,
                generateApiClient,
                input,
                log,
              });
            },
            concurrency: resolveConcurrency(),
            trustUpstreamDataset: false,
          },
          experimentEvaluators
        );
      }
    );
  }
);
