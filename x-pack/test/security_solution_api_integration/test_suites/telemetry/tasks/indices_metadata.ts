/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  cleanupDatastreams,
  cleanupPolicies,
  ensureBackingIndices,
  launchTask,
  randomDatastream,
  randomIlmPolicy,
  taskHasRun,
  waitFor,
} from '../../../../common/utils/security_solution';

const TASK_ID = 'security:indices-metadata-telemetry:1.0.0';
const NUM_INDICES = 5;

const TELEMETRY_INDEX_STATS_EVENT = 'telemetry_index_stats_event';
const TELEMETRY_ILM_STATS_EVENT = 'telemetry_ilm_stats_event';
const TELEMETRY_ILM_POLICY_EVENT = 'telemetry_ilm_policy_event';
const TELEMETRY_DATA_STREAM_EVENT = 'telemetry_data_stream_event';

export default ({ getService }: FtrProviderContext) => {
  const ebtServer = getService('kibana_ebt_server');
  const kibanaServer = getService('kibanaServer');
  const logger = getService('log');
  const es = getService('es');

  describe('Indices metadata task telemetry', function () {
    let dsName: string;
    let policyName: string;

    describe('@ess @serverless indices metadata', () => {
      beforeEach(async () => {
        dsName = await randomDatastream(es);
        await ensureBackingIndices(dsName, NUM_INDICES, es);
      });

      afterEach(async () => {
        await cleanupDatastreams(es);
      });

      it('should publish data stream events', async () => {
        const runAt = await launchTask(TASK_ID, kibanaServer, logger);

        const opts = {
          eventTypes: [TELEMETRY_DATA_STREAM_EVENT],
          withTimeoutMs: 1000,
          fromTimestamp: new Date().toISOString(),
        };

        await waitFor(
          async () => {
            const events = await ebtServer
              .getEvents(Number.MAX_SAFE_INTEGER, opts)
              .then((result) => result.map((ev) => ev.properties.items))
              .then((result) => result.flat())
              .then((result) => result.filter((ev) => (ev as any).datastream_name === dsName));

            const hasRun = await taskHasRun(TASK_ID, kibanaServer, runAt);
            const eventCount = events.length;

            return hasRun && eventCount === 1;
          },
          'waitForTaskToRun',
          logger
        );
      });

      it('should publish index stats events', async () => {
        const runAt = await launchTask(TASK_ID, kibanaServer, logger);

        const opts = {
          eventTypes: [TELEMETRY_INDEX_STATS_EVENT],
          withTimeoutMs: 1000,
          fromTimestamp: new Date().toISOString(),
        };

        // .ds-<ds-name>-YYYY.MM.DD-NNNNNN
        const regex = new RegExp(`^\.ds-${dsName}-\\d{4}.\\d{2}.\\d{2}-\\d{6}$`);
        await waitFor(
          async () => {
            const events = await ebtServer
              .getEvents(Number.MAX_SAFE_INTEGER, opts)
              .then((result) => result.map((ev) => ev.properties.items))
              .then((result) => result.flat())
              .then((result) =>
                result.filter((ev) => regex.test((ev as any).index_name as string))
              );

            const hasRun = await taskHasRun(TASK_ID, kibanaServer, runAt);

            return hasRun && events.length === NUM_INDICES;
          },
          'waitForTaskToRun',
          logger
        );
      });
    });

    describe('@ess indices metadata', function () {
      this.tags('skipServerless');

      beforeEach(async () => {
        policyName = await randomIlmPolicy(es);
        dsName = await randomDatastream(es, policyName);
        await ensureBackingIndices(dsName, NUM_INDICES, es);
      });

      afterEach(async () => {
        await cleanupDatastreams(es);
        await cleanupPolicies(es);
      });

      it('should publish ilm policy events', async () => {
        const runAt = await launchTask(TASK_ID, kibanaServer, logger);

        const opts = {
          eventTypes: [TELEMETRY_ILM_POLICY_EVENT],
          withTimeoutMs: 1000,
          fromTimestamp: new Date().toISOString(),
        };

        await waitFor(
          async () => {
            const events = await ebtServer
              .getEvents(Number.MAX_SAFE_INTEGER, opts)
              .then((result) => result.map((ev) => ev.properties.items))
              .then((result) => result.flat())
              .then((result) => result.filter((ev) => (ev as any).policy_name === policyName));

            const hasRun = await taskHasRun(TASK_ID, kibanaServer, runAt);

            return hasRun && events.length === 1;
          },
          'waitForTaskToRun',
          logger
        );
      });

      it('should publish ilm stats events', async () => {
        const runAt = await launchTask(TASK_ID, kibanaServer, logger);

        const opts = {
          eventTypes: [TELEMETRY_ILM_STATS_EVENT],
          withTimeoutMs: 1000,
          fromTimestamp: new Date().toISOString(),
        };

        await waitFor(
          async () => {
            const events = await ebtServer
              .getEvents(Number.MAX_SAFE_INTEGER, opts)
              .then((result) => result.map((ev) => ev.properties.items))
              .then((result) => result.flat())
              .then((result) => result.filter((ev) => (ev as any).policy_name === policyName));

            const hasRun = await taskHasRun(TASK_ID, kibanaServer, runAt);

            return hasRun && events.length === NUM_INDICES;
          },
          'waitForTaskToRun',
          logger
        );
      });

      it('index stats events should have the expected fields', async () => {
        for (let i = 0; i < 10; i++) {
          await es.index({
            index: dsName,
            body: { '@timestamp': new Date().toISOString(), foo: 'bar', bar: i },
          });
        }

        await waitFor(
          async () => {
            const count = await es.count({ index: dsName });

            return count.count === 10;
          },
          'waitForTaskToRun',
          logger
        );

        let index = '';
        let id = '';
        for (let _ = 0; _ < 10; _++) {
          const search = await es.search({
            index: dsName,
          });
          id = search.hits.hits[0]._id ?? '';
          index = search.hits.hits[0]._index;
        }

        await es
          .create({
            index: dsName,
            id,
            body: { '@timestamp': new Date().toISOString(), foo: 'bar', bar: 99 },
          })
          .catch((_) => {});

        await es.delete({ index, id });

        const runAt = await launchTask(TASK_ID, kibanaServer, logger);

        const opts = {
          eventTypes: [TELEMETRY_INDEX_STATS_EVENT],
          withTimeoutMs: 1000,
          fromTimestamp: new Date().toISOString(),
        };

        // .ds-<ds-name>-YYYY.MM.DD-NNNNNN
        const regex = new RegExp(`^\.ds-${dsName}-\\d{4}.\\d{2}.\\d{2}-\\d{6}$`);
        await waitFor(
          async () => {
            const events = await ebtServer
              .getEvents(Number.MAX_SAFE_INTEGER, opts)
              .then((result) => result.map((ev) => ev.properties.items))
              .then((result) => result.flat())
              .then((result) =>
                result.filter((ev) => regex.test((ev as any).index_name as string))
              );

            const hasRun = await taskHasRun(TASK_ID, kibanaServer, runAt);

            return hasRun && events.length === NUM_INDICES;
          },
          'waitForTaskToRun',
          logger
        );

        const events = await ebtServer
          .getEvents(Number.MAX_SAFE_INTEGER, opts)
          .then((result) => result.map((ev) => ev.properties.items))
          .then((result) => result.flat())
          .then((result) => result.filter((ev) => regex.test((ev as any).index_name as string)));

        expect(
          events.some((ev) => {
            return (ev as any).docs_total_size_in_bytes_primaries > 1;
          })
        ).toBeTruthy();

        expect(
          events.some((ev) => {
            return (ev as any).docs_deleted_primaries > 1;
          })
        ).toBeTruthy();

        expect(
          events.some((ev) => {
            return (ev as any).docs_count_primaries > 1;
          })
        ).toBeTruthy();

        expect(
          events.some((ev) => {
            return (ev as any).docs_total_size_in_bytes > 1;
          })
        ).toBeTruthy();

        expect(
          events.some((ev) => {
            return (ev as any).docs_deleted > 1;
          })
        ).toBeTruthy();

        expect(
          events.some((ev) => {
            return (ev as any).docs_count > 1;
          })
        ).toBeTruthy();

        expect(
          events.some((ev) => {
            return (ev as any).query_total > 1;
          })
        ).toBeTruthy();

        expect(
          events.some((ev) => {
            return (ev as any).index_failed_due_to_version_conflict > 0;
          })
        ).toBeTruthy();

        expect(
          events.some((ev) => {
            return (ev as any).index_failed > 0;
          })
        ).toBeTruthy();
      });
    });
  });
};
