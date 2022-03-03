/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import expect from '@kbn/expect';
import url from 'url';
import supertest from 'supertest';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ConcreteTaskInstance } from '../../../../plugins/task_manager/server';

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
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const config = getService('config');
  const request = supertest(url.format(config.get('servers.kibana')));

  const UNREGISTERED_TASK_TYPE_ID = 'ce7e1250-3322-11eb-94c1-db6995e83f6b';
  const REMOVED_TASK_TYPE_ID = 'be7e1250-3322-11eb-94c1-db6995e83f6a';

  describe('not registered task types', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/task_manager_removed_types');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/task_manager_removed_types');
    });

    function scheduleTask(
      task: Partial<ConcreteTaskInstance | DeprecatedConcreteTaskInstance>
    ): Promise<SerializedConcreteTaskInstance> {
      return request
        .post('/api/sample_tasks/schedule')
        .set('kbn-xsrf', 'xxx')
        .send({ task })
        .expect(200)
        .then((response: { body: SerializedConcreteTaskInstance }) => response.body);
    }

    function currentTasks<State = unknown, Params = unknown>(): Promise<{
      docs: Array<SerializedConcreteTaskInstance<State, Params>>;
    }> {
      return request
        .get('/api/sample_tasks')
        .expect(200)
        .then((response) => response.body);
    }

    it('should successfully schedule registered tasks, not claim unregistered tasks and mark removed task types as unrecognized', async () => {
      const scheduledTask = await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: `1s` },
        params: {},
      });

      await retry.try(async () => {
        const tasks = (await currentTasks()).docs;
        expect(tasks.length).to.eql(3);

        const taskIds = tasks.map((task) => task.id);
        expect(taskIds).to.contain(scheduledTask.id);
        expect(taskIds).to.contain(UNREGISTERED_TASK_TYPE_ID);
        expect(taskIds).to.contain(REMOVED_TASK_TYPE_ID);

        const scheduledTaskInstance = tasks.find((task) => task.id === scheduledTask.id);
        const unregisteredTaskInstance = tasks.find(
          (task) => task.id === UNREGISTERED_TASK_TYPE_ID
        );
        const removedTaskInstance = tasks.find((task) => task.id === REMOVED_TASK_TYPE_ID);

        expect(scheduledTaskInstance?.status).to.eql('claiming');
        expect(unregisteredTaskInstance?.status).to.eql('idle');
        expect(removedTaskInstance?.status).to.eql('unrecognized');
      });
    });
  });
}
