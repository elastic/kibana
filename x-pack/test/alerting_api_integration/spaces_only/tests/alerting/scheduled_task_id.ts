/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getUrlPrefix, TaskManagerDoc, ObjectRemover, getTestRuleData } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

const MIGRATED_RULE_ID = '74f3e6d7-b7bb-477d-ac28-92ee22728e6e';
const MIGRATED_TASK_ID = '329798f0-b0b0-11ea-9510-fdf248d5f2a4';

// eslint-disable-next-line import/no-default-export
export default function createScheduledTaskIdTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('scheduled task id', () => {
    const objectRemover = new ObjectRemover(supertest);
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

    it('cannot create rule with same ID as a scheduled task ID used by another rule', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/${MIGRATED_RULE_ID}`
      );
      expect(response.status).to.eql(200);
      expect(response.body.scheduled_task_id).to.eql(MIGRATED_TASK_ID);

      await supertest
        .post(`${getUrlPrefix(``)}/api/alerting/rule/${MIGRATED_TASK_ID}`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(409);
    });

    it('for migrated rules - sets scheduled task id to match rule id when rule is disabled then enabled', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/${MIGRATED_RULE_ID}`
      );
      expect(response.status).to.eql(200);
      expect(response.body.scheduled_task_id).to.eql(MIGRATED_TASK_ID);

      // scheduled task id should exist
      const taskRecordLoaded = await getScheduledTask(MIGRATED_TASK_ID);
      expect(JSON.parse(taskRecordLoaded.task.params)).to.eql({
        alertId: MIGRATED_RULE_ID,
        spaceId: 'default',
      });

      await supertestWithoutAuth
        .post(`${getUrlPrefix(``)}/api/alerting/rule/${MIGRATED_RULE_ID}/_disable`)
        .set('kbn-xsrf', 'foo')
        .expect(204);

      await supertestWithoutAuth
        .post(`${getUrlPrefix(``)}/api/alerting/rule/${MIGRATED_RULE_ID}/_enable`)
        .set('kbn-xsrf', 'foo')
        .expect(204);

      try {
        await getScheduledTask(MIGRATED_TASK_ID);
        throw new Error('Should have removed scheduled task');
      } catch (e) {
        expect(e.meta.statusCode).to.eql(404);
      }

      // scheduled task id that is same as rule id should exist
      const taskRecordNew = await getScheduledTask(MIGRATED_RULE_ID);
      expect(JSON.parse(taskRecordNew.task.params)).to.eql({
        alertId: MIGRATED_RULE_ID,
        spaceId: 'default',
      });
    });

    it('sets scheduled task id to rule id when rule is created', async () => {
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(``)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData());

      expect(response.status).to.eql(200);
      objectRemover.add('default', response.body.id, 'rule', 'alerting');

      expect(response.body.scheduled_task_id).to.eql(response.body.id);
      const taskRecord = await getScheduledTask(response.body.scheduled_task_id);
      expect(taskRecord.type).to.eql('task');
      expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
      expect(JSON.parse(taskRecord.task.params)).to.eql({
        alertId: response.body.id,
        spaceId: 'default',
      });
    });
  });
}
