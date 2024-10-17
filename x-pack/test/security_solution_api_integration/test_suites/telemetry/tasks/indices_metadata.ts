/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { TELEMETRY_DATA_STREAM_EVENT } from '@kbn/security-solution-plugin/server/lib/telemetry/event_based/events';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { waitFor } from '../../../../common/utils/security_solution';

const TASK_ID = 'security:indices-metadata-telemetry:1.0.0';

export default ({ getService }: FtrProviderContext) => {
  const ebtServer = getService('kibana_ebt_server');
  const kibanaServer = getService('kibanaServer');
  const logger = getService('log');
  const es = getService('es');

  const dsPrefix: string = 'test-ds';

  describe('@ess @serverless Indices metadata task telemetry', () => {
    let dsName: string;

    before(async () => {});

    after(async () => {});

    beforeEach(async () => {
      dsName = `${dsPrefix}-${Date.now()}`;
      const indexTemplateBody = {
        index_patterns: [`${dsPrefix}-*`],
        data_stream: {},
        template: {},
      };

      await es.indices.putIndexTemplate({
        name: dsPrefix,
        body: indexTemplateBody,
      });

      await es.indices.createDataStream({ name: dsName });
    });

    afterEach(async () => {
      es.indices.deleteDataStream({ name: dsName });
    });

    describe('indices metadata', () => {
      it('should publish data stream events', async () => {
        await runSoon(TASK_ID);

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
    });
  });

  const runSoon = async (taskId: string, delayMillis: number = 1_000) => {
    const task = await kibanaServer.savedObjects.get({
      type: 'task',
      id: taskId,
    });

    const runAt = new Date(Date.now() + delayMillis).toISOString();

    await kibanaServer.savedObjects.update({
      type: 'task',
      id: taskId,
      attributes: {
        ...task.attributes,
        runAt,
        scheduledAt: runAt,
        status: TaskStatus.Idle,
      },
    });
  };
};
