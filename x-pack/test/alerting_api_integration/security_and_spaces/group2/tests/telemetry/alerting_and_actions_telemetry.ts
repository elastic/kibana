/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';
import { Spaces, Superuser } from '../../../scenarios';
import { getUrlPrefix, getEventLog, getTestRuleData, TaskManagerDoc } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAlertingAndActionsTelemetryTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const logger = getService('log');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('telemetry', () => {
    const alwaysFiringRuleId: { [key: string]: string } = {};

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

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
          name: 'connector that errors',
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
                id: failingConnectorId,
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
            notify_when: 'onActiveAlert',
            params: {},
            actions: [
              {
                id: noopConnectorId,
                group: 'small',
                params: {},
              },
              {
                id: 'my-slack1',
                group: 'medium',
                params: {},
              },
              {
                id: failingConnectorId,
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
            actions: [],
          },
        });

        await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: 'test.multipleSearches',
            schedule: { interval: '40s' },
            throttle: '1m',
            params: { numSearches: 2, delay: `2s` },
            actions: [],
          },
        });

        await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: 'test.cumulative-firing',
            schedule: { interval: '61s' },
            throttle: '2s',
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
      }
    }

    function verifyActionsTelemetry(telemetry: any) {
      logger.info(`actions telemetry - ${JSON.stringify(telemetry)}`);
      // total number of active connectors (used by a rule)
      expect(telemetry.count_active_total).to.equal(7);

      // total number of connectors broken down by connector type
      expect(telemetry.count_by_type['test.throw']).to.equal(3);
      expect(telemetry.count_by_type['test.excluded']).to.equal(3);
      expect(telemetry.count_by_type['test.noop']).to.equal(3);
      expect(telemetry.count_by_type.__slack).to.equal(1);
      expect(telemetry.count_by_type.__servicenow).to.equal(2);
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
      expect(telemetry.count_actions_executions_by_type_per_day['test.throw'] > 0).to.be(true);

      // average execution time - just checking for a positive number as we can't set an exact number
      // if the time is less than 1ms it will round down to 0
      expect(telemetry.avg_execution_time_per_day >= 0).to.be(true);

      // average execution time broken down by rule type
      expect(telemetry.avg_execution_time_by_type_per_day['test.throw'] > 0).to.be(true);

      // number of failed executions
      expect(telemetry.count_actions_executions_failed_per_day > 0).to.be(true);
      expect(telemetry.count_actions_executions_failed_by_type_per_day['test.throw'] > 0).to.be(
        true
      );

      expect(
        telemetry.count_connector_types_by_action_run_outcome_per_day['test.throw'].failure
      ).to.greaterThan(0);
    }

    function verifyAlertingTelemetry(telemetry: any) {
      logger.info(`alerting telemetry - ${JSON.stringify(telemetry)}`);
      // total number of enabled rules
      expect(telemetry.count_active_total).to.equal(18);

      // total number of disabled rules
      expect(telemetry.count_disabled_total).to.equal(3);

      // total number of rules broken down by rule type
      expect(telemetry.count_by_type.test__noop).to.equal(6);
      expect(telemetry.count_by_type['example__always-firing']).to.equal(3);
      expect(telemetry.count_by_type['test__cumulative-firing']).to.equal(3);
      expect(telemetry.count_by_type.test__multipleSearches).to.equal(3);
      expect(telemetry.count_by_type.test__onlyContextVariables).to.equal(3);
      expect(telemetry.count_by_type.test__throw).to.equal(3);

      // total number of enabled rules broken down by rule type
      expect(telemetry.count_active_by_type['example__always-firing']).to.equal(3);
      expect(telemetry.count_active_by_type['test__cumulative-firing']).to.equal(3);
      expect(telemetry.count_active_by_type.test__multipleSearches).to.equal(3);
      expect(telemetry.count_active_by_type.test__noop).to.equal(3);
      expect(telemetry.count_active_by_type.test__onlyContextVariables).to.equal(3);
      expect(telemetry.count_active_by_type.test__throw).to.equal(3);

      // throttle time stats
      expect(telemetry.throttle_time.min).to.equal('0s');
      expect(telemetry.throttle_time.avg).to.equal('115.5s');
      expect(telemetry.throttle_time.max).to.equal('600s');
      expect(telemetry.throttle_time_number_s.min).to.equal(0);
      expect(telemetry.throttle_time_number_s.avg).to.equal(115.5);
      expect(telemetry.throttle_time_number_s.max).to.equal(600);

      // schedule interval stats
      expect(telemetry.schedule_time.min).to.equal('3s');
      expect(telemetry.schedule_time.avg).to.equal('72s');
      expect(telemetry.schedule_time.max).to.equal('300s');
      expect(telemetry.schedule_time_number_s.min).to.equal(3);
      expect(telemetry.schedule_time_number_s.avg).to.equal(72);
      expect(telemetry.schedule_time_number_s.max).to.equal(300);

      // attached connectors stats
      expect(telemetry.connectors_per_alert.min).to.equal(0);
      expect(telemetry.connectors_per_alert.avg).to.equal(1);
      expect(telemetry.connectors_per_alert.max).to.equal(3);

      // number of spaces with rules
      expect(telemetry.count_rules_namespaces).to.equal(3);

      // number of rule executions - just checking for non-zero as we can't set an exact number
      // each rule should have had a chance to execute once
      expect(telemetry.count_rules_executions_per_day >= 21).to.be(true);

      // number of rule executions broken down by rule type
      expect(telemetry.count_by_type['example__always-firing'] >= 3).to.be(true);
      expect(telemetry.count_by_type.test__onlyContextVariables >= 3).to.be(true);
      expect(telemetry.count_by_type['test__cumulative-firing'] >= 3).to.be(true);
      expect(telemetry.count_by_type.test__noop >= 3).to.be(true);
      expect(telemetry.count_by_type.test__multipleSearches >= 3).to.be(true);
      expect(telemetry.count_by_type.test__throw >= 3).to.be(true);

      // average execution time - just checking for non-zero as we can't set an exact number
      expect(telemetry.avg_execution_time_per_day > 0).to.be(true);

      // average execution time broken down by rule type
      expect(telemetry.avg_execution_time_by_type_per_day['example__always-firing'] > 0).to.be(
        true
      );
      expect(telemetry.avg_execution_time_by_type_per_day.test__onlyContextVariables > 0).to.be(
        true
      );
      expect(telemetry.avg_execution_time_by_type_per_day['test__cumulative-firing'] > 0).to.be(
        true
      );
      expect(telemetry.avg_execution_time_by_type_per_day.test__noop > 0).to.be(true);
      expect(telemetry.avg_execution_time_by_type_per_day.test__multipleSearches > 0).to.be(true);
      expect(telemetry.avg_execution_time_by_type_per_day.test__throw > 0).to.be(true);

      // average es search time - just checking for non-zero as we can't set an exact number
      expect(telemetry.avg_es_search_duration_per_day > 0).to.be(true);

      // average es search time broken down by rule type, most of these rule types don't perform ES queries
      expect(
        telemetry.avg_es_search_duration_by_type_per_day['example__always-firing'] === 0
      ).to.be(true);
      expect(
        telemetry.avg_es_search_duration_by_type_per_day.test__onlyContextVariables === 0
      ).to.be(true);
      expect(
        telemetry.avg_es_search_duration_by_type_per_day['test__cumulative-firing'] === 0
      ).to.be(true);
      expect(telemetry.avg_es_search_duration_by_type_per_day.test__noop === 0).to.be(true);
      expect(telemetry.avg_es_search_duration_by_type_per_day.test__throw === 0).to.be(true);

      // rule type that performs ES search
      expect(telemetry.avg_es_search_duration_by_type_per_day.test__multipleSearches > 0).to.be(
        true
      );

      // average total search time time - just checking for non-zero as we can't set an exact number
      expect(telemetry.avg_total_search_duration_per_day > 0).to.be(true);

      // average total search time broken down by rule type, most of these rule types don't perform ES queries
      expect(
        telemetry.avg_total_search_duration_by_type_per_day['example__always-firing'] === 0
      ).to.be(true);
      expect(
        telemetry.avg_total_search_duration_by_type_per_day.test__onlyContextVariables === 0
      ).to.be(true);
      expect(
        telemetry.avg_total_search_duration_by_type_per_day['test__cumulative-firing'] === 0
      ).to.be(true);
      expect(telemetry.avg_total_search_duration_by_type_per_day.test__noop === 0).to.be(true);
      expect(telemetry.avg_total_search_duration_by_type_per_day.test__throw === 0).to.be(true);

      // rule type that performs ES search
      expect(telemetry.avg_total_search_duration_by_type_per_day.test__multipleSearches > 0).to.be(
        true
      );

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

      // percentile calculations for number of scheduled actions
      expect(telemetry.percentile_num_generated_actions_per_day.p50 >= 0).to.be(true);
      expect(telemetry.percentile_num_generated_actions_per_day.p90 >= 0).to.be(true);
      expect(telemetry.percentile_num_generated_actions_per_day.p99).to.be.greaterThan(0);

      // percentile calculations by rule type. most of these rule types don't schedule actions so they should all be 0
      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p50['example__always-firing']
      ).to.equal(0);
      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p90['example__always-firing']
      ).to.equal(0);
      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p99['example__always-firing']
      ).to.equal(0);

      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p50.test__onlyContextVariables
      ).to.equal(0);
      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p90.test__onlyContextVariables
      ).to.equal(0);
      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p99.test__onlyContextVariables
      ).to.equal(0);

      expect(telemetry.percentile_num_generated_actions_by_type_per_day.p50.test__noop).to.equal(0);
      expect(telemetry.percentile_num_generated_actions_by_type_per_day.p90.test__noop).to.equal(0);
      expect(telemetry.percentile_num_generated_actions_by_type_per_day.p99.test__noop).to.equal(0);

      expect(telemetry.percentile_num_generated_actions_by_type_per_day.p50.test__throw).to.equal(
        0
      );
      expect(telemetry.percentile_num_generated_actions_by_type_per_day.p90.test__throw).to.equal(
        0
      );
      expect(telemetry.percentile_num_generated_actions_by_type_per_day.p99.test__throw).to.equal(
        0
      );

      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p50.test__multipleSearches
      ).to.equal(0);
      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p90.test__multipleSearches
      ).to.equal(0);
      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p99.test__multipleSearches
      ).to.equal(0);

      // this rule type does schedule actions so should be least 1 action scheduled
      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p50['test__cumulative-firing']
      ).to.be.greaterThan(0);
      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p90['test__cumulative-firing']
      ).to.be.greaterThan(0);
      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p99['test__cumulative-firing']
      ).to.be.greaterThan(0);

      // percentile calculations for number of alerts
      expect(telemetry.percentile_num_alerts_per_day.p50 >= 0).to.be(true);
      expect(telemetry.percentile_num_alerts_per_day.p90 >= 0).to.be(true);
      expect(telemetry.percentile_num_alerts_per_day.p99).to.be.greaterThan(0);

      // percentile calculations by rule type. most of these rule types don't generate alerts so they should all be 0
      expect(
        telemetry.percentile_num_alerts_by_type_per_day.p50['example__always-firing']
      ).to.equal(0);
      expect(
        telemetry.percentile_num_alerts_by_type_per_day.p90['example__always-firing']
      ).to.equal(0);
      expect(
        telemetry.percentile_num_alerts_by_type_per_day.p99['example__always-firing']
      ).to.equal(0);

      expect(
        telemetry.percentile_num_alerts_by_type_per_day.p50.test__onlyContextVariables
      ).to.equal(0);
      expect(
        telemetry.percentile_num_alerts_by_type_per_day.p90.test__onlyContextVariables
      ).to.equal(0);
      expect(
        telemetry.percentile_num_alerts_by_type_per_day.p99.test__onlyContextVariables
      ).to.equal(0);

      expect(telemetry.percentile_num_alerts_by_type_per_day.p50.test__noop).to.equal(0);
      expect(telemetry.percentile_num_alerts_by_type_per_day.p90.test__noop).to.equal(0);
      expect(telemetry.percentile_num_alerts_by_type_per_day.p99.test__noop).to.equal(0);

      expect(telemetry.percentile_num_alerts_by_type_per_day.p50.test__throw).to.equal(0);
      expect(telemetry.percentile_num_alerts_by_type_per_day.p90.test__throw).to.equal(0);
      expect(telemetry.percentile_num_alerts_by_type_per_day.p99.test__throw).to.equal(0);

      expect(telemetry.percentile_num_alerts_by_type_per_day.p50.test__multipleSearches).to.equal(
        0
      );
      expect(telemetry.percentile_num_alerts_by_type_per_day.p90.test__multipleSearches).to.equal(
        0
      );
      expect(telemetry.percentile_num_alerts_by_type_per_day.p99.test__multipleSearches).to.equal(
        0
      );

      // this rule type does generate alerts so should be least 1 alert
      expect(
        telemetry.percentile_num_alerts_by_type_per_day.p50['test__cumulative-firing']
      ).to.be.greaterThan(0);
      expect(
        telemetry.percentile_num_alerts_by_type_per_day.p90['test__cumulative-firing']
      ).to.be.greaterThan(0);
      expect(
        telemetry.percentile_num_alerts_by_type_per_day.p99['test__cumulative-firing']
      ).to.be.greaterThan(0);

      // rules grouped by execution status
      expect(telemetry.count_rules_by_execution_status).to.eql({
        success: 15,
        error: 3,
        warning: 0,
      });
      // number of rules that has tags
      expect(telemetry.count_rules_with_tags).to.be(21);
      // rules grouped by notify when
      expect(telemetry.count_rules_by_notify_when).to.eql({
        on_action_group_change: 0,
        on_active_alert: 6,
        on_throttle_interval: 15,
      });
      // rules snoozed
      expect(telemetry.count_rules_snoozed).to.be(0);
      // rules muted
      expect(telemetry.count_rules_muted).to.be(0);
      // rules with muted alerts
      expect(telemetry.count_rules_with_muted_alerts).to.be(0);
      // Connector types grouped by consumers
      expect(telemetry.count_connector_types_by_consumers).to.eql({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        alertsFixture: { test__noop: 9, test__throw: 9, __slack: 3 },
      });

      expect(telemetry.count_rules_by_execution_status_per_day.failure).to.greaterThan(0);
      expect(telemetry.count_rules_by_execution_status_per_day.success).to.greaterThan(0);
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
          actions: new Map([['execute', { gte: 10 }]]),
        });
      });

      // request actions telemetry task to run
      await supertest
        .post('/api/alerting_actions_telemetry/run_soon')
        .set('kbn-xsrf', 'xxx')
        .send({ taskId: 'Actions-actions_telemetry' })
        .expect(200);

      let actionsTelemetry: any;
      await retry.try(async () => {
        const telemetryTask = await es.get<TaskManagerDoc>({
          id: `task:Actions-actions_telemetry`,
          index: '.kibana_task_manager',
        });
        expect(telemetryTask!._source!.task?.status).to.be('idle');
        const taskState = telemetryTask!._source!.task?.state;
        expect(taskState).not.to.be(undefined);
        actionsTelemetry = JSON.parse(taskState!);
        expect(actionsTelemetry.runs).to.equal(2);
        expect(actionsTelemetry.count_total).to.equal(20);
      });

      // request alerting telemetry task to run
      await supertest
        .post('/api/alerting_actions_telemetry/run_soon')
        .set('kbn-xsrf', 'xxx')
        .send({ taskId: 'Alerting-alerting_telemetry' })
        .expect(200);

      let alertingTelemetry: any;
      await retry.try(async () => {
        const telemetryTask = await es.get<TaskManagerDoc>({
          id: `task:Alerting-alerting_telemetry`,
          index: '.kibana_task_manager',
        });
        expect(telemetryTask!._source!.task?.status).to.be('idle');
        const taskState = telemetryTask!._source!.task?.state;
        expect(taskState).not.to.be(undefined);
        alertingTelemetry = JSON.parse(taskState!);
        expect(alertingTelemetry.runs).to.equal(2);
        expect(alertingTelemetry.count_total).to.equal(21);
      });

      verifyActionsTelemetry(actionsTelemetry);
      verifyAlertingTelemetry(alertingTelemetry);
    });
  });
}
