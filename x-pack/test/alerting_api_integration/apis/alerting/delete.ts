/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData } from './utils';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function createDeleteTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('delete', () => {
    let alertId: string;
    let scheduledTaskId: string;
    let space1AlertId: string;
    let space1ScheduledTaskId: string;

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
      await supertest
        .post('/s/space_1/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200)
        .then((resp: any) => {
          space1AlertId = resp.body.id;
          space1ScheduledTaskId = resp.body.scheduledTaskId;
        });
    });
    after(() => esArchiver.unload('actions/basic'));

    async function getScheduledTask(id: string) {
      return await es.get({
        id,
        index: '.kibana_task_manager',
      });
    }

    it('should return 204 when deleting an alert and removing scheduled task', async () => {
      await supertest
        .delete(`/api/alert/${alertId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
      let hasThrownError = false;
      try {
        await getScheduledTask(scheduledTaskId);
      } catch (e) {
        hasThrownError = true;
        expect(e.status).to.eql(404);
      }
      expect(hasThrownError).to.eql(true);
    });

    it('should return 404 when deleting an alert from another space', async () => {
      await supertest
        .delete(`/api/alert/${space1AlertId}`)
        .set('kbn-xsrf', 'foo')
        .expect(404);
    });

    it('should return 204 when deleting an alert in a space', async () => {
      await supertest
        .delete(`/s/space_1/api/alert/${space1AlertId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
      let hasThrownError = false;
      try {
        await getScheduledTask(space1ScheduledTaskId);
      } catch (e) {
        hasThrownError = true;
        expect(e.status).to.eql(404);
      }
      expect(hasThrownError).to.eql(true);
    });
  });
}
