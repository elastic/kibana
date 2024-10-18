/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TELEMETRY_CLUSTER_STATS_EVENT,
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
        await launchTask(TASK_ID, kibanaServer, logger);

        const opts = {
          eventTypes: [TELEMETRY_DATA_STREAM_EVENT.eventType],
          withTimeoutMs: 1000,
          fromTimestamp: new Date().toISOString(),
          filters: {
            'properties.datastream_name': {
              eq: dsName,
            },
          },
        };

        await waitFor(
          async () => {
            const eventCount = await ebtServer.getEventCount(opts);
            return eventCount === 1;
          },
          'waitForTaskToRun',
          logger
        );
      });

      it('should publish index stats events', async () => {
        await launchTask(TASK_ID, kibanaServer, logger);

        const opts = {
          eventTypes: [TELEMETRY_INDEX_STATS_EVENT.eventType],
          withTimeoutMs: 1000,
          fromTimestamp: new Date().toISOString(),
        };

        // .ds-<ds-name>-YYYY.MM.DD-NNNNNN
        const regex = new RegExp(`^\.ds-${dsName}-\\d{4}.\\d{2}.\\d{2}-\\d{6}$`);
        await waitFor(
          async () => {
            const events = await ebtServer.getEvents(Number.MAX_SAFE_INTEGER, opts);
            const filtered = events.filter((ev) => regex.test(ev.properties.index_name as string));
            return filtered.length === NUM_INDICES;
          },
          'waitForTaskToRun',
          logger
        );
      });

      it('should publish cluster stats events', async () => {
        await launchTask(TASK_ID, kibanaServer, logger);

        const opts = {
          eventTypes: [TELEMETRY_CLUSTER_STATS_EVENT.eventType],
          withTimeoutMs: 1000,
          fromTimestamp: new Date().toISOString(),
        };

        await waitFor(
          async () => {
            const events = await ebtServer.getEventCount(opts);
            return events === 1;
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
        await launchTask(TASK_ID, kibanaServer, logger);

        const opts = {
          eventTypes: [TELEMETRY_ILM_POLICY_EVENT.eventType],
          withTimeoutMs: 1000,
          fromTimestamp: new Date().toISOString(),
          filters: {
            'properties.policy_name': {
              eq: policyName,
            },
          },
        };

        await waitFor(
          async () => {
            const events = await ebtServer.getEventCount(opts);
            return events === 1;
          },
          'waitForTaskToRun',
          logger
        );
      });

      it('should publish ilm stats events', async () => {
        await launchTask(TASK_ID, kibanaServer, logger);

        const opts = {
          eventTypes: [TELEMETRY_ILM_STATS_EVENT.eventType],
          withTimeoutMs: 1000,
          fromTimestamp: new Date().toISOString(),
          filters: {
            'properties.policy_name': {
              eq: policyName,
            },
          },
        };

        await waitFor(
          async () => {
            const events = await ebtServer.getEventCount(opts);
            return events === NUM_INDICES;
          },
          'waitForTaskToRun',
          logger
        );
      });
    });
  });
};
