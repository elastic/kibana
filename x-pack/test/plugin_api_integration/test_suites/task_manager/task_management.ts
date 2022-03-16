/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { random, times } from 'lodash';
import expect from '@kbn/expect';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FtrProviderContext } from '../../ftr_provider_context';
import TaskManagerMapping from '../../../../plugins/task_manager/server/saved_objects/mappings.json';
import {
  DEFAULT_MAX_WORKERS,
  DEFAULT_POLL_INTERVAL,
} from '../../../../plugins/task_manager/server/config';
import { ConcreteTaskInstance } from '../../../../plugins/task_manager/server';

const {
  task: { properties: taskManagerIndexMapping },
} = TaskManagerMapping;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface RawDoc {
  _id: string;
  _source: any;
  _type?: string;
}
export interface SearchResults {
  hits: {
    hits: RawDoc[];
  };
}

type DeprecatedConcreteTaskInstance = Omit<ConcreteTaskInstance, 'schedule'> & {
  interval: string;
};

type SerializedConcreteTaskInstance<State = string, Params = string> = Omit<
  ConcreteTaskInstance,
  'state' | 'params' | 'scheduledAt' | 'startedAt' | 'retryAt' | 'runAt'
> & {
  state: State;
  params: Params;
  scheduledAt: string;
  startedAt: string | null;
  retryAt: string | null;
  runAt: string;
};

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const testHistoryIndex = '.kibana_task_manager_test_result';

  describe('scheduling and running tasks', () => {
    beforeEach(async () => {
      // clean up before each test
      return await supertest.delete('/api/sample_tasks').set('kbn-xsrf', 'xxx').expect(200);
    });

    beforeEach(async () => {
      const exists = await es.indices.exists({ index: testHistoryIndex });
      if (exists) {
        await es.deleteByQuery({
          index: testHistoryIndex,
          refresh: true,
          body: { query: { term: { type: 'task' } } },
        });
      } else {
        await es.indices.create({
          index: testHistoryIndex,
          body: {
            mappings: {
              properties: {
                type: {
                  type: 'keyword',
                },
                taskId: {
                  type: 'keyword',
                },
                params: taskManagerIndexMapping.params,
                state: taskManagerIndexMapping.state,
                runAt: taskManagerIndexMapping.runAt,
              } as Record<string, estypes.MappingProperty>,
            },
          },
        });
      }
    });

    after(async () => {
      // clean up after last test
      return await supertest.delete('/api/sample_tasks').set('kbn-xsrf', 'xxx').expect(200);
    });

    function currentTasks<State = unknown, Params = unknown>(): Promise<{
      docs: Array<SerializedConcreteTaskInstance<State, Params>>;
    }> {
      return supertest
        .get('/api/sample_tasks')
        .expect(200)
        .then((response) => response.body);
    }

    function currentTask<State = unknown, Params = unknown>(
      task: string
    ): Promise<SerializedConcreteTaskInstance<State, Params>> {
      return supertest
        .get(`/api/sample_tasks/task/${task}`)
        .send({ task })
        .expect((response) => {
          expect(response.status).to.eql(200);
          expect(typeof JSON.parse(response.text).id).to.eql(`string`);
        })
        .then((response) => response.body);
    }

    function currentTaskError<State = unknown, Params = unknown>(
      task: string
    ): Promise<{
      statusCode: number;
      error: string;
      message: string;
    }> {
      return supertest
        .get(`/api/sample_tasks/task/${task}`)
        .send({ task })
        .expect(function (response) {
          expect(response.status).to.eql(200);
          expect(typeof JSON.parse(response.text).message).to.eql(`string`);
        })
        .then((response) => response.body);
    }

    function ensureTasksIndexRefreshed() {
      return supertest.get(`/api/ensure_tasks_index_refreshed`).send({}).expect(200);
    }

    async function historyDocs(taskId?: string): Promise<RawDoc[]> {
      return es
        .search({
          index: testHistoryIndex,
          body: {
            query: {
              term: { type: 'task' },
            },
          },
        })
        .then((result) =>
          (result as unknown as SearchResults).hits.hits.filter((task) =>
            taskId ? task._source?.taskId === taskId : true
          )
        );
    }

    function scheduleTask(
      task: Partial<ConcreteTaskInstance | DeprecatedConcreteTaskInstance>
    ): Promise<SerializedConcreteTaskInstance> {
      return supertest
        .post('/api/sample_tasks/schedule')
        .set('kbn-xsrf', 'xxx')
        .send({ task })
        .expect(200)
        .then((response: { body: SerializedConcreteTaskInstance }) => {
          log.debug(`Task Scheduled: ${response.body.id}`);
          return response.body;
        });
    }

    function runTaskNow(task: { id: string }) {
      return supertest
        .post('/api/sample_tasks/run_now')
        .set('kbn-xsrf', 'xxx')
        .send({ task })
        .expect(200)
        .then((response) => response.body);
    }

    // TODO: Add this back in with https://github.com/elastic/kibana/issues/106139
    // function runEphemeralTaskNow(task: {
    //   taskType: string;
    //   params: Record<string, any>;
    //   state: Record<string, any>;
    // }) {
    //   return supertest
    //     .post('/api/sample_tasks/ephemeral_run_now')
    //     .set('kbn-xsrf', 'xxx')
    //     .send({ task })
    //     .expect(200)
    //     .then((response) => response.body);
    // }

    function scheduleTaskIfNotExists(task: Partial<ConcreteTaskInstance>) {
      return supertest
        .post('/api/sample_tasks/ensure_scheduled')
        .set('kbn-xsrf', 'xxx')
        .send({ task })
        .expect(200)
        .then((response: { body: ConcreteTaskInstance }) => response.body);
    }

    function releaseTasksWaitingForEventToComplete(event: string) {
      return supertest
        .post('/api/sample_tasks/event')
        .set('kbn-xsrf', 'xxx')
        .send({ event })
        .expect(200);
    }

    function getTaskById<State = unknown, Params = unknown>(
      tasks: Array<SerializedConcreteTaskInstance<State, Params>>,
      id: string
    ) {
      return tasks.filter((task) => task.id === id)[0];
    }

    async function provideParamsToTasksWaitingForParams(
      taskId: string,
      data: Record<string, unknown> = {}
    ) {
      // wait for task to start running and stall on waitForParams
      await retry.try(async () => {
        const tasks = (await currentTasks()).docs;
        expect(getTaskById(tasks, taskId).status).to.eql('running');
      });

      return supertest
        .post('/api/sample_tasks/event')
        .set('kbn-xsrf', 'xxx')
        .send({ event: taskId, data })
        .expect(200);
    }

    it('should support middleware', async () => {
      const historyItem = random(1, 100);

      const scheduledTask = await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: '30m' },
        params: { historyItem },
      });
      log.debug(`Task created: ${scheduledTask.id}`);

      await retry.try(async () => {
        expect((await historyDocs()).length).to.eql(1);

        const [task] = (await currentTasks<{ count: number }>()).docs;
        log.debug(`Task found: ${task.id}`);
        log.debug(`Task status: ${task.status}`);
        log.debug(`Task state: ${JSON.stringify(task.state, null, 2)}`);
        log.debug(`Task params: ${JSON.stringify(task.params, null, 2)}`);

        expect(task.state.count).to.eql(1);

        expect(task.params).to.eql({
          superFly: 'My middleware param!',
          originalParams: { historyItem },
        });
      });
    });

    it('should remove non-recurring tasks after they complete', async () => {
      await scheduleTask({
        taskType: 'sampleTask',
        params: {},
      });

      await retry.try(async () => {
        const history = await historyDocs();
        expect(history.length).to.eql(1);
        expect((await currentTasks()).docs).to.eql([]);
      });
    });

    it('should use a given ID as the task document ID', async () => {
      const result = await scheduleTask({
        id: 'test-task-for-sample-task-plugin-to-test-task-manager',
        taskType: 'sampleTask',
        params: {},
      });

      expect(result.id).to.be('test-task-for-sample-task-plugin-to-test-task-manager');
    });

    it('should allow a task with a given ID to be scheduled multiple times', async () => {
      const result = await scheduleTaskIfNotExists({
        id: 'test-task-to-reschedule-in-task-manager',
        taskType: 'sampleTask',
        params: {},
      });

      expect(result.id).to.be('test-task-to-reschedule-in-task-manager');

      const rescheduleResult = await scheduleTaskIfNotExists({
        id: 'test-task-to-reschedule-in-task-manager',
        taskType: 'sampleTask',
        params: {},
      });

      expect(rescheduleResult.id).to.be('test-task-to-reschedule-in-task-manager');
    });

    it('should reschedule if task errors', async () => {
      const task = await scheduleTask({
        taskType: 'sampleTask',
        params: { failWith: 'Dangit!!!!!' },
      });

      await retry.try(async () => {
        const scheduledTask = await currentTask(task.id);
        expect(scheduledTask.attempts).to.be.greaterThan(0);
        expect(Date.parse(scheduledTask.runAt)).to.be.greaterThan(
          Date.parse(task.runAt) + 5 * 60 * 1000
        );
      });
    });

    it('should schedule the retry of recurring tasks to run at the next schedule when they time out', async () => {
      const intervalInMinutes = 30;
      const intervalInMilliseconds = intervalInMinutes * 60 * 1000;
      const task = await scheduleTask({
        taskType: 'sampleRecurringTaskWhichHangs',
        schedule: { interval: `${intervalInMinutes}m` },
        params: {},
      });

      await retry.try(async () => {
        const scheduledTask = await currentTask(task.id);
        const retryAt = Date.parse(scheduledTask.retryAt!);
        expect(isNaN(retryAt)).to.be(false);

        const buffer = 10000; // 10 second buffer
        const retryDelay = retryAt - Date.parse(task.runAt);
        expect(retryDelay).to.be.greaterThan(intervalInMilliseconds - buffer);
        expect(retryDelay).to.be.lessThan(intervalInMilliseconds + buffer);
      });
    });

    it('should reschedule if task returns runAt', async () => {
      const nextRunMilliseconds = random(60000, 200000);
      const count = random(1, 20);

      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        params: { nextRunMilliseconds },
        state: { count },
      });

      await retry.try(async () => {
        expect((await historyDocs(originalTask.id)).length).to.eql(1);

        const task = await currentTask<{ count: number }>(originalTask.id);
        expect(task.attempts).to.eql(0);
        expect(task.state.count).to.eql(count + 1);

        expectReschedule(Date.parse(originalTask.runAt), task, nextRunMilliseconds);
      });
    });

    it('should reschedule if task has an interval', async () => {
      const interval = random(5, 200);
      const intervalMilliseconds = interval * 60000;

      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: `${interval}m` },
        params: {},
      });

      await retry.try(async () => {
        expect((await historyDocs()).length).to.eql(1);

        const [task] = (await currentTasks<{ count: number }>()).docs;
        expect(task.attempts).to.eql(0);
        expect(task.state.count).to.eql(1);

        expectReschedule(Date.parse(originalTask.runAt), task, intervalMilliseconds);
      });
    });

    it('should support the deprecated interval field', async () => {
      const interval = random(5, 200);
      const intervalMilliseconds = interval * 60000;

      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        interval: `${interval}m`,
        params: {},
      });

      await retry.try(async () => {
        expect((await historyDocs()).length).to.eql(1);

        const [task] = (await currentTasks<{ count: number }>()).docs;
        expect(task.attempts).to.eql(0);
        expect(task.state.count).to.eql(1);

        expectReschedule(Date.parse(originalTask.runAt), task, intervalMilliseconds);
      });
    });

    it('should return a task run result when asked to run a task now', async () => {
      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: `30m` },
        params: {},
      });

      await retry.try(async () => {
        const docs = await historyDocs();
        expect(docs.filter((taskDoc) => taskDoc._source.taskId === originalTask.id).length).to.eql(
          1
        );

        const [task] = (await currentTasks<{ count: number }>()).docs.filter(
          (taskDoc) => taskDoc.id === originalTask.id
        );

        expect(task.state.count).to.eql(1);

        // ensure this task shouldnt run for another half hour
        expectReschedule(Date.parse(originalTask.runAt), task, 30 * 60000);
      });

      const now = Date.now();
      const runNowResult = await runTaskNow({
        id: originalTask.id,
      });

      expect(runNowResult).to.eql({ id: originalTask.id });

      await retry.try(async () => {
        expect(
          (await historyDocs()).filter((taskDoc) => taskDoc._source.taskId === originalTask.id)
            .length
        ).to.eql(2);

        const [task] = (await currentTasks<{ count: number }>()).docs.filter(
          (taskDoc) => taskDoc.id === originalTask.id
        );
        expect(task.state.count).to.eql(2);

        // ensure this task shouldnt run for another half hour
        expectReschedule(now, task, 30 * 60000);
      });
    });

    it('should prioritize tasks which are called using runNow', async () => {
      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: `30m` },
        params: {},
      });

      await retry.try(async () => {
        const docs = await historyDocs(originalTask.id);
        expect(docs.length).to.eql(1);

        const task = await currentTask<{ count: number }>(originalTask.id);

        expect(task.state.count).to.eql(1);

        // ensure this task shouldnt run for another half hour
        expectReschedule(Date.parse(originalTask.runAt), task, 30 * 60000);
      });

      const taskToBeReleased = await scheduleTask({
        taskType: 'sampleTask',
        params: { waitForEvent: 'releaseSingleTask' },
      });

      await retry.try(async () => {
        // wait for taskToBeReleased to stall
        expect((await historyDocs(taskToBeReleased.id)).length).to.eql(1);
      });

      // schedule multiple tasks that should force
      // Task Manager to use up its worker capacity
      // causing tasks to pile up
      await Promise.all(
        times(DEFAULT_MAX_WORKERS + random(1, DEFAULT_MAX_WORKERS), () =>
          scheduleTask({
            taskType: 'sampleTask',
            params: {
              waitForEvent: 'releaseTheOthers',
            },
          })
        )
      );

      // we need to ensure that TM has a chance to fill its queue with the stalling tasks
      await delay(DEFAULT_POLL_INTERVAL);

      // call runNow for our task
      const runNowResult = runTaskNow({
        id: originalTask.id,
      });

      // we need to ensure that TM has a chance to push the runNow task into the queue
      // before we release the stalled task, so lets give it a chance
      await delay(DEFAULT_POLL_INTERVAL);

      // and release only one slot in our worker queue
      await releaseTasksWaitingForEventToComplete('releaseSingleTask');

      expect(await runNowResult).to.eql({ id: originalTask.id });

      await retry.try(async () => {
        const task = await currentTask<{ count: number }>(originalTask.id);
        expect(task.state.count).to.eql(2);
      });

      // drain tasks, othrwise they'll keep Task Manager stalled
      await retry.try(async () => {
        await releaseTasksWaitingForEventToComplete('releaseTheOthers');
        const tasks = (
          await currentTasks<{}, { originalParams: { waitForEvent: string } }>()
        ).docs.filter((task) => task.params.originalParams.waitForEvent === 'releaseTheOthers');
        expect(tasks.length).to.eql(0);
      });
    });

    it('should only run as many instances of a task as its maxConcurrency will allow', async () => {
      // should run as there's only one and maxConcurrency on this TaskType is 1
      const firstWithSingleConcurrency = await scheduleTask({
        taskType: 'sampleTaskWithSingleConcurrency',
        params: {
          waitForEvent: 'releaseFirstWaveOfTasks',
        },
      });

      // should run as there's only two and maxConcurrency on this TaskType is 2
      const [firstLimitedConcurrency, secondLimitedConcurrency] = await Promise.all([
        scheduleTask({
          taskType: 'sampleTaskWithLimitedConcurrency',
          params: {
            waitForEvent: 'releaseFirstWaveOfTasks',
          },
        }),
        scheduleTask({
          taskType: 'sampleTaskWithLimitedConcurrency',
          params: {
            waitForEvent: 'releaseSecondWaveOfTasks',
          },
        }),
      ]);

      await retry.try(async () => {
        expect((await historyDocs(firstWithSingleConcurrency.id)).length).to.eql(1);
        expect((await historyDocs(firstLimitedConcurrency.id)).length).to.eql(1);
        expect((await historyDocs(secondLimitedConcurrency.id)).length).to.eql(1);
      });

      // should not run as there one running and maxConcurrency on this TaskType is 1
      const secondWithSingleConcurrency = await scheduleTask({
        taskType: 'sampleTaskWithSingleConcurrency',
        params: {
          waitForEvent: 'releaseSecondWaveOfTasks',
        },
      });

      // should not run as there are two running and maxConcurrency on this TaskType is 2
      const thirdWithLimitedConcurrency = await scheduleTask({
        taskType: 'sampleTaskWithLimitedConcurrency',
        params: {
          waitForEvent: 'releaseSecondWaveOfTasks',
        },
      });

      // schedule a task that should get picked up before the two blocked tasks
      const taskWithUnlimitedConcurrency = await scheduleTask({
        taskType: 'sampleTask',
        params: {},
      });

      await retry.try(async () => {
        expect((await historyDocs(taskWithUnlimitedConcurrency.id)).length).to.eql(1);
        expect((await currentTask(secondWithSingleConcurrency.id)).status).to.eql('idle');
        expect((await currentTask(thirdWithLimitedConcurrency.id)).status).to.eql('idle');
      });

      // release the running SingleConcurrency task and only one of the LimitedConcurrency tasks
      await releaseTasksWaitingForEventToComplete('releaseFirstWaveOfTasks');

      await retry.try(async () => {
        // ensure the completed tasks were deleted
        expect((await currentTaskError(firstWithSingleConcurrency.id)).message).to.eql(
          `Saved object [task/${firstWithSingleConcurrency.id}] not found`
        );
        expect((await currentTaskError(firstLimitedConcurrency.id)).message).to.eql(
          `Saved object [task/${firstLimitedConcurrency.id}] not found`
        );

        // ensure blocked tasks is still running
        expect((await currentTask(secondLimitedConcurrency.id)).status).to.eql('running');

        // ensure the blocked tasks begin running
        expect((await currentTask(secondWithSingleConcurrency.id)).status).to.eql('running');
        expect((await currentTask(thirdWithLimitedConcurrency.id)).status).to.eql('running');
      });

      // release blocked task
      await releaseTasksWaitingForEventToComplete('releaseSecondWaveOfTasks');
    });

    it('should return a task run error result when RunNow is called at a time that would cause the task to exceed its maxConcurrency', async () => {
      // should run as there's only one and maxConcurrency on this TaskType is 1
      const firstWithSingleConcurrency = await scheduleTask({
        taskType: 'sampleTaskWithSingleConcurrency',
        // include a schedule so that the task isn't deleted after completion
        schedule: { interval: `30m` },
        params: {
          waitForEvent: 'releaseRunningTaskWithSingleConcurrencyFirst',
        },
      });

      // should not run as the first is running
      const secondWithSingleConcurrency = await scheduleTask({
        taskType: 'sampleTaskWithSingleConcurrency',
        params: {
          waitForEvent: 'releaseRunningTaskWithSingleConcurrencySecond',
        },
      });

      // run the first tasks once just so that we can be sure it runs in response to our
      // runNow callm, rather than the initial execution
      await retry.try(async () => {
        expect((await historyDocs(firstWithSingleConcurrency.id)).length).to.eql(1);
      });
      await releaseTasksWaitingForEventToComplete('releaseRunningTaskWithSingleConcurrencyFirst');

      // wait for second task to stall
      await retry.try(async () => {
        expect((await historyDocs(secondWithSingleConcurrency.id)).length).to.eql(1);
      });

      // run the first task again using runNow - should fail due to concurrency concerns
      const failedRunNowResult = await runTaskNow({
        id: firstWithSingleConcurrency.id,
      });

      expect(failedRunNowResult).to.eql({
        id: firstWithSingleConcurrency.id,
        error: `Error: Failed to run task "${firstWithSingleConcurrency.id}" as we would exceed the max concurrency of "Sample Task With Single Concurrency" which is 1. Rescheduled the task to ensure it is picked up as soon as possible.`,
      });

      // release the second task
      await releaseTasksWaitingForEventToComplete('releaseRunningTaskWithSingleConcurrencySecond');
    });

    it('should return a task run error result when running a task now fails', async () => {
      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: `30m` },
        params: { failWith: 'this task was meant to fail!', failOn: 3 },
      });

      await retry.try(async () => {
        const docs = await historyDocs();
        expect(docs.filter((taskDoc) => taskDoc._source.taskId === originalTask.id).length).to.eql(
          1
        );

        const task = await currentTask<{ count: number }>(originalTask.id);
        expect(task.state.count).to.eql(1);
        expect(task.status).to.eql('idle');

        // ensure this task shouldnt run for another half hour
        expectReschedule(Date.parse(originalTask.runAt), task, 30 * 60000);
      });

      await ensureTasksIndexRefreshed();

      // second run should still be successful
      const successfulRunNowResult = await runTaskNow({
        id: originalTask.id,
      });
      expect(successfulRunNowResult).to.eql({ id: originalTask.id });

      await retry.try(async () => {
        const task = await currentTask<{ count: number }>(originalTask.id);
        expect(task.state.count).to.eql(2);
        expect(task.status).to.eql('idle');
      });

      await ensureTasksIndexRefreshed();

      // flaky: runTaskNow() sometimes fails with the following error, so retrying
      // error: Failed to run task "<id>" as it is currently running
      await retry.try(async () => {
        const failedRunNowResult = await runTaskNow({
          id: originalTask.id,
        });

        expect(failedRunNowResult).to.eql({
          id: originalTask.id,
          error: `Error: Failed to run task \"${originalTask.id}\": Error: this task was meant to fail!`,
        });
      });

      await retry.try(async () => {
        expect(
          (await historyDocs()).filter((taskDoc) => taskDoc._source.taskId === originalTask.id)
            .length
        ).to.eql(2);

        const task = await currentTask(originalTask.id);
        expect(task.attempts).to.eql(1);
      });
    });

    it('should increment attempts when task fails on markAsRunning', async () => {
      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        params: { throwOnMarkAsRunning: true },
      });

      await delay(DEFAULT_POLL_INTERVAL * 3);

      await retry.try(async () => {
        const task = await currentTask(originalTask.id);
        expect(task.attempts).to.eql(3);
        expect(task.status).to.eql('failed');
      });
    });

    it('should return a task run error result when trying to run a non-existent task', async () => {
      // runNow should fail
      const failedRunNowResult = await runTaskNow({
        id: 'i-dont-exist',
      });
      expect(failedRunNowResult).to.eql({
        error: `Error: Failed to run task "i-dont-exist" as it does not exist`,
        id: 'i-dont-exist',
      });
    });

    it('should return a task run error result when trying to run a task now which is already running', async () => {
      const longRunningTask = await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: '30m' },
        params: {
          waitForParams: true,
        },
      });

      // tell the task to wait for the 'runNowHasBeenAttempted' event
      await provideParamsToTasksWaitingForParams(longRunningTask.id, {
        waitForEvent: 'runNowHasBeenAttempted',
      });

      await retry.try(async () => {
        const docs = await historyDocs();
        expect(
          docs.filter((taskDoc) => taskDoc._source.taskId === longRunningTask.id).length
        ).to.eql(1);

        const task = await currentTask(longRunningTask.id);
        expect(task.status).to.eql('running');
      });

      await ensureTasksIndexRefreshed();

      // first runNow should fail
      const failedRunNowResult = await runTaskNow({
        id: longRunningTask.id,
      });

      expect(failedRunNowResult).to.eql({
        error: `Error: Failed to run task "${longRunningTask.id}" as it is currently running`,
        id: longRunningTask.id,
      });

      // finish first run by emitting 'runNowHasBeenAttempted' event
      await releaseTasksWaitingForEventToComplete('runNowHasBeenAttempted');
      await retry.try(async () => {
        const tasks = (await currentTasks<{ count: number }>()).docs;
        expect(getTaskById(tasks, longRunningTask.id).state.count).to.eql(1);

        const task = await currentTask(longRunningTask.id);
        expect(task.status).to.eql('idle');
      });

      await ensureTasksIndexRefreshed();

      // second runNow should be successful
      const successfulRunNowResult = runTaskNow({
        id: longRunningTask.id,
      });

      await provideParamsToTasksWaitingForParams(longRunningTask.id);

      expect(await successfulRunNowResult).to.eql({ id: longRunningTask.id });
    });

    it('should allow a failed task to be rerun using runNow', async () => {
      const taskThatFailsBeforeRunNow = await scheduleTask({
        taskType: 'singleAttemptSampleTask',
        params: {
          waitForParams: true,
        },
      });

      // tell the task to fail on its next run
      await provideParamsToTasksWaitingForParams(taskThatFailsBeforeRunNow.id, {
        failWith: 'error on first run',
      });

      // wait for task to fail
      await retry.try(async () => {
        const tasks = (await currentTasks()).docs;
        expect(getTaskById(tasks, taskThatFailsBeforeRunNow.id).status).to.eql('failed');
      });

      // runNow should be successfully run the failing task
      const runNowResultWithExpectedFailure = runTaskNow({
        id: taskThatFailsBeforeRunNow.id,
      });

      // release the task without failing this time
      await provideParamsToTasksWaitingForParams(taskThatFailsBeforeRunNow.id);

      expect(await runNowResultWithExpectedFailure).to.eql({ id: taskThatFailsBeforeRunNow.id });
    });

    async function expectReschedule(
      originalRunAt: number,
      task: SerializedConcreteTaskInstance<any, any>,
      expectedDiff: number
    ) {
      const buffer = 10000;
      expect(Date.parse(task.runAt) - originalRunAt).to.be.greaterThan(expectedDiff - buffer);
      expect(Date.parse(task.runAt) - originalRunAt).to.be.lessThan(expectedDiff + buffer);
    }

    it('should run tasks in parallel, allowing for long running tasks along side faster tasks', async () => {
      /**
       * It's worth noting this test relies on the /event endpoint that forces Task Manager to hold off
       * on completing a task until a call is made by the test suite.
       * If we begin testing with multiple Kibana instacnes in Parallel this will likely become flaky.
       * If you end up here because the test is flaky, this might be why.
       */
      const fastTask = await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: `1s` },
        params: {},
      });

      const longRunningTask = await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: `1s` },
        params: {
          waitForEvent: 'rescheduleHasHappened',
        },
      });

      await retry.try(async () => {
        const tasks = (await currentTasks<{ count: number }>()).docs;
        expect(getTaskById(tasks, fastTask.id).state.count).to.eql(2);
      });

      await releaseTasksWaitingForEventToComplete('rescheduleHasHappened');

      await retry.try(async () => {
        const tasks = (await currentTasks<{ count: number }>()).docs;

        expect(getTaskById(tasks, fastTask.id).state.count).to.greaterThan(2);
        expect(getTaskById(tasks, longRunningTask.id).state.count).to.eql(1);
      });
    });

    it('should mark non-recurring task as failed if task is still running but maxAttempts has been reached', async () => {
      const task = await scheduleTask({
        taskType: 'sampleOneTimeTaskTimingOut',
        params: {},
      });

      await retry.try(async () => {
        const [scheduledTask] = (await currentTasks()).docs;
        expect(scheduledTask.id).to.eql(task.id);
        expect(scheduledTask.status).to.eql('failed');
        expect(scheduledTask.attempts).to.eql(3);
      });
    });

    it('should continue claiming recurring task even if maxAttempts has been reached', async () => {
      const task = await scheduleTask({
        taskType: 'sampleRecurringTaskTimingOut',
        schedule: { interval: '1s' },
        params: {},
      });

      await retry.try(async () => {
        const [scheduledTask] = (await currentTasks()).docs;
        expect(scheduledTask.id).to.eql(task.id);
        expect(scheduledTask.status).to.eql('claiming');
        expect(scheduledTask.attempts).to.be.greaterThan(3);
      });
    });

    // TODO: Add this back in with https://github.com/elastic/kibana/issues/106139
    // it('should return the resulting task state when asked to run an ephemeral task now', async () => {
    //   const ephemeralTask = await runEphemeralTaskNow({
    //     taskType: 'sampleTask',
    //     params: {},
    //     state: {},
    //   });

    //   await retry.try(async () => {
    //     expect(
    //       (await historyDocs()).filter((taskDoc) => taskDoc._source.taskId === ephemeralTask.id)
    //         .length
    //     ).to.eql(1);

    //     expect(ephemeralTask.state.count).to.eql(1);
    //   });

    //   const secondEphemeralTask = await runEphemeralTaskNow({
    //     taskType: 'sampleTask',
    //     params: {},
    //     // pass state from previous ephemeral run as input for the second run
    //     state: ephemeralTask.state,
    //   });

    //   // ensure state is cumulative
    //   expect(secondEphemeralTask.state.count).to.eql(2);

    //   await retry.try(async () => {
    //     // ensure new id is produced for second task execution
    //     expect(
    //       (await historyDocs()).filter((taskDoc) => taskDoc._source.taskId === ephemeralTask.id)
    //         .length
    //     ).to.eql(1);
    //     expect(
    //       (await historyDocs()).filter(
    //         (taskDoc) => taskDoc._source.taskId === secondEphemeralTask.id
    //       ).length
    //     ).to.eql(1);
    //   });
    // });

    // TODO: Add this back in with https://github.com/elastic/kibana/issues/106139
    // it('Epheemral task run should only run one instance of a task if its maxConcurrency is 1', async () => {
    //   const ephemeralTaskWithSingleConcurrency: {
    //     state: {
    //       executions: Array<{
    //         result: {
    //           id: string;
    //           state: {
    //             timings: Array<{
    //               start: number;
    //               stop: number;
    //             }>;
    //           };
    //         };
    //       }>;
    //     };
    //   } = await runEphemeralTaskNow({
    //     taskType: 'taskWhichExecutesOtherTasksEphemerally',
    //     params: {
    //       tasks: [
    //         {
    //           taskType: 'timedTaskWithSingleConcurrency',
    //           params: { delay: 1000 },
    //           state: {},
    //         },
    //         {
    //           taskType: 'timedTaskWithSingleConcurrency',
    //           params: { delay: 1000 },
    //           state: {},
    //         },
    //         {
    //           taskType: 'timedTaskWithSingleConcurrency',
    //           params: { delay: 1000 },
    //           state: {},
    //         },
    //         {
    //           taskType: 'timedTaskWithSingleConcurrency',
    //           params: { delay: 1000 },
    //           state: {},
    //         },
    //       ],
    //     },
    //     state: {},
    //   });

    //   ensureOverlappingTasksDontExceedThreshold(
    //     ephemeralTaskWithSingleConcurrency.state.executions,
    //     // make sure each task intersects with any other task
    //     0
    //   );
    // });

    // TODO: Add this back in with https://github.com/elastic/kibana/issues/106139
    // it('Ephemeral task run should only run as many instances of a task as its maxConcurrency will allow', async () => {
    //   const ephemeralTaskWithSingleConcurrency: {
    //     state: {
    //       executions: Array<{
    //         result: {
    //           id: string;
    //           state: {
    //             timings: Array<{
    //               start: number;
    //               stop: number;
    //             }>;
    //           };
    //         };
    //       }>;
    //     };
    //   } = await runEphemeralTaskNow({
    //     taskType: 'taskWhichExecutesOtherTasksEphemerally',
    //     params: {
    //       tasks: [
    //         {
    //           taskType: 'timedTaskWithLimitedConcurrency',
    //           params: { delay: 100 },
    //           state: {},
    //         },
    //         {
    //           taskType: 'timedTaskWithLimitedConcurrency',
    //           params: { delay: 100 },
    //           state: {},
    //         },
    //         {
    //           taskType: 'timedTaskWithLimitedConcurrency',
    //           params: { delay: 100 },
    //           state: {},
    //         },
    //         {
    //           taskType: 'timedTaskWithLimitedConcurrency',
    //           params: { delay: 100 },
    //           state: {},
    //         },
    //         {
    //           taskType: 'timedTaskWithLimitedConcurrency',
    //           params: { delay: 100 },
    //           state: {},
    //         },
    //         {
    //           taskType: 'timedTaskWithLimitedConcurrency',
    //           params: { delay: 100 },
    //           state: {},
    //         },
    //       ],
    //     },
    //     state: {},
    //   });

    //   ensureOverlappingTasksDontExceedThreshold(
    //     ephemeralTaskWithSingleConcurrency.state.executions,
    //     // make sure each task intersects with, at most, 1 other task
    //     1
    //   );
    // });

    // TODO: Add this back in with https://github.com/elastic/kibana/issues/106139
    // it('Ephemeral task executions cant exceed the max workes in Task Manager', async () => {
    //   const ephemeralTaskWithSingleConcurrency: {
    //     state: {
    //       executions: Array<{
    //         result: {
    //           id: string;
    //           state: {
    //             timings: Array<{
    //               start: number;
    //               stop: number;
    //             }>;
    //           };
    //         };
    //       }>;
    //     };
    //   } = await runEphemeralTaskNow({
    //     taskType: 'taskWhichExecutesOtherTasksEphemerally',
    //     params: {
    //       tasks: times(20, () => ({
    //         taskType: 'timedTask',
    //         params: { delay: 100 },
    //         state: {},
    //       })),
    //     },
    //     state: {},
    //   });

    //   ensureOverlappingTasksDontExceedThreshold(
    //     ephemeralTaskWithSingleConcurrency.state.executions,
    //     // make sure each task intersects with, at most, 9 other tasks (as max workes is 10)
    //     9
    //   );
    // });
  });

  // TODO: Add this back in with https://github.com/elastic/kibana/issues/106139
  // function ensureOverlappingTasksDontExceedThreshold(
  //   executions: Array<{
  //     result: {
  //       id: string;
  //       state: {
  //         timings: Array<{
  //           start: number;
  //           stop: number;
  //         }>;
  //       };
  //     };
  //   }>,
  //   threshold: number
  // ) {
  //   const executionRanges = executions.map((execution) => ({
  //     id: execution.result.id,
  //     range: range(
  //       // calculate range of milliseconds
  //       // in which the task was running (that should be good enough)
  //       execution.result.state.timings[0].start,
  //       execution.result.state.timings[0].stop
  //     ),
  //   }));

  //   const intersections = new Map<string, string[]>();
  //   for (const currentExecution of executionRanges) {
  //     for (const executionToComparteTo of executionRanges) {
  //       if (currentExecution.id !== executionToComparteTo.id) {
  //         // find all executions that intersect
  //         if (intersection(currentExecution.range, executionToComparteTo.range).length) {
  //           intersections.set(currentExecution.id, [
  //             ...(intersections.get(currentExecution.id) ?? []),
  //             executionToComparteTo.id,
  //           ]);
  //         }
  //       }
  //     }
  //   }

  //   const tooManyIntersectingTasks = [...intersections.entries()].find(
  //     // make sure each task intersects with, at most, threshold of other task
  //     ([, intersectingTasks]) => intersectingTasks.length > threshold
  //   );
  //   if (tooManyIntersectingTasks) {
  //     throw new Error(
  //       `Invalid execution found: ${tooManyIntersectingTasks[0]} overlaps with ${tooManyIntersectingTasks[1]}`
  //     );
  //   }
  // }
}
