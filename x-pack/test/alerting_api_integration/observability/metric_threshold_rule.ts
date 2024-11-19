/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { cleanup, generate, Dataset, PartialConfig } from '@kbn/data-forge';
import {
  Aggregators,
  InfraRuleType,
  MetricThresholdParams,
} from '@kbn/infra-plugin/common/alerting/metrics';
import { COMPARATORS } from '@kbn/alerting-comparators';
import {
  waitForDocumentInIndex,
  waitForAlertInIndex,
  waitForRuleStatus,
} from './helpers/alerting_wait_for_helpers';
import { FtrProviderContext } from '../common/ftr_provider_context';
import { createIndexConnector, createRule } from './helpers/alerting_api_helper';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const supertest = getService('supertest');
  const logger = getService('log');
  const retryService = getService('retry');

  describe('Metric threshold rule >', () => {
    let ruleId: string;
    let alertId: string;
    let actionId: string;
    let dataForgeConfig: PartialConfig;
    let dataForgeIndices: string[];

    const METRICS_ALERTS_INDEX = '.alerts-observability.metrics.alerts-default';
    const ALERT_ACTION_INDEX = 'alert-action-metric-threshold';

    describe('alert and action creation', () => {
      before(async () => {
        await supertest.patch(`/api/metrics/source/default`).set('kbn-xsrf', 'foo').send({
          anomalyThreshold: 50,
          description: '',
          metricAlias: 'kbn-data-forge-fake_hosts.fake_hosts-*',
          name: 'Default',
        });
        dataForgeConfig = {
          schedule: [
            {
              template: 'good',
              start: 'now-10m',
              end: 'now+5m',
              metrics: [{ name: 'system.cpu.user.pct', method: 'linear', start: 0.9, end: 0.9 }],
            },
          ],
          indexing: { dataset: 'fake_hosts' as Dataset },
        };
        dataForgeIndices = await generate({ client: esClient, config: dataForgeConfig, logger });
        await waitForDocumentInIndex({
          esClient,
          indexName: dataForgeIndices.join(','),
          docCountTarget: 45,
          retryService,
          logger,
        });
        actionId = await createIndexConnector({
          supertest,
          name: 'Index Connector: Metric threshold API test',
          indexName: ALERT_ACTION_INDEX,
          logger,
        });
        const createdRule = await createRule<MetricThresholdParams>({
          supertest,
          logger,
          esClient,
          ruleTypeId: InfraRuleType.MetricThreshold,
          consumer: 'infrastructure',
          tags: ['infrastructure'],
          name: 'Metric threshold rule',
          params: {
            criteria: [
              {
                aggType: Aggregators.AVERAGE,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [0.5],
                timeSize: 5,
                timeUnit: 'm',
                metric: 'system.cpu.user.pct',
              },
            ],
            sourceId: 'default',
            alertOnNoData: true,
            alertOnGroupDisappear: true,
          },
          actions: [
            {
              group: 'metrics.threshold.fired',
              id: actionId,
              params: {
                documents: [
                  {
                    ruleType: '{{rule.type}}',
                    alertDetailsUrl: '{{context.alertDetailsUrl}}',
                    reason: '{{context.reason}}',
                  },
                ],
              },
              frequency: {
                notify_when: 'onActionGroupChange',
                throttle: null,
                summary: false,
              },
            },
          ],
          schedule: {
            interval: '1m',
          },
        });
        ruleId = createdRule.id;
      });

      after(async () => {
        await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo');
        await supertest.delete(`/api/actions/connector/${actionId}`).set('kbn-xsrf', 'foo');
        await esDeleteAllIndices([ALERT_ACTION_INDEX, ...dataForgeIndices]);
        await esClient.deleteByQuery({
          index: METRICS_ALERTS_INDEX,
          query: { term: { 'kibana.alert.rule.uuid': ruleId } },
        });
        await esClient.deleteByQuery({
          index: '.kibana-event-log-*',
          query: { term: { 'kibana.alert.rule.consumer': 'infrastructure' } },
        });
        await cleanup({ client: esClient, config: dataForgeConfig, logger });
      });

      it('rule should be active', async () => {
        const executionStatus = await waitForRuleStatus({
          id: ruleId,
          expectedStatus: 'active',
          supertest,
          retryService,
          logger,
        });
        expect(executionStatus.status).to.be('active');
      });

      it('should set correct information in the alert document', async () => {
        const resp = await waitForAlertInIndex({
          esClient,
          indexName: METRICS_ALERTS_INDEX,
          ruleId,
          retryService,
          logger,
        });
        alertId = (resp.hits.hits[0]._source as any)['kibana.alert.uuid'];
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.rule.category',
          'Metric threshold'
        );
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.consumer', 'infrastructure');
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.rule.name',
          'Metric threshold rule'
        );
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.producer', 'infrastructure');
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.revision', 0);
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.rule.rule_type_id',
          'metrics.alert.threshold'
        );
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.uuid', ruleId);
        expect(resp.hits.hits[0]._source).property('kibana.space_ids').contain('default');
        expect(resp.hits.hits[0]._source)
          .property('kibana.alert.rule.tags')
          .contain('infrastructure');
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.action_group',
          'metrics.threshold.fired'
        );
        expect(resp.hits.hits[0]._source).property('tags').contain('infrastructure');
        expect(resp.hits.hits[0]._source).property('kibana.alert.instance.id', '*');
        expect(resp.hits.hits[0]._source).property('kibana.alert.workflow_status', 'open');
        expect(resp.hits.hits[0]._source).property('event.kind', 'signal');
        expect(resp.hits.hits[0]._source).property('event.action', 'open');

        expect(resp.hits.hits[0]._source)
          .property('kibana.alert.rule.parameters')
          .eql({
            criteria: [
              {
                aggType: 'avg',
                comparator: '>',
                threshold: [0.5],
                timeSize: 5,
                timeUnit: 'm',
                metric: 'system.cpu.user.pct',
              },
            ],
            sourceId: 'default',
            alertOnNoData: true,
            alertOnGroupDisappear: true,
          });
      });

      it('should set correct action parameter: ruleType', async () => {
        const resp = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: ALERT_ACTION_INDEX,
          retryService,
          logger,
        });

        expect(resp.hits.hits[0]._source?.ruleType).eql('metrics.alert.threshold');
        expect(resp.hits.hits[0]._source?.alertDetailsUrl).eql(
          `https://localhost:5601/app/observability/alerts/${alertId}`
        );
        expect(resp.hits.hits[0]._source?.reason).eql(
          `system.cpu.user.pct is 90% in the last 5 mins. Alert when above 50%.`
        );
      });
    });
  });
}
