/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { get } from 'lodash';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { ALERT_START } from '@kbn/rule-data-utils';
import moment from 'moment';
import type { Space } from '../../../../../common/types';
import { Space1, Superuser } from '../../../../scenarios';
import type { TaskManagerDoc } from '../../../../../common/lib';
import {
  getUrlPrefix,
  getEventLog,
  ObjectRemover,
  getTestRuleData,
} from '../../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function alertDeletionTaskStateTests({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertest);

  const getEventLogWithRetry = async (id: string, space: Space) => {
    await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: space.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions: new Map([['execute', { equal: 1 }]]),
      });
    });
  };

  describe('alert deletion - task state', () => {
    beforeEach(async () => {
      await es.deleteByQuery({
        index: '.kibana-event-log*',
        query: { bool: { must: [{ match: { 'event.action': 'delete-alerts' } }] } },
        conflicts: 'proceed',
      });
    });

    afterEach(async () => {
      await es.deleteByQuery({
        index: '.internal.alerts-*',
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await es.deleteByQuery({
        index: '.kibana-event-log*',
        query: { bool: { must: [{ match: { 'event.action': 'delete-alerts' } }] } },
        conflicts: 'proceed',
      });
      await objectRemover.removeAll();
    });

    it('should remove active alerts from task state when deleted', async () => {
      // get last run date should be undefined
      const lastRunResponsePre = await supertestWithoutAuth
        .get(`${getUrlPrefix(Space1.id)}/api/alerts_fixture/last_run_alert_deletion`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .expect(200);
      expect(lastRunResponsePre.body.lastRun).to.be(undefined);

      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiringAad',
            schedule: { interval: '1d' },
            throttle: null,
            notify_when: null,
            params: {
              pattern: {
                instance1: [true, true, true, true, true, true],
                instance2: [true, true, true, true, true, true],
              },
            },
          })
        );

      expect(response.status).to.eql(200);
      const ruleId = response.body.id;
      objectRemover.add(Space1.id, ruleId, 'rule', 'alerting');

      // wait for the rule to execute
      await getEventLogWithRetry(ruleId, Space1);

      // get the task document and check state
      const taskResult = await es.get<TaskManagerDoc>({
        index: '.kibana_task_manager',
        id: `task:${ruleId}`,
      });
      expect(taskResult).not.to.be(undefined);

      const taskState = JSON.parse(taskResult._source?.task?.state!);
      const alertUuid = taskState.alertInstances.instance1.meta.uuid;

      // update the start date of the alert document to be > 1 day ago
      // we need to do this because we only allow deleting alerts older than 1 day
      await es.update({
        index: `.internal.alerts-test.patternfiring.alerts-default-000001`,
        id: alertUuid,
        doc: {
          [ALERT_START]: moment.utc().subtract(2, 'days').toISOString(),
        },
        refresh: true,
      });

      // schedule the task
      await supertestWithoutAuth
        .post(`${getUrlPrefix(Space1.id)}/internal/alerting/rules/settings/_alert_delete_schedule`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          active_alert_delete_threshold: 1,
          inactive_alert_delete_threshold: undefined,
        })
        .expect(204);

      // wait for the task to complete
      await retry.try(async () => {
        const results = await es.search<IValidatedEvent>({
          index: '.kibana-event-log*',
          query: { bool: { must: [{ match: { 'event.action': 'delete-alerts' } }] } },
        });
        expect(results.hits.hits.length).to.eql(1);
        expect(results.hits.hits[0]._source?.event?.outcome).to.eql('success');
      });

      // get the task document and check state
      const taskResultAfter = await es.get<TaskManagerDoc>({
        index: '.kibana_task_manager',
        id: `task:${ruleId}`,
      });

      expect(taskResultAfter).not.to.be(undefined);

      const taskStateAfter = JSON.parse(taskResultAfter._source?.task?.state!);

      // instance1 should have been cleared but instance2 should still be there
      await retry.try(async () => {
        expect(get(taskStateAfter, 'alertInstances.instance1')).to.be(undefined);
        expect(get(taskStateAfter, 'alertInstances.instance2')).not.to.be(undefined);
      });

      // get last run date should be defined
      const lastRunResponsePost = await supertestWithoutAuth
        .get(`${getUrlPrefix(Space1.id)}/api/alerts_fixture/last_run_alert_deletion`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .expect(200);

      expect(lastRunResponsePost.body.lastRun).to.match(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/
      );
    });
  });
}
