/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  cleanupDatastreams,
  cleanupIngestPipelines,
  indexRandomData,
  launchTask,
  randomDatastream,
  randomIngestPipeline,
  taskHasRun,
  waitFor,
} from '../../../../common/utils/security_solution';

const TASK_ID = 'security:ingest-pipelines-stats-telemetry:1.0.0';
const INGEST_PIPELINES_STATS_EBT = 'telemetry_node_ingest_pipelines_stats_event';

export default ({ getService }: FtrProviderContext) => {
  const ebtServer = getService('kibana_ebt_server');
  const kibanaServer = getService('kibanaServer');
  const logger = getService('log');
  const es = getService('es');

  describe('Security Telemetry - Ingest pipeline stats task.', function () {
    let datastream: string;
    let pipeline: string;

    describe('@ess @serverless indices metadata', () => {
      beforeEach(async () => {
        datastream = await randomDatastream(es);
        pipeline = await randomIngestPipeline(es);

        await indexRandomData(es, datastream, pipeline);
      });

      afterEach(async () => {
        await cleanupDatastreams(es);
        await cleanupIngestPipelines(es);
      });

      it('should publish events when scheduled', async () => {
        const runAt = await launchTask(TASK_ID, kibanaServer, logger);

        const opts = {
          eventTypes: [INGEST_PIPELINES_STATS_EBT],
          withTimeoutMs: 1000,
          fromTimestamp: new Date().toISOString(),
        };

        await waitFor(
          async () => {
            const events = await ebtServer.getEvents(Number.MAX_SAFE_INTEGER, opts);

            const hasRun = await taskHasRun(TASK_ID, kibanaServer, runAt);
            const eventCount = events.length;

            return hasRun && eventCount >= 0;
          },
          'waitForTaskToRun',
          logger
        );
      });

      it('should publish events for a new pipeline', async () => {
        const runAt = await launchTask(TASK_ID, kibanaServer, logger);

        const opts = {
          eventTypes: [INGEST_PIPELINES_STATS_EBT],
          withTimeoutMs: 1000,
          fromTimestamp: new Date().toISOString(),
        };

        await waitFor(
          async () => {
            const events = await ebtServer
              .getEvents(Number.MAX_SAFE_INTEGER, opts)
              .then((result) => result.map((ev) => ev.properties.pipelines))
              .then((result) => result.flat())
              .then((result) => result.filter((ev) => (ev as any).name === pipeline));

            const hasRun = await taskHasRun(TASK_ID, kibanaServer, runAt);
            const eventCount = events.length;

            return hasRun && eventCount >= 1;
          },
          'waitForTaskToRun',
          logger
        );
      });
    });
  });
};
