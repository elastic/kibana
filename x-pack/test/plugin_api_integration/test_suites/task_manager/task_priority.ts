/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { taskMappings as TaskManagerMapping } from '@kbn/task-manager-plugin/server/saved_objects/mappings';
import { asyncForEach } from '@kbn/std';
import { FtrProviderContext } from '../../ftr_provider_context';

const { properties: taskManagerIndexMapping } = TaskManagerMapping;

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
  const retry = getService('retry');
  const supertest = getService('supertest');

  const testHistoryIndex = '.kibana_task_manager_test_result';

  function scheduleTask(
    task: Partial<ConcreteTaskInstance | DeprecatedConcreteTaskInstance>
  ): Promise<SerializedConcreteTaskInstance> {
    return supertest
      .post('/api/sample_tasks/schedule')
      .set('kbn-xsrf', 'xxx')
      .send({ task })
      .expect(200)
      .then((response: { body: SerializedConcreteTaskInstance }) => response.body);
  }

  function currentTasks<State = unknown, Params = unknown>(): Promise<{
    docs: Array<SerializedConcreteTaskInstance<State, Params>>;
  }> {
    return supertest
      .get('/api/sample_tasks')
      .expect(200)
      .then((response) => response.body);
  }

  async function historyDocs({
    taskId,
    taskType,
  }: {
    taskId?: string;
    taskType?: string;
  }): Promise<RawDoc[]> {
    const filter: any[] = [{ term: { type: 'task' } }];
    if (taskId) {
      filter.push({ term: { taskId } });
    }
    if (taskType) {
      filter.push({ term: { taskType } });
    }
    return es
      .search({
        index: testHistoryIndex,
        body: {
          query: {
            bool: {
              filter,
            },
          },
        },
      })
      .then((result) => (result as unknown as SearchResults).hits.hits);
  }

  describe('task priority', () => {
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

    afterEach(async () => {
      await supertest.delete('/api/sample_tasks').set('kbn-xsrf', 'xxx').expect(200);
    });

    it('should claim low priority tasks if there is capacity', async () => {
      // schedule 5 normal tasks and 1 low priority task
      // setting the schedule long so they should only run once
      const tasksToSchedule = [];
      for (let i = 0; i < 5; i++) {
        tasksToSchedule.push(
          scheduleTask({
            taskType: 'sampleTask',
            schedule: { interval: `1d` },
            params: {},
          })
        );
      }
      tasksToSchedule.push(
        scheduleTask({
          taskType: 'lowPriorityTask',
          schedule: { interval: `1d` },
          params: {},
        })
      );
      const scheduledTasks = await Promise.all(tasksToSchedule);

      await retry.try(async () => {
        const tasks = (await currentTasks()).docs;
        expect(tasks.length).to.eql(6);

        const taskIds = tasks.map((task) => task.id);
        const taskDocs: RawDoc[] = [];
        await asyncForEach(scheduledTasks, async (scheduledTask) => {
          expect(taskIds).to.contain(scheduledTask.id);
          const doc: RawDoc[] = await historyDocs({ taskId: scheduledTask.id });
          expect(doc.length).to.eql(1);
          taskDocs.push(...doc);
        });

        expect(
          taskDocs.findIndex((taskDoc) => taskDoc._source.taskType === 'lowPriorityTask')
        ).to.be.greaterThan(-1);
      });
    });

    it('should not claim low priority tasks when there is no capacity', async () => {
      // schedule a bunch of normal priority tasks that run frequently
      const tasksToSchedule = [];
      for (let i = 0; i < 10; i++) {
        tasksToSchedule.push(
          scheduleTask({
            taskType: 'sampleTask',
            schedule: { interval: `1s` },
            params: {},
          })
        );
      }

      // schedule a low priority task
      tasksToSchedule.push(
        scheduleTask({
          taskType: 'lowPriorityTask',
          schedule: { interval: `1s` },
          params: {},
        })
      );
      const scheduledTasks = await Promise.all(tasksToSchedule);

      // make sure all tasks get created
      await retry.try(async () => {
        const tasks = (await currentTasks()).docs;
        expect(tasks.length).to.eql(11);

        const taskIds = tasks.map((task) => task.id);
        scheduledTasks.forEach((scheduledTask) => {
          expect(taskIds).to.contain(scheduledTask.id);
        });
      });

      // wait for 30 seconds to let the multiple task claiming cycles run
      await new Promise((r) => setTimeout(r, 30000));

      const docs: RawDoc[] = await historyDocs({ taskType: 'lowPriorityTask' });
      expect(docs.length).to.eql(0);
    });
  });
}
