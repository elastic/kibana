/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmRuleType } from '@kbn/rule-data-utils';
import { transactionErrorRateActionVariables } from '@kbn/apm-plugin/server/routes/alerts/rule_types/transaction_error_rate/register_transaction_error_rate_rule_type';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { omit } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createApmRule,
  fetchServiceInventoryAlertCounts,
  fetchServiceTabAlertCount,
  ApmAlertFields,
  getIndexAction,
  createIndexConnector,
} from './helpers/alerting_api_helper';
import { cleanupRuleAndAlertState } from './helpers/cleanup_rule_and_alert_state';
import { waitForAlertsForRule } from './helpers/wait_for_alerts_for_rule';
import { waitForActiveRule } from './helpers/wait_for_active_rule';
import { waitForIndexConnectorResults } from './helpers/wait_for_index_connector_results';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('supertest');
  const es = getService('es');
  const logger = getService('log');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  registry.when('transaction error rate alert', { config: 'basic', archives: [] }, () => {
    before(() => {
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
      return synthtraceEsClient.index(events);
    });

    after(async () => {
      await synthtraceEsClient.clean();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/177104
    describe('create rule without kql query', () => {
      let ruleId: string;
      let actionId: string;
      let alerts: ApmAlertFields[];

      before(async () => {
        actionId = await createIndexConnector({ supertest, name: 'Transation error rate' });
        const indexAction = getIndexAction({
          actionId,
          actionVariables: transactionErrorRateActionVariables,
        });

        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.TransactionErrorRate,
          name: 'Apm transaction error rate without kql query',
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
        });
        ruleId = createdRule.id;
        alerts = await waitForAlertsForRule({ es, ruleId });
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
          results = await waitForIndexConnectorResults({ es });
        });

        it('has the right keys', async () => {
          expect(results.length).to.be(1);
          expect(Object.keys(results[0]).sort()).to.eql([
            'alertDetailsUrl',
            'environment',
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
          expect(omit(results[0], 'alertDetailsUrl')).to.eql({
            environment: 'production',
            interval: '5 mins',
            reason:
              'Failed transactions is 50% in the last 5 mins for service: opbeans-java, env: production, type: request, name: tx-java. Alert when > 40%.',
            serviceName: 'opbeans-java',
            transactionName: 'tx-java',
            threshold: '40',
            transactionType: 'request',
            triggerValue: '50',
            viewInAppUrl:
              'http://mockedPublicBaseUrl/app/apm/services/opbeans-java?transactionType=request&environment=production',
          });
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

    // FLAKY: https://github.com/elastic/kibana/issues/177108
    describe('create rule with kql query', () => {
      let ruleId: string;
      let alerts: ApmAlertFields[];

      beforeEach(async () => {
        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.TransactionErrorRate,
          name: 'Apm transaction error rate without kql query',
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
        });
        ruleId = createdRule.id;
        alerts = await waitForAlertsForRule({ es, ruleId });
      });

      afterEach(async () => {
        await cleanupRuleAndAlertState({ es, supertest, logger });
      });

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

      it('shows alert count=1 for opbeans-node on service inventory', async () => {
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
