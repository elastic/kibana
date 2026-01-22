/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmRuleType } from '@kbn/rule-data-utils';
import { transactionErrorRateActionVariables } from '@kbn/apm-plugin/server/routes/alerts/rule_types/transaction_error_rate/register_transaction_error_rate_rule_type';
import { apm, timerange } from '@kbn/synthtrace-client';
import expect from '@kbn/expect';
import { omit } from 'lodash';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { RoleCredentials } from '../../../services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { ApmAlertFields } from './helpers/alerting_helper';
import {
  fetchServiceInventoryAlertCounts,
  fetchServiceTabAlertCount,
  getIndexAction,
  APM_ACTION_VARIABLE_INDEX,
  APM_ALERTS_INDEX,
} from './helpers/alerting_helper';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');
  const alertingApi = getService('alertingApi');
  const samlAuth = getService('samlAuth');

  describe('transaction error rate alert', () => {
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let roleAuthc: RoleCredentials;

    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      await alertingApi.cleanUpAlerts({
        roleAuthc,
        consumer: 'apm',
        alertIndexName: APM_ALERTS_INDEX,
        connectorIndexName: APM_ACTION_VARIABLE_INDEX,
      });

      const opbeansJava = apm
        .service({ name: 'opbeans-java', environment: 'production', agentName: 'java' })
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
              .failure(),
            opbeansJava
              .transaction({ transactionName: 'tx-java' })
              .timestamp(timestamp)
              .duration(200)
              .success(),
            opbeansNode
              .transaction({ transactionName: 'tx-node' })
              .timestamp(timestamp)
              .duration(400)
              .failure(),
            opbeansNode
              .transaction({ transactionName: 'tx-node' })
              .timestamp(timestamp)
              .duration(800)
              .success(),
          ];
        });

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      return apmSynthtraceEsClient.index(events);
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('create rule without kql query', () => {
      let ruleId: string;
      let actionId: string;
      let alerts: ApmAlertFields[];

      before(async () => {
        actionId = await alertingApi.createIndexConnector({
          name: 'Transation error rate',
          indexName: APM_ACTION_VARIABLE_INDEX,
          roleAuthc,
        });

        const indexAction = getIndexAction({
          actionId,
          actionVariables: transactionErrorRateActionVariables,
        });

        const createdRule = await alertingApi.createRule({
          ruleTypeId: ApmRuleType.TransactionErrorRate,
          name: 'Apm transaction error rate without kql query',
          consumer: 'apm',
          schedule: {
            interval: '1m',
          },
          tags: ['apm'],
          params: {
            threshold: 40,
            windowSize: 5,
            windowUnit: 'm',
            transactionType: 'request',
            serviceName: 'opbeans-java',
            environment: 'production',
            groupBy: [
              'service.name',
              'service.environment',
              'transaction.type',
              'transaction.name',
            ],
          },
          actions: [indexAction],
          roleAuthc,
        });
        ruleId = createdRule.id;
        alerts = (
          await alertingApi.waitForDocumentInIndex({
            indexName: APM_ALERTS_INDEX,
            ruleId,
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
          results = results = (
            await alertingApi.waitForDocumentInIndex({
              indexName: APM_ACTION_VARIABLE_INDEX,
            })
          ).hits.hits.map((hit) => hit._source) as Array<Record<string, string>>;
        });

        it('has the right keys', async () => {
          expect(results.length).to.be(1);
          expect(Object.keys(results[0]).sort()).to.eql([
            'alertDetailsUrl',
            'environment',
            'grouping',
            'interval',
            'reason',
            'serviceName',
            'threshold',
            'transactionName',
            'transactionType',
            'triggerValue',
            'viewInAppUrl',
          ]);
        });

        it('has the right values', () => {
          expect(omit(results[0], 'alertDetailsUrl', 'viewInAppUrl')).to.eql({
            environment: 'production',
            interval: '5 mins',
            reason:
              'Failed transactions is 50% in the last 5 mins for service: opbeans-java, env: production, type: request, name: tx-java. Alert when > 40%.',
            serviceName: 'opbeans-java',
            transactionName: 'tx-java',
            threshold: '40',
            transactionType: 'request',
            triggerValue: '50',
            grouping:
              '{"service":{"name":"opbeans-java","environment":"production"},"transaction":{"type":"request","name":"tx-java"}}',
          });

          const url = new URL(results[0].viewInAppUrl);

          expect(url.pathname).to.equal('/app/apm/services/opbeans-java');
          expect(url.searchParams.get('transactionType')).to.equal('request');
          expect(url.searchParams.get('environment')).to.equal('production');
        });
      });

      it('indexes alert document with all group-by fields', async () => {
        expect(alerts[0]).property('service.name', 'opbeans-java');
        expect(alerts[0]).property('service.environment', 'production');
        expect(alerts[0]).property('transaction.type', 'request');
        expect(alerts[0]).property('transaction.name', 'tx-java');
      });

      it('produces an alert for opbeans-java with the correct reason', async () => {
        expect(alerts[0]!['kibana.alert.reason']).to.be(
          'Failed transactions is 50% in the last 5 mins for service: opbeans-java, env: production, type: request, name: tx-java. Alert when > 40%.'
        );
      });

      it('shows the 1 alert count for opbeans-java in service inventory', async () => {
        const serviceInventoryAlertCounts = await fetchServiceInventoryAlertCounts(apmApiClient);
        expect(serviceInventoryAlertCounts).to.eql({
          'opbeans-node': 0,
          'opbeans-java': 1,
        });
      });

      it('shows the correct alert count in opbeans-java service', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-java',
        });
        expect(serviceTabAlertCount).to.be(1);
      });

      it('shows the correct alert count in opbeans-node service', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-node',
        });
        expect(serviceTabAlertCount).to.be(0);
      });
    });

    describe('create rule with kql query', () => {
      let ruleId: string;
      let alerts: ApmAlertFields[];

      before(async () => {
        await alertingApi.cleanUpAlerts({
          roleAuthc,
          consumer: 'apm',
          alertIndexName: APM_ALERTS_INDEX,
          connectorIndexName: APM_ACTION_VARIABLE_INDEX,
        });

        const createdRule = await alertingApi.createRule({
          ruleTypeId: ApmRuleType.TransactionErrorRate,
          name: 'Apm transaction error rate without kql query',
          consumer: 'apm',
          schedule: {
            interval: '1m',
          },
          tags: ['apm'],
          params: {
            threshold: 40,
            windowSize: 5,
            windowUnit: 'm',
            transactionType: undefined,
            serviceName: undefined,
            environment: 'ENVIRONMENT_ALL',
            searchConfiguration: {
              query: {
                query:
                  'service.name: opbeans-node and transaction.type: request and service.environment: production',
                language: 'kuery',
              },
            },
            groupBy: [
              'service.name',
              'service.environment',
              'transaction.type',
              'transaction.name',
            ],
          },
          actions: [],
          roleAuthc,
        });
        ruleId = createdRule.id;
        alerts = (
          await alertingApi.waitForDocumentInIndex({
            indexName: APM_ALERTS_INDEX,
            ruleId,
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

      it('indexes alert document with all group-by fields', async () => {
        expect(alerts[0]).property('service.name', 'opbeans-node');
        expect(alerts[0]).property('service.environment', 'production');
        expect(alerts[0]).property('transaction.type', 'request');
        expect(alerts[0]).property('transaction.name', 'tx-node');
      });

      it('produces an alert for opbeans-node with the correct reason', async () => {
        expect(alerts[0]!['kibana.alert.reason']).to.be(
          'Failed transactions is 50% in the last 5 mins for service: opbeans-node, env: production, type: request, name: tx-node. Alert when > 40%.'
        );
      });

      it.skip('shows alert count=1 for opbeans-node on service inventory', async () => {
        const serviceInventoryAlertCounts = await fetchServiceInventoryAlertCounts(apmApiClient);
        expect(serviceInventoryAlertCounts).to.eql({
          'opbeans-node': 1,
          'opbeans-java': 0,
        });
      });

      it('shows alert count=0 in opbeans-java service', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-java',
        });
        expect(serviceTabAlertCount).to.be(0);
      });

      it('shows alert count=1 in opbeans-node service', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-node',
        });
        expect(serviceTabAlertCount).to.be(1);
      });
    });
  });
}
