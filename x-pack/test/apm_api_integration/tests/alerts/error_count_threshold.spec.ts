/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { errorCountMessage } from '@kbn/apm-plugin/common/rules/default_action_message';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createAlertingRule, createIndexConnector } from './alerting_api_helper';
import { waitForRuleStatus, waitForDocumentInIndex } from './wait_for_rule_status';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');

  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  const apmApiClient = getService('apmApiClient');

  const synthtraceEsClient = getService('synthtraceEsClient');

  registry.when('error count threshold alert', { config: 'basic', archives: [] }, () => {
    const start = '2021-01-01T00:00:00.000Z';
    const end = '2021-01-01T00:15:00.000Z';

    let ruleId: string | undefined;
    let actionId: string | undefined;

    const INDEX_NAME = 'error-count';

    async function fetchAlertCountOnApm() {
      const dateRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };
      const [serviceInventoryResponse, alertsCount] = await Promise.all([
        apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services',
          params: {
            query: {
              ...dateRange,
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
              probability: 1,
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.SixtyMinutes,
            },
          },
        }),
        apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/alerts_count',
          params: {
            path: {
              serviceName: 'service-a',
            },
            query: {
              ...dateRange,
              environment: 'ENVIRONMENT_ALL',
            },
          },
        }),
      ]);

      return {
        serviceInventory: serviceInventoryResponse.body.items[0].alertsCount,
        alertsCount: alertsCount.body.alertsCount,
      };
    }

    before(async () => {
      const serviceA = apm
        .service({ name: 'service-a', environment: 'production', agentName: 'java' })
        .instance('a');
      const events = timerange(new Date(start).getTime(), new Date(end).getTime())
        .ratePerMinute(1)
        .generator((timestamp) => {
          return serviceA
            .transaction({ transactionName: 'tx' })
            .timestamp(timestamp)
            .duration(100)
            .failure()
            .errors(
              serviceA
                .error({ message: '[ResponseError] index_not_found_exception' })
                .timestamp(timestamp + 50)
            );
        });
      await synthtraceEsClient.index(events);
    });

    after(async () => {
      await synthtraceEsClient.clean();
      await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo');
      await supertest.delete(`/api/actions/connector/${actionId}`).set('kbn-xsrf', 'foo');
      await es.deleteByQuery({
        index: INDEX_NAME,
        query: { match_all: {} },
      });
    });

    describe('create alert', () => {
      before(async () => {
        actionId = await createIndexConnector({
          supertest,
          name: 'Error count API test',
          indexName: INDEX_NAME,
        });
        const createdRule = await createAlertingRule({
          supertest,
          ruleTypeId: ApmRuleType.ErrorCount,
          name: 'Apm error count',
          params: {
            environment: 'production',
            threshold: 1,
            windowSize: 99,
            windowUnit: 'y',
          },
          actions: [
            {
              group: 'threshold_met',
              id: actionId,
              params: {
                documents: [{ message: errorCountMessage }],
              },
              frequency: {
                notify_when: 'onActionGroupChange',
                throttle: null,
                summary: false,
              },
            },
          ],
        });
        ruleId = createdRule.id;
      });

      it('checks if alert is active', async () => {
        const executionStatus = await waitForRuleStatus({
          id: ruleId,
          expectedStatus: 'active',
          supertest,
          log,
        });
        expect(executionStatus.status).to.be('active');
      });

      it('returns correct message', async () => {
        const resp = await waitForDocumentInIndex<{ message: string }>({
          es,
          indexName: INDEX_NAME,
          log,
        });

        expect(resp.hits.hits[0]._source?.message).eql(
          `Apm error count alert is firing because of the following conditions:

- Service name: service-a
- Environment: production
- Threshold: 1 error
- Triggered value: 15 errors over the last 99y`
        );
      });
      describe('APM', () => {
        let alertsCount: Awaited<ReturnType<typeof fetchAlertCountOnApm>>;

        before(async () => {
          alertsCount = await fetchAlertCountOnApm();
        });
        it('shows one error count on service inventory and alerts tab', async () => {
          expect(alertsCount.serviceInventory).greaterThan(0);
          expect(alertsCount.alertsCount).greaterThan(0);
        });
      });
    });
  });
}
