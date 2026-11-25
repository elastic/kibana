/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  buildBackfillQuery,
  countPendingAlerts,
} from '../../../../../../server/lib/entity_analytics/migrations/backfill_alert_entity_id/backfill_client';
import { ALERT_ENTITY_ID } from '../../../../../../common/field_maps/field_names';

import {
  ALIAS,
  BACKFILL_TAGS,
  MAPPED_INDEX,
  SIGNAL,
  UNMAPPED_INDEX,
  WINDOW,
  asKibanaLogger,
  createTestIndices,
  deleteTestIndices,
  getBackfillTargets,
  seedHosts,
} from '../../fixtures/alert_entity_id_backfill/helpers';

/**
 * Which indices the backfill will write to, and how many alerts are left to stamp.
 */
apiTest.describe('alert entity.id backfill target indices', { tag: BACKFILL_TAGS }, () => {
  apiTest.beforeEach(async ({ esClient }) => {
    await createTestIndices(esClient);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await deleteTestIndices(esClient);
  });

  apiTest('keeps only the indices that can hold the field', async ({ esClient, log }) => {
    const { usable, unusable } = await getBackfillTargets(esClient, asKibanaLogger(log), ALIAS);

    expect([...usable]).toStrictEqual([MAPPED_INDEX]);
    expect(unusable).toBe(1);
  });

  apiTest('keeps every index when all of them map the field', async ({ esClient, log }) => {
    await esClient.indices.delete({ index: UNMAPPED_INDEX });

    const { usable, unusable } = await getBackfillTargets(esClient, asKibanaLogger(log), ALIAS);

    expect([...usable]).toStrictEqual([MAPPED_INDEX]);
    expect(unusable).toBe(0);
  });

  apiTest('keeps no index when none of them map the field', async ({ esClient, log }) => {
    await esClient.indices.delete({ index: MAPPED_INDEX });

    const { usable, unusable } = await getBackfillTargets(esClient, asKibanaLogger(log), ALIAS);

    expect(usable.size).toBe(0);
    expect(unusable).toBe(1);
  });

  apiTest('excludes an index that cannot be written to', async ({ esClient, log }) => {
    await esClient.indices.putSettings({
      index: MAPPED_INDEX,
      settings: { 'index.blocks.write': true },
    });

    const { usable, unusable } = await getBackfillTargets(esClient, asKibanaLogger(log), ALIAS);

    expect(usable.size).toBe(0);
    expect(unusable).toBe(2);
  });

  apiTest('reports nothing for an alias that does not exist', async ({ esClient, log }) => {
    const { usable, unusable } = await getBackfillTargets(
      esClient,
      asKibanaLogger(log),
      'backfill-client-missing'
    );

    expect(usable.size).toBe(0);
    expect(unusable).toBe(0);
  });

  apiTest('counts only alerts the backfill would stamp', async ({ esClient, log }) => {
    const logger = asKibanaLogger(log);
    await seedHosts(esClient, MAPPED_INDEX, 5);
    // In the alias but not writable, so outside the query entirely.
    await seedHosts(esClient, UNMAPPED_INDEX, 3);

    const { usable } = await getBackfillTargets(esClient, logger, ALIAS);
    const count = await countPendingAlerts({
      esClient,
      logger,
      alertsIndex: ALIAS,
      query: buildBackfillQuery(WINDOW, usable),
      signal: SIGNAL,
    });

    expect(count).toBe(5);
  });

  apiTest('does not count alerts that already carry the field', async ({ esClient, log }) => {
    const logger = asKibanaLogger(log);
    await seedHosts(esClient, MAPPED_INDEX, 4);
    await esClient.updateByQuery({
      index: MAPPED_INDEX,
      refresh: true,
      query: { match_all: {} },
      script: { lang: 'painless', source: `ctx._source['${ALERT_ENTITY_ID}'] = ['host:x'];` },
    });

    const { usable } = await getBackfillTargets(esClient, logger, ALIAS);
    const count = await countPendingAlerts({
      esClient,
      logger,
      alertsIndex: ALIAS,
      query: buildBackfillQuery(WINDOW, usable),
      signal: SIGNAL,
    });

    expect(count).toBe(0);
  });
});
