/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializedConcreteTaskInstance, TaskStatus } from '@kbn/task-manager-plugin/server/task';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const retry = getService('retry');

  describe('Skip invalid tasks', () => {
    function currentTask(task: string): Promise<SerializedConcreteTaskInstance> {
      return supertest
        .get(`/api/sample_tasks/task/${task}`)
        .send({ task })
        .expect((response) => {
          expect(response.status).to.eql(200);
          expect(typeof JSON.parse(response.text).id).to.eql(`string`);
        })
        .then((response) => response.body);
    }

    after(async () => {
      // clean up after last test
      return await supertest.delete('/api/sample_tasks').set('kbn-xsrf', 'xxx').expect(200);
    });

    it('Skips recurring tasks that has invalid indirect param', async () => {
      const createdTask = await supertest
        .post('/api/sample_tasks/schedule')
        .set('kbn-xsrf', 'xxx')
        .send({
          task: {
            taskType: 'sampleRecurringTaskWithInvalidIndirectParam',
            params: {},
          },
        })
        .expect(200)
        .then((response: { body: SerializedConcreteTaskInstance }) => {
          log.debug(`Task Scheduled: ${response.body.id}`);
          return response.body;
        });

      let lastRunAt: string;
      await retry.try(async () => {
        const task = await currentTask(createdTask.id);
        lastRunAt = task.runAt;
        // skips 2 times
        expect(task.numSkippedRuns).to.eql(2);
      });

      let newLastRun: string;
      await retry.try(async () => {
        const task = await currentTask(createdTask.id);
        expect(task.attempts).to.eql(0);
        expect(task.retryAt).to.eql(null);
        // skip attempts remains as it is
        expect(task.numSkippedRuns).to.eql(2);
        // keeps rescheduling after skips
        expect(new Date(task.runAt).getTime()).to.greaterThan(new Date(lastRunAt).getTime());
        newLastRun = task.runAt;
      });

      // should keep running the rule  after 2 skips and 1 successful run
      await retry.try(async () => {
        const task = await currentTask(createdTask.id);
        expect(task.attempts).to.eql(0);
        expect(task.retryAt).to.eql(null);
        // skip attempts remains as it is
        expect(task.numSkippedRuns).to.eql(2);
        // keeps rescheduling after skips
        expect(new Date(task.runAt).getTime()).to.greaterThan(new Date(newLastRun).getTime());
      });
    });

    it('Skips non-recurring tasks that have invalid indirect params and sets status as "dead_letter" after 1 reschedule attempt', async () => {
      const createdTask = await supertest
        .post('/api/sample_tasks/schedule')
        .set('kbn-xsrf', 'xxx')
        .send({
          task: {
            taskType: 'sampleOneTimeTaskWithInvalidIndirectParam',
            params: {},
          },
        })
        .expect(200)
        .then((response: { body: SerializedConcreteTaskInstance }) => {
          log.debug(`Task Scheduled: ${response.body.id}`);
          return response.body;
        });

      await retry.try(async () => {
        const task = await currentTask(createdTask.id);
        // skips 2 times
        expect(task.numSkippedRuns).to.eql(2);
      });

      await retry.try(async () => {
        const task = await currentTask(createdTask.id);
        // reschedules 1 more time and set the status as 'dead_letter'
        expect(task.attempts).to.eql(1);
        expect(task.status).to.eql(TaskStatus.DeadLetter);
        expect(task.numSkippedRuns).to.eql(2);
      });
    });

    it('Skips the tasks with invalid params and sets status as "dead_letter" after 1 reschedule attempt', async () => {
      const createdTask = await supertest
        .post('/api/sample_tasks/schedule')
        .set('kbn-xsrf', 'xxx')
        .send({
          task: {
            taskType: 'sampleTaskWithParamsSchema',
            params: { foo: 'bar' }, // invalid params
          },
        })
        .expect(200)
        .then((response: { body: SerializedConcreteTaskInstance }) => {
          log.debug(`Task Scheduled: ${response.body.id}`);
          return response.body;
        });

      await retry.try(async () => {
        const task = await currentTask(createdTask.id);
        // skips 2 times
        expect(task.numSkippedRuns).to.eql(2);
      });

      await retry.try(async () => {
        const task = await currentTask(createdTask.id);
        // reschedules 1 more time and set the status as 'dead_letter' as the task throws an error
        expect(task.attempts).to.eql(1);
        expect(task.status).to.eql(TaskStatus.DeadLetter);
        expect(task.numSkippedRuns).to.eql(2);
      });
    });
  });
}
