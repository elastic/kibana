/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';
import { OpenAISimulator } from '@kbn/actions-simulators-plugin/server/openai_simulation';
import { Spaces, Superuser } from '../../../scenarios';
import {
  getUrlPrefix,
  getEventLog,
  getTestRuleData,
  TaskManagerDoc,
  ObjectRemover,
} from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAlertingAndActionsTelemetryTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const logger = getService('log');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const configService = getService('config');

  describe('test telemetry', () => {
    const objectRemover = new ObjectRemover(supertest);
    const esQueryRuleId: { [key: string]: string } = {};
    const simulator = new OpenAISimulator({
      returnError: false,
      proxy: {
        config: configService.get('kbnTestServer.serverArgs'),
      },
    });
    let apiUrl: string;

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    before(async () => {
      apiUrl = await simulator.start();
    });

    afterEach(() => objectRemover.removeAll());

    after(async () => {
      simulator.close();
      await esTestIndexTool.destroy();
    });

    async function createConnector(opts: {
      name: string;
      space: string;
      connectorTypeId: string;
      secrets?: { apiKey: string };
      config?: { apiProvider: string; apiUrl: string };
    }) {
      const { name, space, connectorTypeId, secrets, config } = opts;
      const { body: createdConnector } = await supertestWithoutAuth
        .post(`${getUrlPrefix(space)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          name,
          connector_type_id: connectorTypeId,
          config: config || {},
          secrets: secrets || {},
        })
        .expect(200);
      objectRemover.add(space, createdConnector.id, 'connector', 'actions');
      return createdConnector.id;
    }

    async function createRule(opts: { space: string; ruleOverwrites: any }) {
      const { ruleOverwrites, space } = opts;
      const ruleResponse = await supertestWithoutAuth
        .post(`${getUrlPrefix(space)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send(getTestRuleData(ruleOverwrites));
      expect(ruleResponse.status).to.equal(200);
      objectRemover.add(space, ruleResponse.body.id, 'rule', 'alerting');
      return ruleResponse.body.id;
    }

    async function createMaintenanceWindow({
      spaceId,
      interval,
      scopedQuery = null,
    }: {
      spaceId: string;
      interval?: number;
      scopedQuery?: {
        filters: string[];
        kql: string;
        dsl: string;
      } | null;
    }) {
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          title: 'test-maintenance-window',
          duration: 60 * 60 * 1000, // 1 hr
          r_rule: {
            dtstart: new Date().toISOString(),
            tzid: 'UTC',
            freq: 0,
            count: 1,
            ...(interval ? { interval } : {}),
          },
          category_ids: ['management'],
          scoped_query: scopedQuery,
        });
      // console.log('response', response.body);
      expect(response.status).to.equal(200);

      objectRemover.add(spaceId, response.body.id, 'rules/maintenance_window', 'alerting', true);

      return response.body.id;
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
        // excluded connector
        await createConnector({
          name: 'unused connector',
          space: space.id,
          connectorTypeId: 'test.excluded',
        });
        const genAiConnectorId = await createConnector({
          name: 'gen ai connector',
          space: space.id,
          connectorTypeId: '.gen-ai',
          secrets: {
            apiKey: 'genAiApiKey',
          },
          config: {
            apiProvider: 'OpenAI',
            apiUrl,
          },
        });
        await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '1h' },
            throttle: null,
            params: {
              pattern: { instance: [true] },
            },
            actions: [
              {
                id: noopConnectorId,
                group: 'default',
                params: {},
              },
              {
                id: 'my-slack1',
                group: 'default',
                params: {},
              },
              {
                id: failingConnectorId,
                group: 'default',
                params: {},
              },
              {
                id: genAiConnectorId,
                group: 'default',
                params: {},
              },
            ],
          },
        });
        // disabled rule
        await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: 'test.noop',
            schedule: { interval: '1h' },
            throttle: null,
            enabled: false,
            params: {},
            actions: [],
          },
        });
        // throwing rule
        await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: 'test.throw',
            schedule: { interval: '1h' },
            throttle: null,
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
        // ES search rule
        await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: 'test.multipleSearches',
            schedule: { interval: '1h' },
            throttle: '1s',
            params: { numSearches: 2, delay: `2s` },
            actions: [],
          },
        });
        // ES query rule
        esQueryRuleId[space.id] = await createRule({
          space: space.id,
          ruleOverwrites: {
            rule_type_id: '.es-query',
            schedule: { interval: '1h' },
            throttle: null,
            params: {
              size: 100,
              timeWindowSize: 5,
              timeWindowUnit: 'm',
              thresholdComparator: '>',
              threshold: [0],
              searchType: 'esqlQuery',
              esqlQuery: {
                esql: 'from .kibana-alerting-test-data | stats c = count(date) | where c < 0',
              },
              timeField: 'date_epoch_millis',
            },
            actions: [],
          },
        });
        // MW with toggles off
        await createMaintenanceWindow({ spaceId: space.id });
        // MW with toggles on
        await createMaintenanceWindow({
          spaceId: space.id,
          interval: 1,
          scopedQuery: {
            filters: [],
            kql: 'kibana.alert.job_errors_results.job_id : * ',
            dsl: '{"bool":{"must":[],"filter":[{"bool":{"should":[{"exists":{"field":"kibana.alert.job_errors_results.job_id"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}',
          },
        });
      }
    }

    function verifyActionsTelemetry(telemetry: any) {
      logger.info(`actions telemetry - ${JSON.stringify(telemetry)}`);
      // total number of active connectors (used by a rule)
      expect(telemetry.count_active_total).to.equal(10);

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
      expect(telemetry.count_by_type['__gen-ai']).to.equal(3);
      expect(telemetry.count_gen_ai_provider_types.OpenAI).to.equal(3);

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
        telemetry.count_connector_types_by_action_run_outcome_per_day['test.throw'].failure > 0
      ).to.be(true);
    }

    function verifyAlertingTelemetry(telemetry: any) {
      logger.info(`alerting telemetry - ${JSON.stringify(telemetry)}`);
      // total number of enabled rules
      expect(telemetry.count_active_total).to.equal(12);

      // total number of disabled rules
      expect(telemetry.count_disabled_total).to.equal(3);

      // total number of rules broken down by rule type
      expect(telemetry.count_by_type.test__noop).to.equal(3);
      expect(telemetry.count_by_type.test__patternFiring).to.equal(3);
      expect(telemetry.count_by_type.test__multipleSearches).to.equal(3);
      expect(telemetry.count_by_type.test__throw).to.equal(3);
      expect(telemetry.count_by_type['__es-query']).to.equal(3);
      expect(telemetry.count_by_type['__es-query_es_query']).to.equal(0);
      expect(telemetry.count_by_type['__es-query_search_source']).to.equal(0);
      expect(telemetry.count_by_type['__es-query_esql_query']).to.equal(3);

      // total number of enabled rules broken down by rule type
      expect(telemetry.count_active_by_type.test__patternFiring).to.equal(3);
      expect(telemetry.count_active_by_type.test__multipleSearches).to.equal(3);
      expect(telemetry.count_active_by_type.test__throw).to.equal(3);
      expect(telemetry.count_active_by_type['__es-query']).to.equal(3);
      expect(telemetry.count_active_by_type['__es-query_es_query']).to.equal(0);
      expect(telemetry.count_active_by_type['__es-query_search_source']).to.equal(0);
      expect(telemetry.count_active_by_type['__es-query_esql_query']).to.equal(3);

      // throttle time stats
      expect(telemetry.throttle_time.min).to.equal('0s');
      expect(telemetry.throttle_time.avg).to.equal('0.3333333333333333s');
      expect(telemetry.throttle_time.max).to.equal('1s');
      expect(telemetry.throttle_time_number_s.min).to.equal(0);
      expect(telemetry.throttle_time_number_s.avg).to.equal(0.3333333333333333);
      expect(telemetry.throttle_time_number_s.max).to.equal(1);

      // schedule interval stats
      expect(telemetry.schedule_time.min).to.equal('3600s');
      expect(telemetry.schedule_time.avg).to.equal('3600s');
      expect(telemetry.schedule_time.max).to.equal('3600s');
      expect(telemetry.schedule_time_number_s.min).to.equal(3600);
      expect(telemetry.schedule_time_number_s.avg).to.equal(3600);
      expect(telemetry.schedule_time_number_s.max).to.equal(3600);

      // attached connectors stats
      expect(telemetry.connectors_per_alert.min).to.equal(0);
      expect(telemetry.connectors_per_alert.avg).to.equal(1);
      expect(telemetry.connectors_per_alert.max).to.equal(4);

      // number of spaces with rules
      expect(telemetry.count_rules_namespaces).to.equal(3);

      // number of rule executions - just checking for non-zero as we can't set an exact number
      // each rule should have had a chance to execute once
      expect(telemetry.count_rules_executions_per_day > 0).to.be(true);

      // number of rule executions broken down by rule type
      expect(telemetry.count_by_type.test__patternFiring >= 3).to.be(true);
      expect(telemetry.count_by_type.test__noop >= 3).to.be(true);
      expect(telemetry.count_by_type.test__multipleSearches >= 3).to.be(true);
      expect(telemetry.count_by_type.test__throw >= 3).to.be(true);
      expect(telemetry.count_by_type['__es-query'] >= 3).to.be(true);

      // average execution time - just checking for non-zero as we can't set an exact number
      expect(telemetry.avg_execution_time_per_day > 0).to.be(true);

      // average execution time broken down by rule type
      expect(telemetry.avg_execution_time_by_type_per_day.test__patternFiring > 0).to.be(true);
      expect(telemetry.avg_execution_time_by_type_per_day.test__multipleSearches > 0).to.be(true);
      expect(telemetry.avg_execution_time_by_type_per_day.test__throw > 0).to.be(true);
      expect(telemetry.avg_execution_time_by_type_per_day['__es-query'] > 0).to.be(true);

      // average es search time - just checking for non-zero as we can't set an exact number
      expect(telemetry.avg_es_search_duration_per_day > 0).to.be(true);

      // average es search time broken down by rule type, most of these rule types don't perform ES queries
      expect(telemetry.avg_es_search_duration_by_type_per_day.test__patternFiring).to.equal(0);
      expect(telemetry.avg_es_search_duration_by_type_per_day.test__throw).to.equal(0);

      // rule type that performs ES search
      expect(telemetry.avg_es_search_duration_by_type_per_day.test__multipleSearches > 0).to.be(
        true
      );

      // average total search time time - just checking for non-zero as we can't set an exact number
      expect(telemetry.avg_total_search_duration_per_day > 0).to.be(true);

      // average total search time broken down by rule type, most of these rule types don't perform ES queries
      expect(telemetry.avg_total_search_duration_by_type_per_day.test__patternFiring).to.equal(0);
      expect(telemetry.avg_total_search_duration_by_type_per_day.test__throw).to.equal(0);

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
      expect(telemetry.percentile_num_generated_actions_per_day.p99 > 0).to.be(true);

      // percentile calculations by rule type. most of these rule types don't schedule actions so they should all be 0
      // but this rule type does schedule actions so should be least 1 action scheduled

      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p50.test__patternFiring > 0
      ).to.be(true);
      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p90.test__patternFiring > 0
      ).to.be(true);
      expect(
        telemetry.percentile_num_generated_actions_by_type_per_day.p99.test__patternFiring > 0
      ).to.be(true);

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

      expect(telemetry.percentile_num_generated_actions_by_type_per_day.p50['__es-query']).to.equal(
        0
      );
      expect(telemetry.percentile_num_generated_actions_by_type_per_day.p90['__es-query']).to.equal(
        0
      );
      expect(telemetry.percentile_num_generated_actions_by_type_per_day.p99['__es-query']).to.equal(
        0
      );

      // percentile calculations for number of alerts
      expect(telemetry.percentile_num_alerts_per_day.p50 >= 0).to.be(true);
      expect(telemetry.percentile_num_alerts_per_day.p90 >= 0).to.be(true);
      expect(telemetry.percentile_num_alerts_per_day.p99 > 0).to.be(true);

      // percentile calculations by rule type. most of these rule types don't generate alerts so they should all be 0
      // but this rule type does generate alerts so should be least 1 alert

      expect(telemetry.percentile_num_alerts_by_type_per_day.p50.test__patternFiring > 0).to.be(
        true
      );
      expect(telemetry.percentile_num_alerts_by_type_per_day.p90.test__patternFiring > 0).to.be(
        true
      );
      expect(telemetry.percentile_num_alerts_by_type_per_day.p99.test__patternFiring > 0).to.be(
        true
      );

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

      expect(telemetry.percentile_num_alerts_by_type_per_day.p50['__es-query']).to.equal(0);
      expect(telemetry.percentile_num_alerts_by_type_per_day.p90['__es-query']).to.equal(0);
      expect(telemetry.percentile_num_alerts_by_type_per_day.p99['__es-query']).to.equal(0);

      // rules grouped by execution status
      expect(telemetry.count_rules_by_execution_status.success > 0).to.be(true);
      expect(telemetry.count_rules_by_execution_status.error > 0).to.be(true);
      expect(telemetry.count_rules_by_execution_status.warning).to.equal(0);

      // number of rules that has tags
      expect(telemetry.count_rules_with_tags).to.equal(15);
      // rules grouped by notify when
      expect(telemetry.count_rules_by_notify_when.on_action_group_change).to.equal(0);
      expect(telemetry.count_rules_by_notify_when.on_active_alert).to.equal(0);
      expect(telemetry.count_rules_by_notify_when.on_throttle_interval).to.equal(15);
      // rules snoozed
      expect(telemetry.count_rules_snoozed).to.equal(0);
      // rules muted
      expect(telemetry.count_rules_muted).to.equal(0);
      // rules with muted alerts
      expect(telemetry.count_rules_with_muted_alerts).to.equal(0);
      // Connector types grouped by consumers
      expect(telemetry.count_connector_types_by_consumers.alertsFixture.test__noop).to.equal(6);
      expect(telemetry.count_connector_types_by_consumers.alertsFixture.test__throw).to.equal(3);
      expect(telemetry.count_connector_types_by_consumers.alertsFixture.__slack).to.equal(3);

      expect(telemetry.count_rules_by_execution_status_per_day.failure > 0).to.be(true);
      expect(telemetry.count_rules_by_execution_status_per_day.success > 0).to.be(true);

      // maintenance window telemetry
      expect(telemetry.count_mw_total).to.equal(6);
      expect(telemetry.count_mw_with_filter_alert_toggle_on).to.equal(3);
      expect(telemetry.count_mw_with_repeat_toggle_on).to.equal(3);
    }

    it('should retrieve telemetry data in the expected format', async () => {
      await setup();

      // let it run for a bit
      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces[2].id,
          type: 'alert',
          id: esQueryRuleId[Spaces[2].id],
          provider: 'alerting',
          actions: new Map([['execute', { gte: 1 }]]),
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
          id: 'task:Actions-actions_telemetry',
          index: '.kibana_task_manager',
        });
        expect(telemetryTask!._source!.task?.status).to.be('idle');
        const taskState = telemetryTask!._source!.task?.state;
        expect(taskState).not.to.be(undefined);
        actionsTelemetry = JSON.parse(taskState!);
        expect(actionsTelemetry.runs > 0).to.be(true);
        expect(actionsTelemetry.count_total).to.equal(24);
      });

      verifyActionsTelemetry(actionsTelemetry);

      // request alerting telemetry task to run
      await supertest
        .post('/api/alerting_actions_telemetry/run_soon')
        .set('kbn-xsrf', 'xxx')
        .send({ taskId: 'Alerting-alerting_telemetry' })
        .expect(200);

      let alertingTelemetry: any;
      await retry.try(async () => {
        const telemetryTask = await es.get<TaskManagerDoc>({
          id: 'task:Alerting-alerting_telemetry',
          index: '.kibana_task_manager',
        });
        expect(telemetryTask!._source!.task?.status).to.be('idle');
        const taskState = telemetryTask!._source!.task?.state;
        expect(taskState).not.to.be(undefined);
        alertingTelemetry = JSON.parse(taskState!);
        expect(alertingTelemetry.runs > 0).to.be(true);
        expect(alertingTelemetry.count_total).to.equal(15);
      });

      verifyAlertingTelemetry(alertingTelemetry);
    });
  });
}
