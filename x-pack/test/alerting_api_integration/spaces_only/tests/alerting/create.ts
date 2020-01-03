/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { checkAAD, getUrlPrefix, getTestAlertData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  describe('create', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string) {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    }

    it('should handle create alert request appropriately', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          actionTypeId: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
              },
            ],
          })
        );

      expect(response.statusCode).to.eql(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'alert');
      expect(response.body).to.eql({
        id: response.body.id,
        name: 'abc',
        tags: ['foo'],
        actions: [
          {
            id: createdAction.id,
            actionTypeId: createdAction.actionTypeId,
            group: 'default',
            params: {},
          },
        ],
        enabled: true,
        alertTypeId: 'test.noop',
        consumer: 'bar',
        params: {},
        createdBy: null,
        schedule: { interval: '1m' },
        scheduledTaskId: response.body.scheduledTaskId,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        createdAt: response.body.createdAt,
        updatedAt: response.body.updatedAt,
      });
      expect(Date.parse(response.body.createdAt)).to.be.greaterThan(0);
      expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(0);
      expect(Date.parse(response.body.updatedAt)).to.eql(Date.parse(response.body.createdAt));

      expect(typeof response.body.scheduledTaskId).to.be('string');
      const { _source: taskRecord } = await getScheduledTask(response.body.scheduledTaskId);
      expect(taskRecord.type).to.eql('task');
      expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
      expect(JSON.parse(taskRecord.task.params)).to.eql({
        alertId: response.body.id,
        spaceId: Spaces.space1.id,
      });
      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: response.body.id,
      });
    });

    it('should handle create alert request appropriately when an alert is disabled ', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ enabled: false }));

      expect(response.statusCode).to.eql(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'alert');
      expect(response.body.scheduledTaskId).to.eql(undefined);
    });
  });
}
