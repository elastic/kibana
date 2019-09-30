/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestAlertData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

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
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData());

      expect(response.statusCode).to.eql(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'alert');
      expect(response.body).to.eql({
        id: response.body.id,
        actions: [],
        enabled: true,
        alertTypeId: 'test.noop',
        alertTypeParams: {},
        createdBy: null,
        interval: '10s',
        scheduledTaskId: response.body.scheduledTaskId,
        updatedBy: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
      });
      expect(typeof response.body.scheduledTaskId).to.be('string');
      const { _source: taskRecord } = await getScheduledTask(response.body.scheduledTaskId);
      expect(taskRecord.type).to.eql('task');
      expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
      expect(JSON.parse(taskRecord.task.params)).to.eql({
        alertId: response.body.id,
        spaceId: Spaces.space1.id,
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
