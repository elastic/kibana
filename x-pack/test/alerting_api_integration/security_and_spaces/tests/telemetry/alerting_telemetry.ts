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
export default function createAlertingTelemetryTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('alerting telemetry', () => {
    const alwaysFiringRuleId: { [key: string]: string } = {};
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      // reset the state in the telemetry task
      await es.update({
        id: `task:Alerting-alerting_telemetry`,
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
        await createConnector({
          name: 'connector that errors',
          space: space.id,
          connectorTypeId: 'test.throw',
        });
        await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: 'test.noop',
            schedule: { interval: '30s' },
            throttle: '1s',
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
            rule_type_id: 'test.onlyContextVariables',
            schedule: { interval: '10s' },
            throttle: '10m',
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
            rule_type_id: 'test.throw',
            schedule: { interval: '1m' },
            throttle: '30s',
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

        alwaysFiringRuleId[space.id] = await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: 'example.always-firing',
            schedule: { interval: '3s' },
            throttle: null,
            params: {},
            actions: [
              {
                id: noopConnectorId,
                group: 'small',
                params: {},
              },
              {
                id: noopConnectorId,
                group: 'medium',
                params: {},
              },
              {
                id: noopConnectorId,
                group: 'large',
                params: {},
              },
            ],
          },
        });

        await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: 'test.noop',
            schedule: { interval: '5m' },
            throttle: null,
            enabled: false,
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
        .send({ taskId: 'Alerting-alerting_telemetry' })
        .expect(200);

      // get telemetry task doc
      const telemetryTask = await es.get<TaskManagerDoc>({
        id: `task:Alerting-alerting_telemetry`,
        index: '.kibana_task_manager',
      });
      const taskState = telemetryTask?._source?.task?.state;
      expect(taskState).not.to.be(undefined);
      const telemetry = JSON.parse(taskState!);

      // total number of rules
      expect(telemetry.count_total).to.equal(15);

      // total number of enabled rules
      expect(telemetry.count_active_total).to.equal(12);

      // total number of disabled rules
      expect(telemetry.count_disabled_total).to.equal(3);

      // total number of rules broken down by rule type
      expect(telemetry.count_by_type.test__onlyContextVariables).to.equal(3);
      expect(telemetry.count_by_type['example__always-firing']).to.equal(3);
      expect(telemetry.count_by_type.test__throw).to.equal(3);
      expect(telemetry.count_by_type.test__noop).to.equal(6);

      // total number of enabled rules broken down by rule type
      expect(telemetry.count_active_by_type.test__onlyContextVariables).to.equal(3);
      expect(telemetry.count_active_by_type['example__always-firing']).to.equal(3);
      expect(telemetry.count_active_by_type.test__throw).to.equal(3);
      expect(telemetry.count_active_by_type.test__noop).to.equal(3);

      // throttle time stats
      expect(telemetry.throttle_time.min).to.equal('0s');
      expect(telemetry.throttle_time.avg).to.equal('157.75s');
      expect(telemetry.throttle_time.max).to.equal('600s');
      expect(telemetry.throttle_time_number_s.min).to.equal(0);
      expect(telemetry.throttle_time_number_s.avg).to.equal(157.75);
      expect(telemetry.throttle_time_number_s.max).to.equal(600);

      // schedule interval stats
      expect(telemetry.schedule_time.min).to.equal('3s');
      expect(telemetry.schedule_time.avg).to.equal('80.6s');
      expect(telemetry.schedule_time.max).to.equal('300s');
      expect(telemetry.schedule_time_number_s.min).to.equal(3);
      expect(telemetry.schedule_time_number_s.avg).to.equal(80.6);
      expect(telemetry.schedule_time_number_s.max).to.equal(300);

      // attached connectors stats
      expect(telemetry.connectors_per_alert.min).to.equal(1);
      expect(telemetry.connectors_per_alert.avg).to.equal(1.4);
      expect(telemetry.connectors_per_alert.max).to.equal(3);

      // number of spaces with rules
      expect(telemetry.count_rules_namespaces).to.equal(3);

      // number of rule executions - just checking for non-zero as we can't set an exact number
      // each rule should have had a chance to execute once
      expect(telemetry.count_rules_executions_per_day >= 15).to.be(true);

      // number of rule executions broken down by rule type
      expect(telemetry.count_by_type.test__onlyContextVariables >= 3).to.be(true);
      expect(telemetry.count_by_type['example__always-firing'] >= 3).to.be(true);
      expect(telemetry.count_by_type.test__throw >= 3).to.be(true);
      expect(telemetry.count_by_type.test__noop >= 3).to.be(true);

      // average execution time - just checking for non-zero as we can't set an exact number
      expect(telemetry.avg_execution_time_per_day > 0).to.be(true);

      // average execution time broken down by rule type
      expect(telemetry.avg_execution_time_by_type_per_day.test__onlyContextVariables > 0).to.be(
        true
      );
      expect(telemetry.avg_execution_time_by_type_per_day['example__always-firing'] > 0).to.be(
        true
      );
      expect(telemetry.avg_execution_time_by_type_per_day.test__throw > 0).to.be(true);
      expect(telemetry.avg_execution_time_by_type_per_day.test__noop > 0).to.be(true);

      // number of failed executions - we have one rule that always fails
      expect(telemetry.count_rules_executions_failured_per_day >= 1).to.be(true);
      expect(telemetry.count_rules_executions_failured_by_reason_per_day.execute >= 1).to.be(true);
      expect(
        telemetry.count_rules_executions_failured_by_reason_by_type_per_day.execute.test__throw >= 1
      ).to.be(true);

      // number of execution timeouts - testing for existence of this field but
      // this test doesn't have any rules that timeout
      expect(telemetry.count_rules_executions_timeouts_per_day).to.equal(0);
      expect(telemetry.count_rules_executions_timeouts_by_type_per_day).to.be.empty();

      // number of failed/unrecognized tasks - testing for existence of this field but
      // this test doesn't have any unrecognized rule types
      expect(telemetry.count_failed_and_unrecognized_rule_tasks_per_day).to.equal(0);
      expect(telemetry.count_failed_and_unrecognized_rule_tasks_by_status_per_day).to.be.empty();
      expect(
        telemetry.count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day
      ).to.be.empty();
    });
  });
}
