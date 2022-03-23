/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces, Superuser } from '../../scenarios';
import {
  getUrlPrefix,
  getEventLog,
  getTestRuleData,
  ObjectRemover,
  TaskManagerDoc,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createActionsTelemetryTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('actions telemetry', () => {
    const alwaysFiringRuleId: { [key: string]: string } = {};
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      // reset the state in the telemetry task
      await es.update({
        id: `task:Actions-actions_telemetry`,
        index: '.kibana_task_manager',
        body: {
          doc: {
            task: {
              state: '{}',
            },
          },
        },
      });
    });
    after(() => objectRemover.removeAll());

    async function createConnector(opts: { name: string; space: string; connectorTypeId: string }) {
      const { name, space, connectorTypeId } = opts;
      const { body: createdConnector } = await supertestWithoutAuth
        .post(`${getUrlPrefix(space)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          name,
          connector_type_id: connectorTypeId,
          config: {},
          secrets: {},
        })
        .expect(200);
      objectRemover.add(space, createdConnector.id, 'action', 'actions');
      return createdConnector.id;
    }

    async function createRule(opts: { space: string; ruleOverwrites: any }) {
      const { ruleOverwrites, space } = opts;
      const ruleResponse = await supertestWithoutAuth
        .post(`${getUrlPrefix(space)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send(getTestRuleData(ruleOverwrites));
      expect(ruleResponse.status).to.eql(200);
      objectRemover.add(space, ruleResponse.body.id, 'rule', 'alerting');
      return ruleResponse.body.id;
    }

    async function setup() {
      // Create rules and connectors in multiple spaces
      for (const space of Spaces) {
        const noopConnectorId = await createConnector({
          name: 'noop connector',
          space: space.id,
          connectorTypeId: 'test.noop',
        });
        const failingConnectorId = await createConnector({
          name: 'connector that throws',
          space: space.id,
          connectorTypeId: 'test.throw',
        });

        await createConnector({
          name: 'unused connector',
          space: space.id,
          connectorTypeId: 'test.excluded',
        });
        await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: 'test.noop',
            schedule: { interval: '1s' },
            throttle: null,
            notify_when: 'onActiveAlert',
            params: {},
            actions: [
              {
                id: noopConnectorId,
                group: 'default',
                params: {},
              },
            ],
          },
        });
        await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: 'test.noop',
            schedule: { interval: '1s' },
            throttle: null,
            params: {},
            notify_when: 'onActiveAlert',
            actions: [
              {
                id: failingConnectorId,
                group: 'default',
                params: {},
              },
            ],
          },
        });

        alwaysFiringRuleId[space.id] = await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: 'test.cumulative-firing',
            schedule: { interval: '3s' },
            throttle: null,
            notify_when: 'onActiveAlert',
            params: {},
            actions: [
              {
                id: noopConnectorId,
                group: 'default',
                params: {},
              },
              {
                id: failingConnectorId,
                group: 'default',
                params: {},
              },
              {
                id: 'my-slack1',
                group: 'other',
                params: {},
              },
            ],
          },
        });
      }
    }

    it('should retrieve telemetry data in the expected format', async () => {
      await setup();

      // let it run for a bit
      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces[0].id,
          type: 'alert',
          id: alwaysFiringRuleId[Spaces[0].id],
          provider: 'alerting',
          actions: new Map([['execute', { gte: 5 }]]),
        });
      });

      // request telemetry task to run
      await supertest
        .post('/api/alerting_actions_telemetry/run_now')
        .set('kbn-xsrf', 'xxx')
        .send({ taskId: 'Actions-actions_telemetry' })
        .expect(200);

      // get telemetry task doc
      const telemetryTask = await es.get<TaskManagerDoc>({
        id: `task:Actions-actions_telemetry`,
        index: '.kibana_task_manager',
      });
      const taskState = telemetryTask?._source?.task?.state;
      expect(taskState).not.to.be(undefined);
      const telemetry = JSON.parse(taskState!);

      // total number of connectors
      expect(telemetry.count_total).to.equal(17);

      // total number of active connectors (used by a rule)
      expect(telemetry.count_active_total).to.equal(7);

      // total number of connectors broken down by connector type
      expect(telemetry.count_by_type['test.throw']).to.equal(3);
      expect(telemetry.count_by_type['test.excluded']).to.equal(3);
      expect(telemetry.count_by_type['test.noop']).to.equal(3);
      expect(telemetry.count_by_type.__slack).to.equal(1);
      expect(telemetry.count_by_type['system-abc-action-type']).to.equal(1);
      expect(telemetry.count_by_type.__index).to.equal(1);
      expect(telemetry.count_by_type['test.index-record']).to.equal(1);
      expect(telemetry.count_by_type.__webhook).to.equal(4);

      // total number of active connectors broken down by connector type
      expect(telemetry.count_active_by_type['test.throw']).to.equal(3);
      expect(telemetry.count_active_by_type['test.noop']).to.equal(3);
      expect(telemetry.count_active_by_type.__slack).to.equal(1);

      // total number of rules using the alert history connector
      expect(telemetry.count_active_alert_history_connectors).to.equal(0);

      // total number of email connectors used by rules broken down by service type
      // testing for existence of this field but we don't have any rules using email
      // connectors in this test
      expect(telemetry.count_active_email_connectors_by_service_type).to.be.empty();

      // number of spaces with connectors
      expect(telemetry.count_actions_namespaces).to.equal(3);

      // number of action executions - just checking for non-zero as we can't set an exact number
      expect(telemetry.count_actions_executions_per_day > 0).to.be(true);

      // number of action executions broken down by connector type
      expect(telemetry.count_actions_executions_by_type_per_day['test.noop'] > 0).to.be(true);

      // average execution time - just checking for non-zero as we can't set an exact number
      expect(telemetry.avg_execution_time_per_day > 0).to.be(true);

      // average execution time broken down by rule type
      expect(telemetry.avg_execution_time_by_type_per_day['test.noop'] > 0).to.be(true);

      // number of failed executions
      expect(telemetry.count_actions_executions_failed_per_day > 0).to.be(true);
      expect(telemetry.count_actions_executions_failed_by_type_per_day['test.throw'] > 0).to.be(
        true
      );
    });
  });
}
