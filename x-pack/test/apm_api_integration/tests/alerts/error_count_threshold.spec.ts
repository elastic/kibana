/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { getErrorGroupingKey } from '@kbn/apm-synthtrace-client/src/lib/apm/instance';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createApmRule,
  deleteApmAlerts,
  deleteApmRules,
  deleteRuleById,
  clearKibanaApmEventLog,
  deleteAlertsByRuleId,
  fetchServiceInventoryAlertCounts,
  fetchServiceTabAlertCount,
  ApmAlertFields,
} from './helpers/alerting_api_helper';
import { waitForAlertsForRule } from './helpers/wait_for_alerts_for_rule';
import { waitForRuleStatus } from './helpers/wait_for_rule_status';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');

  const supertest = getService('supertest');
  const es = getService('es');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

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

    before(async () => {
      await deleteApmRules(supertest);
      await deleteApmAlerts(es);
      await clearKibanaApmEventLog(es);

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

      await Promise.all([synthtraceEsClient.index(events), synthtraceEsClient.index(phpEvents)]);
    });

    after(async () => {
      await synthtraceEsClient.clean();
    });

    describe('create rule without kql filter', () => {
      let ruleId: string;
      let alerts: ApmAlertFields[];

      before(async () => {
        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.ErrorCount,
          name: 'Apm error count without kql query',
          params: {
            kqlFilter: '',
            ...ruleParams,
          },
          actions: [],
        });

        ruleId = createdRule.id;
        alerts = await waitForAlertsForRule({ es, ruleId, minimumAlertCount: 2 });
      });

      after(async () => {
        await deleteRuleById({ supertest, ruleId });
        await deleteAlertsByRuleId({ es, ruleId });
      });

      it('checks if rule is active', async () => {
        const ruleStatus = await waitForRuleStatus({
          id: ruleId,
          expectedStatus: 'active',
          supertest,
        });
        expect(ruleStatus).to.be('active');
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
            errorGroupingKey: getErrorGroupingKey(phpErrorMessage),
            errorGroupingName: phpErrorMessage,
          },
          {
            serviceName: 'opbeans-java',
            environment: 'production',
            transactionName: 'tx-java',
            errorGroupingKey: getErrorGroupingKey(javaErrorMessage),
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
        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.ErrorCount,
          name: 'Apm error count with kql query',
          params: {
            kqlFilter: 'service.name: opbeans-php',
            ...ruleParams,
          },
          actions: [],
        });
        ruleId = createdRule.id;
      });

      after(async () => {
        await deleteRuleById({ supertest, ruleId });
        await deleteAlertsByRuleId({ es, ruleId });
      });

      it('produces one alert for the opbeans-php service', async () => {
        const alerts = await waitForAlertsForRule({ es, ruleId });
        expect(alerts[0]['kibana.alert.reason']).to.be(
          'Error count is 30 in the last 1 hr for service: opbeans-php, env: production, name: tx-php, error key: c85df8159a74b47b461d6ddaa6ba7da38cfc3e74019aef66257d10df74adeb99, error name: a php error. Alert when > 1.'
        );
      });
    });
  });
}
