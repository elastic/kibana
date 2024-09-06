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
import { setTimeout as setTimeoutAsync } from 'timers/promises';
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
  const testNode1 = 'y-test-node';
  const testNode2 = 'z-test-node';

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

  function updateKibanaNodes() {
    const lastSeen = new Date().toISOString();
    return Promise.all([
      supertest
        .post('/api/update_kibana_node')
        .set('kbn-xsrf', 'xxx')
        .send({ id: testNode1, lastSeen })
        .expect(200),
      supertest
        .post('/api/update_kibana_node')
        .set('kbn-xsrf', 'xxx')
        .send({ id: testNode2, lastSeen })
        .expect(200),
    ]);
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

  // Failing: See https://github.com/elastic/kibana/issues/192023
  describe.skip('task partitions', () => {
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
      await es.deleteByQuery({
        index: '.kibana_task_manager',
        refresh: true,
        body: { query: { terms: { id: [testNode1, testNode2] } } },
      });
    });

    it('should run tasks with partitions assigned to this kibana node', async () => {
      const partitions: Record<string, number> = {
        '0': 127,
        '1': 147,
        '2': 23,
      };

      // wait for the pod partitions cache to update before scheduling tasks
      await updateKibanaNodes();
      await setTimeoutAsync(10000);

      const tasksToSchedule = [];
      for (let i = 0; i < 3; i++) {
        tasksToSchedule.push(
          scheduleTask({
            id: `${i}`,
            taskType: 'sampleTask',
            schedule: { interval: `1d` },
            params: {},
          })
        );
      }
      const scheduledTasks = await Promise.all(tasksToSchedule);

      let tasks: any[] = [];
      await retry.try(async () => {
        tasks = (await currentTasks()).docs;
        expect(tasks.length).to.eql(3);
      });

      const taskIds = tasks.map((task) => task.id);
      await asyncForEach(scheduledTasks, async (scheduledTask) => {
        expect(taskIds).to.contain(scheduledTask.id);
        expect(scheduledTask.partition).to.eql(partitions[scheduledTask.id]);

        let taskRanOnThisNode: boolean = false;
        let counter = 0;
        await retry.try(async () => {
          await updateKibanaNodes();

          const doc: RawDoc[] = await historyDocs({ taskId: scheduledTask.id });
          if (doc.length === 1) {
            taskRanOnThisNode = true;
            return;
          }

          // we don't want the test to time out, so we check
          // 20 times and then return
          if (scheduledTask.id === '2' && counter > 20) {
            return;
          }
          counter++;

          throw new Error(`The task ID: ${scheduledTask.id} has not run yet`);
        });

        // taskId 2 should not run on this kibana node
        if (scheduledTask.id === '2') {
          expect(taskRanOnThisNode).to.be(false);
        } else {
          expect(taskRanOnThisNode).to.be(true);
        }
      });
    });
  });
}
