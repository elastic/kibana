/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cleanupDatastreams,
  cleanupIngestPipelines,
  indexRandomData,
  launchTaskAndWaitFor,
  randomDatastream,
  randomIngestPipeline,
} from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../ftr_provider_context';

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
        const opts = {
          eventTypes: [INGEST_PIPELINES_STATS_EBT],
          withTimeoutMs: 1000,
        };

        await launchTaskAndWaitFor(
          TASK_ID,
          kibanaServer,
          logger,
          `${INGEST_PIPELINES_STATS_EBT} to be published`,
          async (since) => {
            const events = await ebtServer.getEvents(Number.MAX_SAFE_INTEGER, {
              ...opts,
              fromTimestamp: since,
            });

            return events.length >= 1;
          }
        );
      });

      it('should publish events for a new pipeline', async () => {
        const opts = {
          eventTypes: [INGEST_PIPELINES_STATS_EBT],
          withTimeoutMs: 1000,
        };

        await launchTaskAndWaitFor(
          TASK_ID,
          kibanaServer,
          logger,
          `${INGEST_PIPELINES_STATS_EBT} to be published for pipeline ${pipeline}`,
          async (since) => {
            const events = await ebtServer
              .getEvents(Number.MAX_SAFE_INTEGER, { ...opts, fromTimestamp: since })
              .then((result) => result.map((ev) => ev.properties.pipelines))
              .then((result) => result.flat())
              .then((result) => result.filter((ev) => (ev as any).name === pipeline));

            return events.length >= 1;
          }
        );
      });
    });
  });
};
