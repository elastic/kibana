/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import expect from '@kbn/expect';
import url from 'url';
import supertestAsPromised from 'supertest-as-promised';
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
  const supertest = supertestAsPromised(url.format(config.get('servers.kibana')));

  const REMOVED_TASK_TYPE_ID = 'be7e1250-3322-11eb-94c1-db6995e83f6a';

  describe('removed task types', () => {
    before(async () => {
      await esArchiver.load('task_manager_removed_types');
    });

    after(async () => {
      await esArchiver.unload('task_manager_removed_types');
    });

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

    it('should successfully schedule registered tasks and mark unregistered tasks as unrecognized', async () => {
      const scheduledTask = await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: `1s` },
        params: {},
      });

      await retry.try(async () => {
        const tasks = (await currentTasks()).docs;
        expect(tasks.length).to.eql(2);

        const taskIds = tasks.map((task) => task.id);
        expect(taskIds).to.contain(scheduledTask.id);
        expect(taskIds).to.contain(REMOVED_TASK_TYPE_ID);

        const scheduledTaskInstance = tasks.find((task) => task.id === scheduledTask.id);
        const removedTaskInstance = tasks.find((task) => task.id === REMOVED_TASK_TYPE_ID);

        expect(scheduledTaskInstance?.status).to.eql('claiming');
        expect(removedTaskInstance?.status).to.eql('unrecognized');
      });
    });
  });
}
