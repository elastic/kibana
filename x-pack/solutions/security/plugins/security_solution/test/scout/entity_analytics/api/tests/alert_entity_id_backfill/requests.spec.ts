/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EsClient } from '@kbn/scout-security';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { getEuidPainlessSourceUpdateScript } from '@kbn/entity-store/common/domain/euid/painless';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import {
  buildBackfillQuery,
  countPendingAlerts,
  resolveTargetIndices,
  startBackfill,
} from '../../../../../../server/lib/entity_analytics/migrations/backfill_alert_entity_id/backfill_client';
import { ALERT_ENTITY_ID } from '../../../../../../common/field_maps/field_names';

import {
  ALERTS_INDEX,
  ALIAS,
  BACKFILL_TAGS,
  MAPPED_INDEX,
  SIGNAL,
  TEST_INDEX_PROPERTIES,
  WINDOW,
  WRONG_TYPE_INDEX,
  asKibanaLogger,
  createTestIndices,
  deleteTestIndices,
  pollUntilComplete,
  readBackfillProgress,
  seedDocuments,
  seedHosts,
} from '../../fixtures/alert_entity_id_backfill/helpers';

/**
 * Issuing the update-by-query and reading its progress back.
 */
apiTest.describe('alert entity.id backfill requests', { tag: BACKFILL_TAGS }, () => {
  const script = getEuidPainlessSourceUpdateScript(
    // Host alone, so an alert with no host identity is genuinely underivable.
    [getBuiltInEntityDefinition(EntityType.host)],
    `ctx._source['${ALERT_ENTITY_ID}'] = euids;`
  );

  apiTest.beforeEach(async ({ esClient }) => {
    await createTestIndices(esClient);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await deleteTestIndices(esClient);
    await esClient.deleteByQuery({
      index: ALERTS_INDEX,
      refresh: true,
      conflicts: 'proceed',
      query: { match_all: {} },
    });
  });

  const start = async (esClient: EsClient, logger: Logger, maxDocs: number) => {
    const { usable } = await resolveTargetIndices({
      esClient,
      logger,
      alertsIndex: ALIAS,
      signal: SIGNAL,
    });
    const esTaskId = await startBackfill({
      esClient,
      logger,
      alertsIndex: ALIAS,
      query: buildBackfillQuery(WINDOW, usable),
      alertsPerSecond: -1,
      maxDocs,
      signal: SIGNAL,
    });

    expect(typeof esTaskId).toBe('string');
    return esTaskId as string;
  };

  apiTest(
    'stamps everything it matched and reports a total below the cap',
    async ({ esClient, log }) => {
      const CAP = 1_000;
      const NUM_DOCS = 10;

      const logger = asKibanaLogger(log);
      await seedHosts(esClient, MAPPED_INDEX, NUM_DOCS);

      const progress = await pollUntilComplete(
        esClient,
        logger,
        await start(esClient, logger, CAP)
      );

      expect(progress.completed).toBe(true);
      expect(progress.total).toBe(NUM_DOCS);
      expect(progress.updated).toBe(NUM_DOCS);
      expect(progress.failures).toStrictEqual([]);
      expect(progress.versionConflicts).toBe(0);
    }
  );

  apiTest('reports total equal to the cap when the cap is reached', async ({ esClient, log }) => {
    const CAP = 5;
    const NUM_DOCS = 20;

    const logger = asKibanaLogger(log);
    await seedHosts(esClient, MAPPED_INDEX, NUM_DOCS);

    const progress = await pollUntilComplete(esClient, logger, await start(esClient, logger, CAP));

    expect(progress.total).toBe(CAP);
    expect(progress.updated).toBe(CAP);
  });

  apiTest('leaves the remainder for the next request', async ({ esClient, log }) => {
    const CAP = 5;
    const NUM_DOCS = 12;

    const logger = asKibanaLogger(log);
    await seedHosts(esClient, MAPPED_INDEX, NUM_DOCS);

    await pollUntilComplete(esClient, logger, await start(esClient, logger, CAP));
    const { usable } = await resolveTargetIndices({
      esClient,
      logger,
      alertsIndex: ALIAS,
      signal: SIGNAL,
    });
    const remaining = await countPendingAlerts({
      esClient,
      logger,
      alertsIndex: ALIAS,
      query: buildBackfillQuery(WINDOW, usable),
      signal: SIGNAL,
    });

    expect(remaining).toBe(NUM_DOCS - CAP);
  });

  apiTest('surfaces per-document failures the request reported', async ({ esClient, log }) => {
    // An index that has the field but with the wrong type. It passes the mapping check, so the
    // request targets it, and then every write fails
    const logger = asKibanaLogger(log);
    await esClient.indices.create({
      index: WRONG_TYPE_INDEX,
      mappings: {
        dynamic: false,
        properties: {
          '@timestamp': TEST_INDEX_PROPERTIES['@timestamp'],
          'host.name': TEST_INDEX_PROPERTIES['host.name'],
          [ALERT_ENTITY_ID]: { type: 'long' },
        },
      },
      aliases: { [ALIAS]: {} },
    });
    await seedHosts(esClient, WRONG_TYPE_INDEX, 3);

    const progress = await pollUntilComplete(
      esClient,
      logger,
      await start(esClient, logger, 1_000)
    );

    expect(progress.failures.length).toBeGreaterThan(0);
    // Asserting on what the logged entry has to tell an operator — which index and which field —
    // rather than on Elasticsearch's exception name, which it has renamed before.
    expect(progress.failures[0]).toContain(WRONG_TYPE_INDEX);
    expect(progress.failures[0]).toContain(ALERT_ENTITY_ID);
  });

  apiTest(
    'reports a task that no longer exists rather than treating it as finished',
    async ({ esClient, log }) => {
      // The node running it restarted, or someone cancelled it. Alerts it had not reached are still
      // unstamped, so the request has to be reissued.
      const progress = await readBackfillProgress(
        esClient,
        asKibanaLogger(log),
        'nonexistentnodeid123456:99999'
      );

      expect(progress.vanished).toBe(true);
      expect(progress.completed).toBe(false);
    }
  );

  // Everything above runs on indices this suite creates, for control. This covers what that
  // cannot: the alerts write target is a hidden, system-managed alias over concrete indices, and
  // nothing about a synthetic alias implies an internal-user update-by-query may write to it.
  apiTest(
    'stamps alerts on the real alerts alias and leaves them searchable',
    async ({ esClient }) => {
      await seedDocuments(esClient, ALERTS_INDEX, [{ 'host.id': 'ubq-host-1' }]);

      const response = await esClient.updateByQuery({
        index: ALERTS_INDEX,
        refresh: true,
        conflicts: 'proceed',
        requests_per_second: 500,
        query: { bool: { must_not: [{ exists: { field: ALERT_ENTITY_ID } }] } },
        script: { lang: 'painless', source: script },
      });

      expect(response.updated).toBeGreaterThan(0);
      expect(response.failures).toStrictEqual([]);

      // Searchable, not merely present in `_source`: alerts are `dynamic: false`, so a write to an
      // index missing the mapping would succeed and be invisible to scoring.
      const stamped = await esClient.search({
        index: ALERTS_INDEX,
        query: { term: { [ALERT_ENTITY_ID]: 'host:ubq-host-1' } },
      });

      expect((stamped.hits.hits ?? []).length).toBeGreaterThan(0);
    }
  );

  apiTest(
    'skips alerts that resolve to no EUID instead of writing an empty value',
    async ({ esClient }) => {
      await seedDocuments(esClient, ALERTS_INDEX, [{ 'user.name': 'alice' }]);

      const response = await esClient.updateByQuery({
        index: ALERTS_INDEX,
        refresh: true,
        conflicts: 'proceed',
        query: { bool: { must_not: [{ exists: { field: ALERT_ENTITY_ID } }] } },
        script: { lang: 'painless', source: script },
      });

      // `ctx.op = 'noop'` rather than a rewrite, so the document is not touched at all.
      expect(response.updated).toBe(0);
      expect(response.noops).toBeGreaterThan(0);
    }
  );
});
