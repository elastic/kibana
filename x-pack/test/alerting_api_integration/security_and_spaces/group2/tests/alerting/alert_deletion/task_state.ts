/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { get } from 'lodash';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { ALERT_START } from '@kbn/rule-data-utils';
import moment from 'moment';
import { Space } from '../../../../../common/types';
import { Space1, Superuser } from '../../../../scenarios';
import {
  getUrlPrefix,
  getEventLog,
  ObjectRemover,
  getTestRuleData,
  TaskManagerDoc,
} from '../../../../../common/lib';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

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

      // update the alert deletion rules setting
      await supertestWithoutAuth
        .post(`${getUrlPrefix(Space1.id)}/internal/alerting/rules/settings/_alert_deletion`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          is_active_alerts_deletion_enabled: true,
          is_inactive_alerts_deletion_enabled: false,
          active_alerts_deletion_threshold: 1,
          inactive_alerts_deletion_threshold: 90,
        })
        .expect(200);

      // schedule the task
      await supertestWithoutAuth
        .post(`${getUrlPrefix(Space1.id)}/api/alerts_fixture/schedule_alert_deletion`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({})
        .expect(200);

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
      expect(get(taskStateAfter, 'alertInstances.instance1')).to.be(undefined);
      expect(get(taskStateAfter, 'alertInstances.instance2')).not.to.be(undefined);
    });
  });
}
