/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData } from './utils';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function createDeleteTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('delete', () => {
    let alertId: string;
    let scheduledTaskId: string;

    before(async () => {
      await esArchiver.load('actions/basic');
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200)
        .then((resp: any) => {
          alertId = resp.body.id;
          scheduledTaskId = resp.body.scheduledTaskId;
        });
    });
    after(() => esArchiver.unload('actions/basic'));

    async function getScheduledTask(id: string) {
      return await es.get({
        id,
        index: '.kibana_task_manager',
      });
    }

    it('should return 200 when deleting an alert and removing scheduled task', async () => {
      await supertest
        .delete(`/api/alert/${alertId}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);
      let hasThrownError = false;
      try {
        await getScheduledTask(scheduledTaskId);
      } catch (e) {
        hasThrownError = true;
        expect(e.status).to.eql(404);
      }
      expect(hasThrownError).to.eql(true);
    });
  });
}
