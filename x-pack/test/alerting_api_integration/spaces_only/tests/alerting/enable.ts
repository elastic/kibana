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
export default function createEnableAlertTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('enable', () => {
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
        it('should handle enable alert request appropriately', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData({ enabled: false }))
            .expect(200);
          objectRemover.add(scenario.id, createdAlert.id, 'alert');

          await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/alert/${createdAlert.id}/_enable`)
            .set('kbn-xsrf', 'foo')
            .expect(204, '');

          const { body: updatedAlert } = await supertest
            .get(`${getUrlPrefix(scenario.id)}/api/alert/${createdAlert.id}`)
            .set('kbn-xsrf', 'foo')
            .expect(200);
          expect(typeof updatedAlert.scheduledTaskId).to.eql('string');
          const { _source: taskRecord } = await getScheduledTask(updatedAlert.scheduledTaskId);
          expect(taskRecord.type).to.eql('task');
          expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
          expect(JSON.parse(taskRecord.task.params)).to.eql({
            alertId: createdAlert.id,
            spaceId: scenario.id,
          });
        });
      });
    }
  });
}
