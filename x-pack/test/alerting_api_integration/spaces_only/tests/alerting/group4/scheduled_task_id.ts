/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  getUrlPrefix,
  TaskManagerDoc,
  ObjectRemover,
  getTestRuleData,
} from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

const MIGRATED_RULE_ID = '74f3e6d7-b7bb-477d-ac28-92ee22728e6e';
const MIGRATED_TASK_ID = '329798f0-b0b0-11ea-9510-fdf248d5f2a4';

// eslint-disable-next-line import/no-default-export
export default function createScheduledTaskIdTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');

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
      // Not 100% sure why, seems the rules need to be loaded separately to avoid the task
      // failing to load the rule during execution and deleting itself. Otherwise
      // we have flakiness
      await esArchiver.load('x-pack/test/functional/es_archives/rules_scheduled_task_id/rules');
      await esArchiver.load('x-pack/test/functional/es_archives/rules_scheduled_task_id/tasks');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rules_scheduled_task_id/tasks');
      await esArchiver.unload('x-pack/test/functional/es_archives/rules_scheduled_task_id/rules');
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

    describe('sets scheduled task id to match rule id when rule is disabled then enabled', function () {
      this.tags('skipFIPS');
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
          consumer: 'alerts',
        });
      });
    });

    describe('sets scheduled task id to rule id', function () {
      this.tags('skipFIPS');
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
          consumer: 'alertsFixture',
        });
        expect(taskRecord.task.enabled).to.eql(true);
      });
    });

    describe('deletes associated task for rule', function () {
      this.tags('skipFIPS');
      it('deletes associated task for rule if task is unrecognized', async () => {
        const RULE_ID = '46be60d4-ae63-48ed-ab6f-f4d9b4defacf';
        // We've archived a disabled rule with a scheduled task ID that references
        // a task with a removed task type. Task manager will mark the task as unrecognized.
        // When we enable the rule, the unrecognized task should be removed and a new
        // task created in its place

        await supertestWithoutAuth
          .post('/api/alerting_tasks/run_mark_tasks_as_unrecognized')
          .set('kbn-xsrf', 'foo')
          .send({})
          .expect(200);

        // scheduled task should exist and be unrecognized
        await retry.try(async () => {
          const taskRecordLoaded = await getScheduledTask(RULE_ID);
          expect(taskRecordLoaded.task.status).to.equal('unrecognized');
        });

        // enable the rule
        await supertestWithoutAuth
          .post(`${getUrlPrefix(``)}/api/alerting/rule/${RULE_ID}/_enable`)
          .set('kbn-xsrf', 'foo');
        await retry.try(async () => {
          const response = await supertestWithoutAuth.get(
            `${getUrlPrefix(``)}/api/alerting/rule/${RULE_ID}`
          );

          expect(response.status).to.eql(200);
          expect(response.body.enabled).to.be(true);
        });

        // new scheduled task should exist with ID and status should not be unrecognized
        const newTaskRecordLoaded = await getScheduledTask(RULE_ID);
        expect(newTaskRecordLoaded.task.status).not.to.equal('unrecognized');
      });
    });
  });
}
