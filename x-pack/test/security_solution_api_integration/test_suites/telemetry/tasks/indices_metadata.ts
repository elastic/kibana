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
  cleanupIngestPipelines,
  cleanupPolicies,
  ensureBackingIndices,
  launchTask,
  randomDatastream,
  randomIlmPolicy,
  randomIngestPipeline,
  taskHasRun,
  waitFor,
} from '../../../../common/utils/security_solution';

const TASK_ID = 'security:indices-metadata-telemetry:1.0.0';
const NUM_INDICES = 5;

const TELEMETRY_INDEX_STATS_EVENT = 'telemetry_index_stats_event';
const TELEMETRY_ILM_STATS_EVENT = 'telemetry_ilm_stats_event';
const TELEMETRY_ILM_POLICY_EVENT = 'telemetry_ilm_policy_event';
const TELEMETRY_DATA_STREAM_EVENT = 'telemetry_data_stream_event';
const TELEMETRY_INDEX_SETTINGS_EVENT = 'telemetry_index_settings_event';
const TELEMETRY_INDEX_TEMPLATES_EVENT = 'telemetry_index_templates_event';

export default ({ getService }: FtrProviderContext) => {
  const ebtServer = getService('kibana_ebt_server');
  const kibanaServer = getService('kibanaServer');
  const logger = getService('log');
  const es = getService('es');

  describe('Security Telemetry - Indices metadata task telemetry', function () {
    let dsName: string;
    let policyName: string;
    let defaultPipeline: string;
    let finalPipeline: string;

    // FLAKY: https://github.com/elastic/kibana/issues/216044
    describe.skip('@ess @serverless indices metadata', () => {
      beforeEach(async () => {
        dsName = await randomDatastream(es);
        await ensureBackingIndices(dsName, NUM_INDICES, es);
      });

      afterEach(async () => {
        await cleanupDatastreams(es);
      });

      it('should publish data stream events', async () => {
        const events = await launchTaskAndWaitForEvents({
          eventTypes: [TELEMETRY_DATA_STREAM_EVENT],
          dsName,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);
      });

      it('should include `template` in data stream events when defined', async () => {
        const events = await launchTaskAndWaitForEvents({
          eventTypes: [TELEMETRY_DATA_STREAM_EVENT],
          dsName,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);
        const event = events[0] as any;
        expect(event.template).toBeDefined();
      });

      it('should publish index stats events', async () => {
        const events = await launchTaskAndWaitForEvents({
          eventTypes: [TELEMETRY_INDEX_STATS_EVENT],
          index: dsName,
        });

        expect(events.length).toEqual(NUM_INDICES);
      });
    });

    describe('@ess indices metadata', function () {
      this.tags('skipServerless');

      beforeEach(async () => {
        policyName = await randomIlmPolicy(es);
        defaultPipeline = await randomIngestPipeline(es);
        finalPipeline = await randomIngestPipeline(es);
        dsName = await randomDatastream(es, { policyName, defaultPipeline, finalPipeline });
        await ensureBackingIndices(dsName, NUM_INDICES, es);
      });

      afterEach(async () => {
        await cleanupDatastreams(es);
        await cleanupPolicies(es);
        await cleanupIngestPipelines(es);
      });

      it('should include `ilm_policy` in data stream events when defined', async () => {
        const events = await launchTaskAndWaitForEvents({
          eventTypes: [TELEMETRY_DATA_STREAM_EVENT],
          dsName,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);
        const event = events[0] as any;
        expect(event.ilm_policy).toBeDefined();
      });

      it('should publish ilm policy events', async () => {
        const events = await launchTaskAndWaitForEvents({
          eventTypes: [TELEMETRY_ILM_POLICY_EVENT],
          policyName,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);
      });

      it('should publish ilm stats events', async () => {
        const events = await launchTaskAndWaitForEvents({
          eventTypes: [TELEMETRY_ILM_STATS_EVENT],
          policyName,
        });

        expect(events.length).toEqual(NUM_INDICES);
      });

      it('index stats events should have the expected fields', async () => {
        const numDocs = 10;

        // Index some docs
        await indexRandomDocs(dsName, numDocs);

        // search docs to increment the stats and also to get a valid id
        const search = await es.search({
          index: dsName,
        });
        const id = search.hits.hits[0]._id ?? '';
        const index = search.hits.hits[0]._index;

        // create a doc with a version conflict to increment the failed stats
        await es
          .create({
            index: dsName,
            id,
            body: { '@timestamp': new Date().toISOString(), foo: 'bar', bar: 99 },
          })
          .catch((_) => {});

        // delete a doc to increment the deleted stats
        await es.delete({ index, id });

        const events = await launchTaskAndWaitForEvents({
          eventTypes: [TELEMETRY_INDEX_STATS_EVENT],
          index: dsName,
        });
        expect(events.length).toEqual(NUM_INDICES);

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
            return (ev as any).docs_count_primaries === numDocs - 1;
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
            return (ev as any).docs_count === numDocs - 1;
          })
        ).toBeTruthy();

        expect(
          events.some((ev) => {
            return (ev as any).query_total > 1;
          })
        ).toBeTruthy();

        expect(
          events.some((ev) => {
            return (ev as any).index_failed_due_to_version_conflict === 1;
          })
        ).toBeTruthy();

        expect(
          events.some((ev) => {
            return (ev as any).index_failed === 1;
          })
        ).toBeTruthy();
      });

      it('should publish indices settings', async () => {
        const events = await launchTaskAndWaitForEvents({
          eventTypes: [TELEMETRY_INDEX_SETTINGS_EVENT],
          index: dsName,
        });

        expect(events.length).toEqual(NUM_INDICES);
        expect(events.filter((v) => v.default_pipeline === defaultPipeline)).toHaveLength(
          NUM_INDICES
        );
        expect(events.filter((v) => v.final_pipeline === finalPipeline)).toHaveLength(NUM_INDICES);
      });

      it('should publish index mode as part of index settings', async () => {
        const events = await launchTaskAndWaitForEvents({
          eventTypes: [TELEMETRY_INDEX_SETTINGS_EVENT],
          index: dsName,
        });

        expect(events.length).toEqual(NUM_INDICES);
        expect(events.filter((v) => v.index_mode !== undefined)).toHaveLength(NUM_INDICES);
      });

      it('should publish index templates', async () => {
        const events = await launchTaskAndWaitForEvents({
          eventTypes: [TELEMETRY_INDEX_TEMPLATES_EVENT],
        });

        expect(events.length).toBeGreaterThanOrEqual(1);
      });
    });

    const indexRandomDocs = async (index: string, count: number) => {
      for (let i = 0; i < count; i++) {
        await es.index({
          index,
          body: { '@timestamp': new Date().toISOString(), foo: 'bar', bar: i },
        });
      }

      await waitFor(
        async () => {
          const resp = await es.count({ index });

          return resp.count === count;
        },
        'waitForTaskToRun',
        logger
      );
    };

    const launchTaskAndWaitForEvents = async (params: {
      eventTypes: string[];
      dsName?: string;
      policyName?: string;
      index?: string;
    }) => {
      const datastream = params.dsName;
      const index = params.index;
      const policy = params.policyName;

      const runAt = await launchTask(TASK_ID, kibanaServer, logger);
      const opts = {
        eventTypes: params.eventTypes,
        withTimeoutMs: 1000,
        fromTimestamp: new Date().toISOString(),
      };

      // .ds-<ds-name>-YYYY.MM.DD-NNNNNN
      const regex = new RegExp(`^\.ds-${index}-\\d{4}.\\d{2}.\\d{2}-\\d{6}$`);
      let events: any[] = [];
      await waitFor(
        async () => {
          events = await ebtServer
            .getEvents(Number.MAX_SAFE_INTEGER, opts)
            .then((result) => result.map((ev) => ev.properties.items))
            .then((result) => result.flat())
            .then((result) =>
              result.filter((ev) => {
                const event = ev as any;
                return index === undefined || regex.test(event.index_name as string);
              })
            )
            .then((result) =>
              result.filter((ev) => {
                const event = ev as any;
                return datastream === undefined || event.datastream_name === datastream;
              })
            )
            .then((result) =>
              result.filter((ev) => {
                const event = ev as any;
                return policy === undefined || event.policy_name === policy;
              })
            );

          const hasRun = await taskHasRun(TASK_ID, kibanaServer, runAt);

          return hasRun && events.length > 0;
        },
        'waitForTaskToRun',
        logger
      );

      return events;
    };
  });
};
