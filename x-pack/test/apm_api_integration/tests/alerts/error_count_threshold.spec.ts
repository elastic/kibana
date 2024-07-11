/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmRuleType } from '@kbn/rule-data-utils';
import { errorCountActionVariables } from '@kbn/apm-plugin/server/routes/alerts/rule_types/error_count/register_error_count_rule_type';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { omit } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createApmRule,
  fetchServiceInventoryAlertCounts,
  fetchServiceTabAlertCount,
  ApmAlertFields,
  createIndexConnector,
  getIndexAction,
} from './helpers/alerting_api_helper';
import { cleanupRuleAndAlertState } from './helpers/cleanup_rule_and_alert_state';
import { waitForAlertsForRule } from './helpers/wait_for_alerts_for_rule';
import { waitForIndexConnectorResults } from './helpers/wait_for_index_connector_results';
import { waitForActiveRule } from './helpers/wait_for_active_rule';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('supertest');
  const es = getService('es');
  const logger = getService('log');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  registry.when('error count threshold alert', { config: 'basic', archives: [] }, () => {
    const javaErrorMessage = 'a java error';
    const phpErrorMessage = 'a php error';

    const ruleParams = {
      environment: 'production',
      threshold: 1,
      windowSize: 1,
      windowUnit: 'h',
      groupBy: [
        'service.name',
        'service.environment',
        'transaction.name',
        'error.grouping_key',
        'error.grouping_name',
      ],
    };

    before(() => {
      const opbeansJava = apm
        .service({ name: 'opbeans-java', environment: 'production', agentName: 'java' })
        .instance('instance');

      const opbeansPhp = apm
        .service({ name: 'opbeans-php', environment: 'production', agentName: 'php' })
        .instance('instance');

      const opbeansNode = apm
        .service({ name: 'opbeans-node', environment: 'production', agentName: 'node' })
        .instance('instance');

      const events = timerange('now-15m', 'now')
        .ratePerMinute(1)
        .generator((timestamp) => {
          return [
            opbeansJava
              .transaction({ transactionName: 'tx-java' })
              .timestamp(timestamp)
              .duration(100)
              .failure()
              .errors(opbeansJava.error({ message: javaErrorMessage }).timestamp(timestamp + 50)),

            opbeansNode
              .transaction({ transactionName: 'tx-node' })
              .timestamp(timestamp)
              .duration(100)
              .success(),
          ];
        });

      const phpEvents = timerange('now-15m', 'now')
        .ratePerMinute(2)
        .generator((timestamp) => {
          return [
            opbeansPhp
              .transaction({ transactionName: 'tx-php' })
              .timestamp(timestamp)
              .duration(100)
              .failure()
              .errors(opbeansPhp.error({ message: phpErrorMessage }).timestamp(timestamp + 50)),
          ];
        });

      return Promise.all([
        apmSynthtraceEsClient.index(events),
        apmSynthtraceEsClient.index(phpEvents),
      ]);
    });

    after(() => apmSynthtraceEsClient.clean());

    // FLAKY: https://github.com/elastic/kibana/issues/176948
    describe.skip('create rule without kql filter', () => {
      let ruleId: string;
      let alerts: ApmAlertFields[];
      let actionId: string;

      before(async () => {
        actionId = await createIndexConnector({ supertest, name: 'Transation error count' });
        const indexAction = getIndexAction({
          actionId,
          actionVariables: errorCountActionVariables,
        });
        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.ErrorCount,
          name: 'Apm error count without kql query',
          params: {
            ...ruleParams,
          },
          actions: [indexAction],
        });

        ruleId = createdRule.id;
        alerts = await waitForAlertsForRule({ es, ruleId, minimumAlertCount: 2 });
      });

      after(async () => {
        await cleanupRuleAndAlertState({ es, supertest, logger });
      });

      it('checks if rule is active', async () => {
        const ruleStatus = await waitForActiveRule({ ruleId, supertest });
        expect(ruleStatus).to.be('active');
      });

      describe('action variables', () => {
        let results: Array<Record<string, string>>;

        before(async () => {
          results = await waitForIndexConnectorResults({ es, minCount: 2 });
        });

        it('produces a index action document for each service', async () => {
          expect(results.map(({ serviceName }) => serviceName).sort()).to.eql([
            'opbeans-java',
            'opbeans-php',
          ]);
        });

        it('has the right keys', async () => {
          const phpEntry = results.find((result) => result.serviceName === 'opbeans-php')!;
          expect(Object.keys(phpEntry).sort()).to.eql([
            'alertDetailsUrl',
            'environment',
            'errorGroupingKey',
            'errorGroupingName',
            'interval',
            'reason',
            'serviceName',
            'threshold',
            'transactionName',
            'triggerValue',
            'viewInAppUrl',
          ]);
        });

        it('has the right values', () => {
          const phpEntry = results.find((result) => result.serviceName === 'opbeans-php')!;
          expect(omit(phpEntry, 'alertDetailsUrl')).to.eql({
            environment: 'production',
            interval: '1 hr',
            reason:
              'Error count is 30 in the last 1 hr for service: opbeans-php, env: production, name: tx-php, error key: c85df8159a74b47b461d6ddaa6ba7da38cfc3e74019aef66257d10df74adeb99, error name: a php error. Alert when > 1.',
            serviceName: 'opbeans-php',
            transactionName: 'tx-php',
            errorGroupingKey: 'c85df8159a74b47b461d6ddaa6ba7da38cfc3e74019aef66257d10df74adeb99',
            errorGroupingName: 'a php error',
            threshold: '1',
            triggerValue: '30',
            viewInAppUrl:
              'http://mockedPublicBaseUrl/app/apm/services/opbeans-php/errors?environment=production',
          });
        });
      });

      it('produces one alert for each of the opbeans-java and opbeans-php', async () => {
        const alertReasons = [alerts[0]['kibana.alert.reason'], alerts[1]['kibana.alert.reason']];

        expect(alertReasons).to.eql([
          'Error count is 30 in the last 1 hr for service: opbeans-php, env: production, name: tx-php, error key: c85df8159a74b47b461d6ddaa6ba7da38cfc3e74019aef66257d10df74adeb99, error name: a php error. Alert when > 1.',
          'Error count is 15 in the last 1 hr for service: opbeans-java, env: production, name: tx-java, error key: b6a4ac83620b34ae44dd98a13e144782f88698f827af7edb10690c5e6e7d8597, error name: a java error. Alert when > 1.',
        ]);
      });

      it('indexes alert document with all group-by fields', async () => {
        const alertDetails = [alerts[0], alerts[1]].map((alert) => {
          return {
            serviceName: alert!['service.name'],
            environment: alert!['service.environment'],
            transactionName: alert!['transaction.name'],
            errorGroupingKey: alert!['error.grouping_key'],
            errorGroupingName: alert!['error.grouping_name'],
          };
        });

        expect(alertDetails).to.eql([
          {
            serviceName: 'opbeans-php',
            environment: 'production',
            transactionName: 'tx-php',
            errorGroupingKey: '000000000000000000000a php error',
            errorGroupingName: phpErrorMessage,
          },
          {
            serviceName: 'opbeans-java',
            environment: 'production',
            transactionName: 'tx-java',
            errorGroupingKey: '00000000000000000000a java error',
            errorGroupingName: javaErrorMessage,
          },
        ]);
      });

      it('shows the a single alert for opbeans-java and opbeans-php on the service inventory', async () => {
        const serviceInventoryAlertCounts = await fetchServiceInventoryAlertCounts(apmApiClient);
        expect(serviceInventoryAlertCounts).to.eql({
          'opbeans-node': 0,
          'opbeans-java': 1,
          'opbeans-php': 1,
        });
      });

      it('shows 1 alert for opbeans-java in the tab', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-java',
        });
        expect(serviceTabAlertCount).to.be(1);
      });

      it('shows no alerts for opbeans-node in the tab', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-node',
        });
        expect(serviceTabAlertCount).to.be(0);
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/176964
    describe.skip('create rule with kql filter for opbeans-php', () => {
      let ruleId: string;

      before(async () => {
        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.ErrorCount,
          name: 'Apm error count with kql query',
          params: {
            searchConfiguration: {
              query: {
                query: 'service.name: opbeans-php',
                language: 'kuery',
              },
            },
            ...ruleParams,
          },
          actions: [],
        });
        ruleId = createdRule.id;
      });

      after(async () => {
        await cleanupRuleAndAlertState({ es, supertest, logger });
      });

      it('produces one alert for the opbeans-php service', async () => {
        const alerts = await waitForAlertsForRule({ es, ruleId });
        expect(alerts[0]['kibana.alert.reason']).to.be(
          'Error count is 30 in the last 1 hr for service: opbeans-php, env: production, name: tx-php, error key: 000000000000000000000a php error, error name: a php error. Alert when > 1.'
        );
      });
    });
  });
}
