/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData } from './utils';
import { SpaceScenarios } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createDisableAlertTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('disable', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string) {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    }

    for (const scenario of SpaceScenarios) {
      describe(scenario.id, () => {
        it('should handle disable alert request appropriately', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData({ enabled: true }))
            .expect(200);
          objectRemover.add(scenario.id, createdAlert.id, 'alert');

          await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert/${createdAlert.id}/_disable`)
            .set('kbn-xsrf', 'foo')
            .expect(204, '');

          try {
            await getScheduledTask(createdAlert.scheduledTaskId);
            throw new Error('Should have removed scheduled task');
          } catch (e) {
            expect(e.status).to.eql(404);
          }
        });
      });
    }
  });
}
