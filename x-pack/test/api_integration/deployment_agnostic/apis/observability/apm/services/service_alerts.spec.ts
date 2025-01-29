/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { AggregationType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  APM_ACTION_VARIABLE_INDEX,
  APM_ALERTS_INDEX,
  ApmAlertFields,
} from '../alerts/helpers/alerting_helper';

export default function ServiceAlerts({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const alertingApi = getService('alertingApi');
  const samlAuth = getService('samlAuth');
  const synthtrace = getService('synthtrace');

  const dayInMs = 24 * 60 * 60 * 1000;
  const start = Date.now() - dayInMs;
  const end = Date.now() + dayInMs;
  const goService = 'synth-go';

  async function getServiceAlerts({
    serviceName,
    environment,
  }: {
    serviceName: string;
    environment: string;
  }) {
    return apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/alerts_count',
      params: {
        path: { serviceName },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment,
        },
      },
    });
  }

  describe('Service alerts', () => {
    let roleAuthc: RoleCredentials;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    function createRule() {
      return alertingApi.createRule({
        name: `Latency threshold | ${goService}`,
        params: {
          serviceName: goService,
          transactionType: undefined,
          windowSize: 5,
          windowUnit: 'h',
          threshold: 100,
          aggregationType: AggregationType.Avg,
          environment: 'testing',
          groupBy: ['service.name', 'service.environment', 'transaction.type', 'transaction.name'],
        },
        ruleTypeId: ApmRuleType.TransactionDuration,
        roleAuthc,
        consumer: 'apm',
      });
    }

    before(async () => {
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      const synthServices = [
        apm
          .service({ name: goService, environment: 'testing', agentName: 'go' })
          .instance('instance-1'),
      ];

      await apmSynthtraceEsClient.index(
        synthServices.map((service) =>
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              service
                .transaction({
                  transactionName: 'GET /api/product/list',
                  transactionType: 'request',
                })
                .duration(2000)
                .timestamp(timestamp)
                .children(
                  service
                    .span({
                      spanName: '/_search',
                      spanType: 'db',
                      spanSubtype: 'elasticsearch',
                    })
                    .destination('elasticsearch')
                    .duration(100)
                    .success()
                    .timestamp(timestamp),
                  service
                    .span({
                      spanName: '/_search',
                      spanType: 'db',
                      spanSubtype: 'elasticsearch',
                    })
                    .destination('elasticsearch')
                    .duration(300)
                    .success()
                    .timestamp(timestamp)
                )
            )
        )
      );
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('with alerts', () => {
      let ruleId: string;
      let alerts: ApmAlertFields[];

      before(async () => {
        const createdRule = await createRule();
        ruleId = createdRule.id;
        alerts = (
          await alertingApi.waitForDocumentInIndex({
            indexName: APM_ALERTS_INDEX,
            ruleId,
          })
        ).hits.hits.map((hit) => hit._source) as ApmAlertFields[];
      });

      after(async () => {
        await alertingApi.cleanUpAlerts({
          roleAuthc,
          ruleId,
          alertIndexName: APM_ALERTS_INDEX,
          connectorIndexName: APM_ACTION_VARIABLE_INDEX,
          consumer: 'apm',
        });
      });

      it('checks if rule is active', async () => {
        const ruleStatus = await alertingApi.waitForRuleStatus({
          roleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(ruleStatus).to.be('active');
      });

      it('should successfully run the rule', async () => {
        const response = await alertingApi.runRule(roleAuthc, ruleId);
        expect(response.status).to.be(204);
      });

      it('produces 1 alert', async () => {
        expect(alerts.length).to.be(1);
      });

      it('returns the correct number of alerts', async () => {
        const response = await getServiceAlerts({ serviceName: goService, environment: 'testing' });
        expect(response.status).to.be(200);
        expect(response.body.serviceName).to.be(goService);
        expect(response.body.alertsCount).to.be(1);
      });
    });

    describe('without alerts', () => {
      it('returns the correct number of alerts', async () => {
        const response = await getServiceAlerts({ serviceName: goService, environment: 'foo' });
        expect(response.status).to.be(200);
        expect(response.body.serviceName).to.be(goService);
        expect(response.body.alertsCount).to.be(0);
      });
    });
  });
}
