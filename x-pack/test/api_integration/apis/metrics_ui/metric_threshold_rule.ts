/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { cleanup, generate } from '@kbn/infra-forge';
import { Aggregators, Comparator, InfraRuleType } from '@kbn/infra-plugin/common/alerting/metrics';
import {
  waitForDocumentInIndex,
  waitForAlertInIndex,
  waitForRuleStatus,
} from './helpers/alerting_wait_for_helpers';
import { FtrProviderContext } from '../../ftr_provider_context';
import { createIndexConnector, createMetricThresholdRule } from './helpers/alerting_api_helper';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const supertest = getService('supertest');
  const logger = getService('log');

  describe('Metric threshold rule >', () => {
    let ruleId: string;
    let actionId: string | undefined;
    let infraDataIndex: string;

    const METRICS_ALERTS_INDEX = '.alerts-observability.metrics.alerts-default';
    const ALERT_ACTION_INDEX = 'alert-action-metric-threshold';

    describe('alert and action creation', () => {
      before(async () => {
        infraDataIndex = await generate({ esClient, lookback: 'now-15m', logger });
        actionId = await createIndexConnector({
          supertest,
          name: 'Index Connector: Metric threshold API test',
          indexName: ALERT_ACTION_INDEX,
        });
        const createdRule = await createMetricThresholdRule({
          supertest,
          ruleTypeId: InfraRuleType.MetricThreshold,
          name: 'Metric threshold rule',
          params: {
            criteria: [
              {
                aggType: Aggregators.AVERAGE,
                comparator: Comparator.GT,
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
        await esDeleteAllIndices([ALERT_ACTION_INDEX, infraDataIndex]);
        await esClient.deleteByQuery({
          index: METRICS_ALERTS_INDEX,
          query: { term: { 'kibana.alert.rule.uuid': ruleId } },
        });
        await esClient.deleteByQuery({
          index: '.kibana-event-log-*',
          query: { term: { 'kibana.alert.rule.consumer': 'infrastructure' } },
        });
        await cleanup({ esClient, logger });
      });

      it('rule should be active', async () => {
        const executionStatus = await waitForRuleStatus({
          id: ruleId,
          expectedStatus: 'active',
          supertest,
        });
        expect(executionStatus.status).to.be('active');
      });

      it('should set correct action parameter: ruleType', async () => {
        const resp = await waitForDocumentInIndex<{ ruleType: string }>({
          esClient,
          indexName: ALERT_ACTION_INDEX,
        });

        expect(resp.hits.hits[0]._source?.ruleType).eql('metrics.alert.threshold');
      });

      it('should set correct information in the alert document', async () => {
        const resp = await waitForAlertInIndex({
          esClient,
          indexName: METRICS_ALERTS_INDEX,
          ruleId,
        });
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
    });
  });
}
