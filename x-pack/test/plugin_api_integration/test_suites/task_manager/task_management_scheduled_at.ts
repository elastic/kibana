/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ConcreteTaskInstance } from '../../../../plugins/task_manager/server/task';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function createTaskManagementScheduledAtTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');

  describe('task management scheduled at', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/task_manager_tasks');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/task_manager_tasks');
      await esArchiver.emptyKibanaIndex();
    });

    it('sets scheduledAt to runAt if retryAt is null', async () => {
      await retry.try(async () => {
        const response = await es.get<{ task: ConcreteTaskInstance }>(
          {
            index: '.kibana_task_manager',
            id: 'task:ge7e1250-3322-11eb-94c1-db6395e84f6g',
          },
          {
            meta: true,
          }
        );
        expect(response.statusCode).to.eql(200);
        expect(response.body._source?.task.scheduledAt).to.eql('2020-11-30T16:00:00.000Z');
      });
    });

    it('sets scheduledAt to retryAt if retryAt time has passed', async () => {
      await retry.try(async () => {
        const response = await es.get<{ task: ConcreteTaskInstance }>(
          {
            index: '.kibana_task_manager',
            id: 'task:ie7e1250-3322-11eb-94c1-db6395e84f6i',
          },
          {
            meta: true,
          }
        );
        expect(response.statusCode).to.eql(200);
        expect(response.body._source?.task.scheduledAt).to.eql('2020-11-30T17:00:00.000Z');
      });
    });
  });
}
