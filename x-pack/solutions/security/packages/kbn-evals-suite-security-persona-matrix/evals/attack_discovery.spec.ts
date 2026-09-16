/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { restoreAlertsSnapshot } from '@kbn/security-evals-alerts-snapshot';
import { evaluate } from '@kbn/evals-suite-attack-discovery/src/evaluate';

const CHRYSALIS_95_SNAPSHOT = {
  bucket: 'security-ai-datasets',
  basePath: 'attack-discovery/oh-my-malware-95-deduped/2026-07-24',
  snapshotName: 'alerts-snapshot',
};

// AD `_generate` exposes no temperature/seed, so the discovery count varies
// run-to-run on identical input. The alert corpus is byte-reproducible.
// The window below matches the SOURCE alerts' real @timestamp range
// (2026-03-19..26, from the original oh-my-malware/2026-03-26 snapshot) —
// the "2026-07-24" in the bucket path is only the dedup snapshot's creation
// date, not the alert data's timestamp. Don't "fix" this to a recent date;
// that would silently zero out the corpus (generateApi defaults to
// start:'now-24h', which selects nothing outside this window).
const CORPUS_WINDOW = { start: '2026-03-01T00:00:00.000Z', end: '2026-04-01T00:00:00.000Z' };

evaluate.describe(
  'Attack Discovery (Chrysalis kill-chains)',
  { tag: tags.stateful.classic },
  () => {
    evaluate(
      'generate API (GCS 95-alert snapshot)',
      async ({ evaluateDataset, connector, esClient, log }) => {
        await restoreAlertsSnapshot({ esClient, log, config: CHRYSALIS_95_SNAPSHOT });
        const { count } = await esClient.count({ index: '.alerts-security.alerts-default' });
        log.info(`[attack-discovery] corpus ready: ${count} alerts (reference: 95)`);

        await evaluateDataset({
          dataset: {
            name: 'Attack Discovery Chrysalis kill-chains (generate API)',
            description:
              'Deduped 95-alert Attack Discovery corpus restored from the shared GCS snapshot ' +
              '(security-ai-datasets/attack-discovery/oh-my-malware-95-deduped) and evaluated ' +
              'via the production _generate API.',
            examples: [
              {
                input: {
                  mode: 'generateApi' as const,
                  connectorId: connector.id,
                  alertsIndexPattern: '.alerts-security.alerts-default',
                  size: 100,
                  ...CORPUS_WINDOW,
                },
                output: { attackDiscoveries: [] },
                metadata: {},
              },
            ],
          },
        });
      }
    );
  }
);
