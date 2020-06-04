/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestAlertData,
  ObjectRemover,
} from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function createEnableAlertTests({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('enable', () => {
    const objectRemover = new ObjectRemover(supertestWithoutAuth);
    const alertUtils = new AlertUtils({ space: Spaces.space1, supertestWithoutAuth });

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string) {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    }

    it('should handle enable alert request appropriately', async () => {
      const { body: createdAlert } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ enabled: false }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

      await alertUtils.enable(createdAlert.id);

      const { body: updatedAlert } = await supertestWithoutAuth
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);
      expect(typeof updatedAlert.scheduledTaskId).to.eql('string');
      const { _source: taskRecord } = await getScheduledTask(updatedAlert.scheduledTaskId);
      expect(taskRecord.type).to.eql('task');
      expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
      expect(JSON.parse(taskRecord.task.params)).to.eql({
        alertId: createdAlert.id,
        spaceId: Spaces.space1.id,
      });

      // Ensure AAD isn't broken
      await checkAAD({
        supertest: supertestWithoutAuth,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdAlert.id,
      });
    });

    it(`shouldn't enable alert from another space`, async () => {
      const { body: createdAlert } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.other.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ enabled: false }))
        .expect(200);
      objectRemover.add(Spaces.other.id, createdAlert.id, 'alert', 'alerts');

      await alertUtils.getEnableRequest(createdAlert.id).expect(404, {
        statusCode: 404,
        error: 'Not Found',
        message: `Saved object [alert/${createdAlert.id}] not found`,
      });
    });
  });
}
