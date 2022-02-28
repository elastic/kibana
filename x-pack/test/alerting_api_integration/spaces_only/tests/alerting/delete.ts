/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createDeleteTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('delete', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string) {
      return await es.get({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
    }

    it('should handle delete alert request appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);

      await supertest
        .delete(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');

      try {
        await getScheduledTask(createdAlert.scheduledTaskId);
        throw new Error('Should have removed scheduled task');
      } catch (e) {
        expect(e.meta.statusCode).to.eql(404);
      }
    });

    it(`shouldn't delete alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);

      await supertest
        .delete(`${getUrlPrefix(Spaces.other.id)}/api/alerting/rule/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [alert/${createdAlert.id}] not found`,
        });
    });

    describe('legacy', () => {
      it('should handle delete alert request appropriately', async () => {
        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        await supertest
          .delete(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}`)
          .set('kbn-xsrf', 'foo')
          .expect(204, '');

        try {
          await getScheduledTask(createdAlert.scheduledTaskId);
          throw new Error('Should have removed scheduled task');
        } catch (e) {
          expect(e.meta.statusCode).to.eql(404);
        }
      });
    });
  });
}
