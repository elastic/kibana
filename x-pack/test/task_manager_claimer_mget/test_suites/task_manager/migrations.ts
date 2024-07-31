/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';
import {
  ConcreteTaskInstance,
  SerializedConcreteTaskInstance,
  TaskInstanceWithDeprecatedFields,
  TaskStatus,
} from '@kbn/task-manager-plugin/server/task';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { RuleTaskState, WrappedLifecycleRuleState } from '@kbn/alerting-state-types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function createGetTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const ALERT_ID = '0359d7fcc04da9878ee9aadbda38ba55';
  const ACTION_TASK_PARAMS_ID = '6e96ac5e648f57523879661ea72525b7';

  describe('migrations', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/task_manager_tasks');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/task_manager_tasks');
    });

    it('8.0.0 migrates actions tasks with legacy id to saved object ids', async () => {
      // NOTE: We hae to use elastic search directly against the ".kibana" index because alerts do not expose the references which we want to test exists
      const response = await es.get<{ task: TaskInstanceWithDeprecatedFields }>(
        {
          index: '.kibana_task_manager',
          id: 'task:be7e1250-3322-11eb-94c1-db6995e84f6a',
        },
        {
          meta: true,
        }
      );
      expect(response.statusCode).to.eql(200);
      expect(response.body._source?.task.params).to.eql(
        `{"spaceId":"user1","alertId":"${SavedObjectsUtils.getConvertedObjectId(
          'user1',
          'alert',
          ALERT_ID
        )}"}`
      );
    });

    it('8.0.0 migrates actions tasks from legacy id to saved object ids', async () => {
      const searchResult: TransportResult<
        estypes.SearchResponse<{ task: TaskInstanceWithDeprecatedFields }>,
        unknown
      > = await es.search(
        {
          index: '.kibana_task_manager',
          body: {
            query: {
              term: {
                _id: 'task:be7e1250-3322-11eb-94c1-db6995e8389f',
              },
            },
          },
        },
        { meta: true }
      );
      expect(searchResult.statusCode).to.equal(200);
      expect((searchResult.body.hits.total as estypes.SearchTotalHits).value).to.equal(1);
      const hit = searchResult.body.hits.hits[0];
      expect(hit!._source!.task.params!).to.equal(
        `{"spaceId":"user1","actionTaskParamsId":"${SavedObjectsUtils.getConvertedObjectId(
          'user1',
          'action_task_params',
          ACTION_TASK_PARAMS_ID
        )}"}`
      );
    });

    it('8.2.0 migrates alerting tasks that has no schedule.interval', async () => {
      const searchResult: TransportResult<
        estypes.SearchResponse<{ task: ConcreteTaskInstance }>,
        unknown
      > = await es.search(
        {
          index: '.kibana_task_manager',
          body: {
            query: {
              term: {
                _id: 'task:d33d7590-8377-11ec-8c11-2dfe94229b95',
              },
            },
          },
        },
        { meta: true }
      );
      expect(searchResult.statusCode).to.equal(200);
      expect((searchResult.body.hits.total as estypes.SearchTotalHits).value).to.equal(1);
      const hit = searchResult.body.hits.hits[0];
      expect(hit!._source!.task.attempts).to.be(0);
      expect(hit!._source!.task.status).to.be(TaskStatus.Idle);
    });

    it('8.2.0 migrates tasks with unrecognized status to idle if task type is removed', async () => {
      const response = await es.get<{ task: ConcreteTaskInstance }>(
        {
          index: '.kibana_task_manager',
          id: 'task:ce7e1250-3322-11eb-94c1-db6995e84f6d',
        },
        {
          meta: true,
        }
      );
      expect(response.statusCode).to.eql(200);
      expect(response.body._source?.task.taskType).to.eql(
        `alerting:0359d7fcc04da9878ee9aadbda38ba55`
      );
      expect(response.body._source?.task.status).to.eql(`idle`);
    });

    it('8.2.0 does not migrate tasks with unrecognized status if task type is valid', async () => {
      const response = await es.get<{ task: ConcreteTaskInstance }>(
        {
          index: '.kibana_task_manager',
          id: 'task:fe7e1250-3322-11eb-94c1-db6395e84f6e',
        },
        {
          meta: true,
        }
      );
      expect(response.statusCode).to.eql(200);
      expect(response.body._source?.task.taskType).to.eql(`sampleTaskRemovedType`);
      expect(response.body._source?.task.status).to.eql(`unrecognized`);
    });

    it('8.5.0 migrates active tasks to set enabled to true', async () => {
      const response = await es.search<{ task: ConcreteTaskInstance }>(
        {
          index: '.kibana_task_manager',
          size: 100,
          body: {
            query: {
              match_all: {},
            },
          },
        },
        {
          meta: true,
        }
      );
      expect(response.statusCode).to.eql(200);
      const tasks = response.body.hits.hits;
      tasks
        .filter(
          (task) =>
            task._source?.task.status !== 'failed' && task._source?.task.status !== 'unrecognized'
        )
        .forEach((task) => {
          expect(task._source?.task.enabled).to.eql(true);
        });
    });

    it('8.5.0 does not migrates failed and unrecognized', async () => {
      const response = await es.search<{ task: ConcreteTaskInstance }>(
        {
          index: '.kibana_task_manager',
          size: 100,
          body: {
            query: {
              match_all: {},
            },
          },
        },
        {
          meta: true,
        }
      );
      expect(response.statusCode).to.eql(200);
      const tasks = response.body.hits.hits;
      tasks
        .filter(
          (task) =>
            task._source?.task.status === 'failed' || task._source?.task.status === 'unrecognized'
        )
        .forEach((task) => {
          expect(task._source?.task.enabled).to.be(undefined);
        });
    });

    describe('8.8.0', async () => {
      it('adds UUIDs to all alerts', async () => {
        const response = await es.search<{ task: SerializedConcreteTaskInstance }>(
          {
            index: '.kibana_task_manager',
            size: 100,
            body: { query: { match_all: {} } },
          },
          { meta: true }
        );
        expect(response.statusCode).to.eql(200);
        const tasks = response.body.hits.hits;
        tasks.forEach((task) => {
          const stateString = task._source?.task.state;
          expect(stateString).to.be.ok();
          const state: RuleTaskState = JSON.parse(stateString!);
          const uuids = new Set<string>();

          for (const alert of Object.values(state.alertInstances || {})) {
            const uuid = alert?.meta?.uuid || 'uuid-is-missing';
            expect(uuid).to.match(/^.{8}-.{4}-.{4}-.{4}-.{12}$/);
            expect(uuids.has(uuid)).to.be(false);
            uuids.add(uuid);
          }

          for (const alert of Object.values(state.alertRecoveredInstances || {})) {
            const uuid = alert?.meta?.uuid || 'uuid-is-missing';
            expect(uuid).to.match(/^.{8}-.{4}-.{4}-.{4}-.{12}$/);
            expect(uuids.has(uuid)).to.be(false);
            uuids.add(uuid);
          }
        });
      });

      it('copies UUIDs from rule registry wrapper to alerting framework', async () => {
        const response = await es.search<{ task: SerializedConcreteTaskInstance }>(
          {
            index: '.kibana_task_manager',
            size: 100,
            body: { query: { match_all: {} } },
          },
          { meta: true }
        );
        expect(response.statusCode).to.eql(200);
        const tasks = response.body.hits.hits;
        tasks.forEach((task) => {
          const stateString = task._source?.task.state;
          expect(stateString).to.be.ok();

          const state: RuleTaskState = JSON.parse(stateString!);
          if (!state?.alertTypeState?.wrapped) return;

          const wrappedUUIDs = new Map<string, string>();
          const wrappedState = state.alertTypeState as WrappedLifecycleRuleState<any>;

          for (const alert of Object.values(wrappedState.trackedAlerts || {})) {
            const id = alert.alertId;
            const uuid = alert.alertUuid;
            wrappedUUIDs.set(id, uuid);
          }

          for (const alert of Object.values(wrappedState.trackedAlertsRecovered || {})) {
            const id = alert.alertId;
            const uuid = alert.alertUuid;
            wrappedUUIDs.set(id, uuid);
          }

          for (const [id, alert] of Object.entries(state.alertInstances || {})) {
            const uuid = alert?.meta?.uuid || 'uuid-is-missing';
            expect(uuid).to.be(wrappedUUIDs.get(id));
          }

          for (const [id, alert] of Object.entries(state.alertRecoveredInstances || {})) {
            const uuid = alert?.meta?.uuid || 'uuid-is-missing';
            expect(uuid).to.be(wrappedUUIDs.get(id));
          }
        });
      });
    });
  });
}
