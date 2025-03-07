/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TELEMETRY_DATA_STREAM_EVENT,
  TELEMETRY_ILM_POLICY_EVENT,
  TELEMETRY_ILM_STATS_EVENT,
  TELEMETRY_INDEX_STATS_EVENT,
} from '@kbn/security-solution-plugin/server/lib/telemetry/event_based/events';

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
          eventTypes: [TELEMETRY_DATA_STREAM_EVENT.eventType],
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
          eventTypes: [TELEMETRY_INDEX_STATS_EVENT.eventType],
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
          eventTypes: [TELEMETRY_ILM_POLICY_EVENT.eventType],
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
          eventTypes: [TELEMETRY_ILM_STATS_EVENT.eventType],
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
    });
  });
};
