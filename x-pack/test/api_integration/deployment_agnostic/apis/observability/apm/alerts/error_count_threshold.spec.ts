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
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { RoleCredentials } from '../../../../services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  fetchServiceInventoryAlertCounts,
  fetchServiceTabAlertCount,
  ApmAlertFields,
  getIndexAction,
  APM_ACTION_VARIABLE_INDEX,
  APM_ALERTS_INDEX,
} from './helpers/alerting_helper';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');
  const alertingApi = getService('alertingApi');
  const samlAuth = getService('samlAuth');

  describe('error count threshold alert', () => {
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let roleAuthc: RoleCredentials;

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

    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

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

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

      return Promise.all([
        apmSynthtraceEsClient.index(events),
        apmSynthtraceEsClient.index(phpEvents),
      ]);
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('create rule without kql filter', () => {
      let ruleId: string;
      let alerts: ApmAlertFields[];
      let actionId: string;

      before(async () => {
        actionId = await alertingApi.createIndexConnector({
          name: 'Transation error count',
          indexName: APM_ACTION_VARIABLE_INDEX,
          roleAuthc,
        });

        const indexAction = getIndexAction({
          actionId,
          actionVariables: errorCountActionVariables,
        });

        const createdRule = await alertingApi.createRule({
          ruleTypeId: ApmRuleType.ErrorCount,
          name: 'Apm error count without kql query',
          consumer: 'apm',
          schedule: {
            interval: '1m',
          },
          tags: ['apm'],
          params: {
            ...ruleParams,
          },
          actions: [indexAction],
          roleAuthc,
        });

        ruleId = createdRule.id;
        alerts = (
          await alertingApi.waitForDocumentInIndex({
            indexName: APM_ALERTS_INDEX,
            ruleId,
            docCountTarget: 2,
          })
        ).hits.hits.map((hit) => hit._source) as ApmAlertFields[];
      });

      after(() =>
        alertingApi.cleanUpAlerts({
          roleAuthc,
          ruleId,
          alertIndexName: APM_ALERTS_INDEX,
          connectorIndexName: APM_ACTION_VARIABLE_INDEX,
          consumer: 'apm',
        })
      );

      it('checks if rule is active', async () => {
        const ruleStatus = await alertingApi.waitForRuleStatus({
          ruleId,
          roleAuthc,
          expectedStatus: 'active',
        });
        expect(ruleStatus).to.be('active');
      });

      describe('action variables', () => {
        let results: Array<Record<string, string>>;

        before(async () => {
          await alertingApi.waitForRuleStatus({
            ruleId,
            roleAuthc,
            expectedStatus: 'active',
          });

          results = (
            await alertingApi.waitForDocumentInIndex({
              indexName: APM_ACTION_VARIABLE_INDEX,
              docCountTarget: 2,
            })
          ).hits.hits.map((hit) => hit._source) as Array<Record<string, string>>;
        });

        it('produces a index action document for each service', async () => {
          expect(results.map(({ serviceName }) => serviceName).sort()).to.eql([
            'opbeans-java',
            'opbeans-php',
          ]);
        });

        it('checks if rule is active', async () => {
          const ruleStatus = await alertingApi.waitForRuleStatus({
            ruleId,
            roleAuthc,
            expectedStatus: 'active',
          });
          expect(ruleStatus).to.be('active');
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
          expect(omit(phpEntry, 'alertDetailsUrl', 'viewInAppUrl')).to.eql({
            environment: 'production',
            interval: '1 hr',
            reason:
              'Error count is 30 in the last 1 hr for service: opbeans-php, env: production, name: tx-php, error key: 000000000000000000000a php error, error name: a php error. Alert when > 1.',
            serviceName: 'opbeans-php',
            transactionName: 'tx-php',
            errorGroupingKey: '000000000000000000000a php error',
            errorGroupingName: 'a php error',
            threshold: '1',
            triggerValue: '30',
          });

          const url = new URL(phpEntry.viewInAppUrl);

          expect(url.pathname).to.equal('/app/apm/services/opbeans-php/errors');
          expect(url.searchParams.get('environment')).to.equal('production');
        });
      });

      it('produces one alert for each of the opbeans-java and opbeans-php', async () => {
        const alertReasons = [alerts[0]['kibana.alert.reason'], alerts[1]['kibana.alert.reason']];

        expect(alertReasons).to.eql([
          'Error count is 30 in the last 1 hr for service: opbeans-php, env: production, name: tx-php, error key: 000000000000000000000a php error, error name: a php error. Alert when > 1.',
          'Error count is 15 in the last 1 hr for service: opbeans-java, env: production, name: tx-java, error key: 00000000000000000000a java error, error name: a java error. Alert when > 1.',
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

    describe('create rule with kql filter for opbeans-php', () => {
      let ruleId: string;

      before(async () => {
        const createdRule = await alertingApi.createRule({
          ruleTypeId: ApmRuleType.ErrorCount,
          name: 'Apm error count with kql query',
          consumer: 'apm',
          schedule: {
            interval: '1m',
          },
          tags: ['apm'],
          params: {
            ...ruleParams,
            searchConfiguration: {
              query: {
                query: 'service.name: opbeans-php',
                language: 'kuery',
              },
            },
          },
          actions: [],
          roleAuthc,
        });

        ruleId = createdRule.id;
      });

      after(() =>
        alertingApi.cleanUpAlerts({
          roleAuthc,
          ruleId,
          alertIndexName: APM_ALERTS_INDEX,
          connectorIndexName: APM_ACTION_VARIABLE_INDEX,
          consumer: 'apm',
        })
      );

      it('produces one alert for the opbeans-php service', async () => {
        const alerts = (
          await alertingApi.waitForDocumentInIndex({
            indexName: APM_ALERTS_INDEX,
            ruleId,
          })
        ).hits.hits.map((hit) => hit._source) as ApmAlertFields[];

        expect(alerts[0]['kibana.alert.reason']).to.be(
          'Error count is 30 in the last 1 hr for service: opbeans-php, env: production, name: tx-php, error key: 000000000000000000000a php error, error name: a php error. Alert when > 1.'
        );
      });
    });
  });
}
