/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import expect from '@kbn/expect';
import url from 'url';
import supertestAsPromised from 'supertest-as-promised';

const {
  task: { properties: taskManagerIndexMapping },
} = require('../../../../legacy/plugins/task_manager/mappings.json');

export default function({ getService }) {
  const es = getService('legacyEs');
  const log = getService('log');
  const retry = getService('retry');
  const config = getService('config');
  const testHistoryIndex = '.task_manager_test_result';
  const supertest = supertestAsPromised(url.format(config.get('servers.kibana')));

  describe('scheduling and running tasks', () => {
    beforeEach(() =>
      supertest
        .delete('/api/sample_tasks')
        .set('kbn-xsrf', 'xxx')
        .expect(200)
    );

    beforeEach(async () => {
      const exists = await es.indices.exists({ index: testHistoryIndex });
      if (exists) {
        await es.deleteByQuery({
          index: testHistoryIndex,
          q: 'type:task',
          refresh: true,
        });
      } else {
        await es.indices.create({
          index: testHistoryIndex,
          body: {
            mappings: {
              properties: taskManagerIndexMapping,
            },
          },
        });
      }
    });

    function currentTasks() {
      return supertest
        .get('/api/sample_tasks')
        .expect(200)
        .then(response => response.body);
    }

    function historyDocs() {
      return es
        .search({
          index: testHistoryIndex,
          q: 'type:task',
        })
        .then(result => result.hits.hits);
    }

    function scheduleTask(task) {
      return supertest
        .post('/api/sample_tasks')
        .set('kbn-xsrf', 'xxx')
        .send(task)
        .expect(200)
        .then(response => response.body);
    }

    it('should support middleware', async () => {
      const historyItem = _.random(1, 100);

      const scheduledTask = await scheduleTask({
        taskType: 'sampleTask',
        interval: '30m',
        params: { historyItem },
      });
      log.debug(`Task created: ${scheduledTask.id}`);

      await retry.try(async () => {
        expect((await historyDocs()).length).to.eql(1);

        const [task] = (await currentTasks()).docs;
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

    it('should reschedule if task errors', async () => {
      const task = await scheduleTask({
        taskType: 'sampleTask',
        params: { failWith: 'Dangit!!!!!' },
      });

      await retry.try(async () => {
        const [scheduledTask] = (await currentTasks()).docs;
        expect(scheduledTask.id).to.eql(task.id);
        expect(scheduledTask.attempts).to.be.greaterThan(0);
        expect(Date.parse(scheduledTask.runAt)).to.be.greaterThan(
          Date.parse(task.runAt) + 5 * 60 * 1000
        );
      });
    });

    it('should reschedule if task returns runAt', async () => {
      const nextRunMilliseconds = _.random(60000, 200000);
      const count = _.random(1, 20);

      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        params: { nextRunMilliseconds },
        state: { count },
      });

      await retry.try(async () => {
        expect((await historyDocs()).length).to.eql(1);

        const [task] = (await currentTasks()).docs;
        expect(task.attempts).to.eql(0);
        expect(task.state.count).to.eql(count + 1);

        expectReschedule(originalTask, task, nextRunMilliseconds);
      });
    });

    it('should reschedule if task has an interval', async () => {
      const interval = _.random(5, 200);
      const intervalMilliseconds = interval * 60000;

      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        interval: `${interval}m`,
        params: {},
      });

      await retry.try(async () => {
        expect((await historyDocs()).length).to.eql(1);

        const [task] = (await currentTasks()).docs;
        expect(task.attempts).to.eql(0);
        expect(task.state.count).to.eql(1);

        expectReschedule(originalTask, task, intervalMilliseconds);
      });
    });

    async function expectReschedule(originalTask, currentTask, expectedDiff) {
      const originalRunAt = Date.parse(originalTask.runAt);
      const buffer = 10000;
      expect(Date.parse(currentTask.runAt) - originalRunAt).to.be.greaterThan(
        expectedDiff - buffer
      );
      expect(Date.parse(currentTask.runAt) - originalRunAt).to.be.lessThan(expectedDiff + buffer);
    }
  });
}
