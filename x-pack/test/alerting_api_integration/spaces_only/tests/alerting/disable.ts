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
export default function createDisableAlertTests({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('disable', () => {
    const objectRemover = new ObjectRemover(supertestWithoutAuth);
    const alertUtils = new AlertUtils({ space: Spaces.space1, supertestWithoutAuth });

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string) {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    }

    it('should handle disable alert request appropriately', async () => {
      const { body: createdAlert } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ enabled: true }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert');

      await alertUtils.disable(createdAlert.id);

      try {
        await getScheduledTask(createdAlert.scheduledTaskId);
        throw new Error('Should have removed scheduled task');
      } catch (e) {
        expect(e.status).to.eql(404);
      }

      // Ensure AAD isn't broken
      await checkAAD({
        supertest: supertestWithoutAuth,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdAlert.id,
      });
    });

    it(`shouldn't disable alert from another space`, async () => {
      const { body: createdAlert } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.other.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ enabled: true }))
        .expect(200);
      objectRemover.add(Spaces.other.id, createdAlert.id, 'alert');

      await alertUtils.getDisableRequest(createdAlert.id).expect(404, {
        statusCode: 404,
        error: 'Not Found',
        message: `Saved object [alert/${createdAlert.id}] not found`,
      });
    });
  });
}
