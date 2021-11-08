/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getUrlPrefix, TaskManagerDoc } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createScheduledTaskIdTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('scheduled task id', () => {
    async function getScheduledTask(id: string): Promise<TaskManagerDoc> {
      const scheduledTask = await es.get<TaskManagerDoc>({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
      return scheduledTask._source!;
    }

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rules_scheduled_task_id');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rules_scheduled_task_id');
    });

    it('sets scheduled task id to match rule id when rule is disabled then enabled', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
      );

      expect(response.status).to.eql(200);

      // scheduled task id should exist
      const taskRecordLoaded = await getScheduledTask(response.body.scheduled_task_id);
      expect(JSON.parse(taskRecordLoaded.task.params)).to.eql({
        alertId: response.body.id,
        spaceId: 'default',
      });

      await supertestWithoutAuth
        .post(`${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-92ee22728e6e/_disable`)
        .set('kbn-xsrf', 'foo')
        .expect(204);

      await supertestWithoutAuth
        .post(`${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-92ee22728e6e/_enable`)
        .set('kbn-xsrf', 'foo')
        .expect(204);

      try {
        await getScheduledTask(response.body.scheduled_task_id);
        throw new Error('Should have removed scheduled task');
      } catch (e) {
        expect(e.meta.statusCode).to.eql(404);
      }

      // scheduled task id that is same as rule id should exist
      const taskRecordNew = await getScheduledTask(response.body.id);
      expect(JSON.parse(taskRecordNew.task.params)).to.eql({
        alertId: response.body.id,
        spaceId: 'default',
      });
    });
  });
}
