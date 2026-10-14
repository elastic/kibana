/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { getEuidPainlessSourceUpdateScript } from '@kbn/entity-store/common/domain/euid/painless';
import { EntityType } from '@kbn/security-solution-plugin/common/entity_analytics/types';
import {
  buildBackfillQuery,
  countPendingAlerts,
  pollBackfill,
  resolveTargetIndices,
  startBackfill,
} from '@kbn/security-solution-plugin/server/lib/entity_analytics/migrations/backfill_alert_entity_id/backfill_client';
import { ALERT_ENTITY_ID } from '@kbn/security-solution-plugin/common/field_maps/field_names';

import type { FtrProviderContext } from '../../../../ftr_provider_context';

const ALIAS = 'backfill-client-test';
const MAPPED_INDEX = `${ALIAS}-000001`;
const UNMAPPED_INDEX = `${ALIAS}-000002`;
const WRONG_TYPE_INDEX = `${ALIAS}-000003`;
const ALERTS_INDEX = '.alerts-security.alerts-default';

const WINDOW = { start: '2020-01-01T00:00:00.000Z', end: '2030-01-01T00:00:00.000Z' };

/**
 * The backfill task's Elasticsearch client, against a real cluster.
 *
 * A purpose-built alias is used rather than the real alerts indices, because these tests need to
 * control the mapping, the document count and the write blocks. That the same calls work against
 * the alerts alias itself is covered by the EUID derivation parity suite.
 */
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const log = getService('log');
  const signal = new AbortController().signal;

  const logger = {
    debug: (message: string) => log.debug(message),
    info: (message: string) => log.info(message),
    warn: (message: string) => log.warning(message),
    error: (message: string) => log.error(message),
    // The client only ever calls the four above; the rest satisfy the Logger type.
    trace: () => {},
    fatal: () => {},
    log: () => {},
    get: () => logger,
    isLevelEnabled: () => true,
  } as never;

  /** Identity fields only, so a host EUID can be derived and the field can be stamped. */
  const properties = {
    '@timestamp': { type: 'date' as const },
    'host.name': { type: 'keyword' as const },
    [ALERT_ENTITY_ID]: { type: 'keyword' as const },
  };

  const seed = async (index: string, count: number) => {
    const operations = Array.from({ length: count }).flatMap((_, i) => [
      { index: { _index: index } },
      { '@timestamp': new Date().toISOString(), 'host.name': `host-${i}` },
    ]);
    await es.bulk({ operations, refresh: true });
  };

  /** Polls until the request finishes, so assertions see a settled task rather than a racing one. */
  const pollUntilComplete = async (esTaskId: string) => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const progress = await pollBackfill({ esClient: es, logger, esTaskId, signal });
      if (progress.completed || progress.vanished) {
        return progress;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Update-by-query ${esTaskId} did not finish in time`);
  };

  const usableIndices = async () => {
    const { usable } = await resolveTargetIndices({
      esClient: es,
      logger,
      alertsIndex: ALIAS,
      signal,
    });
    return usable;
  };

  describe('@ess @serverless @skipInServerlessMKI alert entity.id backfill client', () => {
    beforeEach(async () => {
      await es.indices.create({
        index: MAPPED_INDEX,
        mappings: { dynamic: false, properties },
        aliases: { [ALIAS]: {} },
      });
      // Same shape without the stamped field. Alerts indices are `dynamic: false`, so a write here
      // would succeed and then be invisible to scoring — the task has to exclude it.
      await es.indices.create({
        index: UNMAPPED_INDEX,
        mappings: {
          dynamic: false,
          properties: {
            '@timestamp': properties['@timestamp'],
            'host.name': properties['host.name'],
          },
        },
        aliases: { [ALIAS]: {} },
      });
    });

    afterEach(async () => {
      // Named rather than a wildcard: clusters run with `action.destructive_requires_name`.
      // `ignore_unavailable` because only some tests create the wrong-type index, and without it
      // one missing member makes Elasticsearch reject the whole request and delete nothing.
      await es.indices.delete({
        index: [MAPPED_INDEX, UNMAPPED_INDEX, WRONG_TYPE_INDEX],
        ignore_unavailable: true,
      });
    });

    describe('resolveTargetIndices', () => {
      it('keeps only the indices that can hold the field', async () => {
        const { usable, unusable } = await resolveTargetIndices({
          esClient: es,
          logger,
          alertsIndex: ALIAS,
          signal,
        });

        expect([...usable]).to.eql([MAPPED_INDEX]);
        expect(unusable).to.be(1);
      });

      it('excludes an index that cannot be written to', async () => {
        // The usual cause is a disk flood-stage watermark, which sets a block of its own.
        await es.indices.putSettings({
          index: MAPPED_INDEX,
          settings: { 'index.blocks.write': true },
        });

        const { usable, unusable } = await resolveTargetIndices({
          esClient: es,
          logger,
          alertsIndex: ALIAS,
          signal,
        });

        expect(usable.size).to.be(0);
        expect(unusable).to.be(2);
      });

      it('reports nothing for an alias that does not exist', async () => {
        const { usable, unusable } = await resolveTargetIndices({
          esClient: es,
          logger,
          alertsIndex: 'backfill-client-missing',
          signal,
        });

        expect(usable.size).to.be(0);
        expect(unusable).to.be(0);
      });
    });

    describe('countPendingAlerts', () => {
      it('counts only alerts the backfill would stamp', async () => {
        await seed(MAPPED_INDEX, 5);
        // In the alias but not writable, so outside the query entirely.
        await seed(UNMAPPED_INDEX, 3);

        const count = await countPendingAlerts({
          esClient: es,
          logger,
          alertsIndex: ALIAS,
          query: buildBackfillQuery(WINDOW, await usableIndices()),
          signal,
        });

        expect(count).to.be(5);
      });

      it('does not count alerts that already carry the field', async () => {
        await seed(MAPPED_INDEX, 4);
        await es.updateByQuery({
          index: MAPPED_INDEX,
          refresh: true,
          query: { match_all: {} },
          script: { lang: 'painless', source: `ctx._source['${ALERT_ENTITY_ID}'] = ['host:x'];` },
        });

        const count = await countPendingAlerts({
          esClient: es,
          logger,
          alertsIndex: ALIAS,
          query: buildBackfillQuery(WINDOW, await usableIndices()),
          signal,
        });

        expect(count).to.be(0);
      });
    });

    describe('startBackfill and pollBackfill', () => {
      const start = async (maxDocs: number) => {
        const esTaskId = await startBackfill({
          esClient: es,
          logger,
          alertsIndex: ALIAS,
          query: buildBackfillQuery(WINDOW, await usableIndices()),
          alertsPerSecond: -1,
          maxDocs,
          signal,
        });
        expect(esTaskId).to.be.a('string');
        return esTaskId as string;
      };

      it('stamps everything it matched and reports a total below the cap', async () => {
        await seed(MAPPED_INDEX, 10);

        const progress = await pollUntilComplete(await start(1_000));

        expect(progress.completed).to.be(true);
        expect(progress.total).to.be(10);
        expect(progress.updated).to.be(10);
        expect(progress.failures).to.eql([]);
        // Reading a field the response actually carries, rather than one we named in a mock. If
        // this were misspelled the task would see no conflicts and never reissue for them.
        expect(progress.versionConflicts).to.be(0);
      });

      it('reports total equal to the cap when the cap is reached', async () => {
        await seed(MAPPED_INDEX, 20);

        const progress = await pollUntilComplete(await start(5));

        expect(progress.total).to.be(5);
        expect(progress.updated).to.be(5);
      });

      it('leaves the remainder for the next request', async () => {
        const NUM_ALERTS = 12;
        const MAX_DOCS = 5;

        await seed(MAPPED_INDEX, NUM_ALERTS);

        await pollUntilComplete(await start(MAX_DOCS));
        const remaining = await countPendingAlerts({
          esClient: es,
          logger,
          alertsIndex: ALIAS,
          query: buildBackfillQuery(WINDOW, await usableIndices()),
          signal,
        });

        expect(remaining).to.be(NUM_ALERTS - MAX_DOCS);
      });

      it('surfaces per-document failures the request reported', async () => {
        // An index that has the field but with the wrong type. It passes the mapping check, so the
        // request targets it, and then every write fails
        await es.indices.create({
          index: WRONG_TYPE_INDEX,
          mappings: {
            dynamic: false,
            properties: {
              '@timestamp': properties['@timestamp'],
              'host.name': properties['host.name'],
              [ALERT_ENTITY_ID]: { type: 'long' },
            },
          },
          aliases: { [ALIAS]: {} },
        });
        await seed(WRONG_TYPE_INDEX, 3);

        const progress = await pollUntilComplete(await start(1_000));

        expect(progress.failures.length).to.be.greaterThan(0);
        // Asserting on what the logged entry has to tell an operator — which index and which
        // field — rather than on Elasticsearch's exception name, which it has renamed before.
        expect(progress.failures[0]).to.contain(WRONG_TYPE_INDEX);
        expect(progress.failures[0]).to.contain(ALERT_ENTITY_ID);
      });

      it('reports a task that no longer exists rather than treating it as finished', async () => {
        const progress = await pollBackfill({
          esClient: es,
          logger,
          esTaskId: 'nonexistentnodeid123456:99999',
          signal,
        });

        expect(progress.vanished).to.be(true);
        expect(progress.completed).to.be(false);
      });
    });

    /**
     * The same request against the real alerts indices.
     *
     * Everything above runs on indices this suite creates, for control. These two cover what that
     * cannot: the alerts write target is a hidden, system-managed alias over concrete indices, and
     * nothing about a synthetic alias implies an internal-user update-by-query may write to it.
     *
     * Alerts are bulk-written rather than produced by a rule. The concern here is writing to the
     * alerts index, not rule execution — and a direct write also arrives unstamped, which is the
     * state the backfill targets.
     */
    describe('against the alerts alias', () => {
      const script = getEuidPainlessSourceUpdateScript(
        // Host alone, so an alert with no host identity is genuinely underivable.
        [getBuiltInEntityDefinition(EntityType.host)],
        `ctx._source['${ALERT_ENTITY_ID}'] = euids;`
      );

      const seedAlerts = async (documents: Array<Record<string, unknown>>) => {
        await es.bulk({
          index: ALERTS_INDEX,
          refresh: true,
          operations: documents.flatMap((document) => [
            { create: {} },
            { '@timestamp': new Date().toISOString(), ...document },
          ]),
        });
      };

      const stampUnstampedAlerts = () =>
        es.updateByQuery({
          index: ALERTS_INDEX,
          refresh: true,
          conflicts: 'proceed',
          requests_per_second: 500,
          query: { bool: { must_not: [{ exists: { field: ALERT_ENTITY_ID } }] } },
          script: { lang: 'painless', source: script },
        });

      afterEach(async () => {
        await es.deleteByQuery({
          index: ALERTS_INDEX,
          refresh: true,
          conflicts: 'proceed',
          query: { match_all: {} },
        });
      });

      it('stamps the derived EUID and leaves it searchable', async () => {
        await seedAlerts([{ 'host.id': 'ubq-host-1' }]);

        const response = await stampUnstampedAlerts();

        expect(response.updated).to.be.greaterThan(0);
        expect(response.failures).to.eql([]);

        // Searchable, not merely present in `_source`: alerts are `dynamic: false`, so a write to
        // an index missing the mapping would succeed and be invisible to scoring.
        const stamped = await es.search({
          index: ALERTS_INDEX,
          query: { term: { [ALERT_ENTITY_ID]: 'host:ubq-host-1' } },
        });

        expect((stamped.hits.hits ?? []).length).to.be.greaterThan(0);
      });

      it('skips alerts that resolve to no EUID instead of writing an empty value', async () => {
        await seedAlerts([{ 'user.name': 'alice' }]);

        const response = await stampUnstampedAlerts();

        // `ctx.op = 'noop'` rather than a rewrite, so the document is not touched at all.
        expect(response.updated).to.be(0);
        expect(response.noops).to.be.greaterThan(0);
      });
    });
  });
};
