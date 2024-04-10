/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  const logger = getService('log');

  const TASK_ID = 'serverless-security:nlp-cleanup-task:1.0.0';

  describe('@serverless NLP Cleanup Task in Complete Tier', async () => {
    describe('New Complete Deployment', () => {
      it('registers, runs and immediately deletes NLP Cleanup Task', async () => {
        try {
          // When running on CI, the task may not have run and been disabled, so wait for a moment for it to be cleaned up
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const task = await kibanaServer.savedObjects.get({
            type: 'task',
            id: TASK_ID,
          });
          logger.error(`Task should not exist: \n${JSON.stringify(task, null, 2)}`);
        } catch (e) {
          // TODO: Better way to check if task doesn't exist? savedObjects.find() is paginated and returned tasks > pageSize...
          // Maybe query event log, or `.kibana_task_manager` index directly?
          expect(e.message).to.eql('Request failed with status code 404');

          return;
        }
        throw new Error('Task should not exist!');
      });
    });
  });
};
